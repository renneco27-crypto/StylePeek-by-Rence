/* ══════════════════════════════════════════════════════════════════════════
   Style Peek Hybrid Studio — Popup Controller (v2.1)
   1. Website Code Extractor (foppgeakfpkdghmmmflmblcidoofpohm)
   2. Web Page Downloader + Scroll-Merge + Linked Pages (aeojmgngnebhbjpncamiplkimkbnmpmk)
   3. Ad-Safe Tree Button-Clicking State Crawler + Undo Engine
   4. zip2html.py Inliner (Zip2HtmlInliner)
   5. StitchCSV Offline Android App Generator (OfflineResourceInterceptor.java + Top/Bottom Safe Margins)
   6. Interactive Figma Capture & Relative Explorer (fkmaohpngenfoccdgceedjkfhkdcohmg + StylePeek 68eb4bf)
   7. Mutually Exclusive VisBug Live Drag & Fix (kdmdoinnkaeognnpegpkepdnggeaodkn)
   8. Website TechStack Detector (ngpdngfmjfnkdjlgdallobombenfdckg — Unlimited Free)
   ══════════════════════════════════════════════════════════════════════════ */

const EXTRA_MIMES = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".cur": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".css": "text/css",
  ".js": "application/javascript",
  ".html": "text/html",
  ".htm": "text/html"
};

function guessMime(pathStr) {
  const clean = (pathStr || "").split("?")[0].split("#")[0].toLowerCase();
  const dot = clean.lastIndexOf(".");
  if (dot !== -1) {
    const ext = clean.slice(dot);
    if (EXTRA_MIMES[ext]) return EXTRA_MIMES[ext];
  }
  return "application/octet-stream";
}

function setStatus(message, type = "") {
  const el = document.getElementById("statusText");
  if (!el) return;
  el.textContent = message;
  el.className = type === "ok" ? "status-ok" : type === "err" ? "status-err" : "";
}

/* ──────────────────────────────────────────────────────────
   1. Full Website Scroll-Merge + Lazy Promotion + Ad Removal
      (Combines foppgeakfpkdghmmmflmblcidoofpohm + aeojmgngnebhbjpncamiplkimkbnmpmk)
   ────────────────────────────────────────────────────────── */
async function extractPageContentInTab(doAutoScroll = true, recordedBranches = []) {
  const origScrollX = window.scrollX || window.pageXOffset || 0;
  const origScrollY = window.scrollY || window.pageYOffset || 0;

  // All 17 lazy attributes from Web Page Downloader (aeojmgngnebhbjpncamiplkimkbnmpmk)
  const LAZY_ATTRS = [
    "data-src", "data-lazy-src", "data-original", "data-lazy", "data-bg",
    "data-bg-url", "data-srcset", "data-lazy-url", "data-image", "data-lazy-srcset",
    "data-original-src", "data-ll-status", "data-source", "data-src-small",
    "data-src-medium", "data-src-large", "loading-src"
  ];

  const promoteLazyNodes = () => {
    document.querySelectorAll("img, source, video, [data-bg], [data-bg-url]").forEach(el => {
      if (el.tagName === "IMG" && el.loading === "lazy") el.loading = "eager";
      for (const attr of LAZY_ATTRS) {
        const val = el.getAttribute(attr);
        if (!val || val.startsWith("data:image/gif") || val.startsWith("data:image/svg")) continue;
        if (attr.includes("srcset")) {
          if (!el.getAttribute("srcset")) el.setAttribute("srcset", val);
        } else if (attr.includes("bg")) {
          if (!el.style.backgroundImage) el.style.backgroundImage = `url("${val}")`;
        } else if (el.tagName === "IMG" || el.tagName === "SOURCE") {
          const curSrc = el.getAttribute("src") || "";
          if (!curSrc || curSrc.startsWith("data:image/gif") || curSrc.startsWith("data:image/svg")) {
            el.setAttribute("src", val);
          }
        }
      }
    });
  };

  promoteLazyNodes();

  if (doAutoScroll) {
    try {
      const getMaxScroll = () =>
        Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0,
          window.innerHeight
        );

      let totalHeight = getMaxScroll();
      if (totalHeight > window.innerHeight + 80) {
        const step = Math.max(350, Math.floor(window.innerHeight * 0.75));
        let maxSteps = 80;
        for (let pos = 0; pos < totalHeight && maxSteps > 0; pos += step, maxSteps--) {
          window.scrollTo(0, pos);
          promoteLazyNodes();
          await new Promise(r => setTimeout(r, 45));
          totalHeight = getMaxScroll();
        }
        window.scrollTo(0, totalHeight);
        promoteLazyNodes();
        await new Promise(r => setTimeout(r, 120));
        window.scrollTo(origScrollX, origScrollY);
        await new Promise(r => setTimeout(r, 60));
      }
    } catch {}
  }

  // Clone DOM and remove injected extension overlays + Google AdSense / Ad containers
  const docClone = document.documentElement.cloneNode(true);
  docClone
    .querySelectorAll(
      "#sp-root, [id^='sp-'], #__figma_h2d_chrome_extension_toolbar__, #__figma_html_to_design_toolbar_host__, #sp-h2d-interactive-modal, figma-html-to-design-toolbar, vis-bug, vis-bug-handles, vis-bug-hover, vis-bug-label, vis-bug-offscreen-label, vis-bug-distance, vis-bug-grip, vis-bug-boxmodel, vis-bug-metatip, vis-bug-ally, vis-bug-corners, vis-bug-hotkeys, ins.adsbygoogle, [id^='google_ads'], iframe#google_esf, [data-ad-client], [data-ad-slot], [data-google-query-id], amp-ad"
    )
    .forEach(el => el.remove());

  // Clean live temporary attributes on active document
  document.querySelectorAll("[data-sp-bid]").forEach(el => el.removeAttribute("data-sp-bid"));
  document.querySelectorAll("[data-sp-cid]").forEach(el => el.removeAttribute("data-sp-cid"));

  // Inject recorded Tree Button States + Offline State Playback Runtime into clone
  if (Array.isArray(recordedBranches) && recordedBranches.length > 0) {
    const cloneBody = docClone.querySelector("body") || docClone;
    const stateDataScript = document.createElement("script");
    stateDataScript.id = "sp-state-data";
    stateDataScript.type = "application/json";
    stateDataScript.textContent = JSON.stringify(recordedBranches);
    cloneBody.appendChild(stateDataScript);

    const offlineRuntimeScript = document.createElement("script");
    offlineRuntimeScript.id = "sp-offline-runtime";
    offlineRuntimeScript.textContent = `
(function() {
  try {
    var raw = document.getElementById("sp-state-data");
    if (!raw) return;
    var states = JSON.parse(raw.textContent || "[]");
    if (!states.length) return;
    var stateMap = {};
    states.forEach(function(s) { stateMap[s.bid] = s; });
    document.addEventListener("click", function(e) {
      var trigger = e.target.closest ? e.target.closest("[data-sp-bid]") : null;
      if (!trigger) return;
      var bid = trigger.getAttribute("data-sp-bid");
      var state = stateMap[bid];
      if (!state) return;
      if (trigger.tagName === "A") {
        var href = trigger.getAttribute("href") || "";
        if (href.startsWith("#") || href.startsWith("javascript:")) e.preventDefault();
      }
      if (Array.isArray(state.mutations)) {
        state.mutations.forEach(function(m) {
          var target = document.querySelector('[data-sp-cid="' + m.cid + '"]');
          if (!target) return;
          if (m.className !== undefined) target.className = m.className;
          if (m.attr && m.val !== undefined) {
            if (m.val === null) target.removeAttribute(m.attr);
            else target.setAttribute(m.attr, m.val);
          }
          if (m.innerHTML !== undefined) target.innerHTML = m.innerHTML;
        });
      }
    }, true);
  } catch(e) {}
})();
`;
    cloneBody.appendChild(offlineRuntimeScript);
  }

  // Also collect same-origin non-ad <a href> links for optional multi-page scraping
  const AD_URL_RE = /(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google|google\.com\/aclk|google\.com\/url\?|gclid=|utm_medium=cpc|taboola\.com|outbrain\.com)/i;
  const linkedPages = [];
  const seenLinks = new Set();
  document.querySelectorAll("a[href]").forEach(a => {
    const raw = (a.getAttribute("href") || "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
    if (AD_URL_RE.test(raw)) return;
    try {
      const u = new URL(raw, window.location.href);
      if (u.origin === window.location.origin && u.pathname !== window.location.pathname) {
        const cleanHref = u.origin + u.pathname;
        if (!seenLinks.has(cleanHref) && linkedPages.length < 25) {
          seenLinks.add(cleanHref);
          linkedPages.push(cleanHref);
        }
      }
    } catch {}
  });

  return {
    html: "<!DOCTYPE html>\n" + docClone.outerHTML,
    linkedPages
  };
}

