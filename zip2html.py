#!/usr/bin/env python3
"""
zip2html.py - turn a "saved website" zip into ONE self-contained, viewable HTML file.

WHAT IT EXPECTS (the structure of a typical saved-page zip)
    my-site.zip
    └── my-site/
        ├── index.html                 <- the page (entry point)
        ├── some-site/_next/static/chunks/*.css , *.js
        ├── some-site/_next/static/media/*.woff2     (fonts)
        ├── some-site/assets/images/*.png , *.gif    (images)
        └── ads-or-cdn-host/...                      (third-party files, mostly useless)
    index.html refers to those files with relative paths such as
    href="some-site/_next/static/chunks/abc.css".

WHAT IT DOES
    1. Safely unzips to a temp folder.
    2. Finds the entry page (index.html, shallowest one; or use --entry).
    3. Inlines every local stylesheet (and the fonts/images those stylesheets use).
    4. Inlines local <img>, <source>, <video poster>, favicons, inline style="url()" images
       as base64 data: URIs.
    5. Removes <script> tags, ad/tracker <iframe>s and preload/manifest links
       (they only break or phone home when a saved page is opened offline).
       Use --keep-scripts to keep scripts (inlined) if you want to try to run the page's JS.
    6. Writes a single .html file you can double-click.

USAGE
    python zip2html.py site.zip                 -> site.html next to the zip
    python zip2html.py site.zip -o out.html
    python zip2html.py site.zip --entry some/other/page.html
    python zip2html.py site.zip --keep-scripts
    python zip2html.py site.zip --list          (just show the HTML pages found)
    python zip2html.py site.zip --max-asset-mb 5

Requires only Python 3.8+ (standard library).
"""
import argparse
import base64
import mimetypes
import os
import re
import sys
import tempfile
import zipfile
from urllib.parse import unquote

# ---- extra mime types Python may not know -------------------------------------------------
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/ttf", ".ttf")
mimetypes.add_type("font/otf", ".otf")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("text/javascript", ".js")

REMOTE = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#", "blob:")


# ---- helpers ------------------------------------------------------------------------------
def safe_extract(zf: zipfile.ZipFile, dest: str) -> None:
    """Extract while refusing path-traversal entries (../../evil)."""
    dest_real = os.path.realpath(dest)
    for m in zf.infolist():
        target = os.path.realpath(os.path.join(dest, m.filename))
        if not (target == dest_real or target.startswith(dest_real + os.sep)):
            print(f"  ! skipped unsafe path in zip: {m.filename}", file=sys.stderr)
            continue
        zf.extract(m, dest)


def find_entry(root: str, wanted: str = None) -> str:
    htmls = []
    for dp, _, files in os.walk(root):
        if "__MACOSX" in dp:
            continue
        for f in files:
            if f.lower().endswith((".html", ".htm")):
                htmls.append(os.path.join(dp, f))
    if not htmls:
        sys.exit("No .html file found in the zip.")
    if wanted:
        wanted = wanted.replace("\\", "/").strip("/")
        for p in htmls:
            if os.path.relpath(p, root).replace("\\", "/").endswith(wanted):
                return p
        sys.exit(f"--entry '{wanted}' not found. Use --list to see available pages.")
    def rank(p):
        rel = os.path.relpath(p, root)
        is_index = os.path.basename(p).lower() in ("index.html", "index.htm")
        return (0 if is_index else 1, rel.count(os.sep), -os.path.getsize(p))
    return sorted(htmls, key=rank)[0]


