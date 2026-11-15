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
      if (totalHeight > window.innerHeight + 60) {
        const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
        for (let pos = 0; pos <= totalHeight; pos += step) {
          window.scrollTo({ top: pos, behavior: "smooth" });
          promoteLazyNodes();
          await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 200)));
          totalHeight = getMaxScroll();
        }
        window.scrollTo({ top: totalHeight, behavior: "smooth" });
        promoteLazyNodes();
        await new Promise(r => setTimeout(r, 400));
        window.scrollTo({ left: origScrollX, top: origScrollY, behavior: "smooth" });
        await new Promise(r => setTimeout(r, 300));
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

const AD_URL_REGEX = /(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google|taboola\.com|outbrain\.com|pagead|adsbygoogle|google-analytics\.com)/i;

function toAssetRelPath(urlObject, baseOrigin) {
  if (AD_URL_REGEX.test(urlObject.href)) return null;

  const isSameOrigin = baseOrigin && urlObject.origin === baseOrigin;
  let pathname = decodeURIComponent(urlObject.pathname || "/");
  pathname = pathname.replace(/^\/+([A-Za-z]:\/)/, ""); // strip Windows drive prefix on file:///

  // Strip trailing slashes or map root to index.html
  if (isSameOrigin) {
    if (pathname === "" || pathname === "/") pathname = "index.html";
    else if (pathname.endsWith("/")) pathname += "index.html";
    return pathname.replace(/^\/+/, "");
  }

  // Cross-origin external asset (e.g. Google Fonts or CDN)
  const hostFolder = urlObject.hostname
    ? urlObject.hostname.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "-").toLowerCase()
    : "external-assets";
  if (pathname === "" || pathname === "/") pathname = "/index.html";
  else if (pathname.endsWith("/")) pathname += "index.html";
  if (!pathname.startsWith("/")) pathname = "/" + pathname;
  return ("_external/" + hostFolder + pathname).replace(/^\/+/, "");
}

function resolveResourceLinks(doc, baseUrl) {
  let baseOrigin = "";
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {}

  // Strip Google AdSense & tracking containers from DOM
  doc.querySelectorAll(
    "ins.adsbygoogle, [id^='google_ads'], iframe#google_esf, [data-ad-client], [data-ad-slot], [data-google-query-id], amp-ad, script[src*='pagead'], script[src*='adsbygoogle'], script[src*='googlesyndication']"
  ).forEach(el => el.remove());

  const resourceElements = doc.querySelectorAll(
    "link[href], script[src], img[src], source[src], video[poster], image[href], object[data]"
  );
  const resourceUrls = [];
  const seen = new Set();

  const addResource = (absUrl, newRelPath) => {
    if (newRelPath && !seen.has(absUrl)) {
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
        if (AD_URL_REGEX.test(urlObject.href)) {
          element.remove();
          return;
        }
        if (urlObject.protocol === "http:" || urlObject.protocol === "https:" || urlObject.protocol === "file:") {
          const newPath = toAssetRelPath(urlObject, baseOrigin);
          if (newPath) {
            element.setAttribute(attrName, newPath);
            addResource(urlObject.href, newPath);
          }
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
        if (AD_URL_REGEX.test(urlObject.href)) return "";
        if (urlObject.protocol === "http:" || urlObject.protocol === "https:" || urlObject.protocol === "file:") {
          const newPath = toAssetRelPath(urlObject, baseOrigin);
          if (newPath) {
            addResource(urlObject.href, newPath);
            tokens[0] = newPath;
          }
        }
      } catch {}
      return tokens.join(" ");
    }).filter(Boolean);
    if (newParts.length > 0) {
      element.setAttribute("srcset", newParts.join(", "));
    } else {
      element.removeAttribute("srcset");
    }
  });

  // Resolve inline style="...background-image: url(...)..."
  doc.querySelectorAll("[style*='url(']").forEach(element => {
    const rawStyle = element.getAttribute("style") || "";
    const updatedStyle = rawStyle.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, ref) => {
      const cleanRef = (ref || "").trim();
      if (!cleanRef || cleanRef.startsWith("data:") || cleanRef.startsWith("#")) return m;
      try {
        const u = new URL(cleanRef, baseUrl);
        if (AD_URL_REGEX.test(u.href)) return "none";
        if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "file:") {
          const newPath = toAssetRelPath(u, baseOrigin);
          if (newPath) {
            addResource(u.href, newPath);
            return `url("${newPath}")`;
          }
        }
      } catch {}
      return m;
    });
    element.setAttribute("style", updatedStyle);
  });

  return resourceUrls;
}

