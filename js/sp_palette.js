/**
 * StylePeek Studio — Website Color Palette Picker Engine
 * js/sp_palette.js
 * Scans, extracts, normalizes, clusters, and manages website color palettes.
 * Strictly complies with tokens.css and design.md (CTRL+SPC UI Kit, zero emojis, Lucide SVGs).
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  SP.state = SP.state || {};
  const state = SP.state;

  /* ── Color Math & Normalization Helpers ── */
  function parseRgbString(str) {
    if (!str || typeof str !== "string") return null;
    const clean = str.trim().toLowerCase();
    if (clean === "transparent" || clean === "inherit" || clean === "initial" || clean === "unset" || clean === "currentcolor") {
      return null;
    }

    // Match rgb(r, g, b) or rgba(r, g, b, a)
    const mRgb = clean.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (mRgb) {
      const r = Math.min(255, Math.max(0, parseFloat(mRgb[1])));
      const g = Math.min(255, Math.max(0, parseFloat(mRgb[2])));
      const b = Math.min(255, Math.max(0, parseFloat(mRgb[3])));
      const a = mRgb[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(mRgb[4]))) : 1;
      if (a === 0) return null;
      return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
    }

    // Match #hex (#rgb, #rgba, #rrggbb, #rrggbbaa)
    if (clean.startsWith("#")) {
      const h = clean.slice(1);
      if (h.length === 3 || h.length === 4) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
        if (a === 0) return null;
        return { r, g, b, a };
      }
      if (h.length === 6 || h.length === 8) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        if (a === 0) return null;
        return { r, g, b, a };
      }
    }

    // Match hsl(h, s%, l%) or hsla(h, s%, l%, a)
    const mHsl = clean.match(/^hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (mHsl) {
      const h = parseFloat(mHsl[1]) / 360;
      const s = parseFloat(mHsl[2]) / 100;
      const l = parseFloat(mHsl[3]) / 100;
      const a = mHsl[4] !== undefined ? parseFloat(mHsl[4]) : 1;
      if (a === 0) return null;

      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
    }

    return null;
  }

  function rgbToHexStr(r, g, b) {
    const toH = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
    return `#${toH(r)}${toH(g)}${toH(b)}`;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(lum1, lum2) {
    const l1 = Math.max(lum1, lum2);
    const l2 = Math.min(lum1, lum2);
    return ((l1 + 0.05) / (l2 + 0.05)).toFixed(1);
  }

  function colorDistance(c1, c2) {
    // Euclidean distance in RGB
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /* ── Website Color Extraction Engine ── */
  function extractWebsitePalette() {
    const colorMap = new Map(); // hex -> { hex, r, g, b, a, count, roles: Set, sources: Set, cssVarNames: Set }
    const cssVarsFound = [];

    // 1. Scan Stylesheets for CSS Custom Properties (--*) on :root, html, body
    try {
      const sheets = Array.from(document.styleSheets || []);
      for (const sheet of sheets) {
        let rules = null;
        try {
          rules = sheet.cssRules || sheet.rules;
        } catch (e) {
          // Cross-origin stylesheet access restricted
          continue;
        }
        if (!rules) continue;

        for (const rule of Array.from(rules)) {
          if ((typeof CSSStyleRule !== "undefined" && rule instanceof CSSStyleRule) || rule.selectorText) {
            const sel = (rule.selectorText || "").toLowerCase();
            if (sel.includes(":root") || sel.includes("html") || sel.includes("body") || sel.includes("[data-theme") || sel.includes(".dark") || sel.includes(".theme-")) {
              const style = rule.style;
              if (style) {
                for (let i = 0; i < style.length; i++) {
                  const prop = style[i];
                  if (prop && prop.startsWith("--")) {
                    const val = style.getPropertyValue(prop).trim();
                    const parsed = parseRgbString(val);
                    if (parsed) {
                      const hex = rgbToHexStr(parsed.r, parsed.g, parsed.b);
                      cssVarsFound.push({ prop, hex, val });
                      recordColor(hex, parsed, "variable", prop);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Continue gracefully
    }

    // 2. Helper to record colors into accumulator map
    function recordColor(hex, parsed, role, source) {
      if (!hex || hex === "#00000000") return;
      if (!colorMap.has(hex)) {
        const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
        const lum = getLuminance(parsed.r, parsed.g, parsed.b);
        const contrastOnWhite = getContrastRatio(lum, 1.0);
        const contrastOnBlack = getContrastRatio(lum, 0.0);
        colorMap.set(hex, {
          hex,
          r: parsed.r,
          g: parsed.g,
          b: parsed.b,
          a: parsed.a !== undefined ? parsed.a : 1,
          hsl,
          luminance: lum,
          contrastOnWhite,
          contrastOnBlack,
          textColor: lum > 0.45 ? "#1C1C1E" : "#FAF9F6",
          count: 0,
          roles: new Set(),
          sources: new Set(),
          cssVarNames: new Set()
        });
      }
      const entry = colorMap.get(hex);
      entry.count += 1;
      if (role) entry.roles.add(role);
      if (source) {
        if (role === "variable") entry.cssVarNames.add(source);
        else entry.sources.add(source);
      }
    }

    // 3. Scan DOM Elements (Sampling up to 1,200 visible elements to stay ultra-fast)
    const allEls = document.querySelectorAll("body, body *");
    const sampleLimit = Math.min(allEls.length, 1200);
    const step = Math.max(1, Math.floor(allEls.length / sampleLimit));

    for (let i = 0; i < allEls.length; i += step) {
      const el = allEls[i];
      if (window.isOwn && window.isOwn(el)) continue;

      let cs = null;
      try {
        cs = window.getComputedStyle(el);
      } catch (e) {
        continue;
      }
      if (!cs || cs.display === "none" || cs.visibility === "hidden") continue;

      const tag = el.tagName.toLowerCase();
      const isContainer = ["div", "section", "main", "header", "footer", "nav", "article", "aside", "body"].includes(tag);
      const isText = ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "a", "strong", "b", "em", "label", "button", "li", "td", "th"].includes(tag);

      // Background Color
      const bg = cs.backgroundColor;
      const parsedBg = parseRgbString(bg);
      if (parsedBg && parsedBg.a > 0.05) {
        const hex = rgbToHexStr(parsedBg.r, parsedBg.g, parsedBg.b);
        recordColor(hex, parsedBg, isContainer ? "surface" : "accent", tag);
      }

      // Text Color
      if (isText || (el.childNodes.length > 0 && Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0))) {
        const col = cs.color;
        const parsedCol = parseRgbString(col);
        if (parsedCol && parsedCol.a > 0.1) {
          const hex = rgbToHexStr(parsedCol.r, parsedCol.g, parsedCol.b);
          recordColor(hex, parsedCol, "text", tag);
        }
      }

      // Border Color
      const bw = parseFloat(cs.borderTopWidth || "0");
      const bs = cs.borderTopStyle;
      if (bw > 0 && bs && bs !== "none") {
        const bCol = cs.borderTopColor;
        const parsedBdr = parseRgbString(bCol);
        if (parsedBdr && parsedBdr.a > 0.1) {
          const hex = rgbToHexStr(parsedBdr.r, parsedBdr.g, parsedBdr.b);
          recordColor(hex, parsedBdr, "border", tag);
        }
      }

      // SVG Fill & Stroke
      if ((typeof SVGElement !== "undefined" && el instanceof SVGElement) || (tag === "svg" || tag === "path" || tag === "circle" || tag === "rect")) {
        const fill = cs.fill;
        const parsedFill = parseRgbString(fill);
        if (parsedFill && parsedFill.a > 0.05) {
          const hex = rgbToHexStr(parsedFill.r, parsedFill.g, parsedFill.b);
          recordColor(hex, parsedFill, "accent", "svg-fill");
        }
        const stroke = cs.stroke;
        const parsedStroke = parseRgbString(stroke);
        if (parsedStroke && parsedStroke.a > 0.05) {
          const hex = rgbToHexStr(parsedStroke.r, parsedStroke.g, parsedStroke.b);
          recordColor(hex, parsedStroke, "border", "svg-stroke");
        }
      }
    }

    // Convert map to array and sort by count descending
    const rawList = Array.from(colorMap.values()).map(c => ({
      hex: c.hex,
      r: c.r,
      g: c.g,
      b: c.b,
      a: c.a,
      hsl: c.hsl,
      luminance: c.luminance,
      contrastOnWhite: c.contrastOnWhite,
      contrastOnBlack: c.contrastOnBlack,
      textColor: c.textColor,
      count: c.count,
      roles: Array.from(c.roles),
      sources: Array.from(c.sources).slice(0, 5),
      cssVarNames: Array.from(c.cssVarNames)
    }));

    rawList.sort((a, b) => b.count - a.count);

    // Grouping by Role
    const surfaces = rawList.filter(c => c.roles.includes("surface") || c.hsl.s < 12 || c.hsl.l > 92 || c.hsl.l < 10);
    const textColors = rawList.filter(c => c.roles.includes("text"));
    const accents = rawList.filter(c => c.roles.includes("accent") || (c.hsl.s > 25 && c.hsl.l >= 15 && c.hsl.l <= 85));
    const dominant = rawList.slice(0, 10);
    const cssVars = rawList.filter(c => c.roles.includes("variable") || c.cssVarNames.length > 0);

    const result = {
      url: window.location?.href || document?.location?.href || "",
      host: window.location?.hostname || document?.location?.hostname || "page",
      title: document.title || "Website",
      timestamp: Date.now(),
      totalColors: rawList.length,
      all: rawList,
      dominant,
      surfaces,
      text: textColors,
      accents,
      cssVars,
      sampled: SP.state.sampledColors || []
    };

    SP.state.websitePalette = result;
    return result;
  }

  /* ── Interactive Eyedropper API ── */
  async function pickEyedropper() {
    if (window.spPlayKeyClick) window.spPlayKeyClick(240);

    // Native Chrome / Edge EyeDropper API
    if (typeof window.EyeDropper !== "undefined") {
      try {
        const eyeDropper = new window.EyeDropper();
        const res = await eyeDropper.open();
        if (res && res.sRGBHex) {
          const hex = res.sRGBHex.toUpperCase();
          handlePickedColor(hex);
          return { success: true, hex };
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, aborted: true };
        }
      }
    }

    // Fallback: Point-and-click on-page color picker
    return new Promise(resolve => {
      if (window.showToast) window.showToast("Click any element on the page to pick its color (Esc to cancel)");
      document.body.style.cursor = "crosshair";

      const onPickClick = e => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        const target = e.target;
        if (!target || (window.isOwn && window.isOwn(target))) return resolve({ success: false });
        const cs = window.getComputedStyle(target);
        const bg = cs.backgroundColor;
        const col = cs.color;
        const parsed = parseRgbString(bg) || parseRgbString(col);
        if (parsed) {
          const hex = rgbToHexStr(parsed.r, parsed.g, parsed.b);
          handlePickedColor(hex);
          resolve({ success: true, hex });
        } else {
          resolve({ success: false });
        }
      };

      const onPickKey = e => {
        if (e.key === "Escape") {
          cleanup();
          resolve({ success: false, aborted: true });
        }
      };

      function cleanup() {
        document.body.style.cursor = "";
        window.removeEventListener("click", onPickClick, true);
        window.removeEventListener("keydown", onPickKey, true);
      }

      window.addEventListener("click", onPickClick, { capture: true, once: true });
      window.addEventListener("keydown", onPickKey, { capture: true, once: true });
    });
  }

  function handlePickedColor(hex) {
    if (!hex) return;
    if (window.spPlayKeyClick) window.spPlayKeyClick(320);

    SP.state.sampledColors = SP.state.sampledColors || [];
    if (!SP.state.sampledColors.includes(hex)) {
      SP.state.sampledColors.unshift(hex);
    }

    // If an element is currently selected, apply to fill or text depending on context
    if (state.selectedEl && window.applyBgToElement) {
      window.applyBgToElement(state.selectedEl, hex);
      const bgHexInput = document.getElementById("sp-bg-hex");
      const bgColInput = document.getElementById("sp-bg-color");
      if (bgHexInput) bgHexInput.value = hex;
      if (bgColInput) bgColInput.value = hex;
    }

    // Copy to clipboard
    try {
      navigator.clipboard.writeText(hex);
      if (window.showToast) window.showToast(`Sampled ${hex} (Copied to clipboard!)`);
    } catch (e) {
      if (window.showToast) window.showToast(`Sampled ${hex}`);
    }

    // Refresh modal if open
    const modal = document.getElementById("sp-palette-modal");
    if (modal && modal.style.display !== "none") {
      renderPaletteModalContent();
    }
  }

  /* ── Format Export Helpers ── */
  function formatPaletteAsCssVars(palette) {
    const list = (palette && palette.all) || [];
    const vars = list.slice(0, 16).map((c, i) => {
      const name = c.cssVarNames && c.cssVarNames.length > 0 ? c.cssVarNames[0] : `--site-color-${i + 1}`;
      return `  ${name}: ${c.hex};`;
    });
    return `:root {\n  /* Extracted from ${palette?.host || "website"} via StylePeek Studio */\n${vars.join("\n")}\n}`;
  }

  function formatPaletteAsTailwind(palette) {
    const list = (palette && palette.all) || [];
    const colorsObj = {};
    list.slice(0, 16).forEach((c, i) => {
      const cleanName = (c.roles[0] || "color") + (i > 0 ? `-${i + 1}` : "");
      colorsObj[cleanName] = c.hex;
    });
    return `// Tailwind config colors snippet\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(colorsObj, null, 8).replace(/\n\s*}/, "\n      }")}\n    }\n  }\n};`;
  }

  function formatPaletteAsJson(palette) {
    const list = (palette && palette.all) || [];
    return JSON.stringify({
      website: palette?.host || window.location.hostname,
      title: palette?.title || document.title,
      extractedAt: new Date().toISOString(),
      colors: list.map(c => ({
        hex: c.hex,
        rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
        hsl: `hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)`,
        luminance: c.luminance.toFixed(3),
        roles: c.roles,
        count: c.count
      }))
    }, null, 2);
  }

  /* ── Dedicated On-Page Color Palette Picker Modal ── */
  let paletteModal = null;
  let activeFilterTab = "all"; // "all", "dominant", "surfaces", "text", "accents", "vars"
  let selectedSwatchHex = null;

  function ensurePaletteModalAttached() {
    if (paletteModal && document.contains(paletteModal)) return paletteModal;

    let existing = document.getElementById("sp-palette-modal");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "sp-palette-modal";
      existing.className = "sp-palette-modal-overlay";
      existing.style.display = "none";
      existing.innerHTML = `
        <div class="sp-palette-modal-card" id="sp-palette-card">
          <!-- Tactile Drag Header -->
          <div class="sp-palette-header" id="sp-palette-header">
            <div class="sp-palette-header-left">
              <div id="sp-palette-grip" title="Drag to reposition">${SP.utils?.icons?.grip || "⠿"}</div>
              <div class="sp-palette-title-group">
                <span class="sp-palette-badge">PALETTE</span>
                <span class="sp-palette-title" id="sp-palette-host">Website Colors</span>
              </div>
            </div>
            <div class="sp-palette-header-actions">
              <button type="button" class="sp-pbt-btn" id="sp-palette-btn-eyedropper" title="Pick color anywhere on screen (Eyedropper)">
                <svg class="sp-ico" viewBox="0 0 24 24"><path d="m14 2 4 4L7 17H3v-4L14 2z"/><path d="m13 3 4 4"/><circle cx="18" cy="19" r="3"/><path d="m9 15 2 2"/></svg>
                <span>Pick from Page</span>
              </button>
              <button type="button" class="sp-pbt-btn" id="sp-palette-btn-rescan" title="Rescan page styles">
                <svg class="sp-ico" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Rescan</span>
              </button>
              <button type="button" class="sp-palette-close-btn" id="sp-palette-close" title="Close (Esc)">✕</button>
            </div>
          </div>

          <!-- Tactile Category Segmented Control -->
          <div class="sp-palette-tabs">
            <button type="button" class="sp-palette-tab sp-active" data-filter="all">All Colors</button>
            <button type="button" class="sp-palette-tab" data-filter="dominant">Dominant</button>
            <button type="button" class="sp-palette-tab" data-filter="surfaces">Surfaces</button>
            <button type="button" class="sp-palette-tab" data-filter="text">Typography</button>
            <button type="button" class="sp-palette-tab" data-filter="accents">Accents</button>
            <button type="button" class="sp-palette-tab" data-filter="vars">CSS Tokens</button>
          </div>

          <!-- Active Color Inspection Banner -->
          <div class="sp-palette-inspector" id="sp-palette-inspector">
            <div class="sp-inspect-color-preview" id="sp-inspect-preview" style="background:#1C1C1E;"></div>
            <div class="sp-inspect-details">
              <div class="sp-inspect-hex-row">
                <span class="sp-inspect-hex" id="sp-inspect-hex">#1C1C1E</span>
                <span class="sp-inspect-meta" id="sp-inspect-meta">rgb(28, 28, 30) · hsl(240, 3%, 11%)</span>
              </div>
              <div class="sp-inspect-contrast" id="sp-inspect-contrast">
                <span class="sp-contrast-pill" id="sp-contrast-white">16.2:1 vs #FFF</span>
                <span class="sp-contrast-pill" id="sp-contrast-black">1.3:1 vs #000</span>
              </div>
            </div>
            <div class="sp-inspect-actions">
              <button type="button" class="sp-inspect-btn" id="sp-inspect-copy-hex" title="Copy Hex">Copy HEX</button>
              <button type="button" class="sp-inspect-btn" id="sp-inspect-apply-fill" title="Apply as Fill to Selected Element">Apply Fill &rarr;</button>
              <button type="button" class="sp-inspect-btn" id="sp-inspect-apply-text" title="Apply as Text Color to Selected Element">Apply Text &rarr;</button>
            </div>
          </div>

          <!-- Main Scrollable Grid of Swatches -->
          <div class="sp-palette-body" id="sp-palette-grid">
            <!-- Dynamic Swatches Injected Here -->
          </div>

          <!-- Bottom Tactical Export Action Bar -->
          <div class="sp-palette-footer">
            <div class="sp-palette-stats" id="sp-palette-stats">0 colors detected</div>
            <div class="sp-palette-export-links">
              <button type="button" class="sp-palette-link" id="sp-btn-copy-cssvars">Copy CSS Vars &rarr;</button>
              <button type="button" class="sp-palette-link" id="sp-btn-copy-tailwind">Copy Tailwind &rarr;</button>
              <button type="button" class="sp-palette-link" id="sp-btn-download-json">Download JSON &rarr;</button>
            </div>
          </div>
        </div>
      `;

      const mountTarget = document.body || document.documentElement;
      mountTarget.appendChild(existing);
    }

    paletteModal = existing;
    initPaletteModalEvents();
    return paletteModal;
  }

  function initPaletteModalEvents() {
    if (!paletteModal) return;

    // Draggable modal card header
    const card = paletteModal.querySelector("#sp-palette-card");
    const hdr = paletteModal.querySelector("#sp-palette-header");
    let isDragging = false, ox = 0, oy = 0;

    hdr?.addEventListener("mousedown", e => {
      if (e.target.closest("button") || e.target.closest("input")) return;
      isDragging = true;
      const r = card.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      card.style.position = "fixed";
      card.style.margin = "0";
      card.style.left = r.left + "px";
      card.style.top = r.top + "px";
      card.style.transform = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", e => {
      if (!isDragging || !card) return;
      const left = Math.max(10, Math.min(window.innerWidth - card.offsetWidth - 10, e.clientX - ox));
      const top = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - oy));
      card.style.left = left + "px";
      card.style.top = top + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Close Button
    paletteModal.querySelector("#sp-palette-close")?.addEventListener("click", () => {
      closePaletteModal();
    });

    // Eyedropper Button
    paletteModal.querySelector("#sp-palette-btn-eyedropper")?.addEventListener("click", async () => {
      await pickEyedropper();
    });

    // Rescan Button
    paletteModal.querySelector("#sp-palette-btn-rescan")?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      extractWebsitePalette();
      renderPaletteModalContent();
      if (window.showToast) window.showToast("Palette refreshed from page");
    });

    // Category Tabs Filter
    paletteModal.querySelectorAll(".sp-palette-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        if (window.spPlayKeyClick) window.spPlayKeyClick(170);
        paletteModal.querySelectorAll(".sp-palette-tab").forEach(t => t.classList.remove("sp-active"));
        tab.classList.add("sp-active");
        activeFilterTab = tab.dataset.filter || "all";
        renderPaletteModalContent();
      });
    });

    // Inspector Action Buttons
    paletteModal.querySelector("#sp-inspect-copy-hex")?.addEventListener("click", () => {
      if (!selectedSwatchHex) return;
      navigator.clipboard.writeText(selectedSwatchHex);
      if (window.spPlayKeyClick) window.spPlayKeyClick(240);
      if (window.showToast) window.showToast(`Copied ${selectedSwatchHex}`);
    });

    paletteModal.querySelector("#sp-inspect-apply-fill")?.addEventListener("click", () => {
      if (!selectedSwatchHex) return;
      if (!state.selectedEl) {
        if (window.showToast) window.showToast("Select an element first to apply fill");
        return;
      }
      if (window.applyBgToElement) window.applyBgToElement(state.selectedEl, selectedSwatchHex);
      if (window.spPlayKeyClick) window.spPlayKeyClick(220);
      if (window.showToast) window.showToast(`Applied ${selectedSwatchHex} as fill`);
    });

    paletteModal.querySelector("#sp-inspect-apply-text")?.addEventListener("click", () => {
      if (!selectedSwatchHex) return;
      if (!state.selectedEl) {
        if (window.showToast) window.showToast("Select an element first to apply text color");
        return;
      }
      if (window.applyTextToElement) window.applyTextToElement(state.selectedEl, selectedSwatchHex);
      if (window.spPlayKeyClick) window.spPlayKeyClick(220);
      if (window.showToast) window.showToast(`Applied ${selectedSwatchHex} as text color`);
    });

    // Export Buttons
    paletteModal.querySelector("#sp-btn-copy-cssvars")?.addEventListener("click", () => {
      const p = SP.state.websitePalette || extractWebsitePalette();
      const code = formatPaletteAsCssVars(p);
      navigator.clipboard.writeText(code);
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      if (window.showToast) window.showToast("CSS Variables copied to clipboard!");
    });

    paletteModal.querySelector("#sp-btn-copy-tailwind")?.addEventListener("click", () => {
      const p = SP.state.websitePalette || extractWebsitePalette();
      const code = formatPaletteAsTailwind(p);
      navigator.clipboard.writeText(code);
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      if (window.showToast) window.showToast("Tailwind colors copied to clipboard!");
    });

    paletteModal.querySelector("#sp-btn-download-json")?.addEventListener("click", () => {
      const p = SP.state.websitePalette || extractWebsitePalette();
      const json = formatPaletteAsJson(p);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.host || "site"}-palette.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      if (window.showToast) window.showToast("Palette JSON downloaded");
    });
  }

  function renderPaletteModalContent() {
    ensurePaletteModalAttached();
    if (!paletteModal) return;

    let palette = SP.state.websitePalette;
    if (!palette || !palette.all || palette.all.length === 0) {
      palette = extractWebsitePalette();
    }

    const hostEl = paletteModal.querySelector("#sp-palette-host");
    if (hostEl) hostEl.textContent = palette.host || window.location.hostname;

    const statsEl = paletteModal.querySelector("#sp-palette-stats");
    if (statsEl) statsEl.textContent = `${palette.totalColors || 0} unique colors detected across page`;

    // Filter colors by active tab
    let list = palette.all || [];
    if (activeFilterTab === "dominant") list = palette.dominant || [];
    else if (activeFilterTab === "surfaces") list = palette.surfaces || [];
    else if (activeFilterTab === "text") list = palette.text || [];
    else if (activeFilterTab === "accents") list = palette.accents || [];
    else if (activeFilterTab === "vars") list = palette.cssVars || [];

    // Prepend any user-sampled colors
    const sampledList = (SP.state.sampledColors || []).map(hex => {
      const parsed = parseRgbString(hex);
      return {
        hex,
        r: parsed ? parsed.r : 0,
        g: parsed ? parsed.g : 0,
        b: parsed ? parsed.b : 0,
        luminance: parsed ? getLuminance(parsed.r, parsed.g, parsed.b) : 0,
        contrastOnWhite: "Sampled",
        roles: ["sampled"],
        count: "EyeDropper",
        cssVarNames: []
      };
    });

    const displayList = activeFilterTab === "all" ? [...sampledList, ...list] : list;

    const grid = paletteModal.querySelector("#sp-palette-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (displayList.length === 0) {
      grid.innerHTML = `<div class="sp-palette-empty">No colors found in this category. Click 'Pick from Page' or choose 'All Colors'.</div>`;
      return;
    }

    // Default selection to first item if none active
    if (!selectedSwatchHex || !displayList.some(c => c.hex === selectedSwatchHex)) {
      selectedSwatchHex = displayList[0].hex;
    }
    updateInspectorDetails(displayList.find(c => c.hex === selectedSwatchHex) || displayList[0]);

    displayList.forEach(item => {
      const card = document.createElement("div");
      card.className = "sp-palette-card-item" + (item.hex === selectedSwatchHex ? " sp-selected" : "");
      card.dataset.hex = item.hex;

      const isSampled = item.roles && item.roles.includes("sampled");
      const roleBadge = isSampled ? "Sampled" : (item.cssVarNames && item.cssVarNames[0]) || (item.roles && item.roles[0]) || "";
      const countLabel = isSampled ? "Eyedropper" : (item.count ? `${item.count}×` : "");

      card.innerHTML = `
        <div class="sp-swatch-box" style="background:${item.hex};">
          ${isSampled ? `<span class="sp-swatch-badge">DROPPER</span>` : ""}
        </div>
        <div class="sp-swatch-info">
          <span class="sp-swatch-hex">${item.hex}</span>
          <span class="sp-swatch-meta">${countLabel || roleBadge}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        selectedSwatchHex = item.hex;
        paletteModal.querySelectorAll(".sp-palette-card-item").forEach(c => c.classList.remove("sp-selected"));
        card.classList.add("sp-selected");
        updateInspectorDetails(item);
        if (window.spPlayKeyClick) window.spPlayKeyClick(190);

        // Instant clipboard copy on single click
        navigator.clipboard.writeText(item.hex);
        if (window.showToast) window.showToast(`Copied ${item.hex}`);
      });

      grid.appendChild(card);
    });
  }

  function updateInspectorDetails(item) {
    if (!paletteModal || !item) return;
    const prev = paletteModal.querySelector("#sp-inspect-preview");
    const hexEl = paletteModal.querySelector("#sp-inspect-hex");
    const metaEl = paletteModal.querySelector("#sp-inspect-meta");
    const wEl = paletteModal.querySelector("#sp-contrast-white");
    const bEl = paletteModal.querySelector("#sp-contrast-black");

    if (prev) prev.style.backgroundColor = item.hex;
    if (hexEl) hexEl.textContent = item.hex;

    const rgbStr = `rgb(${item.r || 0}, ${item.g || 0}, ${item.b || 0})`;
    const hslStr = item.hsl ? `hsl(${item.hsl.h}, ${item.hsl.s}%, ${item.hsl.l}%)` : "";
    if (metaEl) metaEl.textContent = `${rgbStr} · ${hslStr}`;

    if (wEl) wEl.textContent = `${item.contrastOnWhite || "—"}:1 vs #FFF`;
    if (bEl) bEl.textContent = `${item.contrastOnBlack || "—"}:1 vs #000`;
  }

  function openPaletteModal() {
    ensurePaletteModalAttached();
    if (!paletteModal) return;
    if (typeof window.closeAllPopups === "function") window.closeAllPopups("paletteModal");
    paletteModal.style.display = "flex";
    renderPaletteModalContent();
    if (window.spPlayKeyClick) window.spPlayKeyClick(210);
  }

  function closePaletteModal() {
    if (paletteModal) {
      paletteModal.style.display = "none";
      if (window.spPlayKeyClick) window.spPlayKeyClick(150);
    }
  }

  function togglePaletteModal() {
    ensurePaletteModalAttached();
    if (paletteModal && paletteModal.style.display !== "none") {
      closePaletteModal();
    } else {
      openPaletteModal();
    }
  }

  /* ── Export Submodule ── */
  SP.palette = {
    extractWebsitePalette,
    pickEyedropper,
    formatPaletteAsCssVars,
    formatPaletteAsTailwind,
    formatPaletteAsJson,
    ensurePaletteModalAttached,
    openPaletteModal,
    closePaletteModal,
    togglePaletteModal,
    renderPaletteModalContent
  };

  window.extractWebsitePalette = extractWebsitePalette;
  window.pickEyedropper = pickEyedropper;
  window.openPaletteModal = openPaletteModal;
  window.closePaletteModal = closePaletteModal;
  window.togglePaletteModal = togglePaletteModal;
})();