class Inliner:
    def __init__(self, root, base_dir, max_bytes):
        self.root, self.base_dir, self.max_bytes = root, base_dir, max_bytes
        self.cache, self.missing, self.skipped, self.inlined = {}, set(), set(), 0

    # resolve a URL found in HTML/CSS to a real file on disk (or None)
    def resolve(self, ref, from_dir):
        ref = ref.strip().strip("'\"")
        if not ref or ref.lower().startswith(REMOTE):
            return None
        ref = unquote(ref.split("#")[0].split("?")[0])
        candidates = []
        if ref.startswith("/"):
            candidates += [os.path.join(self.base_dir, ref.lstrip("/")), os.path.join(self.root, ref.lstrip("/"))]
        else:
            candidates += [os.path.join(from_dir, ref), os.path.join(self.base_dir, ref), os.path.join(self.root, ref)]
        for c in candidates:
            c = os.path.normpath(c)
            if os.path.isfile(c) and os.path.realpath(c).startswith(os.path.realpath(self.root)):
                return c
        return None

    def data_uri(self, path):
        if path in self.cache:
            return self.cache[path]
        if os.path.getsize(path) > self.max_bytes:
            self.skipped.add(path)
            return None
        mt = mimetypes.guess_type(path)[0] or "application/octet-stream"
        with open(path, "rb") as f:
            uri = f"data:{mt};base64," + base64.b64encode(f.read()).decode()
        self.cache[path] = uri
        self.inlined += 1
        return uri

    def to_uri(self, ref, from_dir):
        p = self.resolve(ref, from_dir)
        if p is None:
            if ref.strip() and not ref.strip().lower().startswith(REMOTE):
                self.missing.add(ref)
            return None
        return self.data_uri(p)

    # ---- CSS --------------------------------------------------------------------------------
    def css(self, text, css_dir, depth=0):
        def imp(m):  # @import "x.css";  or @import url(x.css);
            ref = m.group(1) or m.group(2) or m.group(3)
            p = self.resolve(ref, css_dir)
            if p and depth < 5:
                with open(p, encoding="utf-8", errors="replace") as f:
                    return self.css(f.read(), os.path.dirname(p), depth + 1)
            return m.group(0)
        text = re.sub(r"""@import\s+(?:url\(\s*['"]?([^'")]+)['"]?\s*\)|"([^"]+)"|'([^']+)')[^;]*;""", imp, text)

        def url(m):
            ref = m.group(2).strip()
            uri = self.to_uri(ref, css_dir)
            return f"url({m.group(1)}{uri}{m.group(1)})" if uri else m.group(0)
        return re.sub(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""", url, text)

    # ---- HTML -------------------------------------------------------------------------------
    def html(self, h, entry_dir, keep_scripts):
        # 1. things that break offline
        if not keep_scripts:
            h = re.sub(r"<script\b.*?</script\s*>", "", h, flags=re.S | re.I)
        h = re.sub(r"<iframe\b.*?</iframe\s*>", "", h, flags=re.S | re.I)
        h = re.sub(r"<link\b[^>]*\brel=[\"']?(?:preload|prefetch|modulepreload|preconnect|dns-prefetch|manifest)[\"']?[^>]*>", "", h, flags=re.I)
        h = re.sub(r"<link\b[^>]*\bhref=[\"'][^\"']*\.webmanifest[\"'][^>]*>", "", h, flags=re.I)
        # drop integrity/crossorigin (they block inlined resources)
        h = re.sub(r"\s(?:integrity|crossorigin)(?:=(?:\"[^\"]*\"|'[^']*'|[^\s>]*))?", "", h, flags=re.I)

        # 2. stylesheets -> <style>
        def link_css(m):
            tag = m.group(0)
            href = re.search(r"""href=["']([^"']+)["']""", tag, re.I)
            if not href:
                return tag
            p = self.resolve(href.group(1), entry_dir)
            if not p:
                self.missing.add(href.group(1)) if not href.group(1).lower().startswith(REMOTE) else None
                return tag
            with open(p, encoding="utf-8", errors="replace") as f:
                css = self.css(f.read(), os.path.dirname(p))
            media = re.search(r"""media=["']([^"']+)["']""", tag, re.I)
            return f'<style{" media=%s" % chr(34) + media.group(1) + chr(34) if media else ""}>\n{css}\n</style>'
        h = re.sub(r"<link\b[^>]*\brel=[\"']?stylesheet[\"']?[^>]*>", link_css, h, flags=re.I)
        h = re.sub(r"<link\b(?=[^>]*\bhref=)(?![^>]*\brel=)[^>]*\.css[^>]*>", link_css, h, flags=re.I)

        # 3. existing <style> blocks and style="" attributes
        h = re.sub(r"(<style\b[^>]*>)(.*?)(</style>)",
                   lambda m: m.group(1) + self.css(m.group(2), entry_dir) + m.group(3), h, flags=re.S | re.I)
        h = re.sub(r"""(style=)(["'])(.*?)\2""",
                   lambda m: f"{m.group(1)}{m.group(2)}{self.css(m.group(3), entry_dir) if 'url(' in m.group(3) else m.group(3)}{m.group(2)}",
                   h, flags=re.S | re.I)

        # 4. local scripts (only when --keep-scripts)
        if keep_scripts:
            def scr(m):
                p = self.resolve(m.group(2), entry_dir)
                if not p:
                    return m.group(0)
                with open(p, encoding="utf-8", errors="replace") as f:
                    body = f.read().replace("</script", "<\\/script")
                attrs = re.sub(r"""\ssrc=["'][^"']+["']""", "", m.group(1) + m.group(3))
                return f"<script{attrs}>\n{body}\n</script>"
            h = re.sub(r"""<script\b([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>\s*</script>""", scr, h, flags=re.I)

        # 5. srcset (images list) -> just inline each local candidate
        def srcset(m):
            parts = []
            for item in m.group(1).split(","):
                bits = item.strip().split()
                if not bits:
                    continue
                uri = self.to_uri(bits[0], entry_dir)
                parts.append(" ".join([uri or bits[0]] + bits[1:]))
            return 'srcset="' + ", ".join(parts) + '"'
        h = re.sub(r"""srcset=["']([^"']+)["']""", srcset, h, flags=re.I)

        # 6. src / href / poster / data-src on media and icons
        def attr(m):
            name, q, ref = m.group(1), m.group(2), m.group(3)
            if name.lower() == "href" and not re.search(r"\.(?:png|jpe?g|gif|svg|ico|webp|avif|bmp)$", ref.split("?")[0], re.I):
                return m.group(0)  # leave normal links alone
            uri = self.to_uri(ref, entry_dir)
            return f"{name}={q}{uri}{q}" if uri else m.group(0)
        h = re.sub(r"""\b(src|href|poster|data-src)=(["'])([^"']+)\2""", attr, h, flags=re.I)
        return h


def main():
    ap = argparse.ArgumentParser(description="Convert a saved-website .zip into one standalone .html file.")
    ap.add_argument("zip", help="path to the .zip file")
    ap.add_argument("-o", "--output", help="output .html path (default: <zipname>.html next to the zip)")
    ap.add_argument("--entry", help="which HTML page inside the zip to use (path ending, e.g. 'index.html')")
    ap.add_argument("--keep-scripts", action="store_true", help="inline and keep <script> tags (may not work offline)")
    ap.add_argument("--max-asset-mb", type=float, default=10, help="skip inlining single files bigger than this (default 10)")
    ap.add_argument("--list", action="store_true", help="list HTML pages in the zip and exit")
    a = ap.parse_args()

    if not zipfile.is_zipfile(a.zip):
        sys.exit(f"'{a.zip}' is not a valid zip file.")

    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(a.zip) as zf:
            safe_extract(zf, tmp)

        if a.list:
            for dp, _, files in os.walk(tmp):
                for f in files:
                    if f.lower().endswith((".html", ".htm")):
                        p = os.path.join(dp, f)
                        print(f"{os.path.relpath(p, tmp)}  ({os.path.getsize(p)//1024} KB)")
            return

        entry = find_entry(tmp, a.entry)
        print(f"Entry page : {os.path.relpath(entry, tmp)}")
        inl = Inliner(tmp, os.path.dirname(entry), int(a.max_asset_mb * 1024 * 1024))
        with open(entry, encoding="utf-8", errors="replace") as f:
            out_html = inl.html(f.read(), os.path.dirname(entry), a.keep_scripts)

        out = a.output or os.path.splitext(a.zip)[0] + ".html"
        with open(out, "w", encoding="utf-8") as f:
            f.write(out_html)

    print(f"Inlined    : {inl.inlined} files")
    if inl.skipped:
        print(f"Too large  : {len(inl.skipped)} file(s) left out (raise --max-asset-mb)")
    if inl.missing:
        print(f"Not in zip : {len(inl.missing)} reference(s) left as-is, e.g. {sorted(inl.missing)[0][:80]}")
    print(f"Wrote      : {out}  ({os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    main()