function toFolderName(url) {
  try {
    const u = new URL(url);
    if (u.hostname) {
      return u.hostname.replace(/^www\./, "").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    }
    const base = u.pathname.split("/").filter(Boolean).pop() || "local-page";
    return base.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/gi, "-").toLowerCase() || "local-page";
  } catch {
    return "website-code";
  }
}

function toAssetRelPath(urlObject) {
  const hostFolder = urlObject.hostname
    ? urlObject.hostname.replace(/^www\./, "").replace(/[^a-z0-9]/gi, "-").toLowerCase()
    : "local-assets";
  let pathname = decodeURIComponent(urlObject.pathname || "/");
  if (pathname.endsWith("/")) pathname += "index.html";
  pathname = pathname.replace(/^\/+([A-Za-z]:\/)/, ""); // strip Windows drive prefix on file:///
  if (!pathname.startsWith("/")) pathname = "/" + pathname;
  return (hostFolder + pathname).replace(/^\/+/, "");
}

function resolveResourceLinks(doc, baseUrl) {
  const resourceElements = doc.querySelectorAll(
    "link[href], script[src], img[src], source[src], video[poster], image[href], object[data]"
  );
  const resourceUrls = [];
  const seen = new Set();

  const addResource = (absUrl, newRelPath) => {
    if (!seen.has(absUrl)) {
      seen.add(absUrl);
      resourceUrls.push({ absUrl, relPath: newRelPath });
    }
  };

  resourceElements.forEach(element => {
    const attrName = element.hasAttribute("href")
      ? "href"
      : element.hasAttribute("src")
      ? "src"
      : element.hasAttribute("poster")
      ? "poster"
      : element.hasAttribute("data")
      ? "data"
      : null;
    if (!attrName) return;
    const resourcePath = element.getAttribute(attrName);
    if (
      resourcePath &&
      !resourcePath.startsWith("data:") &&
      !resourcePath.startsWith("#") &&
      !resourcePath.startsWith("mailto:") &&
      !resourcePath.startsWith("javascript:")
    ) {
      try {
        const urlObject = new URL(resourcePath, baseUrl);
        if (urlObject.protocol === "http:" || urlObject.protocol === "https:" || urlObject.protocol === "file:") {
          const newPath = toAssetRelPath(urlObject);
          element.setAttribute(attrName, newPath);
          addResource(urlObject.href, newPath);
        }
      } catch {}
    }
  });

  // Resolve srcset on img/source
  doc.querySelectorAll("[srcset]").forEach(element => {
    const rawSrcset = element.getAttribute("srcset");
    if (!rawSrcset) return;
    const newParts = rawSrcset.split(",").map(part => {
      const tokens = part.trim().split(/\s+/);
      if (!tokens[0] || tokens[0].startsWith("data:")) return part;
      try {
        const urlObject = new URL(tokens[0], baseUrl);
        if (urlObject.protocol === "http:" || urlObject.protocol === "https:" || urlObject.protocol === "file:") {
          const newPath = toAssetRelPath(urlObject);
          addResource(urlObject.href, newPath);
          tokens[0] = newPath;
        }
      } catch {}
      return tokens.join(" ");
    });
    element.setAttribute("srcset", newParts.join(", "));
  });

  // Resolve inline style="...background-image: url(...)..."
  doc.querySelectorAll("[style*='url(']").forEach(element => {
    const rawStyle = element.getAttribute("style") || "";
    const updatedStyle = rawStyle.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, ref) => {
      const cleanRef = (ref || "").trim();
      if (!cleanRef || cleanRef.startsWith("data:") || cleanRef.startsWith("#")) return m;
      try {
        const u = new URL(cleanRef, baseUrl);
        if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "file:") {
          const newPath = toAssetRelPath(u);
          addResource(u.href, newPath);
          return `url("${newPath}")`;
        }
      } catch {}
      return m;
    });
    element.setAttribute("style", updatedStyle);
  });

  return resourceUrls;
}

