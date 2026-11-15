/**
 * StylePeek Studio — Figma-Style Deep Layers & Front Passthrough Engine
 * js/sp_deep_layers.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  function clearPassthroughFrontNodes() {
    state.passthroughFrontNodes.forEach(n => {
      try {
        n.classList.remove("sp-front-passthrough");
      } catch (e) {}
    });
    state.passthroughFrontNodes = [];
  }

  function computeVisualLayerStack(el) {
    if (!el || (window.isOwn && window.isOwn(el))) return [];
    const stack = [];
    const seen = new Set();

    function addLayer(node) {
      if (!node || node.nodeType !== 1 || (window.isOwn && window.isOwn(node)) || seen.has(node)) return;
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "LINK") return;
      seen.add(node);
      stack.push(node);
    }

    try {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const cx = Math.max(2, Math.min(window.innerWidth - 2, r.left + r.width / 2));
        const cy = Math.max(2, Math.min(window.innerHeight - 2, r.top + r.height / 2));
        const hitNodes = document.elementsFromPoint(cx, cy);
        for (const h of hitNodes) {
          addLayer(h);
        }
      }
    } catch (e) {}

    let curr = el;
    while (curr && curr.nodeType === 1 && (!window.isOwn || !window.isOwn(curr))) {
      addLayer(curr);
      curr = curr.parentElement;
    }
    addLayer(document.body);
    addLayer(document.documentElement);

    return stack;
  }

  function applyDeepLayerSelection(newIdx) {
    if (!state.deepLayerStack.length) {
      if (state.selectedEl) state.deepLayerStack = computeVisualLayerStack(state.selectedEl);
      if (!state.deepLayerStack.length) return;
    }

    const clampedIdx = Math.max(0, Math.min(state.deepLayerStack.length - 1, newIdx));
    clearPassthroughFrontNodes();

    for (let i = 0; i < clampedIdx; i++) {
      const frontNode = state.deepLayerStack[i];
      if (frontNode && frontNode !== document.body && frontNode !== document.documentElement) {
        frontNode.classList.add("sp-front-passthrough");
        state.passthroughFrontNodes.push(frontNode);
      }
    }

    state.deepLayerIndex = clampedIdx;
    state.isDeepLayerMode = clampedIdx > 0;
    const targetLayer = state.deepLayerStack[clampedIdx];
    if (typeof window.selectElement === "function") window.selectElement(targetLayer, true);

    const tag = targetLayer.tagName.toLowerCase();
    const cls = window.getPrimaryClass ? window.getPrimaryClass(targetLayer) : "";
    if (state.isDeepLayerMode) {
      if (window.showToast) window.showToast(`Layer ${clampedIdx + 1} of ${state.deepLayerStack.length}: <${tag}${cls}> (Behind front elements)`);
    } else {
      if (window.showToast) window.showToast(`Front Layer (1 of ${state.deepLayerStack.length}): <${tag}${cls}>`);
    }
  }

  function stepLayerDeeper() {
    if (window.spPlayKeyClick) window.spPlayKeyClick(145);
    if (!state.selectedEl) {
      if (window.showToast) window.showToast("Click any element on the page first, then step behind it");
      return;
    }
    if (!state.deepLayerStack.length || state.deepLayerStack.indexOf(state.selectedEl) === -1) {
      state.deepLayerStack = computeVisualLayerStack(state.selectedEl);
      state.deepLayerIndex = Math.max(0, state.deepLayerStack.indexOf(state.selectedEl));
    }
    if (state.deepLayerIndex < state.deepLayerStack.length - 1) {
      applyDeepLayerSelection(state.deepLayerIndex + 1);
    } else {
      if (window.showToast) window.showToast("Already at the deepest background layer (Root Canvas)");
    }
  }

  function stepLayerForward() {
    if (window.spPlayKeyClick) window.spPlayKeyClick(195);
    if (!state.selectedEl) return;
    if (!state.deepLayerStack.length || state.deepLayerStack.indexOf(state.selectedEl) === -1) {
      state.deepLayerStack = computeVisualLayerStack(state.selectedEl);
      state.deepLayerIndex = Math.max(0, state.deepLayerStack.indexOf(state.selectedEl));
    }
    if (state.deepLayerIndex > 0) {
      applyDeepLayerSelection(state.deepLayerIndex - 1);
    } else {
      const firstChild = Array.from(state.selectedEl.children || []).find(c => (!window.isOwn || !window.isOwn(c)) && !c.classList.contains("sp-detached-bg-layer"));
      if (firstChild) {
        if (typeof window.selectElement === "function") window.selectElement(firstChild, false);
        const tag = firstChild.tagName.toLowerCase();
        const cls = window.getPrimaryClass ? window.getPrimaryClass(firstChild) : "";
        if (window.showToast) window.showToast(`Selected front child element: <${tag}${cls}>`);
      } else {
        if (window.showToast) window.showToast("Already at the frontmost element");
      }
    }
  }

  function syncKeepFrontBtnUI() {
    const btnKeepFrontStill = document.getElementById("sp-btn-keep-front");
    const keepFrontLabel = document.getElementById("sp-keep-front-label");
    if (!btnKeepFrontStill || !keepFrontLabel) return;
    btnKeepFrontStill.classList.toggle("active", state.keepFrontStationary);
    keepFrontLabel.textContent = state.keepFrontStationary
      ? "Keep Front Elements Still: ON"
      : "Keep Front Elements Still: OFF";
  }

  function detachBackgroundBox() {
    if (window.spPlayKeyClick) window.spPlayKeyClick(160);
    if (!state.selectedEl || state.selectedEl === document.body || state.selectedEl === document.documentElement) {
      if (window.showToast) window.showToast("Select a card or section container first to detach its background box");
      return;
    }

    const target = state.selectedEl;
    if (window.ensurePositioned) window.ensurePositioned(target);

    const existingBg = Array.from(target.children).find(c => c.classList && c.classList.contains("sp-detached-bg-layer"));
    if (existingBg) {
      state.isDeepLayerMode = true;
      if (typeof window.selectElement === "function") window.selectElement(existingBg, true);
      if (window.showToast) window.showToast("Selected detached background box — drag or restyle it independently");
      return;
    }

    const cs = window.getComputedStyle(target);
    const bgLayer = document.createElement("div");
    bgLayer.className = "sp-detached-bg-layer sp-custom-element";
    bgLayer.style.position = "absolute";
    bgLayer.style.top = "0px";
    bgLayer.style.left = "0px";
    bgLayer.style.width = "100%";
    bgLayer.style.height = "100%";
    bgLayer.style.zIndex = "0";
    bgLayer.style.borderRadius = cs.borderRadius || "12px";
    bgLayer.style.backgroundColor = (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent")
      ? cs.backgroundColor
      : "#EAE8E0";
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      bgLayer.style.backgroundImage = cs.backgroundImage;
      bgLayer.style.backgroundSize = cs.backgroundSize || "cover";
      bgLayer.style.backgroundPosition = cs.backgroundPosition || "center";
    }
    if (cs.borderWidth && cs.borderWidth !== "0px") {
      bgLayer.style.border = `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`;
    }
    if (cs.boxShadow && cs.boxShadow !== "none") {
      bgLayer.style.boxShadow = cs.boxShadow;
    }

    Array.from(target.children).forEach(child => {
      if (!window.isOwn || !window.isOwn(child)) {
        if (window.ensurePositioned) window.ensurePositioned(child);
        if (!child.style.zIndex || child.style.zIndex === "auto") {
          child.style.zIndex = "1";
        }
      }
    });

    const oldBg = target.style.background;
    const oldBgColor = target.style.backgroundColor;
    target.style.setProperty("background", "transparent", "important");
    target.style.setProperty("background-color", "transparent", "important");
    target.style.setProperty("overflow", "visible", "important");
    target.insertBefore(bgLayer, target.firstChild);

    state.undoStack.push({
      type: "detach-bg",
      container: target,
      bgLayer,
      oldBg,
      oldBgColor
    });

    state.isDeepLayerMode = true;
    if (typeof window.selectElement === "function") window.selectElement(bgLayer, true);
    if (window.showToast) window.showToast("Detached background box as its own layer");
  }

  function buildBreadcrumbs(el) {
    if (!el) return;
    const layerBreadcrumb = document.getElementById("sp-layer-breadcrumb");
    if (!layerBreadcrumb) return;

    const stackToRender = (state.deepLayerStack && state.deepLayerStack.length > 0 && state.deepLayerStack.includes(el))
      ? state.deepLayerStack
      : computeVisualLayerStack(el);

    layerBreadcrumb.innerHTML = "";
    stackToRender.forEach((node, idx) => {
      const isCurrent = (node === el);
      const tag = node.tagName.toLowerCase();
      const cls = window.getPrimaryClass ? window.getPrimaryClass(node) : "";
      const depthTag = idx === 0 ? "Front: " : `L${idx + 1}: `;
      const btn = document.createElement("button");
      btn.className = "sp-crumb-chip" + (isCurrent ? " active" : "");
      btn.textContent = `${depthTag}${tag}${cls}`;
      btn.title = idx === 0 ? `Select front element <${tag}${cls}>` : `Step behind to Layer ${idx + 1}`;
      btn.addEventListener("click", () => {
        if (window.spPlayKeyClick) window.spPlayKeyClick(170);
        state.deepLayerStack = stackToRender;
        applyDeepLayerSelection(idx);
      });
      layerBreadcrumb.appendChild(btn);
      if (idx < stackToRender.length - 1) {
        const sep = document.createElement("span");
        sep.className = "sp-crumb-sep";
        sep.textContent = "→";
        layerBreadcrumb.appendChild(sep);
      }
    });
  }

  function setLayerSolo(targetEl, enable) {
    if (!targetEl || (window.isOwn && window.isOwn(targetEl))) return;
    const all = Array.from(document.body.querySelectorAll("*")).filter(el => !window.isOwn || !window.isOwn(el));
    if (enable) {
      all.forEach(el => {
        if (el !== targetEl && !targetEl.contains(el) && !el.contains(targetEl)) {
          el.style.setProperty("opacity", "0.08", "important");
        }
      });
      if (window.showToast) window.showToast("Layer isolated (Solo mode)");
    } else {
      all.forEach(el => {
        el.style.removeProperty("opacity");
      });
      if (window.showToast) window.showToast("Solo mode off — all layers restored");
    }
  }

  function initDeepLayers() {
    syncKeepFrontBtnUI();
  }

  /* ── Export ── */
  SP.deepLayers = {
    initDeepLayers,
    clearPassthroughFrontNodes,
    computeVisualLayerStack,
    applyDeepLayerSelection,
    stepLayerDeeper,
    stepLayerForward,
    syncKeepFrontBtnUI,
    detachBackgroundBox,
    buildBreadcrumbs,
    setLayerSolo
  };

  window.clearPassthroughFrontNodes = clearPassthroughFrontNodes;
  window.computeVisualLayerStack = computeVisualLayerStack;
  window.applyDeepLayerSelection = applyDeepLayerSelection;
  window.stepLayerDeeper = stepLayerDeeper;
  window.stepLayerForward = stepLayerForward;
  window.syncKeepFrontBtnUI = syncKeepFrontBtnUI;
  window.detachBackgroundBox = detachBackgroundBox;
  window.buildBreadcrumbs = buildBreadcrumbs;
  window.setLayerSolo = setLayerSolo;
  window.initDeepLayers = initDeepLayers;
})();