// ──────────────────────────────────────────────────────────
// Full Site Bundler (.ZIP packaged with dev server)
// ──────────────────────────────────────────────────────────
async function buildWebsiteZipFromTab(tab, options = {}) {
  const doAutoScroll = options.autoScroll !== false;
  const doTreeCrawl = Boolean(options.treeCrawl);
  const doScrapeLinks = Boolean(options.scrapeLinks);
  const keepScripts = Boolean(options.keepScripts);

  let recordedBranches = [];
  let minedStyles = [];
  let pageContent = "";
  let linkedPages = [];

  // 1. Ensure crawler engine is injected into the active tab
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["js/sp_crawler.js"]
    });
  } catch {}

  // 2. Automated DOM tree climbing & smooth button clicking (1-3s random delay)
  if (doTreeCrawl) {
    setStatus("Tree navigation: climbing DOM tree & smooth clicking (1-3s delay)...");
    try {
      const crawlRes = await chrome.tabs.sendMessage(tab.id, { action: "crawlTreeStates", maxInteractions: 12 });
      if (crawlRes?.ok && Array.isArray(crawlRes.states)) {
        recordedBranches = crawlRes.states;
      }
    } catch {}
  }

  // 3. Smooth scrolling & full DOM + in-memory CSS extraction
  setStatus("Smooth scrolling & extracting DOM + in-memory stylesheets...");
  try {
    const extractRes = await chrome.tabs.sendMessage(tab.id, {
      action: "extractFullPage",
      options: { autoScroll: doAutoScroll, treeCrawl: false }
    });
    if (extractRes?.ok && extractRes.result) {
      pageContent = extractRes.result.html;
      minedStyles = extractRes.result.minedStyles || [];
      linkedPages = extractRes.result.linkedPages || [];
    }
  } catch {}

  // Fallback if content script message was unavailable
  if (!pageContent) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContentInTab,
      args: [doAutoScroll, recordedBranches]
    });
    const payload = results?.[0]?.result;
    pageContent = typeof payload === "string" ? payload : payload?.html;
    linkedPages = payload?.linkedPages || [];
  }

  if (!pageContent) {
    throw new Error("Could not read page HTML on this tab.");
  }

  const baseUrl = tab.url;
  let baseOrigin = "";
  try {
    baseOrigin = new URL(baseUrl).origin;
  } catch {}
  const websiteName = toFolderName(baseUrl);
  const zip = new JSZip();

  const parser = new DOMParser();
  const doc = parser.parseFromString(pageContent, "text/html");

  // If user did not check 'Keep Scripts', remove dynamic hydration scripts that crash offline
  if (!keepScripts) {
    doc.querySelectorAll("script").forEach(s => {
      const type = (s.getAttribute("type") || "").toLowerCase();
      // Keep JSON data scripts and offline runtime
      if (type === "application/json" || type === "application/ld+json" || s.id === "sp-state-data" || s.id === "sp-offline-runtime") {
        return;
      }
      s.remove();
    });
  }

  const resourceUrls = resolveResourceLinks(doc, baseUrl);

  // Inlined stylesheets fallback map (indexed by sheet href)
  const minedStyleMap = new Map();
  for (const ms of minedStyles) {
    if (ms.href) minedStyleMap.set(ms.href, ms.cssText);
  }

  const updatedPageContent = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  zip.file("index.html", updatedPageContent);

  const fetchedSet = new Set();
  const cssAssetsToFetch = [];

  await Promise.all(
    resourceUrls.map(async ({ absUrl, relPath }) => {
      if (fetchedSet.has(absUrl)) return;
      fetchedSet.add(absUrl);
      try {
        let response = null;
        let isCss = relPath.toLowerCase().endsWith(".css");
        let cssText = "";

        try {
          response = await fetch(absUrl);
        } catch {}

        if (response && response.ok) {
          const contentType = (response.headers.get("content-type") || "").toLowerCase();
          if (contentType.includes("text/css")) isCss = true;
          if (isCss) {
            cssText = await response.text();
          }
        } else if (isCss && minedStyleMap.has(absUrl)) {
          // Zero-missing-styles guarantee: Use in-memory sheet rules from active tab!
          cssText = minedStyleMap.get(absUrl);
        }

        if (isCss && cssText) {
          cssText = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, rawRef) => {
            const ref = rawRef.trim();
            if (!ref || ref.startsWith("data:") || ref.startsWith("#")) return m;
            try {
              const u = new URL(ref, absUrl);
              if (AD_URL_REGEX.test(u.href)) return "none";
              if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "file:") {
                const subRel = toAssetRelPath(u, baseOrigin);
                if (subRel) {
                  cssAssetsToFetch.push({ absUrl: u.href, relPath: subRel });
                  return `url("/${subRel}")`;
                }
              }
            } catch {}
            return m;
          });
          zip.file(relPath, cssText);
        } else if (response && response.ok) {
          const buf = await response.arrayBuffer();
          zip.file(relPath, buf);
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
          zip.file(relPath, buf);
        }
      } catch {}
    })
  );

  // Optional: Scrape linked same-origin pages
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
          zip.file(`pages/${slug}`, htmlText);
        } catch {}
      })
    );
  }

  // Package with pnpm / npm dev server configuration (Law: zero-friction local run)
  const packageJson = JSON.stringify(
    {
      name: websiteName || "captured-website",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "sirv . --port 3000 --open --cors --dev",
        start: "sirv . --port 3000 --open --cors",
        serve: "npx serve ."
      },
      devDependencies: {
        "sirv-cli": "^2.0.2"
      }
    },
    null,
    2
  );

  const readmeMd = `# ${websiteName || "Captured Website"}

Captured and packaged with StylePeek.

## Quick Start (with pnpm):
\`\`\`bash
pnpm install
pnpm dev
\`\`\`
Your browser will automatically open \`http://localhost:3000\` with all styles, fonts, and assets running cleanly under a local HTTP server!

## Alternative (npm / yarn):
\`\`\`bash
npm install
npm run dev
\`\`\`

## Instant Run (No install needed):
\`\`\`bash
npx serve .
\`\`\`
`;

  zip.file("package.json", packageJson);
  zip.file("README.md", readmeMd);

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
      (Modularized into js/sp_android_export.js for Law 43)
   ────────────────────────────────────────────────────────── */