async function buildWebsiteZipFromTab(tab, options = {}) {
  const doAutoScroll = options.autoScroll !== false;
  const doTreeCrawl = Boolean(options.treeCrawl);
  const doScrapeLinks = Boolean(options.scrapeLinks);

  let recordedBranches = [];
  if (doTreeCrawl) {
    setStatus("Tree-clicking home screen buttons & recording panels (Ads skipped)...");
    try {
      const crawlRes = await chrome.tabs.sendMessage(tab.id, { action: "crawlTreeStates" });
      if (crawlRes?.ok && Array.isArray(crawlRes.states)) {
        recordedBranches = crawlRes.states;
      }
    } catch {}
  }

  setStatus("Scrolling & extracting DOM + lazy resources...");
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageContentInTab,
    args: [doAutoScroll, recordedBranches]
  });

  const payload = results?.[0]?.result;
  const pageContent = typeof payload === "string" ? payload : payload?.html;
  const linkedPages = payload?.linkedPages || [];
  if (!pageContent) {
    throw new Error("Could not read page HTML on this tab.");
  }

  const baseUrl = tab.url;
  const websiteName = toFolderName(baseUrl);
  const zip = new JSZip();
  const websiteFolder = zip.folder(websiteName);

  const parser = new DOMParser();
  const doc = parser.parseFromString(pageContent, "text/html");
  const resourceUrls = resolveResourceLinks(doc, baseUrl);

  const updatedPageContent = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  websiteFolder.file("index.html", updatedPageContent);

  const fetchedSet = new Set();
  const cssAssetsToFetch = [];

  await Promise.all(
    resourceUrls.map(async ({ absUrl, relPath }) => {
      if (fetchedSet.has(absUrl)) return;
      fetchedSet.add(absUrl);
      try {
        const response = await fetch(absUrl);
        if (!response.ok && !absUrl.startsWith("file:")) return;
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const isCss = contentType.includes("text/css") || relPath.toLowerCase().endsWith(".css");
        if (isCss) {
          let cssText = await response.text();
          cssText = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, rawRef) => {
            const ref = rawRef.trim();
            if (!ref || ref.startsWith("data:") || ref.startsWith("#")) return m;
            try {
              const u = new URL(ref, absUrl);
              if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "file:") {
                const subRel = toAssetRelPath(u);
                cssAssetsToFetch.push({ absUrl: u.href, relPath: subRel });
                return `url("/${subRel}")`;
              }
            } catch {}
            return m;
          });
          websiteFolder.file(relPath, cssText);
        } else {
          const buf = await response.arrayBuffer();
          websiteFolder.file(relPath, buf);
        }
      } catch {}
    })
  );

  // Fetch secondary CSS assets (fonts, background images referenced via url(...))
  await Promise.all(
    cssAssetsToFetch.map(async ({ absUrl, relPath }) => {
      if (fetchedSet.has(absUrl)) return;
      fetchedSet.add(absUrl);
      try {
        const response = await fetch(absUrl);
        if (response.ok || absUrl.startsWith("file:")) {
          const buf = await response.arrayBuffer();
          websiteFolder.file(relPath, buf);
        }
      } catch {}
    })
  );

  // Optional: Scrape linked same-origin pages (Web Page Downloader aeojmgngnebhbjpncamiplkimkbnmpmk)
  if (doScrapeLinks && linkedPages.length > 0) {
    setStatus(`Downloading ${linkedPages.length} linked pages...`);
    await Promise.all(
      linkedPages.slice(0, 15).map(async pageUrl => {
        try {
          const res = await fetch(pageUrl);
          if (!res.ok && !pageUrl.startsWith("file:")) return;
          const htmlText = await res.text();
          const u = new URL(pageUrl);
          let slug = u.pathname.split("/").filter(Boolean).pop() || "page";
          if (!slug.toLowerCase().endsWith(".html")) slug += ".html";
          slug = slug.replace(/[^a-z0-9._-]/gi, "-");
          websiteFolder.file(`pages/${slug}`, htmlText);
        } catch {}
      })
    );
  }

  return { zip, websiteName, baseUrl, branchCount: recordedBranches.length };
}

/* ──────────────────────────────────────────────────────────
   2. Direct Port of zip2html.py (Zip2HtmlInliner)
   ────────────────────────────────────────────────────────── */
