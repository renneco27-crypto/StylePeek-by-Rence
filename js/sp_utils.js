/**
 * StylePeek Studio — Shared Utilities & CSS Mining Engine
 * js/sp_utils.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;

  /* ── Shared State ── */
  SP.state = SP.state || {
    isEnabled: false,
    activeToolMode: "inspect", // "inspect", "move", "resize", "style", "layers", "code", "delete", "off"
    selectedEl: null,
    multiSelectedEls: new Set(),
    hoveredEl: null,
    undoStack: [],
    isTargetLocked: false,
    unlockPending: false,

    // Deep Layer & Stationary-Front State
    isDeepLayerMode: false,
    keepFrontStationary: true,
    deepLayerStack: [],
    deepLayerIndex: 0,
    passthroughFrontNodes: [],
    dragStationaryChildren: [],

    // Preview / Panel State
    siblingsMode: false,
    activeTab: "html",
    panes: {},
    animatedAncestor: null,
    panelPos: { top: "20px", right: "20px", left: null }
  };

  /* ── Tactile Mechanical Key Click Audio (CTRL+SPC UI Kit) ── */
  let spAudioCtx = null;
  function spPlayKeyClick(freq = 170) {
    try {
      if (!spAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) spAudioCtx = new AudioContext();
      }
      if (!spAudioCtx) return;
      if (spAudioCtx.state === "suspended") spAudioCtx.resume();
      const osc = spAudioCtx.createOscillator();
      const gain = spAudioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, spAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, spAudioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.12, spAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, spAudioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(spAudioCtx.destination);
      osc.start();
      osc.stop(spAudioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  /* ── Clean Vector Lucide SVG Icons (Zero Emojis — Law 1) ── */
  const SP_ICONS = {
    grip: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>`,
    inspect: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>`,
    move: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    resize: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    palette: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    code: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    undo: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    camera: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
    power: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    box: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
    type: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    stepDown: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    stepUp: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
    dropper: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 2 4 4L7 17H3v-4L14 2z"/><path d="m13 3 4 4"/><circle cx="18" cy="19" r="3"/><path d="m9 15 2 2"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/><path d="M3 16.2V21m0 0h4.8M3 21l6-6"/><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/><path d="M3 7.8V3m0 0h4.8M3 3l6 6"/></svg>`,
    mobile: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    desktop: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
  };

  /* ── Toast Notifications ── */
  let toastTimer = null;
  function showToast(msg, duration = 2400) {
    const toast = document.getElementById("sp-toast");
    if (!toast) return;
    const toastText = document.getElementById("sp-toast-text") || toast;
    toastText.textContent = msg;
    toast.classList.add("sp-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("sp-show");
    }, duration);
  }

  /* ── Tag & Identifier Extraction Helpers ── */
  function rgbToHex(rgb) {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "";
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return rgb;
    return "#" + m.slice(0, 3).map(x => parseInt(x, 10).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function getClassName(el) {
    if (!el || !el.className) return "";
    if (typeof el.className === "string") return el.className;
    if (typeof el.className.baseVal === "string") return el.className.baseVal;
    return "";
  }

  function getPrimaryClass(el) {
    const raw = getClassName(el);
    if (!raw) return "";
    const valid = raw.trim().split(/\s+/).filter(c => !c.startsWith("sp-") && !c.startsWith("visbug-"));
    return valid.length > 0 ? "." + valid[0] : "";
  }

  function getElementSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const c = getClassName(el).trim().split(/\s+/).filter(x => !x.startsWith("sp-"));
    if (c.length) s += "." + c.slice(0, 2).join(".");
    return s;
  }

  function tag(el) {
    return getElementSelector(el);
  }

  function isOwn(el) {
    if (!el || el.nodeType !== 1) return false;
    const root = document.getElementById("sp-root");
    if (root && (el === root || root.contains(el))) return true;
    const panel = document.getElementById("sp-panel");
    if (panel && (el === panel || panel.contains(el))) return true;
    const toast = document.getElementById("sp-toast");
    if (toast && (el === toast || toast.contains(el))) return true;
    if (el.closest && (
      el.closest("#sp-root") ||
      el.closest("#sp-panel") ||
      el.closest("#sp-toast") ||
      el.closest("#__figma_h2d_chrome_extension_toolbar__")
    )) return true;
    const rootNode = el.getRootNode ? el.getRootNode() : null;
    if (rootNode && rootNode.host && rootNode.host.id === "__figma_h2d_chrome_extension_toolbar__") return true;
    if (el.id && (el.id.startsWith("visbug-") || el.id.startsWith("__figma_") || el.id === "sp-root" || el.id === "sp-panel" || el.id.startsWith("sp-hover-") || el.id.startsWith("sp-select-"))) return true;
    return false;
  }

  function ensurePositioned(el) {
    if (!el || el.nodeType !== 1) return;
    const cs = window.getComputedStyle(el);
    if (cs.position === "static") {
      el.style.setProperty("position", "relative", "important");
    }
  }

  async function copyToClipboard(text, onSuccess, onError) {
    try {
      await navigator.clipboard.writeText(text);
      if (onSuccess) onSuccess();
    } catch (err) {
      if (onError) onError(err);
      else console.error("Clipboard copy failed:", err);
    }
  }

  /* ══════════════════════════════════════════════════════════
     CSS Mining & Computed Styles Snapshot Engine
     ══════════════════════════════════════════════════════════ */
  const PSEUDO_RE = /::?[\w-]+(\([^)]*\))?/g;
  const STATE_RE = /:(?:hover|focus|active|focus-within|focus-visible|checked|disabled)/i;

  function mine(el) {
    const direct = [], pseudo = [], keyframes = {};
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      walkRules(rules, el, direct, pseudo, keyframes, "");
    }
    return { direct, pseudo, keyframes };
  }

  function walkRules(rules, el, direct, pseudo, keyframes, wrap) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        keyframes[rule.name] = rule.cssText;
        continue;
      }
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const w = rule.type === CSSRule.MEDIA_RULE
          ? `@media ${rule.conditionText || rule.media?.mediaText}`
          : `@supports ${rule.conditionText}`;
        walkRules(rule.cssRules, el, direct, pseudo, keyframes, wrap ? `${wrap}\n${w}` : w);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;

      for (const part of (rule.selectorText || "").split(",").map(s => s.trim())) {
        const base = part.replace(PSEUDO_RE, "").trim();
        const isPseudo = STATE_RE.test(part);
        let matches = false;
        try { matches = base && el.matches(base); } catch {}
        if (!matches) continue;
        const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
        (isPseudo ? pseudo : direct).push(text);
      }
    }
  }

  function mineAncestorHoverRules(el) {
    const results = [];
    const subTree = [el, ...Array.from(el.querySelectorAll("*"))];
    const ancestors = [];
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      if (!isOwn(p)) ancestors.push(p);
      p = p.parentElement;
    }
    if (!ancestors.length) return results;

    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      collectAncestorHoverRules(rules, el, subTree, ancestors, results, "");
    }
    return results;
  }

  function collectAncestorHoverRules(rules, el, subTree, ancestors, results, wrap) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const w = rule.type === CSSRule.MEDIA_RULE
          ? `@media ${rule.conditionText || rule.media?.mediaText}`
          : `@supports ${rule.conditionText}`;
        collectAncestorHoverRules(rule.cssRules, el, subTree, ancestors, results, wrap ? `${wrap}\n${w}` : w);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;

      const parts = (rule.selectorText || "").split(",").map(s => s.trim());
      for (const part of parts) {
        if (!STATE_RE.test(part)) continue;
        const subParts = part.split(/\s+/);
        if (subParts.length < 2) continue;

        const ancestorPart = subParts[0].replace(STATE_RE, "").replace(PSEUDO_RE, "").trim();
        const targetPart = subParts.slice(1).join(" ").replace(STATE_RE, "").replace(PSEUDO_RE, "").trim();
        if (!ancestorPart || !targetPart) continue;

        const ancestorMatches = ancestors.some(a => { try { return a.matches(ancestorPart); } catch { return false; } });
        if (!ancestorMatches) continue;

        const targetMatches = subTree.some(child => { try { return child.matches(targetPart); } catch { return false; } });
        if (targetMatches) {
          const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
          results.push(text);
          break;
        }
      }
    }
  }

  function collectNeededRules(rules, rootEl, needed, keyframes, wrap) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        keyframes[rule.name] = rule.cssText;
        continue;
      }
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const w = rule.type === CSSRule.MEDIA_RULE
          ? `@media ${rule.conditionText || rule.media?.mediaText}`
          : `@supports ${rule.conditionText}`;
        collectNeededRules(rule.cssRules, rootEl, needed, keyframes, wrap ? `${wrap}\n${w}` : w);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;

      const selText = rule.selectorText;
      if (!selText) continue;

      const parts = selText.split(",");
      for (let i = 0; i < parts.length; i++) {
        const base = parts[i].replace(STATE_RE, "").replace(PSEUDO_RE, "").trim();
        if (!base) continue;
        let matched = false;
        try {
          matched = rootEl.matches(base) || (rootEl.childElementCount > 0 && !!rootEl.querySelector(base));
        } catch {
          matched = false;
        }
        if (matched) {
          const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
          needed.add(text);
          break;
        }
      }
    }
  }

  function mineAllNeededRules(el) {
    if (!el || el.nodeType !== 1) return "";
    const needed = new Set();
    const keyframes = {};

    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      collectNeededRules(rules, el, needed, keyframes, "");
    }

    const ancestorRules = mineAncestorHoverRules(el);
    ancestorRules.forEach(r => needed.add(r));

    const sheetCSS = [...needed].join("\n\n") + (Object.keys(keyframes).length ? "\n\n" + Object.values(keyframes).join("\n\n") : "");

    const allEls = [el, ...Array.from(el.querySelectorAll("*")).slice(0, 50)];
    const isModuleClass = (cls) => /module_|module--|-[a-zA-Z0-9]{5,8}$/.test(cls);
    const allClasses = allEls.flatMap(e =>
      (e.className && typeof e.className === "string")
        ? e.className.trim().split(/\s+/).filter(Boolean)
        : []
    );
    const moduleClassCount = allClasses.filter(isModuleClass).length;
    const usesModules = allClasses.length > 0 && moduleClassCount / allClasses.length > 0.4;

    if (usesModules || needed.size === 0) {
      return buildComputedStyleCSS(el, allEls, keyframes) + (sheetCSS ? "\n\n" + sheetCSS : "");
    }

    return sheetCSS;
  }

  function buildComputedStyleCSS(rootEl, allEls, keyframes) {
    const lines = ["/* ── Snapshot of Computed Styles ── */"];
    allEls.forEach((el, idx) => {
      const cs = window.getComputedStyle(el);
      const sel = el.id ? `#${el.id}` : (getPrimaryClass(el) || `${el.tagName.toLowerCase()}:nth-of-type(${idx + 1})`);
      lines.push(`${sel} {`);
      lines.push(`  display: ${cs.display};`);
      if (cs.position !== "static") lines.push(`  position: ${cs.position};`);
      lines.push(`  width: ${cs.width};`);
      lines.push(`  height: ${cs.height};`);
      lines.push(`  margin: ${cs.margin};`);
      lines.push(`  padding: ${cs.padding};`);
      lines.push(`  background: ${cs.background};`);
      lines.push(`  color: ${cs.color};`);
      lines.push(`  font-family: ${cs.fontFamily};`);
      lines.push(`  font-size: ${cs.fontSize};`);
      lines.push(`  font-weight: ${cs.fontWeight};`);
      lines.push(`  border: ${cs.border};`);
      lines.push(`  border-radius: ${cs.borderRadius};`);
      lines.push(`  box-shadow: ${cs.boxShadow};`);
      lines.push(`}`);
    });
    return lines.join("\n");
  }

  function buildInlineStyleHTML(exportRoot) {
    const wrap = document.createElement("div");
    wrap.innerHTML = exportRoot.outerHTML;
    const origEls = [exportRoot, ...Array.from(exportRoot.querySelectorAll("*"))];
    const cloneEls = [wrap.firstElementChild, ...Array.from(wrap.firstElementChild.querySelectorAll("*"))];
    origEls.forEach((orig, i) => {
      const clone = cloneEls[i];
      if (!clone) return;
      const cs = window.getComputedStyle(orig);
      clone.setAttribute("style", `display:${cs.display};width:${cs.width};height:${cs.height};color:${cs.color};background:${cs.backgroundColor};font-family:${cs.fontFamily};font-size:${cs.fontSize};`);
    });
    return wrap.innerHTML;
  }

  function findAnimatedAncestor(el) {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      if (isOwn(p)) break;
      const cs = window.getComputedStyle(p);
      const hasAnim = cs.animationName && cs.animationName !== "none";
      const hasTrans = cs.transitionDuration && cs.transitionDuration !== "0s" && cs.transitionProperty && cs.transitionProperty !== "none";
      const { direct, pseudo } = mine(p);
      const hasRules = direct.some(r => /transition|animation/.test(r)) || pseudo.length > 0;
      if (hasAnim || hasTrans || hasRules) return p;
      p = p.parentElement;
    }
    return null;
  }

  /* ── Universal Element & Icon/SVG Sizing Engine ── */
  function applySizeToElement(el, newW, newH, scale = null) {
    if (!el) return;
    const w = Math.max(8, Math.round(newW));
    const h = Math.max(8, Math.round(newH));

    const tagLower = el.tagName ? el.tagName.toLowerCase() : "";
    const isSvgEl = (el instanceof SVGElement) || tagLower === "svg";
    const childSvgs = el.querySelectorAll ? Array.from(el.querySelectorAll("svg")) : [];
    const isIconLike = tagLower === "i" ||
                       (tagLower === "span" && /icon|lucide|fa|material|glyph|tabler|feather/i.test(el.className || "")) ||
                       el.classList?.contains("lucide") ||
                       el.getAttribute?.("data-lucide") != null;

    // Apply CSS constraints with !important so Tailwind/resets don't override
    el.style.setProperty("width", w + "px", "important");
    el.style.setProperty("height", h + "px", "important");
    el.style.setProperty("min-width", w + "px", "important");
    el.style.setProperty("min-height", h + "px", "important");
    el.style.setProperty("max-width", w + "px", "important");
    el.style.setProperty("max-height", h + "px", "important");

    // If SVG or child SVGs exist, update their SVG attributes and viewBox
    if (isSvgEl) {
      el.setAttribute("width", w);
      el.setAttribute("height", h);
      if (!el.getAttribute("viewBox")) {
        try {
          const bbox = el.getBBox ? el.getBBox() : null;
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            el.setAttribute("viewBox", `0 0 ${Math.round(bbox.width)} ${Math.round(bbox.height)}`);
          } else {
            el.setAttribute("viewBox", `0 0 ${w} ${h}`);
          }
        } catch (e) {
          el.setAttribute("viewBox", `0 0 ${w} ${h}`);
        }
      }
    }

    if (childSvgs.length > 0) {
      childSvgs.forEach(svg => {
        svg.style.setProperty("width", w + "px", "important");
        svg.style.setProperty("height", h + "px", "important");
        svg.style.setProperty("min-width", w + "px", "important");
        svg.style.setProperty("min-height", h + "px", "important");
        svg.setAttribute("width", w);
        svg.setAttribute("height", h);
      });
    }

    // If font-based icon glyph
    if (isIconLike || tagLower === "i") {
      const fontSize = Math.min(w, h);
      el.style.setProperty("font-size", fontSize + "px", "important");
      el.style.setProperty("line-height", "1", "important");
    }

    // If scale multiplier is passed
    if (scale !== null && scale !== undefined && scale > 0) {
      el.style.setProperty("transform", `scale(${scale})`, "important");
      el.style.setProperty("transform-origin", "center center", "important");
    }
  }

  /* ── Export to window and StylePeek namespace ── */
  SP.utils = {
    SP_ICONS,
    spPlayKeyClick,
    showToast,
    rgbToHex,
    getClassName,
    getPrimaryClass,
    getElementSelector,
    tag,
    isOwn,
    ensurePositioned,
    copyToClipboard,
    mine,
    mineAncestorHoverRules,
    mineAllNeededRules,
    buildComputedStyleCSS,
    buildInlineStyleHTML,
    findAnimatedAncestor,
    applySizeToElement
  };

  window.SP_ICONS = SP_ICONS;
  window.spPlayKeyClick = spPlayKeyClick;
  window.showToast = showToast;
  window.rgbToHex = rgbToHex;
  window.getClassName = getClassName;
  window.getPrimaryClass = getPrimaryClass;
  window.getElementSelector = getElementSelector;
  window.tag = tag;
  window.isOwn = isOwn;
  window.ensurePositioned = ensurePositioned;
  window.mineAllNeededRules = mineAllNeededRules;
  window.applySizeToElement = applySizeToElement;
})();
