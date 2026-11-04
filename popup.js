/* ══════════════════════════════════════════════════════════════════════════
   Website Code Extractor + Auto-Scroll + zip2html.py Inliner + H2D + VisBug
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
   1. Website Code Extractor + Auto-Scroll
      (from foppgeakfpkdghmmmflmblcidoofpohm + scroll capture)
   ────────────────────────────────────────────────────────── */
async function extractPageContent(doAutoScroll = true) {
  const origScrollX = window.scrollX || window.pageXOffset || 0;
  const origScrollY = window.scrollY || window.pageYOffset || 0;

  // Promote lazy images before scrolling
  document.querySelectorAll("img").forEach(img => {
    if (img.loading === "lazy") img.loading = "eager";
    const dataSrc = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original");
    if (dataSrc && (!img.getAttribute("src") || img.getAttribute("src").startsWith("data:image/gif") || img.getAttribute("src").startsWith("data:image/svg"))) {
      img.setAttribute("src", dataSrc);
    }
  });

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
          await new Promise(r => setTimeout(r, 45));
          totalHeight = getMaxScroll();
        }
        window.scrollTo(0, totalHeight);
        await new Promise(r => setTimeout(r, 120));
        window.scrollTo(origScrollX, origScrollY);
        await new Promise(r => setTimeout(r, 60));
      }
    } catch {}
  }

  // Clone DOM and remove injected extension overlays before serializing
  const docClone = document.documentElement.cloneNode(true);
  docClone
    .querySelectorAll(
      "#sp-root, [id^='sp-'], #__figma_h2d_chrome_extension_toolbar__, figma-html-to-design-toolbar, vis-bug, vis-bug-handles, vis-bug-hover, vis-bug-label, vis-bug-offscreen-label, vis-bug-distance, vis-bug-grip, vis-bug-boxmodel, vis-bug-metatip, vis-bug-ally, vis-bug-corners, vis-bug-hotkeys"
    )
    .forEach(el => el.remove());

  return "<!DOCTYPE html>\n" + docClone.outerHTML;
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
  const resourceElements = doc.querySelectorAll("link[href], script[src], img[src], source[src], video[poster], image[href]");
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

  // Also resolve srcset on img/source
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

  return resourceUrls;
}

async function buildWebsiteZipFromTab(tab, doAutoScroll = true) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageContent,
    args: [doAutoScroll]
  });

  const pageContent = results?.[0]?.result;
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
          // Rewrite url(...) and @import inside CSS so zip2html can resolve them locally too
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

  return { zip, websiteName, baseUrl };
}