const SKIP_PREFIXES = ["data:", "http:", "https:", "mailto:", "tel:", "javascript:", "blob:", "about:", "#", "//"];

function normalizeZipPath(p) {
  const parts = [];
  for (const seg of (p || "").replace(/\\/g, "/").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.join("/");
}

function dirnameZipPath(p) {
  const norm = normalizeZipPath(p);
  const idx = norm.lastIndexOf("/");
  return idx === -1 ? "" : norm.slice(0, idx);
}

class Zip2HtmlInliner {
  constructor(fileMap, baseDir, options = {}) {
    this.fileMap = fileMap;
    this.baseDir = normalizeZipPath(baseDir);
    this.maxBytes = options.maxBytes ?? 25 * 1024 * 1024;
    this.keepScripts = Boolean(options.keepScripts);
    this.cache = new Map();
    this.stats = { inlined: 0, skippedExternal: 0, skippedTooBig: 0, missing: 0 };
  }

  resolve(rawRef, fromDir = null) {
    if (!rawRef) return null;
    const ref = rawRef.trim().replace(/^["']|["']$/g, "");
    if (!ref) return null;
    const lower = ref.toLowerCase();
    for (const prefix of SKIP_PREFIXES) {
      if (lower.startsWith(prefix)) {
        this.stats.skippedExternal += 1;
        return null;
      }
    }
    let clean = ref.split("#")[0].split("?")[0];
    try {
      clean = decodeURIComponent(clean);
    } catch {}
    clean = clean.replace(/\\/g, "/");
    if (!clean) return null;

    const searchDirs = [];
    if (fromDir != null) searchDirs.push(normalizeZipPath(fromDir));
    if (!searchDirs.includes(this.baseDir)) searchDirs.push(this.baseDir);
    if (!searchDirs.includes("")) searchDirs.push("");

    const relClean = clean.replace(/^\/+/, "");
    for (const base of searchDirs) {
      const candidate = normalizeZipPath(base ? `${base}/${relClean}` : relClean);
      if (this.fileMap.has(candidate)) {
        return candidate;
      }
    }

    for (const key of this.fileMap.keys()) {
      if (key === relClean || key.endsWith("/" + relClean)) {
        return key;
      }
    }

    this.stats.missing += 1;
    return null;
  }

  toDataUri(pathKey) {
    if (this.cache.has(pathKey)) return this.cache.get(pathKey);
    const bytes = this.fileMap.get(pathKey);
    if (!bytes) return null;
    if (bytes.byteLength > this.maxBytes) {
      this.stats.skippedTooBig += 1;
      this.cache.set(pathKey, null);
      return null;
    }
    const mime = guessMime(pathKey);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const uri = `data:${mime};base64,${btoa(binary)}`;
    this.cache.set(pathKey, uri);
    this.stats.inlined += 1;
    return uri;
  }

  readText(pathKey) {
    const bytes = this.fileMap.get(pathKey);
    if (!bytes) return null;
    return new TextDecoder("utf-8").decode(bytes);
  }

  inlineCss(cssText, cssDir, depth = 0) {
    if (!cssText || depth > 5) return cssText || "";

    cssText = cssText.replace(
      /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)[^;]*;/gi,
      (m, q1, u1, q2, u2) => {
        const ref = u1 || u2;
        const target = this.resolve(ref, cssDir);
        if (!target) return "";
        const subCss = this.readText(target);
        if (subCss == null) return "";
        return `/* inlined @import ${ref} */\n` + this.inlineCss(subCss, dirnameZipPath(target), depth + 1);
      }
    );

    cssText = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, rawRef) => {
      const ref = (rawRef || "").trim();
      if (!ref || ref.startsWith("data:") || ref.startsWith("#")) return m;
      const target = this.resolve(ref, cssDir);
      if (!target) return m;
      const uri = this.toDataUri(target);
      return uri ? `url("${uri}")` : m;
    });

    return cssText;
  }

  processHtml(htmlText, sourceName = "archive.zip") {
    if (!this.keepScripts) {
      // Preserve offline interactive state runtime scripts (#sp-state-data and #sp-offline-runtime) while stripping external scripts
      htmlText = htmlText.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (full, attrs, body) => {
        if (/id=["']sp-(state-data|offline-runtime)["']/i.test(attrs)) return full;
        return "";
      });
    }

    htmlText = htmlText.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");

    htmlText = htmlText.replace(/<link\b[^>]*>/gi, tag => {
      const relM = tag.match(/\brel\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i);
      const hrefM = tag.match(/\bhref\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i);
      const rel = (relM ? relM[1] || relM[2] || "" : "").toLowerCase();
      const href = hrefM ? hrefM[1] || hrefM[2] || "" : "";
      const relTokens = new Set(rel.split(/\s+/).filter(Boolean));

      if (relTokens.has("stylesheet")) {
        if (!href) return "";
        const target = this.resolve(href, this.baseDir);
        if (!target) return "";
        const cssText = this.readText(target);
        if (cssText == null) return "";
        const inlined = this.inlineCss(cssText, dirnameZipPath(target));
        return `<style>\n/* inlined: ${href} */\n${inlined}\n</style>`;
      }

      if (
        ["preload", "modulepreload", "prefetch", "dns-prefetch", "preconnect", "manifest"].some(t =>
          relTokens.has(t)
        )
      ) {
        return "";
      }

      if ((relTokens.has("icon") || relTokens.has("shortcut") || relTokens.has("apple-touch-icon")) && href) {
        const target = this.resolve(href, this.baseDir);
        if (target) {
          const uri = this.toDataUri(target);
          if (uri) return tag.replace(href, uri);
        }
        return "";
      }

      return tag;
    });

    htmlText = htmlText.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, open, body, close) => {
      return open + this.inlineCss(body, this.baseDir) + close;
    });

    htmlText = htmlText.replace(/(\bstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (m, prefix, quote, body) => {
      return prefix + quote + this.inlineCss(body, this.baseDir) + quote;
    });

    htmlText = htmlText.replace(/(\bsrcset\s*=\s*)(["'])([\s\S]*?)\2/gi, (m, prefix, quote, body) => {
      const newParts = [];
      for (const part of body.split(",")) {
        const tokens = part.trim().split(/\s+/).filter(Boolean);
        if (!tokens.length) continue;
        const urlPart = tokens[0];
        const descriptor = tokens.slice(1).join(" ");
        const target = this.resolve(urlPart, this.baseDir);
        if (target) {
          const uri = this.toDataUri(target);
          if (uri) {
            newParts.push(descriptor ? `${uri} ${descriptor}` : uri);
            continue;
          }
        }
        if (urlPart.startsWith("data:")) {
          newParts.push(part.trim());
        }
      }
      return `${prefix}${quote}${newParts.join(", ")}${quote}`;
    });

    htmlText = htmlText.replace(
      /(<(?:img|source|video|audio|input|embed|object|image|use)\b[^>]*?\b(?:src|href|xlink:href|poster|data-src)\s*=\s*)(["'])([^"']+)\2/gi,
      (m, prefix, quote, ref) => {
        const target = this.resolve(ref, this.baseDir);
        if (!target) return m;
        const uri = this.toDataUri(target);
        return uri ? `${prefix}${quote}${uri}${quote}` : m;
      }
    );

    htmlText = htmlText.replace(/\s+(?:integrity|crossorigin)\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "");

    const banner = `<!-- saved from ${sourceName} by zip2html -->\n`;
    if (!/<meta\s+charset=/i.test(htmlText) && /<head\b[^>]*>/i.test(htmlText)) {
      htmlText = htmlText.replace(/(<head\b[^>]*>)/i, '$1\n<meta charset="utf-8">');
    }
    return banner + htmlText;
  }
}

async function convertJSZipToStandaloneHtml(zip, sourceName = "website.zip", options = {}) {
  const fileMap = new Map();
  const entries = [];

  for (const [rawPath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir) continue;
    const norm = normalizeZipPath(rawPath);
    entries.push({ norm, zipObj });
  }

  await Promise.all(
    entries.map(async ({ norm, zipObj }) => {
      const bytes = await zipObj.async("uint8array");
      fileMap.set(norm, bytes);
    })
  );

  const htmlPaths = Array.from(fileMap.keys()).filter(
    p => p.toLowerCase().endsWith(".html") || p.toLowerCase().endsWith(".htm")
  );
  if (htmlPaths.length === 0) {
    throw new Error("No .html file found inside ZIP archive.");
  }

  htmlPaths.sort((a, b) => {
    const depthA = a.split("/").length;
    const depthB = b.split("/").length;
    if (depthA !== depthB) return depthA - depthB;
    const baseA = a.split("/").pop().toLowerCase();
    const baseB = b.split("/").pop().toLowerCase();
    const isIdxA = baseA === "index.html" || baseA === "index.htm" ? 0 : 1;
    const isIdxB = baseB === "index.html" || baseB === "index.htm" ? 0 : 1;
    if (isIdxA !== isIdxB) return isIdxA - isIdxB;
    return a.length - b.length;
  });

  const indexHtmlPath = htmlPaths[0];
  const baseDir = dirnameZipPath(indexHtmlPath);
  const rawHtml = new TextDecoder("utf-8").decode(fileMap.get(indexHtmlPath));
  const inliner = new Zip2HtmlInliner(fileMap, baseDir, options);
  const finalHtml = inliner.processHtml(rawHtml, sourceName);
  return { finalHtml, stats: inliner.stats, indexHtmlPath };
}

/* ──────────────────────────────────────────────────────────
   3. StitchCSV Offline Android App Generator
      (Uses OfflineResourceInterceptor.java + Top/Bottom Safe Margins)
   ────────────────────────────────────────────────────────── */
const STITCHCSV_OFFLINE_INTERCEPTOR_JAVA = `package com.studyup.app;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.MimeTypeMap;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * OfflineResourceInterceptor (from StitchCSV-feature-caching-mechanism)
 *
 * Serves bundled static HTML/CSS/JS/Media assets in 0ms from:
 *   1. Internal hot-swap directory: context.getFilesDir() + "/webapp/"
 *   2. APK bundled assets: assets/public/
 * Blocks external ad networks (Google AdSense, DoubleClick) automatically.
 */
public class OfflineResourceInterceptor {
    private static final String TAG = "OfflineInterceptor";

    public static void attachServiceWorkerInterceptor(Context context) {
        try {
            ServiceWorkerController swController = ServiceWorkerController.getInstance();
            swController.setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    return intercept(context, request);
                }
            });
        } catch (Throwable t) {
            Log.w(TAG, "ServiceWorkerController not supported on this Android API", t);
        }
    }

    public static WebResourceResponse intercept(Context context, WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        Uri uri = request.getUrl();
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String urlStr = uri.toString().toLowerCase();

        // Block Google AdSense, DoubleClick & Ad tracking requests
        if (host.contains("googlesyndication.com") ||
            host.contains("doubleclick.net") ||
            host.contains("googleadservices.com") ||
            host.contains("taboola.com") ||
            host.contains("outbrain.com") ||
            urlStr.contains("adsbygoogle")) {
            return new WebResourceResponse("text/plain", "UTF-8", 204, "No Content", getCorsHeaders(), null);
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) {
            path = "/index.html";
        }
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;

        // 1. Check hot-swappable local directory: filesDir/webapp/<cleanPath>
        try {
            File localFile = new File(new File(context.getFilesDir(), "webapp"), cleanPath);
            if (!localFile.exists() && !cleanPath.contains(".")) {
                localFile = new File(new File(context.getFilesDir(), "webapp"), cleanPath + ".html");
            }
            if (localFile.exists() && localFile.isFile()) {
                String mime = getMimeType(localFile.getName());
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", getCorsHeaders(), new FileInputStream(localFile));
            }
        } catch (Exception ignored) {}

        // 2. Serve from APK bundled assets/public/<cleanPath>
        AssetManager assets = context.getAssets();
        String[] candidates = new String[] {
            "public/" + cleanPath,
            "public/" + cleanPath + ".html",
            "public/" + cleanPath + "/index.html",
            "public/index.html"
        };

        for (String candidate : candidates) {
            try {
                InputStream is = assets.open(candidate);
                String mime = getMimeType(candidate);
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", getCorsHeaders(), is);
            } catch (Exception ignored) {}
        }

        return null;
    }

    private static Map<String, String> getCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        headers.put("Cache-Control", "public, max-age=31536000, immutable");
        return headers;
    }

    private static String getMimeType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        String ext = MimeTypeMap.getFileExtensionFromUrl(fileName);
        if (ext != null) {
            String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (guessed != null) return guessed;
        }
        return "application/octet-stream";
    }
}
`;

const STITCHCSV_MAIN_ACTIVITY_JAVA = `package com.studyup.app;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * MainActivity (from StitchCSV-feature-caching-mechanism)
 *
 * Includes:
 * 1. OfflineResourceInterceptor for 100% offline zero-latency WebView rendering.
 * 2. Top & Bottom Native Android Safe-Area Margins so WebView content NEVER overlaps
 *    with the top Android Notification / Status Bar or the bottom Native Android Navigation Bar.
 */
public class MainActivity extends AppCompatActivity {
    private WebView webView;

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics()
        ));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure system windows (Status Bar + Bottom Navigation Bar) are respected
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        // Enforce Top (Notification/Status Bar) and Bottom (Native Android Navbar) Safe Margins
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int safeTopPx = Math.max(bars.top, dpToPx(26));    // Clear top notification/status panel
            int safeBottomPx = Math.max(bars.bottom, dpToPx(36)); // Clear bottom 3-button / gesture navbar

            ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            lp.topMargin = safeTopPx;
            lp.bottomMargin = safeBottomPx;
            lp.leftMargin = bars.left;
            lp.rightMargin = bars.right;
            view.setLayoutParams(lp);
            return WindowInsetsCompat.CONSUMED;
        });

        OfflineResourceInterceptor.attachServiceWorkerInterceptor(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse offline = OfflineResourceInterceptor.intercept(MainActivity.this, request);
                if (offline != null) return offline;
                return super.shouldInterceptRequest(view, request);
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;

const STITCHCSV_ACTIVITY_MAIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0F172A"
    android:fitsSystemWindows="true">

    <!-- Top (26dp min) and Bottom (36dp min) margins prevent overlap with Android Notification Panel & Native Navbar -->
    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginTop="26dp"
        android:layout_marginBottom="36dp" />
</FrameLayout>
`;

const STITCHCSV_ANDROID_MANIFEST_XML = appTitle => `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.studyup.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:label="${appTitle.replace(/["<>]/g, "")}"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.DayNight.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

const STITCHCSV_SAFE_AREA_CSS = `
/* ── StitchCSV Android Top Notification Panel & Bottom Native Navbar Safe Clearance ── */
:root {
  --sp-android-top-safe: max(env(safe-area-inset-top, 0px), 26px);
  --sp-android-bottom-safe: max(env(safe-area-inset-bottom, 0px), 36px);
}
html, body {
  padding-top: var(--sp-android-top-safe) !important;
  padding-bottom: var(--sp-android-bottom-safe) !important;
  box-sizing: border-box !important;
}
`;

async function generateOfflineAndroidAppZip(sourceWebZip, appName = "OfflineWebApp") {
  const cleanAppName = (appName || "OfflineWebApp").replace(/[^a-zA-Z0-9_-]/g, "") || "OfflineWebApp";
  const outZip = new JSZip();

  // 1. Copy all website / parent folder files into android/app/src/main/assets/public/
  const entries = [];
  for (const [rawPath, zipObj] of Object.entries(sourceWebZip.files)) {
    if (zipObj.dir) continue;
    entries.push({ norm: normalizeZipPath(rawPath), zipObj });
  }

  // Strip common single top-level folder prefix if present
  const firstSegs = new Set(entries.map(e => e.norm.split("/")[0]));
  const stripPrefix = firstSegs.size === 1 && entries.some(e => e.norm.includes("/"))
    ? Array.from(firstSegs)[0] + "/"
    : "";

  for (const { norm, zipObj } of entries) {
    const rel = stripPrefix && norm.startsWith(stripPrefix) ? norm.slice(stripPrefix.length) : norm;
    if (!rel) continue;
    if (rel.toLowerCase().endsWith(".html") || rel.toLowerCase().endsWith(".htm")) {
      let html = await zipObj.async("string");
      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `<style id="sp-android-safe-margins">${STITCHCSV_SAFE_AREA_CSS}</style>\n</head>`);
      } else {
        html = `<style id="sp-android-safe-margins">${STITCHCSV_SAFE_AREA_CSS}</style>\n` + html;
      }
      outZip.file(`android/app/src/main/assets/public/${rel}`, html);
    } else {
      const bytes = await zipObj.async("uint8array");
      outZip.file(`android/app/src/main/assets/public/${rel}`, bytes);
    }
  }

  // 2. Add StitchCSV OfflineResourceInterceptor.java, MainActivity.java, Layout & Manifest
  outZip.file(
    "android/app/src/main/java/com/studyup/app/OfflineResourceInterceptor.java",
    STITCHCSV_OFFLINE_INTERCEPTOR_JAVA
  );
  outZip.file(
    "android/app/src/main/java/com/studyup/app/MainActivity.java",
    STITCHCSV_MAIN_ACTIVITY_JAVA
  );
  outZip.file(
    "android/app/src/main/res/layout/activity_main.xml",
    STITCHCSV_ACTIVITY_MAIN_XML
  );
  outZip.file(
    "android/app/src/main/AndroidManifest.xml",
    STITCHCSV_ANDROID_MANIFEST_XML(cleanAppName)
  );
  outZip.file(
    "android/app/build.gradle",
    `plugins {
    id 'com.android.application'
}
android {
    namespace "com.studyup.app"
    compileSdk 34
    defaultConfig {
        applicationId "com.studyup.app.${cleanAppName.toLowerCase()}"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core:1.12.0'
}
`
  );
  outZip.file(
    "android/settings.gradle",
    `rootProject.name = "${cleanAppName}"\ninclude ':app'\n`
  );
  outZip.file(
    "run_build_apk.ps1",
    `# Build Offline Android APK (${cleanAppName})\nSet-Location "$PSScriptRoot\\android"\n.\\gradlew assembleDebug\nWrite-Host "APK built at android/app/build/outputs/apk/debug/app-debug.apk"\n`
  );

  return { outZip, cleanAppName };
}

async function buildZipFromFileList(fileList, defaultFolderName = "parent-folder") {
  const zip = new JSZip();
  let folderName = defaultFolderName;
  const files = Array.from(fileList || []);
  if (files.length === 0) throw new Error("No files in selected parent folder.");

  if (files[0].webkitRelativePath) {
    const firstRoot = files[0].webkitRelativePath.split("/")[0];
    if (firstRoot) folderName = firstRoot;
  }

  await Promise.all(
    files.map(async file => {
      const relPath = file.webkitRelativePath || `${folderName}/${file.name}`;
      const buf = await file.arrayBuffer();
      zip.file(relPath, buf);
    })
  );

  return { zip, folderName, fileCount: files.length };
}

function downloadBlobOrDataUrl(blob, filename) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false
      },
      downloadId => {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

/* ──────────────────────────────────────────────────────────
   4. Popup UI Wiring & Mutual Exclusion Status Sync
   ────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  // Segmented Control Tabs (Hick's Law - 3 Clear Modes)
  const tabButtons = document.querySelectorAll(".segment-tab");
  const viewPanels = {
    edit: document.getElementById("view-edit"),
    capture: document.getElementById("view-capture"),
    export: document.getElementById("view-export")
  };

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      Object.values(viewPanels).forEach(p => p && p.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-tab");
      if (viewPanels[target]) {
        viewPanels[target].classList.add("active");
      }
    });
  });

  // Action Buttons
  const btnLaunchStudio = document.getElementById("btnLaunchStudio");
  const btnInspectStyle = document.getElementById("btnInspectStyle");
  const btnFreeDrag = document.getElementById("btnFreeDrag");

  const btnCaptureElement = document.getElementById("btnCaptureElement");
  const btnOpenPreview = document.getElementById("btnOpenPreview");
  const btnCopyLastCode = document.getElementById("btnCopyLastCode");
  const btnToggleFigmaBar = document.getElementById("btnToggleFigmaBar");

  const btnExportHtml = document.getElementById("btnExportHtml");
  const btnExportZip = document.getElementById("btnExportZip");
  const btnDetectTech = document.getElementById("btnDetectTech");
  const btnBuildAndroid = document.getElementById("btnBuildAndroid");

  const autoScrollToggle = document.getElementById("autoScrollToggle");
  const treeCrawlToggle = document.getElementById("treeCrawlToggle");
  const scrapeLinksToggle = document.getElementById("scrapeLinksToggle");
  const keepScriptsToggle = document.getElementById("keepScriptsToggle");

  const zipFileInput = document.getElementById("zipFileInput");
  const parentFolderPicker = document.getElementById("parentFolderPicker");
  const statusPill = document.getElementById("statusPill");

  async function syncToolStates() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      const state = await chrome.runtime.sendMessage({ action: "getToolStates", tabId: tab.id }).catch(() => null);
      if (state?.ok && statusPill) {
        if (state.visbugActive) {
          statusPill.textContent = "Studio Active";
          statusPill.classList.add("active");
        } else if (state.h2dOpen) {
          statusPill.textContent = "Figma Active";
          statusPill.classList.add("active");
        } else {
          statusPill.textContent = "Ready";
          statusPill.classList.remove("active");
        }
      }
    } catch {}
  }

  await syncToolStates();

  // Mode 1: Edit Page & Layers
  btnLaunchStudio?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setStatus("No active webpage tab found", "err");
        return;
      }
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot edit browser system pages", "err");
        return;
      }
      setStatus("Launching Studio...");
      const res = await chrome.runtime.sendMessage({ action: "toggleVisBug", tabId: tab.id }).catch(() => null);
      if (res?.ok && res.active) {
        setStatus("Layer Studio Launched", "ok");
        setTimeout(() => window.close(), 300);
      } else {
        setStatus("Studio Closed");
      }
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  btnInspectStyle?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot inspect browser system pages", "err");
        return;
      }
      await chrome.runtime.sendMessage({ action: "closeH2DToolbar", tabId: tab.id }).catch(() => null);
      chrome.tabs.sendMessage(tab.id, { action: "toggleInspect" }, () => {
        if (chrome.runtime.lastError) {
          // Content script not ready yet, inject and retry
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
            chrome.tabs.sendMessage(tab.id, { action: "toggleInspect" });
            window.close();
          });
        } else {
          window.close();
        }
      });
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  btnFreeDrag?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot drag on browser system pages", "err");
        return;
      }
      await chrome.runtime.sendMessage({ action: "closeH2DToolbar", tabId: tab.id }).catch(() => null);
      chrome.tabs.sendMessage(tab.id, { action: "toggleDrag" }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
            chrome.tabs.sendMessage(tab.id, { action: "toggleDrag" });
            window.close();
          });
        } else {
          window.close();
        }
      });
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  // Mode 2: Capture
  btnCaptureElement?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot capture browser system pages", "err");
        return;
      }
      setStatus("Activating selection mode...");
      const res = await chrome.runtime.sendMessage({ action: "launchH2DToolbar", tabId: tab.id, command: "select_element" }).catch(() => null);
      if (res?.ok) window.close();
      else setStatus("Could not launch selection on this page", "err");
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  btnOpenPreview?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot open preview on browser system pages", "err");
        return;
      }
      const res = await chrome.runtime.sendMessage({ action: "launchH2DToolbar", tabId: tab.id, command: "open_preview" }).catch(() => null);
      if (res?.ok) window.close();
      else setStatus("No preview available yet", "err");
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  btnCopyLastCode?.addEventListener("click", async () => {
    try {
      const data = await chrome.storage.local.get(["sp_last_captured_code"]);
      const code = data?.sp_last_captured_code;
      if (!code) {
        setStatus("No captured code yet — select an element first", "err");
        return;
      }
      await navigator.clipboard.writeText(code);
      setStatus(`Copied ${Math.round(code.length / 1024)} KB code!`, "ok");
    } catch (e) {
      setStatus(`Copy failed: ${e.message || e}`, "err");
    }
  });

  btnToggleFigmaBar?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        setStatus("Cannot toggle on browser system pages", "err");
        return;
      }
      const res = await chrome.runtime.sendMessage({ action: "launchH2DToolbar", tabId: tab.id, command: "toggle" }).catch(() => null);
      setStatus(res?.active ? "Figma Bar ON" : "Figma Bar OFF", res?.active ? "ok" : "");
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  // Mode 3: Export
  btnExportHtml?.addEventListener("click", async () => {
    btnExportHtml.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab");
      setStatus("Extracting page & inlining assets...");
      const { zip, websiteName } = await buildWebsiteZipFromTab(tab, {
        autoScroll: autoScrollToggle?.checked ?? true,
        treeCrawl: treeCrawlToggle?.checked ?? true,
        scrapeLinks: scrapeLinksToggle?.checked ?? false
      });
      const { finalHtml } = await convertJSZipToStandaloneHtml(zip, `${websiteName}.zip`, {
        keepScripts: keepScriptsToggle?.checked ?? false
      });
      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      await downloadBlobOrDataUrl(blob, `${websiteName}.html`);
      setStatus(`Saved ${websiteName}.html`, "ok");
    } catch (err) {
      setStatus(`Export failed: ${err.message || err}`, "err");
    } finally {
      btnExportHtml.disabled = false;
    }
  });

  btnExportZip?.addEventListener("click", async () => {
    btnExportZip.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab");
      setStatus("Creating website .zip...");
      const { zip, websiteName } = await buildWebsiteZipFromTab(tab, {
        autoScroll: autoScrollToggle?.checked ?? true,
        treeCrawl: treeCrawlToggle?.checked ?? true,
        scrapeLinks: scrapeLinksToggle?.checked ?? false
      });
      const content = await zip.generateAsync({ type: "blob" });
      await downloadBlobOrDataUrl(content, `${websiteName}.zip`);
      setStatus(`Saved ${websiteName}.zip`, "ok");
    } catch (err) {
      setStatus(`Zip error: ${err.message || err}`, "err");
    } finally {
      btnExportZip.disabled = false;
    }
  });

  btnDetectTech?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      setStatus("Scanning tech stack...");
      const hdrRes = await chrome.runtime.sendMessage({ action: "getTabHeaders", tabId: tab.id }).catch(() => ({}));
      const headers = hdrRes?.headers || {};
      let res = await chrome.tabs.sendMessage(tab.id, { action: "detectTechStack", headers }).catch(() => null);
      if (!res?.grouped) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["technologies.js", "content.js"] }).catch(() => {});
        res = await chrome.tabs.sendMessage(tab.id, { action: "detectTechStack", headers }).catch(() => null);
      }
      if (res?.count) {
        const topTech = Object.values(res.grouped).flat().map(i => i.name).slice(0, 4).join(", ");
        setStatus(`Found ${res.count}: ${topTech}`, "ok");
      } else {
        setStatus("Static HTML/CSS/JS detected", "ok");
      }
    } catch (e) {
      setStatus("Scan failed", "err");
    }
  });

  btnBuildAndroid?.addEventListener("click", async () => {
    btnBuildAndroid.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab");
      setStatus("Building Android project...");
      const appName = toFolderName(tab.url);
      const { zip: webZip } = await buildWebsiteZipFromTab(tab, { autoScroll: false, treeCrawl: false, scrapeLinks: true });
      const { outZip, cleanAppName } = await generateOfflineAndroidAppZip(webZip, appName);
      const blob = await outZip.generateAsync({ type: "blob" });
      await downloadBlobOrDataUrl(blob, `${cleanAppName}-Offline-Android-App.zip`);
      setStatus(`Saved ${cleanAppName}-Android.zip`, "ok");
    } catch (e) {
      setStatus(`Android error: ${e.message || e}`, "err");
    } finally {
      btnBuildAndroid.disabled = false;
    }
  });
});