// generateOfflineAndroidAppZip is loaded from js/sp_android_export.js

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
    palette: document.getElementById("view-palette"),
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
        if (target === "palette") {
          loadPopupPalette();
        }
      }
    });
  });

  // Action Buttons
  const btnLaunchStudio = document.getElementById("btnLaunchStudio");

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
          statusPill.textContent = "Capture Active";
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
      setStatus(res?.active ? "Capture Bar ON" : "Capture Bar OFF", res?.active ? "ok" : "");
    } catch (e) {
      setStatus(`Error: ${e.message || e}`, "err");
    }
  });

  // Mode: Palette Picker
  const btnCapturePalette = document.getElementById("btnCapturePalette");
  const btnPopupEyedropper = document.getElementById("btnPopupEyedropper");
  const btnPopupRescanPalette = document.getElementById("btnPopupRescanPalette");
  const popupPaletteGrid = document.getElementById("popupPaletteGrid");
  const popupPaletteSiteInfo = document.getElementById("popupPaletteSiteInfo");
  const popupSelectedColorBar = document.getElementById("popupSelectedColorBar");
  const popupSelectedColorPreview = document.getElementById("popupSelectedColorPreview");
  const popupSelectedColorHex = document.getElementById("popupSelectedColorHex");
  const popupSelectedColorRole = document.getElementById("popupSelectedColorRole");
  const btnCopySelectedHex = document.getElementById("btnCopySelectedHex");
  const btnOpenFullPaletteStudio = document.getElementById("btnOpenFullPaletteStudio");
  const btnCopyPaletteCss = document.getElementById("btnCopyPaletteCss");
  const btnCopyPaletteTailwind = document.getElementById("btnCopyPaletteTailwind");

  let cachedPalette = null;
  let activePopupFilter = "all";
  let activeSelectedHex = null;

  btnCapturePalette?.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    Object.values(viewPanels).forEach(p => p && p.classList.remove("active"));
    const palTabBtn = document.querySelector('.segment-tab[data-tab="palette"]');
    if (palTabBtn) palTabBtn.classList.add("active");
    if (viewPanels.palette) viewPanels.palette.classList.add("active");
    loadPopupPalette();
  });

  async function loadPopupPalette(force = false) {
    if (cachedPalette && !force) {
      renderPopupPalette(cachedPalette);
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        if (popupPaletteSiteInfo) popupPaletteSiteInfo.textContent = "No active webpage tab found";
        return;
      }
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        if (popupPaletteSiteInfo) popupPaletteSiteInfo.textContent = "Cannot extract colors from browser pages";
        return;
      }

      if (popupPaletteSiteInfo) popupPaletteSiteInfo.textContent = "Scanning website colors...";

      let res = await chrome.tabs.sendMessage(tab.id, { action: "extractWebsitePalette" }).catch(() => null);

      if (!res || !res.palette) {
        // Inject sp_utils.js and sp_palette.js dynamically if content script wasn't ready
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["js/sp_utils.js", "js/sp_palette.js"]
          });
          res = await chrome.tabs.sendMessage(tab.id, { action: "extractWebsitePalette" }).catch(() => null);
        } catch (injErr) {}
      }

      if (res && res.palette) {
        cachedPalette = res.palette;
        renderPopupPalette(cachedPalette);
        setStatus(`Detected ${cachedPalette.totalColors || 0} colors`, "ok");
      } else {
        if (popupPaletteSiteInfo) popupPaletteSiteInfo.textContent = "Could not extract palette on this page";
        setStatus("Could not extract palette", "err");
      }
    } catch (err) {
      if (popupPaletteSiteInfo) popupPaletteSiteInfo.textContent = "Extraction error";
      setStatus(`Error: ${err.message || err}`, "err");
    }
  }

  function renderPopupPalette(palette) {
    if (!palette || !popupPaletteGrid) return;

    if (popupPaletteSiteInfo) {
      popupPaletteSiteInfo.textContent = `${palette.host || "Site"} · ${palette.totalColors || 0} colors`;
    }

    let list = palette.all || [];
    if (activePopupFilter === "dominant") list = palette.dominant || [];
    else if (activePopupFilter === "surfaces") list = palette.surfaces || [];
    else if (activePopupFilter === "accents") list = palette.accents || [];
    else if (activePopupFilter === "text") list = palette.text || [];

    const sampled = (palette.sampled || []).map(hex => ({
      hex,
      roles: ["sampled"],
      count: "Dropper"
    }));

    const displayList = activePopupFilter === "all" ? [...sampled, ...list] : list;

    popupPaletteGrid.innerHTML = "";

    if (displayList.length === 0) {
      popupPaletteGrid.innerHTML = `<div style="grid-column:1/-1;padding:20px 4px;text-align:center;font-size:10.5px;color:#78716C;">No colors in this category.</div>`;
      return;
    }

    if (!activeSelectedHex || !displayList.some(c => c.hex === activeSelectedHex)) {
      activeSelectedHex = displayList[0].hex;
    }
    updateSelectedColorBar(displayList.find(c => c.hex === activeSelectedHex) || displayList[0]);

    displayList.forEach(item => {
      const swatch = document.createElement("div");
      swatch.className = "popup-swatch-item" + (item.hex === activeSelectedHex ? " active" : "");
      swatch.style.backgroundColor = item.hex;
      swatch.title = `${item.hex} · Click to copy`;

      const hexLabel = document.createElement("span");
      hexLabel.className = "popup-swatch-hex";
      hexLabel.textContent = item.hex;
      swatch.appendChild(hexLabel);

      swatch.addEventListener("click", () => {
        activeSelectedHex = item.hex;
        popupPaletteGrid.querySelectorAll(".popup-swatch-item").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
        updateSelectedColorBar(item);

        navigator.clipboard.writeText(item.hex);
        setStatus(`Copied ${item.hex}!`, "ok");
      });

      popupPaletteGrid.appendChild(swatch);
    });
  }

  function updateSelectedColorBar(item) {
    if (!popupSelectedColorBar || !item) return;
    popupSelectedColorBar.style.display = "flex";
    if (popupSelectedColorPreview) popupSelectedColorPreview.style.backgroundColor = item.hex;
    if (popupSelectedColorHex) popupSelectedColorHex.textContent = item.hex;
    if (popupSelectedColorRole) {
      const roleText = item.roles && item.roles[0] ? item.roles[0] : (item.count ? `${item.count}× on page` : "Detected");
      popupSelectedColorRole.textContent = roleText;
    }
  }

  btnCopySelectedHex?.addEventListener("click", () => {
    if (!activeSelectedHex) return;
    navigator.clipboard.writeText(activeSelectedHex);
    setStatus(`Copied ${activeSelectedHex}!`, "ok");
  });

  btnPopupEyedropper?.addEventListener("click", async () => {
    try {
      if (typeof window.EyeDropper !== "undefined") {
        const dropper = new window.EyeDropper();
        const res = await dropper.open();
        if (res && res.sRGBHex) {
          const hex = res.sRGBHex.toUpperCase();
          navigator.clipboard.writeText(hex);
          setStatus(`Sampled ${hex} (Copied!)`, "ok");
          if (cachedPalette) {
            cachedPalette.sampled = cachedPalette.sampled || [];
            if (!cachedPalette.sampled.includes(hex)) cachedPalette.sampled.unshift(hex);
            renderPopupPalette(cachedPalette);
          }
          return;
        }
      }

      // Fallback: send message to tab to run eyedropper
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "pickEyedropper" }).catch(() => {});
        window.close();
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setStatus(`Eyedropper: ${e.message || e}`, "err");
      }
    }
  });

  btnPopupRescanPalette?.addEventListener("click", () => {
    loadPopupPalette(true);
  });

  // Filter Pills
  document.querySelectorAll("#popupPaletteFilter .filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll("#popupPaletteFilter .filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activePopupFilter = pill.dataset.filter || "all";
      if (cachedPalette) renderPopupPalette(cachedPalette);
    });
  });

  btnOpenFullPaletteStudio?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await chrome.tabs.sendMessage(tab.id, { action: "openPaletteModal" }).catch(() => null);
      window.close();
    } catch (e) {}
  });

  btnCopyPaletteCss?.addEventListener("click", () => {
    if (!cachedPalette || !cachedPalette.all) {
      setStatus("No palette loaded yet", "err");
      return;
    }
    const vars = cachedPalette.all.slice(0, 16).map((c, i) => {
      const name = c.cssVarNames && c.cssVarNames.length > 0 ? c.cssVarNames[0] : `--site-color-${i + 1}`;
      return `  ${name}: ${c.hex};`;
    });
    const code = `:root {\n  /* Extracted from ${cachedPalette.host || "website"} via StylePeek */\n${vars.join("\n")}\n}`;
    navigator.clipboard.writeText(code);
    setStatus("Copied CSS Variables!", "ok");
  });

  btnCopyPaletteTailwind?.addEventListener("click", () => {
    if (!cachedPalette || !cachedPalette.all) {
      setStatus("No palette loaded yet", "err");
      return;
    }
    const colorsObj = {};
    cachedPalette.all.slice(0, 16).forEach((c, i) => {
      const cleanName = (c.roles[0] || "color") + (i > 0 ? `-${i + 1}` : "");
      colorsObj[cleanName] = c.hex;
    });
    const code = `// Tailwind config colors snippet\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colorsObj, null, 8).replace(/\n\s*}/, "\n      }")}\n    }\n  }\n};`;
    navigator.clipboard.writeText(code);
    setStatus("Copied Tailwind Config!", "ok");
  });

  // Mode 3: Export HTML (Shares the EXACT same captureVisibleViewport function as on-canvas capture)
  btnExportHtml?.addEventListener("click", async () => {
    btnExportHtml.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error("No active tab");
      setStatus("Scrolling down panel & saving HTML...");

      // Send captureViewport to execute captureVisibleViewport() on the tab
      let res = await chrome.tabs.sendMessage(tab.id, { action: "captureViewport" }).catch(() => null);
      if (!res?.success) {
        // If content script wasn't active on tab, inject content scripts and run
        const spContentFiles = [
          "technologies.js", "js/sp_utils.js", "js/sp_panel.js", "js/sp_deep_layers.js",
          "js/sp_style.js", "js/sp_move.js", "js/sp_transform.js", "js/sp_inspect.js",
          "js/sp_tech_capture.js", "content.js"
        ];
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: spContentFiles }).catch(() => {});
        res = await chrome.tabs.sendMessage(tab.id, { action: "captureViewport" }).catch(() => null);
      }

      if (res?.success) {
        setStatus(`Saved ${res.filename || "page.html"}`, "ok");
        setTimeout(() => window.close(), 600);
      } else {
        throw new Error(res?.error || "Capture failed. Make sure page is loaded.");
      }
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
        const spContentFiles = [
          "technologies.js", "js/sp_utils.js", "js/sp_panel.js", "js/sp_deep_layers.js",
          "js/sp_style.js", "js/sp_move.js", "js/sp_transform.js", "js/sp_inspect.js",
          "js/sp_tech_capture.js", "content.js"
        ];
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: spContentFiles }).catch(() => {});
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
