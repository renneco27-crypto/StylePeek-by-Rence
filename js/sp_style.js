/**
 * StylePeek Studio — Style Inspector & Drawer Panel
 * js/sp_style.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  let drawer = null;
  let textHex = null;
  let textColor = null;
  let bgHex = null;
  let bgColor = null;
  let borderHex = null;
  let borderColor = null;
  let borderWidthSelect = null;
  let borderStyleSelect = null;
  let elementCssInput = null;
  let btnApplyCss = null;

  function ensureStyleAttached() {
    drawer = document.getElementById("sp-drawer");
    textHex = document.getElementById("sp-text-hex");
    textColor = document.getElementById("sp-text-color");
    bgHex = document.getElementById("sp-bg-hex");
    bgColor = document.getElementById("sp-bg-color");
    borderHex = document.getElementById("sp-border-hex");
    borderColor = document.getElementById("sp-border-color");
    borderWidthSelect = document.getElementById("sp-border-width");
    borderStyleSelect = document.getElementById("sp-border-style");
    elementCssInput = document.getElementById("sp-element-css");
    btnApplyCss = document.getElementById("sp-btn-apply-css");
  }

  /* ── Style Handlers: Text, Fill, Border ── */
  function applyTextToElement(el, col) {
    if (!el) return;
    el.style.setProperty("color", col, "important");

    const textEls = el.querySelectorAll("span, p, a, h1, h2, h3, h4, h5, h6, strong, b, em, i, small, label, button, div, li, td, th, input, textarea, code");
    textEls.forEach(child => {
      if (child.textContent && child.textContent.trim().length > 0) {
        child.style.setProperty("color", col, "important");
      }
    });

    if (el instanceof SVGElement) {
      el.style.setProperty("fill", col, "important");
    }
    el.querySelectorAll("svg, svg path, svg circle, svg rect, svg polygon, svg line").forEach(icon => {
      icon.style.setProperty("fill", col, "important");
    });
  }

  function applyBgToElement(el, col) {
    if (!el) return;
    el.style.setProperty("background-color", col, "important");
    el.style.setProperty("background", col, "important");
    if (el instanceof SVGElement) {
      el.style.setProperty("fill", col, "important");
    }
  }

  function applyBorderToElement(el, col, width, style) {
    if (!el) return;
    ensureStyleAttached();
    const finalW = width || (borderWidthSelect ? borderWidthSelect.value : "1px");
    const finalS = style || (borderStyleSelect ? borderStyleSelect.value : "solid");

    el.style.setProperty("border-color", col, "important");
    el.style.setProperty("border-style", finalS, "important");
    el.style.setProperty("border-width", finalW, "important");

    if (finalW !== "0px" && finalS !== "none") {
      el.style.setProperty("outline", `${finalW} ${finalS} ${col}`, "important");
      el.style.setProperty("box-shadow", `0 0 0 ${finalW} ${col}`, "important");
    } else {
      el.style.removeProperty("outline");
      el.style.removeProperty("box-shadow");
    }

    if (el instanceof SVGElement) {
      el.style.setProperty("stroke", col, "important");
      el.style.setProperty("stroke-width", finalW, "important");
    }
  }

  function applyCustomCss() {
    if (!state.selectedEl) {
      if (window.showToast) window.showToast("Select an element first");
      return;
    }
    const newCss = (elementCssInput?.value || "").trim();
    const oldStyle = state.selectedEl.getAttribute("style") || "";
    state.undoStack.push({
      type: "style",
      node: state.selectedEl,
      oldStyle: oldStyle
    });

    if (newCss) {
      state.selectedEl.style.cssText = newCss;
      if (window.ensurePositioned) window.ensurePositioned(state.selectedEl);
    } else {
      state.selectedEl.removeAttribute("style");
      if (window.ensurePositioned) window.ensurePositioned(state.selectedEl);
    }
    if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
    if (window.spPlayKeyClick) window.spPlayKeyClick(210);
    if (window.showToast) window.showToast("CSS applied to element");
  }

  /* ── Inline Text Editing (Word-Style Precision) ── */
  function isTextEditableCandidate(el) {
    if (!el || (window.isOwn && window.isOwn(el))) return false;
    const nonTextTags = [
      "IMG", "SVG", "CANVAS", "VIDEO", "AUDIO", "IFRAME", "PICTURE", "SOURCE",
      "PATH", "CIRCLE", "RECT", "POLYGON", "POLYLINE", "ELLIPSE", "LINE", "G",
      "HR", "BR", "INPUT", "TEXTAREA", "SELECT", "OBJECT", "EMBED"
    ];
    if (nonTextTags.includes(el.tagName)) return false;

    const text = (el.innerText || el.textContent || "").trim();
    if (!text) return false;

    const hasMedia = el.querySelector("img, svg, canvas, video, iframe");
    if (hasMedia) {
      const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
      if (!hasDirectText) return false;
    }
    return true;
  }

  function startInlineTextEdit(targetEl) {
    if (!targetEl || (window.isOwn && window.isOwn(targetEl))) return;
    if (!isTextEditableCandidate(targetEl)) return;

    let textEl = targetEl;
    if (targetEl.childNodes.length === 1 && targetEl.childNodes[0].nodeType === Node.TEXT_NODE) {
      textEl = targetEl;
    } else {
      const candidate = targetEl.closest("span, p, a, button, h1, h2, h3, h4, h5, h6, strong, b, em, i, small, label, li, td, th");
      if (candidate && (!window.isOwn || !window.isOwn(candidate)) && isTextEditableCandidate(candidate)) {
        textEl = candidate;
      }
    }

    if (!isTextEditableCandidate(textEl)) return;

    if (SP.activeEditingNode && SP.activeEditingNode !== textEl) {
      finishInlineTextEdit(SP.activeEditingNode);
    }

    SP.activeEditingNode = textEl;
    textEl._spOriginalHtml = textEl.innerHTML;
    textEl._spOriginalText = textEl.innerText;
    textEl.contentEditable = "true";
    textEl.classList.add("sp-inline-editing");
    textEl.focus();

    try {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(textEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (err) {}

    if (window.showToast) window.showToast("Editing words live • Enter for new line, Esc to cancel");

    function onBlur() {
      finishInlineTextEdit(textEl);
      textEl.removeEventListener("blur", onBlur);
      textEl.removeEventListener("keydown", onKey);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        textEl.innerHTML = textEl._spOriginalHtml;
        textEl.blur();
      } else if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let caretNode = range.startContainer;
          if (caretNode.nodeType === Node.TEXT_NODE) caretNode = caretNode.parentElement;
          const cs = window.getComputedStyle(caretNode || textEl);

          const newLine = document.createElement("div");
          newLine.style.fontFamily = cs.fontFamily;
          newLine.style.fontSize = cs.fontSize;
          newLine.style.fontWeight = cs.fontWeight;
          newLine.style.fontStyle = cs.fontStyle;
          newLine.style.color = cs.color;
          newLine.style.lineHeight = cs.lineHeight;
          newLine.innerHTML = "<br>";

          range.deleteContents();
          range.insertNode(newLine);

          const newRange = document.createRange();
          newRange.setStart(newLine, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    textEl.addEventListener("blur", onBlur);
    textEl.addEventListener("keydown", onKey);
  }

  function finishInlineTextEdit(node) {
    if (!node) return;
    node.contentEditable = "false";
    node.classList.remove("sp-inline-editing");
    if (node._spOriginalHtml !== undefined && node.innerHTML !== node._spOriginalHtml) {
      const oldHtml = node._spOriginalHtml;
      const newHtml = node.innerHTML;
      state.undoStack.push({
        type: "text",
        node,
        oldHtml,
        newHtml,
        oldText: node._spOriginalText,
        newText: node.innerText
      });
      delete node._spOriginalHtml;
      delete node._spOriginalText;
      if (state.selectedEl && typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
    }
    if (SP.activeEditingNode === node) {
      SP.activeEditingNode = null;
    }
  }

  /* ── Background Layer Scanner ── */
  function scanBackgroundLayers(el) {
    const list = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      if (window.isOwn && window.isOwn(cur)) {
        cur = cur.parentElement;
        continue;
      }
      const cs = window.getComputedStyle(cur);
      const bg = cs.backgroundColor;
      const bi = cs.backgroundImage;
      const hasColor = bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)";
      const hasImage = bi && bi !== "none";
      if (hasColor || hasImage) {
        list.push({ node: cur, bg, bi });
      }
      cur = cur.parentElement;
    }
    return list;
  }

  /* ── Drawer Dragging & Controls Setup ── */
  function initDrawerControls() {
    ensureStyleAttached();
    if (!drawer) return;

    // Draggable header
    const hdr = drawer.querySelector("#sp-drawer-header");
    let isDraggingDrawer = false, ox = 0, oy = 0;

    hdr?.addEventListener("mousedown", e => {
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".sp-drawer-tab")) return;
      isDraggingDrawer = true;
      const r = drawer.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      drawer.style.bottom = "auto";
      drawer.style.right = "auto";
      drawer.style.transform = "none";
      drawer.style.left = r.left + "px";
      drawer.style.top = r.top + "px";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!isDraggingDrawer) return;
      const left = Math.max(10, Math.min(window.innerWidth - drawer.offsetWidth - 10, e.clientX - ox));
      const top = Math.max(10, Math.min(window.innerHeight - 50, e.clientY - oy));
      drawer.style.left = left + "px";
      drawer.style.top = top + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      isDraggingDrawer = false;
    });

    // Color inputs
    textColor?.addEventListener("input", e => {
      if (textHex) textHex.value = e.target.value;
      applyTextToElement(state.selectedEl, e.target.value);
    });
    textHex?.addEventListener("input", e => {
      if (textColor) textColor.value = e.target.value;
      applyTextToElement(state.selectedEl, e.target.value);
    });

    bgColor?.addEventListener("input", e => {
      if (bgHex) bgHex.value = e.target.value;
      applyBgToElement(state.selectedEl, e.target.value);
    });
    bgHex?.addEventListener("input", e => {
      if (bgColor) bgColor.value = e.target.value;
      applyBgToElement(state.selectedEl, e.target.value);
    });

    borderColor?.addEventListener("input", e => {
      if (borderHex) borderHex.value = e.target.value;
      applyBorderToElement(state.selectedEl, e.target.value);
    });
    borderHex?.addEventListener("input", e => {
      if (borderColor) borderColor.value = e.target.value;
      applyBorderToElement(state.selectedEl, e.target.value);
    });
    borderWidthSelect?.addEventListener("change", e => {
      applyBorderToElement(state.selectedEl, borderHex ? borderHex.value : "#DCD9CE", e.target.value);
    });
    borderStyleSelect?.addEventListener("change", e => {
      applyBorderToElement(state.selectedEl, borderHex ? borderHex.value : "#DCD9CE", null, e.target.value);
    });

    // Swatches
    drawer.querySelectorAll(".sp-color-swatch").forEach(swatch => {
      swatch.addEventListener("click", () => {
        if (!state.selectedEl) return;
        const col = swatch.dataset.col;
        const target = swatch.parentElement?.dataset.target;
        if (target === "text") {
          if (textHex) textHex.value = col;
          if (textColor) textColor.value = col.startsWith("#") ? col : "#1C1C1E";
          applyTextToElement(state.selectedEl, col);
        } else if (target === "bg") {
          if (bgHex) bgHex.value = col;
          if (bgColor) bgColor.value = col.startsWith("#") ? col : "#F4F3EE";
          applyBgToElement(state.selectedEl, col);
        } else if (target === "border") {
          if (borderHex) borderHex.value = col;
          if (borderColor) borderColor.value = col.startsWith("#") ? col : "#DCD9CE";
          applyBorderToElement(state.selectedEl, col);
        }
        if (window.spPlayKeyClick) window.spPlayKeyClick(180);
      });
    });

    // Alignment buttons
    drawer.querySelectorAll("[data-vb-align]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!state.selectedEl) {
          if (window.showToast) window.showToast("Select an element first");
          return;
        }
        if (window.spPlayKeyClick) window.spPlayKeyClick(175);
        const mode = btn.getAttribute("data-vb-align");
        const cs = window.getComputedStyle(state.selectedEl);
        state.undoStack.push({
          type: "align",
          node: state.selectedEl,
          oldDisplay: state.selectedEl.style.display,
          oldJustify: state.selectedEl.style.justifyContent,
          oldAlign: state.selectedEl.style.alignItems,
          oldTextAlign: state.selectedEl.style.textAlign
        });

        const hasElementChildren = state.selectedEl.children && state.selectedEl.children.length > 0;
        if (hasElementChildren || cs.display.includes("flex") || cs.display.includes("grid")) {
          if (!cs.display.includes("flex") && !cs.display.includes("grid")) {
            state.selectedEl.style.setProperty("display", "flex", "important");
          }
          state.selectedEl.style.setProperty("align-items", "center", "important");
          if (mode === "left") {
            state.selectedEl.style.setProperty("justify-content", "flex-start", "important");
            state.selectedEl.style.setProperty("text-align", "left", "important");
          } else if (mode === "center") {
            state.selectedEl.style.setProperty("justify-content", "center", "important");
            state.selectedEl.style.setProperty("text-align", "center", "important");
          } else if (mode === "right") {
            state.selectedEl.style.setProperty("justify-content", "flex-end", "important");
            state.selectedEl.style.setProperty("text-align", "right", "important");
          } else if (mode === "between") {
            state.selectedEl.style.setProperty("justify-content", "space-between", "important");
          }
        } else {
          if (mode === "left") state.selectedEl.style.setProperty("text-align", "left", "important");
          else if (mode === "center") state.selectedEl.style.setProperty("text-align", "center", "important");
          else if (mode === "right") state.selectedEl.style.setProperty("text-align", "right", "important");
        }
        if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      });
    });

    btnApplyCss?.addEventListener("click", applyCustomCss);
    elementCssInput?.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomCss();
      }
    });

    // Drawer header action buttons
    document.getElementById("sp-drawer-close")?.addEventListener("click", () => {
      drawer.classList.remove("sp-open");
      if (window.spPlayKeyClick) window.spPlayKeyClick(150);
    });

    document.getElementById("sp-btn-deselect")?.addEventListener("click", () => {
      if (typeof window.clearSelection === "function") window.clearSelection();
      drawer.classList.remove("sp-open");
      if (window.spPlayKeyClick) window.spPlayKeyClick(140);
    });

    document.getElementById("sp-btn-edit-text")?.addEventListener("click", () => {
      if (state.selectedEl) startInlineTextEdit(state.selectedEl);
    });

    document.getElementById("sp-btn-undo")?.addEventListener("click", () => {
      if (typeof window.performUndo === "function") window.performUndo();
    });

    document.getElementById("sp-lock-btn")?.addEventListener("click", () => {
      state.isTargetLocked = !state.isTargetLocked;
      const btn = document.getElementById("sp-lock-btn");
      if (btn) btn.textContent = state.isTargetLocked ? "Locked" : "Unlocked";
      if (window.spPlayKeyClick) window.spPlayKeyClick(160);
      if (window.showToast) window.showToast(state.isTargetLocked ? "Target locked" : "Target unlocked");
    });

    document.getElementById("sp-btn-apply-transform")?.addEventListener("click", () => {
      if (typeof window.applyElementTransform === "function") window.applyElementTransform();
    });

    // Size & Dimensions (Icons & SVGs) Controls
    const inputW = document.getElementById("sp-input-width");
    const inputH = document.getElementById("sp-input-height");

    function adjustDimensions(deltaW, deltaH) {
      if (!state.selectedEl) {
        if (window.showToast) window.showToast("Select an element or icon first");
        return;
      }
      const r = state.selectedEl.getBoundingClientRect();
      const curW = inputW ? parseInt(inputW.value, 10) || Math.round(r.width) : Math.round(r.width);
      const curH = inputH ? parseInt(inputH.value, 10) || Math.round(r.height) : Math.round(r.height);

      const stepW = curW <= 24 ? (Math.sign(deltaW) * 2) : deltaW;
      const stepH = curH <= 24 ? (Math.sign(deltaH) * 2) : deltaH;

      const newW = Math.max(8, curW + stepW);
      const newH = Math.max(8, curH + stepH);

      if (inputW) inputW.value = newW;
      if (inputH) inputH.value = newH;

      if (window.applySizeToElement) {
        window.applySizeToElement(state.selectedEl, newW, newH);
      } else {
        state.selectedEl.style.width = newW + "px";
        state.selectedEl.style.height = newH + "px";
      }

      if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      if (typeof window.syncMobileAdjuster === "function") window.syncMobileAdjuster(state.selectedEl, newW, newH);
      if (window.spPlayKeyClick) window.spPlayKeyClick(240);
    }

    document.getElementById("sp-btn-w-minus")?.addEventListener("click", () => adjustDimensions(-4, 0));
    document.getElementById("sp-btn-w-plus")?.addEventListener("click", () => adjustDimensions(4, 0));
    document.getElementById("sp-btn-h-minus")?.addEventListener("click", () => adjustDimensions(0, -4));
    document.getElementById("sp-btn-h-plus")?.addEventListener("click", () => adjustDimensions(0, 4));

    inputW?.addEventListener("change", () => {
      if (!state.selectedEl) return;
      const newW = Math.max(8, parseInt(inputW.value, 10) || 24);
      const newH = inputH ? Math.max(8, parseInt(inputH.value, 10) || 24) : newW;
      if (window.applySizeToElement) window.applySizeToElement(state.selectedEl, newW, newH);
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      if (typeof window.syncMobileAdjuster === "function") window.syncMobileAdjuster(state.selectedEl, newW, newH);
    });

    inputH?.addEventListener("change", () => {
      if (!state.selectedEl) return;
      const newW = inputW ? Math.max(8, parseInt(inputW.value, 10) || 24) : 24;
      const newH = Math.max(8, parseInt(inputH.value, 10) || 24);
      if (window.applySizeToElement) window.applySizeToElement(state.selectedEl, newW, newH);
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      if (typeof window.syncMobileAdjuster === "function") window.syncMobileAdjuster(state.selectedEl, newW, newH);
    });

    document.querySelectorAll(".sp-scale-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (!state.selectedEl) {
          if (window.showToast) window.showToast("Select an element or icon first");
          return;
        }
        document.querySelectorAll(".sp-scale-chip").forEach(c => c.classList.remove("sp-active-chip"));
        chip.classList.add("sp-active-chip");

        const scale = parseFloat(chip.dataset.scale) || 1.0;
        const r = state.selectedEl.getBoundingClientRect();
        const baseW = Math.round(r.width);
        const baseH = Math.round(r.height);
        const scaledW = Math.max(8, Math.round(baseW * scale));
        const scaledH = Math.max(8, Math.round(baseH * scale));

        if (inputW) inputW.value = scaledW;
        if (inputH) inputH.value = scaledH;

        if (window.applySizeToElement) {
          window.applySizeToElement(state.selectedEl, scaledW, scaledH, scale);
        }
        if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
        if (typeof window.syncMobileAdjuster === "function") window.syncMobileAdjuster(state.selectedEl, scaledW, scaledH);
        if (window.spPlayKeyClick) window.spPlayKeyClick(260);
        if (window.showToast) window.showToast(`Scaled to ${scale}x (${scaledW}×${scaledH}px)`);
      });
    });

    document.getElementById("sp-btn-reset-transform")?.addEventListener("click", () => {
      const area = document.getElementById("sp-transform-code");
      if (area && state.selectedEl) area.value = state.selectedEl.outerHTML || state.selectedEl.textContent || "";
    });

    // Dynamic Website Colors Strip in Drawer
    document.getElementById("sp-btn-drawer-eyedropper")?.addEventListener("click", async () => {
      if (typeof window.pickEyedropper === "function") {
        await window.pickEyedropper();
        syncDrawerWebsiteSwatches();
      }
    });

    document.getElementById("sp-btn-drawer-open-palette")?.addEventListener("click", () => {
      if (typeof window.openPaletteModal === "function") window.openPaletteModal();
    });

    syncDrawerWebsiteSwatches();
  }

  function syncDrawerWebsiteSwatches() {
    const strip = document.getElementById("sp-drawer-website-swatches");
    if (!strip) return;
    strip.innerHTML = "";

    const p = (window.extractWebsitePalette ? window.extractWebsitePalette() : null) || SP.state?.websitePalette;
    const colors = p?.dominant?.length ? p.dominant : (p?.all?.slice(0, 14) || []);
    const sampled = SP.state?.sampledColors || [];
    const allSwatches = [...sampled.map(h => ({ hex: h, label: "Sampled" })), ...colors];

    allSwatches.slice(0, 18).forEach(c => {
      const swatch = document.createElement("div");
      swatch.className = "sp-website-swatch";
      swatch.style.backgroundColor = c.hex;
      swatch.dataset.col = c.hex;
      swatch.title = `${c.hex} · Click to apply as Fill & copy`;

      swatch.addEventListener("click", () => {
        const hex = c.hex;
        navigator.clipboard.writeText(hex);
        if (state.selectedEl) {
          applyBgToElement(state.selectedEl, hex);
          if (bgHex) bgHex.value = hex;
          if (bgColor) bgColor.value = hex;
        }
        if (window.spPlayKeyClick) window.spPlayKeyClick(190);
        if (window.showToast) window.showToast(`Applied & copied ${hex}`);
      });

      strip.appendChild(swatch);
    });
  }

  function initStyle() {
    ensureStyleAttached();
    initDrawerControls();
  }

  /* ── Export ── */
  SP.style = {
    initStyle,
    applyTextToElement,
    applyBgToElement,
    applyBorderToElement,
    applyCustomCss,
    isTextEditableCandidate,
    startInlineTextEdit,
    finishInlineTextEdit,
    scanBackgroundLayers
  };

  window.applyTextToElement = applyTextToElement;
  window.applyBgToElement = applyBgToElement;
  window.applyBorderToElement = applyBorderToElement;
  window.applyCustomCss = applyCustomCss;
  window.isTextEditableCandidate = isTextEditableCandidate;
  window.startInlineTextEdit = startInlineTextEdit;
  window.finishInlineTextEdit = finishInlineTextEdit;
  window.scanBackgroundLayers = scanBackgroundLayers;
  window.initStyle = initStyle;
})();
