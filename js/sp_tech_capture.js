/**
 * StylePeek Studio — Tech Stack Detector & Full-Page Viewport Capture
 * js/sp_tech_capture.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  /* ══════════════════════════════════════════════════════════
     Website TechStack Detector
     ══════════════════════════════════════════════════════════ */
  function detectPageJsGlobals(techCatalog) {
    try {
      const results = {};
      const allGlobals = [];
      for (const [, catData] of Object.entries(techCatalog || {})) {
        for (const tech of catData.technologies || []) {
          if (tech.patterns && tech.patterns.js) {
            const jsVars = Array.isArray(tech.patterns.js) ? tech.patterns.js : [tech.patterns.js];
            for (const g of jsVars) {
              allGlobals.push({ tech: tech.name, prop: g });
            }
          }
        }
      }

      // 1. Direct window checks
      for (const { tech, prop } of allGlobals) {
        try {
          const parts = prop.split('.');
          let val = window;
          for (const p of parts) {
            val = val?.[p];
          }
          if (val !== undefined && val !== null && val !== false) {
            results[tech] = true;
          }
        } catch {}
      }

      // 2. Scan existing script tag texts and identifiers safely without executing code
      const scripts = Array.from(document.querySelectorAll("script"));
      const scriptText = scripts.map(s => (s.textContent || "").slice(0, 1000)).join(" ");
      for (const { tech, prop } of allGlobals) {
        if (!results[tech]) {
          const simpleProp = prop.replace(/\./g, "[._]");
          try {
            if (new RegExp(`\\b${simpleProp}\\b`, "i").test(scriptText)) {
              results[tech] = true;
            }
          } catch {}
        }
      }

      return results;
    } catch {
      return {};
    }
  }

  function detectTechnologiesOnPage(responseHeaders = {}) {
    const TECH_CATALOG =
      (typeof technologies !== "undefined" ? technologies : null) ||
      (typeof window !== "undefined" && window.technologies ? window.technologies : null);
    if (!TECH_CATALOG) {
      return { success: false, grouped: {}, technologies: [], count: 0 };
    }

    const jsGlobalHits = detectPageJsGlobals(TECH_CATALOG);
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[href]'));
    const metas = Array.from(document.querySelectorAll("meta"));
    const cookies = document.cookie || "";
    const detectedTechs = [];
    const grouped = {};

    function checkPatterns(tech) {
      if (!tech || !tech.patterns) return false;
      const checks = [];

      if (tech.patterns.js) {
        const jsVars = Array.isArray(tech.patterns.js) ? tech.patterns.js : [tech.patterns.js];
        checks.push(
          Boolean(jsGlobalHits[tech.name]) ||
            jsVars.some(varName => typeof window[varName] !== "undefined")
        );
      }

      if (tech.patterns.dom) {
        try {
          checks.push(document.querySelector(tech.patterns.dom) !== null);
        } catch {
          checks.push(false);
        }
      }

      if (tech.patterns.script) {
        checks.push(scripts.some(script => tech.patterns.script.test(script.src)));
      }

      if (tech.patterns.css) {
        checks.push(links.some(link => tech.patterns.css.test(link.href)));
      }

      if (tech.patterns.meta) {
        checks.push(
          metas.some(meta => {
            const nameMatch =
              !tech.patterns.meta.name ||
              meta.getAttribute("name") === tech.patterns.meta.name ||
              meta.getAttribute("property") === tech.patterns.meta.name;
            const contentMatch =
              !tech.patterns.meta.content ||
              (meta.getAttribute("content") &&
                tech.patterns.meta.content.test(meta.getAttribute("content")));
            return nameMatch && contentMatch;
          })
        );
      }

      if (tech.patterns.cookie) {
        checks.push(cookies.includes(tech.patterns.cookie));
      }

      return checks.some(c => c === true);
    }

    for (const [categoryKey, categoryData] of Object.entries(TECH_CATALOG)) {
      const catLabel = `${categoryData.icon || "🔧"} ${categoryData.name || categoryKey}`;
      for (const tech of categoryData.technologies || []) {
        if (checkPatterns(tech)) {
          const item = {
            name: tech.name,
            icon: tech.icon || categoryData.icon || "⚡",
            category: categoryKey,
            categoryName: catLabel,
            color: "#38bdf8",
            description: categoryData.name || categoryKey
          };
          detectedTechs.push(item);
          if (!grouped[catLabel]) grouped[catLabel] = [];
          grouped[catLabel].push(item);
        }
      }
    }

    const headerRules = [
      { header: "cf-ray", name: "Cloudflare", icon: "☁️", cat: "☁️ Hosting & CDN" },
      { header: "x-vercel-id", name: "Vercel", icon: "▲", cat: "☁️ Hosting & CDN" },
      { header: "x-nf-request-id", name: "Netlify", icon: "🌐", cat: "☁️ Hosting & CDN" },
      { header: "x-powered-by", regex: /next\.js/i, name: "Next.js", icon: "▲", cat: "⚛️ Frontend Frameworks & Libraries" },
      { header: "x-powered-by", regex: /express/i, name: "Express.js", icon: "🚂", cat: "🔧 Other Tools & Libraries" },
      { header: "server", regex: /cloudflare/i, name: "Cloudflare", icon: "☁️", cat: "☁️ Hosting & CDN" },
      { header: "server", regex: /nginx/i, name: "Nginx", icon: "🟩", cat: "☁️ Hosting & CDN" }
    ];
    for (const hr of headerRules) {
      const val = responseHeaders && responseHeaders[hr.header];
      if (val && (!hr.regex || hr.regex.test(val))) {
        if (!detectedTechs.some(t => t.name === hr.name)) {
          const item = {
            name: hr.name,
            icon: hr.icon,
            category: "hosting",
            categoryName: hr.cat,
            color: "#38bdf8",
            description: `Detected via HTTP header (${hr.header})`
          };
          detectedTechs.push(item);
          if (!grouped[hr.cat]) grouped[hr.cat] = [];
          grouped[hr.cat].push(item);
        }
      }
    }

    return {
      success: true,
      grouped,
      technologies: detectedTechs,
      count: detectedTechs.length,
      url: window.location.href,
      hostname: window.location.hostname || "local-file"
    };
  }

  /* ══════════════════════════════════════════════════════════
     Full-Page Site Auto-Scroll Capture & Download
     ══════════════════════════════════════════════════════════ */
  async function captureVisibleViewport() {
    if (window.showToast) window.showToast("Scrolling down panel to capture full page...");

    try {
      const origScrollX = window.scrollX || window.pageXOffset || 0;
      const origScrollY = window.scrollY || window.pageYOffset || 0;

      // 1. Auto-scroll down website panel and window
      try {
        const promoteLazy = () => {
          document.querySelectorAll("img, [data-src], [data-lazy-src], [data-original], [data-lazy], [data-bg], [data-bg-url]").forEach(el => {
            if (el.tagName === "IMG" && el.loading === "lazy") el.loading = "eager";
            const lazySrc = el.getAttribute("data-src") || el.getAttribute("data-lazy-src") || el.getAttribute("data-original") || el.getAttribute("data-lazy");
            if (lazySrc && el.tagName === "IMG" && (!el.src || el.src.startsWith("data:image/svg") || el.src.startsWith("data:image/gif"))) {
              el.src = lazySrc;
            }
            const bgSrc = el.getAttribute("data-bg") || el.getAttribute("data-bg-url");
            if (bgSrc && !el.style.backgroundImage) {
              el.style.backgroundImage = `url("${bgSrc}")`;
            }
          });
        };
        promoteLazy();

        const candidates = Array.from(document.querySelectorAll("main, [role='main'], [class*='deck'], [class*='slide'], [class*='panel'], [class*='content'], article, section, div"));
        let scrollablePanel = null;
        let maxScrollHeight = 0;
        for (const el of candidates) {
          if (el.clientHeight > 150 && el.scrollHeight > el.clientHeight + 60) {
            const cs = window.getComputedStyle(el);
            const oy = cs.overflowY || cs.overflow;
            if (oy === "auto" || oy === "scroll" || oy === "overlay") {
              if (el.scrollHeight > maxScrollHeight) {
                maxScrollHeight = el.scrollHeight;
                scrollablePanel = el;
              }
            }
          }
        }

        if (scrollablePanel) {
          const pOrigY = scrollablePanel.scrollTop;
          const pTotal = scrollablePanel.scrollHeight;
          const step = Math.max(250, Math.floor(scrollablePanel.clientHeight * 0.65));
          for (let pos = 0; pos <= pTotal; pos += step) {
            scrollablePanel.scrollTop = pos;
            promoteLazy();
            await new Promise(r => setTimeout(r, 65));
          }
          scrollablePanel.scrollTop = pTotal;
          promoteLazy();
          await new Promise(r => setTimeout(r, 120));
          scrollablePanel.scrollTop = pOrigY;
          await new Promise(r => setTimeout(r, 50));
        }

        const scrollHeight = Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0,
          window.innerHeight
        );
        if (scrollHeight > window.innerHeight + 60) {
          const step = Math.max(280, Math.floor(window.innerHeight * 0.65));
          for (let pos = 0; pos <= scrollHeight; pos += step) {
            window.scrollTo(0, pos);
            promoteLazy();
            await new Promise(r => setTimeout(r, 65));
          }
          window.scrollTo(0, scrollHeight);
          promoteLazy();
          await new Promise(r => setTimeout(r, 120));
          window.scrollTo(origScrollX, origScrollY);
          await new Promise(r => setTimeout(r, 60));
        }
      } catch (e) {}

      // 2. Hide extension overlays before cloning
      const toast = document.getElementById("sp-toast");
      const selectBox = document.getElementById("sp-select-box");
      const hoverBox = document.getElementById("sp-hover-box");
      const hoverLbl = document.getElementById("sp-hover-label");
      if (toast) toast.classList.remove("sp-show");
      if (selectBox) selectBox.style.display = "none";
      if (hoverBox) hoverBox.style.display = "none";
      if (hoverLbl) hoverLbl.style.display = "none";

      // 3. Detach root before cloning
      const root = document.getElementById("sp-root");
      if (root && root.parentNode) root.remove();
      const docClone = document.documentElement.cloneNode(true);

      // Reattach root
      if (root) {
        (document.body || document.documentElement).appendChild(root);
        if (state.isEnabled && state.selectedEl && typeof window.updateSelectBox === "function") {
          window.updateSelectBox(state.selectedEl);
        }
      }

      // 4. Purge extension elements, scripts, ads
      docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
      docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
      docClone.querySelectorAll("#sp-root, [id^='sp-'], [class^='sp-'], [class*=' sp-'], .sp-popover, #sp-dock, #sp-sidebar-dock, #sp-drawer, #sp-panel, #sp-toast, #sp-select-box, #sp-hover-box, #sp-hover-label").forEach(e => e.remove());

      // 5. Clean residual attributes
      const allClonedNodes = Array.from(docClone.querySelectorAll("*"));
      for (const node of allClonedNodes) {
        if (!node.parentNode) continue;
        Array.from(node.attributes || []).forEach(attr => {
          if (attr.name.startsWith("data-sp-")) node.removeAttribute(attr.name);
        });
        if (node.classList) {
          node.classList.remove("sp-free-dragging", "sp-inline-editing", "sp-custom-element", "sp-layer-isolated", "sp-multi-selected");
          if (node.className === "") node.removeAttribute("class");
        }
      }

      // 6. Inline images
      const cloneBody = docClone.querySelector("body") || docClone;
      const origImages = Array.from(document.querySelectorAll("img"));
      const cloneImages = Array.from(cloneBody.querySelectorAll("img"));

      for (let i = 0; i < cloneImages.length; i++) {
        const cImg = cloneImages[i];
        const srcAttr = cImg.getAttribute("src") || "";
        const oImg = origImages.find(img => img.getAttribute("src") === srcAttr || img.src === cImg.src) || origImages[i];
        if (oImg) {
          try {
            if (oImg.naturalWidth && oImg.complete) {
              const canvas = document.createElement("canvas");
              canvas.width = oImg.naturalWidth;
              canvas.height = oImg.naturalHeight;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(oImg, 0, 0);
              cImg.src = canvas.toDataURL("image/png");
            } else if (srcAttr) {
              cImg.src = new URL(srcAttr, window.location.href).href;
            }
          } catch (err) {
            try { if (srcAttr) cImg.src = new URL(srcAttr, window.location.href).href; } catch(e){}
          }
        }
      }

      // 7. Inline stylesheets
      let fullCSS = `\n/* ── StylePeek Studio: Full-Page Clean Site Export ── */\n* { box-sizing: border-box; }\nhtml { margin: 0; padding: 0; min-height: 100vh; width: 100%; }\nbody { margin: 0; padding: 0; min-height: 100vh; width: 100%; }\n`;

      const styleLinks = Array.from(document.querySelectorAll("link[rel='stylesheet']"));
      for (const link of styleLinks) {
        const href = link.getAttribute("href");
        if (!href) continue;
        let inlined = false;
        try {
          if (link.sheet && link.sheet.cssRules) {
            const rulesText = Array.from(link.sheet.cssRules).map(r => r.cssText).join("\n");
            if (rulesText) {
              fullCSS += `\n/* Inlined from sheet ${href} */\n` + rulesText + "\n";
              inlined = true;
            }
          }
        } catch (e) {}

        if (!inlined) {
          try {
            const absUrl = new URL(href, window.location.href).href;
            const res = await fetch(absUrl);
            if (res.ok) {
              const text = await res.text();
              fullCSS += `\n/* Inlined from fetch ${href} */\n` + text + "\n";
            }
          } catch (e) {}
        }
      }

      const styleTags = Array.from(document.querySelectorAll("style"));
      for (const st of styleTags) {
        if (st.closest && st.closest("#sp-root")) continue;
        fullCSS += "\n" + (st.textContent || "") + "\n";
      }

      let cloneHead = docClone.querySelector("head");
      if (!cloneHead) {
        cloneHead = document.createElement("head");
        docClone.insertBefore(cloneHead, cloneBody);
      }
      cloneHead.querySelectorAll("link[rel='stylesheet'], style").forEach(el => el.remove());

      if (window.location.protocol.startsWith("http") && window.location.origin && window.location.origin !== "null") {
        let baseEl = cloneHead.querySelector("base");
        if (!baseEl) {
          baseEl = document.createElement("base");
          cloneHead.insertBefore(baseEl, cloneHead.firstChild);
        }
        baseEl.href = window.location.origin + "/";
      }

      const styleEl = document.createElement("style");
      styleEl.textContent = fullCSS;
      cloneHead.appendChild(styleEl);

      const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;
      const rawTitle = (document.title || window.location.hostname || "website").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35) || "page";
      const filename = `${rawTitle}.html`;

      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      const dataUrl = await new Promise((resolve) => {
        try {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(blobUrl);
          reader.readAsDataURL(blob);
        } catch (e) {
          resolve(blobUrl);
        }
      });

      let downloaded = false;
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          downloaded = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "downloadFile",
              url: dataUrl,
              filename: filename
            }, response => {
              if (chrome.runtime.lastError || !response || (!response.ok && !response.success)) {
                resolve(false);
              } else {
                resolve(true);
              }
            });
            setTimeout(() => resolve(false), 1200);
          });
        }
      } catch (err) {}

      if (!downloaded) {
        try {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 1000);
          downloaded = true;
        } catch (err) {}
      }

      if (downloaded) {
        if (window.showToast) window.showToast(`Saved ${filename}`);
        return filename;
      } else {
        if (window.showToast) window.showToast("Could not trigger download. Check download permissions.");
        return null;
      }
    } catch (err) {
      console.error("[StylePeek] captureVisibleViewport error:", err);
      if (window.showToast) window.showToast("Capture error: " + (err.message || "Failed to save"));
      return null;
    }
  }

  /* ── Chrome Extension Messaging ── */
  function initChromeMessaging() {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _, res) => {
        if (!msg || typeof msg !== "object") return false;
        if (msg.action === "turnOn") {
          if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek(msg.mode || "inspect");
          res({ active: state.isEnabled, mode: state.activeToolMode });
        } else if (msg.action === "turnOff" || msg.action === "disableAllModes") {
          if (typeof window.turnOffStylePeek === "function") window.turnOffStylePeek();
          res({ active: state.isEnabled });
        } else if (msg.action === "toggleInspect") {
          if (state.isEnabled && state.activeToolMode === "inspect") {
            if (typeof window.turnOffStylePeek === "function") window.turnOffStylePeek();
          } else {
            if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek("inspect");
          }
          res({ active: state.isEnabled, mode: state.activeToolMode });
        } else if (msg.action === "toggleDrag") {
          if (state.isEnabled && state.activeToolMode === "move") {
            if (typeof window.turnOffStylePeek === "function") window.turnOffStylePeek();
          } else {
            if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek("move");
          }
          res({ active: state.isEnabled, mode: state.activeToolMode });
        } else if (msg.action === "startTool") {
          if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek(msg.mode);
          res({ active: state.isEnabled, mode: state.activeToolMode });
        } else if (msg.action === "getStatus") {
          res({ active: state.isEnabled, mode: state.activeToolMode, hasSelection: !!state.selectedEl });
        } else if (msg.action === "captureViewport") {
          captureVisibleViewport().then(filename => {
            res({ success: true, filename });
          }).catch(err => {
            res({ success: false, error: err?.message || String(err) });
          });
          return true;
        } else if (msg.action === "detectTechStack" || msg.type === "DETECT_TECH") {
          const result = detectTechnologiesOnPage(msg.headers || {});
          res(result);
        } else if (msg.action === "extractWebsitePalette") {
          const palette = SP.palette?.extractWebsitePalette ? SP.palette.extractWebsitePalette() : (window.extractWebsitePalette ? window.extractWebsitePalette() : null);
          res({ success: true, palette });
          return true;
        } else if (msg.action === "pickEyedropper") {
          const picker = SP.palette?.pickEyedropper || window.pickEyedropper;
          if (picker) {
            picker().then(result => res(result));
            return true;
          } else {
            res({ success: false, error: "Eyedropper unavailable" });
          }
        } else if (msg.action === "openPaletteModal") {
          if (typeof window.openPaletteModal === "function") window.openPaletteModal();
          res({ success: true });
          return true;
        }
        return true;
      });
    }
  }

  function initTechCapture() {
    initChromeMessaging();
  }

  /* ── Export ── */
  SP.techCapture = {
    initTechCapture,
    detectPageJsGlobals,
    detectTechnologiesOnPage,
    captureVisibleViewport
  };

  window.detectPageJsGlobals = detectPageJsGlobals;
  window.detectTechnologiesOnPage = detectTechnologiesOnPage;
  window.captureVisibleViewport = captureVisibleViewport;
  window.initTechCapture = initTechCapture;
})();