/* ──────────────────────────────────────────────────────────
   2. Direct Port of zip2html.py (Zip2HtmlInliner)
      Converts a JSZip archive into ONE standalone .html file
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
    // fileMap: Map<normalizedPath, Uint8Array>
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

    // Fallback: match by suffix if archive had a top-level folder prefix
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

    // 1. Replace @import rules with referenced CSS content (matches zip2html.py CSS_IMPORT_RE)
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

    // 2. Replace url(...) with data URIs (matches zip2html.py CSS_URL_RE)
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
    // 1. Strip <script> unless keepScripts is true
    if (!this.keepScripts) {
      htmlText = htmlText.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
    }

    // 2. Strip <iframe>
    htmlText = htmlText.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");

    // 3. Process <link ...> tags
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

    // 4. Inline assets inside existing <style> blocks
    htmlText = htmlText.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, open, body, close) => {
      return open + this.inlineCss(body, this.baseDir) + close;
    });

    // 5. Inline url(...) inside inline style="..." attributes
    htmlText = htmlText.replace(/(\bstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (m, prefix, quote, body) => {
      return prefix + quote + this.inlineCss(body, this.baseDir) + quote;
    });

    // 6. Inline srcset="..." on <img> / <source>
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

    // 7. Inline src / href / poster / data-src on media elements
    htmlText = htmlText.replace(
      /(<(?:img|source|video|audio|input|embed|object|image|use)\b[^>]*?\b(?:src|href|xlink:href|poster|data-src)\s*=\s*)(["'])([^"']+)\2/gi,
      (m, prefix, quote, ref) => {
        const target = this.resolve(ref, this.baseDir);
        if (!target) return m;
        const uri = this.toDataUri(target);
        return uri ? `${prefix}${quote}${uri}${quote}` : m;
      }
    );

    // 8. Strip integrity / crossorigin attributes
    htmlText = htmlText.replace(/\s+(?:integrity|crossorigin)\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "");

    // 9. Add header comment & ensure <meta charset="utf-8">
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
   3. Popup UI Event Wiring
   ────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const autoScrollToggle = document.getElementById("autoScrollToggle");
  const keepScriptsToggle = document.getElementById("keepScriptsToggle");
  const extractHtmlButton = document.getElementById("extractHtmlButton");
  const extractButton = document.getElementById("extractButton");
  const zipToHtmlButton = document.getElementById("zipToHtmlButton");
  const zipFileInput = document.getElementById("zipFileInput");
  const h2dSelectElementBtn = document.getElementById("h2dSelectElementBtn");
  const h2dCaptureToolbarBtn = document.getElementById("h2dCaptureToolbarBtn");
  const copyLastCodeBtn = document.getElementById("copyLastCodeBtn");
  const visbugToggleBtn = document.getElementById("visbugToggleBtn");
  const stylepeekInspectBtn = document.getElementById("stylepeekInspectBtn");
  const stylepeekDragBtn = document.getElementById("stylepeekDragBtn");

  // 1A. Scroll & Extract Single .HTML (Auto-Scroll + Website Code Extractor + zip2html)
  extractHtmlButton.addEventListener("click", async () => {
    extractHtmlButton.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab found.");
      setStatus("Scrolling page & extracting resources...");
      const { zip, websiteName } = await buildWebsiteZipFromTab(tab, autoScrollToggle.checked);
      setStatus("Running zip2html inliner (CSS, fonts, images)...");
      const { finalHtml, stats } = await convertJSZipToStandaloneHtml(zip, `${websiteName}.zip`, {
        keepScripts: keepScriptsToggle.checked
      });
      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      await downloadBlobOrDataUrl(blob, `${websiteName}.html`);
      setStatus(`Saved ${websiteName}.html (${stats.inlined} assets inlined)`, "ok");
    } catch (err) {
      setStatus(`Error: ${err.message || err}`, "err");
    } finally {
      extractHtmlButton.disabled = false;
    }
  });

  // 1B. Scroll & Extract Website .ZIP (Website Code Extractor + Auto-Scroll)
  extractButton.addEventListener("click", async () => {
    extractButton.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab found.");
      setStatus("Scrolling page & bundling ZIP archive...");
      const { zip, websiteName } = await buildWebsiteZipFromTab(tab, autoScrollToggle.checked);
      const content = await zip.generateAsync({ type: "blob" });
      await downloadBlobOrDataUrl(content, `${websiteName}.zip`);
      setStatus(`Downloaded ${websiteName}.zip`, "ok");
    } catch (err) {
      setStatus(`Error: ${err.message || err}`, "err");
    } finally {
      extractButton.disabled = false;
    }
  });

  // 1C. Convert any .ZIP file to standalone .HTML (zip2html.py in browser)
  zipToHtmlButton.addEventListener("click", () => {
    zipFileInput.value = "";
    zipFileInput.click();
  });

  zipFileInput.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    zipToHtmlButton.disabled = true;
    try {
      setStatus(`Reading ${file.name}...`);
      const zip = await JSZip.loadAsync(file);
      const { finalHtml, stats } = await convertJSZipToStandaloneHtml(zip, file.name, {
        keepScripts: keepScriptsToggle.checked
      });
      const outName = file.name.replace(/\.zip$/i, "") + ".html";
      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      await downloadBlobOrDataUrl(blob, outName);
      setStatus(`Converted ${outName} (${stats.inlined} assets inlined)`, "ok");
    } catch (err) {
      setStatus(`ZIP Error: ${err.message || err}`, "err");
    } finally {
      zipToHtmlButton.disabled = false;
    }
  });

  // 2A. Select Element -> Copy Code (fkmaohpngenfoccdgceedjkfhkdcohmg)
  h2dSelectElementBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const res = await chrome.runtime.sendMessage({
      action: "launchH2DToolbar",
      tabId: tab.id,
      command: "select_element"
    });
    if (res?.ok) {
      window.close();
    } else {
      setStatus(`Toolbar error: ${res?.error || "Unsupported page"}`, "err");
    }
  });

  // 2B. Open Floating Capture Toolbar (Capture Code, Capture Design, Select Element)
  h2dCaptureToolbarBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const res = await chrome.runtime.sendMessage({
      action: "launchH2DToolbar",
      tabId: tab.id
    });
    if (res?.ok) {
      window.close();
    } else {
      setStatus(`Toolbar error: ${res?.error || "Unsupported page"}`, "err");
    }
  });

  // 2C. Copy Last Captured Element/Page HTML+CSS Code
  copyLastCodeBtn.addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["sp_last_captured_code"]);
    const code = data?.sp_last_captured_code;
    if (!code) {
      setStatus("No captured code yet — click 'Select Element → Copy Code' first", "err");
      return;
    }
    await navigator.clipboard.writeText(code);
    setStatus(`Copied ${Math.round(code.length / 1024)} KB of HTML+CSS code to clipboard!`, "ok");
  });

  // 3A. Toggle VisBug Live Dragging & Design Fixing (kdmdoinnkaeognnpegpkepdnggeaodkn)
  visbugToggleBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const res = await chrome.runtime.sendMessage({
      action: "toggleVisBug",
      tabId: tab.id
    });
    if (res?.ok) {
      window.close();
    } else {
      setStatus(`VisBug error: ${res?.error || "Unsupported page"}`, "err");
    }
  });

  // 3B. StylePeek Inspector & Free-Drag Mode
  stylepeekInspectBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { action: "toggleInspect" }, () => {
      window.close();
    });
  });

  stylepeekDragBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { action: "toggleDrag" }, () => {
      window.close();
    });
  });
});
