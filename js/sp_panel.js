/**
 * StylePeek Studio — Compact Inspection Preview Panel (#sp-panel)
 * js/sp_panel.js
 * Strictly enforces CTRL+SPC UI Kit design system & ui-laws.txt (under 700 lines).
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  let panelEl = null;
  let elTag = null;
  let elName = null;
  let codeEl = null;
  let copyBtn = null;
  let copyLabel = null;
  let ancestorBar = null;
  let ancestorMsg = null;
  let ancestorBtn = null;
  let siblingsBtn = null;
  let codepenBtn = null;
  let closeBtn = null;
  let pickBtn = null;
  let stageViewport = null;
  let stageReplayBtn = null;
  let isPanelDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentCleanClone = null;

  function ensurePanelAttached() {
    if (panelEl && document.contains(panelEl)) return panelEl;
    const mountTarget = document.body || document.documentElement;

    let existing = document.getElementById("sp-panel");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "sp-panel";
      existing.innerHTML = `
        <div id="sp-header">
          <div id="sp-panel-grip" title="Drag to move panel">${SP.utils?.icons?.grip || "⠿"}</div>
          <span id="sp-el-tag">div</span>
          <span id="sp-el-name">.element</span>
          <div id="sp-header-btns">
            <button type="button" id="sp-codepen-btn" title="Export to CodePen">CodePen ↗</button>
            <button type="button" id="sp-close-btn" title="Close Panel (Esc)">✕</button>
          </div>
        </div>

        <div id="sp-tabs">
          <button type="button" class="sp-tab sp-active" data-tab="html">HTML</button>
          <button type="button" class="sp-tab" data-tab="css">CSS</button>
          <button type="button" class="sp-tab" data-tab="js">JS</button>
          <button type="button" class="sp-tab" data-tab="whole">Whole</button>
        </div>

        <div id="sp-ancestor-bar">
          <span id="sp-ancestor-msg"></span>
          <button type="button" id="sp-ancestor-btn">Go to parent ↑</button>
        </div>

        <div id="sp-pane">
          <div id="sp-stage-box">
            <div id="sp-stage-header">
              <span id="sp-stage-label">Live Animated Preview</span>
              <button type="button" id="sp-stage-replay-btn" title="Replay CSS Animations & Transitions">Replay ↺</button>
            </div>
            <div id="sp-stage-viewport"></div>
          </div>

          <div id="sp-copy-bar">
            <span id="sp-copy-label">HTML</span>
            <button type="button" id="sp-copy-btn">Copy</button>
          </div>
          <pre id="sp-code"></pre>
        </div>

        <div id="sp-footer">
          <button type="button" id="sp-siblings-btn" title="Include parent + all sibling elements in export">⊞ With siblings</button>
          <button type="button" id="sp-pick-btn">Pick another</button>
        </div>
      `;
      mountTarget.appendChild(existing);
    } else if (existing.parentElement !== mountTarget) {
      mountTarget.appendChild(existing);
    }

    panelEl = existing;
    elTag = panelEl.querySelector("#sp-el-tag");
    elName = panelEl.querySelector("#sp-el-name");
    codeEl = panelEl.querySelector("#sp-code");
    copyBtn = panelEl.querySelector("#sp-copy-btn");
    copyLabel = panelEl.querySelector("#sp-copy-label");
    ancestorBar = panelEl.querySelector("#sp-ancestor-bar");
    ancestorMsg = panelEl.querySelector("#sp-ancestor-msg");
    ancestorBtn = panelEl.querySelector("#sp-ancestor-btn");
    siblingsBtn = panelEl.querySelector("#sp-siblings-btn");
    codepenBtn = panelEl.querySelector("#sp-codepen-btn");
    closeBtn = panelEl.querySelector("#sp-close-btn");
    pickBtn = panelEl.querySelector("#sp-pick-btn");
    stageViewport = panelEl.querySelector("#sp-stage-viewport");
    stageReplayBtn = panelEl.querySelector("#sp-stage-replay-btn");

    initPanelEvents();
    return panelEl;
  }

  function applyPanelPos() {
    if (!panelEl) return;
    if (state.panelPos.left !== null) {
      panelEl.style.left = state.panelPos.left;
      panelEl.style.right = "auto";
      panelEl.style.top = state.panelPos.top;
    } else {
      panelEl.style.left = "auto";
      panelEl.style.right = state.panelPos.right;
      panelEl.style.top = state.panelPos.top;
    }
  }

  function showPane(tab) {
    if (!codeEl || !copyLabel || !copyBtn) return;
    state.activeTab = tab;
    codeEl.textContent = state.panes[tab] || "";
    copyLabel.textContent = tab.toUpperCase();
    copyBtn.textContent = "Copy";
    copyBtn.classList.remove("sp-copied");
  }

  function updateLiveStage(cleanClone, cssCode, jsCode) {
    if (!stageViewport || !cleanClone) return;
    stageViewport.innerHTML = "";

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const bg = (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent")
      ? bodyBg
      : (htmlBg && htmlBg !== "rgba(0, 0, 0, 0)" && htmlBg !== "transparent")
        ? htmlBg
        : "#FAF9F6";

    const docHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<base href="${window.location.href}">
<style>
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 20px;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${bg};
  font-family: system-ui, -apple-system, sans-serif;
  overflow: auto;
}
${cssCode || ""}
</style>
</head>
<body>
${cleanClone.outerHTML}
<script>
try {
${jsCode || ""}
} catch (e) {}
</script>
</body>
</html>`;

    const frame = document.createElement("iframe");
    frame.className = "sp-stage-frame";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.srcdoc = docHtml;
    stageViewport.appendChild(frame);
  }

  function initPanelEvents() {
    const tabs = panelEl.querySelectorAll(".sp-tab");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("sp-active"));
        btn.classList.add("sp-active");
        showPane(btn.dataset.tab);
        if (window.spPlayKeyClick) window.spPlayKeyClick(240);
      });
    });

    if (stageReplayBtn) {
      stageReplayBtn.addEventListener("click", () => {
        if (currentCleanClone) {
          updateLiveStage(currentCleanClone, state.panes.css, state.panes.js);
          if (window.spPlayKeyClick) window.spPlayKeyClick(280);
          if (window.showToast) window.showToast("Replayed animations");
        }
      });
    }

    copyBtn.addEventListener("click", () => {
      const text = state.panes[state.activeTab] || "";
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied ✓";
        copyBtn.classList.add("sp-copied");
        if (window.spPlayKeyClick) window.spPlayKeyClick(320);
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("sp-copied");
        }, 1200);
      });
    });

    closeBtn.addEventListener("click", () => {
      spClosePanel();
    });

    pickBtn.addEventListener("click", () => {
      spClosePanel();
      if (typeof window.turnOnStylePeek === "function") {
        window.turnOnStylePeek("inspect");
      }
      if (window.showToast) window.showToast("Click any element to inspect");
    });

    codepenBtn.addEventListener("click", () => {
      openCodePen();
    });

    ancestorBtn.addEventListener("click", () => {
      if (state.animatedAncestor) {
        spOpenPanel(state.animatedAncestor);
      }
    });

    siblingsBtn.addEventListener("click", () => {
      state.siblingsMode = !state.siblingsMode;
      siblingsBtn.classList.toggle("sp-siblings-active", state.siblingsMode);
      siblingsBtn.textContent = state.siblingsMode ? "⊞ With siblings ✓" : "⊞ With siblings";
      if (state.selectedEl) {
        spOpenPanel(state.selectedEl);
      }
      if (window.spPlayKeyClick) window.spPlayKeyClick(190);
    });

    // Draggable header
    const header = panelEl.querySelector("#sp-header");
    header.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      isPanelDragging = true;
      const r = panelEl.getBoundingClientRect();
      dragOffset.x = e.clientX - r.left;
      dragOffset.y = e.clientY - r.top;
      header.style.cursor = "grabbing";
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPanelDragging || !panelEl) return;
      const l = Math.max(0, Math.min(window.innerWidth - panelEl.offsetWidth, e.clientX - dragOffset.x));
      const t = Math.max(0, Math.min(window.innerHeight - panelEl.offsetHeight, e.clientY - dragOffset.y));
      state.panelPos.left = l + "px";
      state.panelPos.top = t + "px";
      state.panelPos.right = null;
      applyPanelPos();
    });

    window.addEventListener("mouseup", () => {
      if (isPanelDragging && header) {
        isPanelDragging = false;
        header.style.cursor = "grab";
      }
    });
  }

  function spOpenPanel(el) {
    let target = (el && el.nodeType === 1 && !window.isOwn?.(el))
      ? el
      : (state.selectedEl || window.__spLastH2DElement || document.querySelector("main") || document.body);

    if (!target || target.nodeType !== 1 || (window.isOwn && window.isOwn(target))) return;

    // Avoid cloning entire massive document.body if root selected
    if (target === document.body || target === document.documentElement) {
      target = document.querySelector("main") || document.querySelector("#root") || document.querySelector("#__next") || document.body.firstElementChild || target;
    }

    ensurePanelAttached();
    state.selectedEl = target;
    state.animatedAncestor = null;

    if (window.closeAllPopups) {
      window.closeAllPopups(panelEl);
    }

    const tagStr = target.tagName.toLowerCase();
    const idStr = target.id ? "#" + target.id : "";
    const clsStr = window.getPrimaryClass ? window.getPrimaryClass(target) : "";
    elTag.textContent = tagStr;
    elName.textContent = idStr ? idStr : (clsStr || `.${tagStr}`);

    // Determine export root based on siblingsMode
    const rootNode = document.getElementById("sp-root");
    const exportRoot = (state.siblingsMode && target.parentElement && (!rootNode || !rootNode.contains(target.parentElement)))
      ? target.parentElement
      : target;

    // Build pure, clean clone stripped of any StylePeek UI elements
    const cleanClone = exportRoot.cloneNode(true);
    cleanClone.querySelectorAll("#sp-root, [id^='sp-'], [class^='sp-'], .sp-custom-element").forEach(n => n.remove());
    cleanClone.classList.remove("sp-multi-selected", "sp-front-passthrough", "sp-layer-isolated");
    cleanClone.style.outline = "";
    currentCleanClone = cleanClone;

    // Panes: HTML
    state.panes.html = cleanClone.outerHTML;

    // Panes: CSS (includes all animations, transitions, and hover rules)
    if (window.mineAllNeededRules) {
      state.panes.css = window.mineAllNeededRules(exportRoot) || "/* No specific CSS rules found */";
    } else {
      state.panes.css = "/* CSS mining utility unavailable */";
    }

    // Panes: JS
    const elClasses = Array.from(cleanClone.classList || []);
    const elId = cleanClone.id;
    const childClasses = Array.from(cleanClone.querySelectorAll("[class]")).flatMap(c => Array.from(c.classList)).filter(Boolean);
    const childIds = Array.from(cleanClone.querySelectorAll("[id]")).map(c => c.id).filter(Boolean);

    const allIdentifiers = [...new Set([
      ...(elId ? [elId, `#${elId}`, `'${elId}'`, `"${elId}"`] : []),
      ...elClasses.flatMap(c => [c, `.${c}`, `'${c}'`, `"${c}"`]),
      ...childIds.flatMap(id => [id, `#${id}`, `'${id}'`, `"${id}"`]),
      ...childClasses.flatMap(c => [`.${c}`, `'${c}'`, `"${c}"`])
    ])];

    const pageScripts = Array.from(document.querySelectorAll("script:not([src])"))
      .map(s => s.textContent.trim())
      .filter(text => text.length > 10 && !text.includes("__stylePeek") && allIdentifiers.some(id => text.includes(id)));

    state.panes.js = pageScripts.length
      ? pageScripts.join("\n\n")
      : `// No inline scripts found referencing this element.\n// Add interactivity here.`;

    // Compute page background for context
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const pageBg = (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent")
      ? bodyBg
      : (htmlBg && htmlBg !== "rgba(0, 0, 0, 0)" && htmlBg !== "transparent")
        ? htmlBg
        : "#FAF9F6";

    // Panes: Whole (complete standalone HTML file with CSS & JS embedded)
    state.panes.whole = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${tagStr} — StylePeek</title>
<style>
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 32px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${pageBg};
  font-family: system-ui, -apple-system, sans-serif;
}
${state.panes.css}
</style>
</head>
<body>
${cleanClone.outerHTML}
<script>
try {
${state.panes.js}
} catch (e) {
  console.error("Script execution error:", e);
}
</script>
</body>
</html>`;

    // Render live animated preview stage
    updateLiveStage(cleanClone, state.panes.css, state.panes.js);

    // Check ancestor animation
    const cs = window.getComputedStyle(el);
    const hasTrans = cs.transitionDuration && cs.transitionDuration !== "0s" && cs.transitionProperty && cs.transitionProperty !== "none";
    const animNames = (cs.animationName && cs.animationName !== "none") ? cs.animationName.split(",").map(s => s.trim()) : [];

    if (SP.utils.findAnimatedAncestor) {
      state.animatedAncestor = SP.utils.findAnimatedAncestor(el);
      if (state.animatedAncestor && !hasTrans && !animNames.length) {
        ancestorMsg.textContent = `Hover animation driven by parent: ${window.tag ? window.tag(state.animatedAncestor) : state.animatedAncestor.tagName.toLowerCase()}`;
        ancestorBar.style.display = "flex";
      } else {
        ancestorBar.style.display = "none";
      }
    } else {
      ancestorBar.style.display = "none";
    }

    applyPanelPos();
    panelEl.classList.add("sp-open");
    showPane(state.activeTab || "html");

    // Also update selection highlight
    if (typeof window.updateSelectBox === "function") {
      window.updateSelectBox(el);
    }
  }

  function spClosePanel() {
    if (panelEl) {
      panelEl.classList.remove("sp-open");
    }
    const selectBox = document.getElementById("sp-select-box");
    if (selectBox && (!state.activeToolMode || state.activeToolMode === "off")) {
      selectBox.style.display = "none";
    }
  }

  function openCodePen() {
    if (!state.selectedEl) return;
    const rootNode = document.getElementById("sp-root");
    const exportRoot = (state.siblingsMode && state.selectedEl.parentElement && (!rootNode || !rootNode.contains(state.selectedEl.parentElement)))
      ? state.selectedEl.parentElement
      : state.selectedEl;

    const htmlOut = state.panes.html || exportRoot.outerHTML;
    let cssOut = state.panes.css || "";

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const pageBg = (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent")
      ? bodyBg
      : (htmlBg && htmlBg !== "rgba(0, 0, 0, 0)" && htmlBg !== "transparent")
        ? htmlBg
        : "#ffffff";
    const bodyColor = window.getComputedStyle(document.body).color || "#000000";

    const bodyCSS = `/* ── Page context injected by StylePeek ── */\nbody {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: ${pageBg};\n  color: ${bodyColor};\n  font-family: ${window.getComputedStyle(document.body).fontFamily || "sans-serif"};\n  padding: 40px 20px;\n}`;
    cssOut = bodyCSS + (cssOut ? "\n\n" + cssOut : "");

    const jsOut = state.panes.js || "";
    const exportLabel = state.siblingsMode ? (window.tag ? window.tag(exportRoot) : "element") + " (+ siblings)" : (window.tag ? window.tag(exportRoot) : "element");

    const data = {
      title: "StylePeek — " + exportLabel,
      html: htmlOut,
      css: cssOut,
      js: jsOut
    };

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://codepen.io/pen/define";
    form.target = "_blank";
    const inp = document.createElement("input");
    inp.type = "hidden";
    inp.name = "data";
    inp.value = JSON.stringify(data);
    form.appendChild(inp);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  /* ── Export ── */
  SP.panel = {
    ensurePanelAttached,
    spOpenPanel,
    spClosePanel,
    openCodePen,
    showPane
  };

  window.spOpenPanel = spOpenPanel;
  window.spClosePanel = spClosePanel;
  window.openCodePen = openCodePen;
})();
