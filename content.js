(function () {
  if (window.__stylePeekInjected) {
    return;
  }
  window.__stylePeekInjected = true;

  let isEnabled = false;
  let activeToolMode = "inspect"; // "inspect", "move", "color", "layers", "code", "delete"
  let selectedEl = null;
  let hoveredEl = null;
  const undoStack = [];

  /* ── Scaffold Injected UI ── */
  const root = document.createElement("div");
  root.id = "sp-root";
  root.innerHTML = `
    <!-- Hover Outline Box -->
    <div id="sp-hover-box"></div>
    <div id="sp-hover-label"></div>

    <!-- Selection Outline Box -->
    <div id="sp-select-box">
      <div id="sp-select-badge"></div>
    </div>

    <!-- Toast Notification -->
    <div id="sp-toast"><span class="sp-dot"></span><span id="sp-toast-text"></span></div>

    <!-- Floating Element Editor Popup -->
    <div id="sp-element-popup">
      <div id="sp-pop-header">
        <div class="sp-pop-title-group">
          <span id="sp-pop-tag">div</span>
          <span id="sp-pop-name">.element</span>
        </div>
        <button class="sp-pop-close-btn" id="sp-pop-close" title="Close popup (Esc)">✕</button>
      </div>

      <div id="sp-pop-tabs">
        <button class="sp-pop-tab sp-active" data-tab="style">🎨 Style</button>
        <button class="sp-pop-tab" data-tab="layers">🥞 Layers</button>
        <button class="sp-pop-tab" data-tab="code">💻 Code</button>
        <button class="sp-pop-tab" data-tab="anim">⚡ Anim</button>
      </div>

      <!-- Tab 1: Style & Gradient -->
      <div class="sp-tab-pane sp-active" id="pane-style">
        <div class="sp-field-row">
          <label>Text Color</label>
          <div class="sp-field-inputs">
            <input type="text" class="sp-hex-input" id="sp-text-hex" value="#ffffff">
            <input type="color" class="sp-color-btn" id="sp-text-color" value="#ffffff">
          </div>
        </div>

        <div class="sp-field-row">
          <label>Background</label>
          <div class="sp-field-inputs">
            <input type="text" class="sp-hex-input" id="sp-bg-hex" value="#000000">
            <input type="color" class="sp-color-btn" id="sp-bg-color" value="#000000">
          </div>
        </div>

        <div class="sp-field-row">
          <label>Border Color</label>
          <div class="sp-field-inputs">
            <input type="text" class="sp-hex-input" id="sp-border-hex" value="#3b82f6">
            <input type="color" class="sp-color-btn" id="sp-border-color" value="#3b82f6">
          </div>
        </div>

        <!-- Gradient Builder -->
        <div class="sp-gradient-box">
          <div class="sp-gradient-header">
            <span>Gradient Generator</span>
            <select class="sp-select" id="sp-grad-type">
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </div>
          <div id="sp-gradient-preview"></div>

          <div class="sp-field-row" style="margin-bottom:6px">
            <label style="width:60px">Direction</label>
            <select class="sp-select" id="sp-grad-dir" style="flex:1">
              <option value="to right">To Right →</option>
              <option value="to bottom">To Bottom ↓</option>
              <option value="135deg">Diagonal ↘ (135°)</option>
              <option value="45deg">Diagonal ↗ (45°)</option>
              <option value="to left">To Left ←</option>
            </select>
          </div>

          <div class="sp-field-row" style="margin-bottom:6px">
            <label style="width:60px">Stop 1</label>
            <div class="sp-field-inputs">
              <input type="text" class="sp-hex-input" id="sp-grad-c1-hex" value="#8b5cf6">
              <input type="color" class="sp-color-btn" id="sp-grad-c1" value="#8b5cf6">
            </div>
          </div>

          <div class="sp-field-row" style="margin-bottom:6px">
            <label style="width:60px">Stop 2</label>
            <div class="sp-field-inputs">
              <input type="text" class="sp-hex-input" id="sp-grad-c2-hex" value="#06b6d4">
              <input type="color" class="sp-color-btn" id="sp-grad-c2" value="#06b6d4">
            </div>
          </div>

          <button class="sp-apply-gradient-btn" id="sp-apply-gradient">Apply Gradient to Element</button>
        </div>

        <!-- Quick Swatches -->
        <div class="sp-swatches-row">
          <div class="sp-color-swatch" style="background:#ffffff" data-col="#ffffff" title="White"></div>
          <div class="sp-color-swatch" style="background:#0f172a" data-col="#0f172a" title="Dark Slate"></div>
          <div class="sp-color-swatch" style="background:#3b82f6" data-col="#3b82f6" title="Blue"></div>
          <div class="sp-color-swatch" style="background:#06b6d4" data-col="#06b6d4" title="Cyan"></div>
          <div class="sp-color-swatch" style="background:#10b981" data-col="#10b981" title="Emerald"></div>
          <div class="sp-color-swatch" style="background:#f59e0b" data-col="#f59e0b" title="Amber"></div>
          <div class="sp-color-swatch" style="background:#ef4444" data-col="#ef4444" title="Rose"></div>
          <div class="sp-color-swatch" style="background:#8b5cf6" data-col="#8b5cf6" title="Purple"></div>
          <div class="sp-color-swatch" style="background:transparent;border:1px dashed #64748b" data-col="transparent" title="Transparent"></div>
        </div>
      </div>

      <!-- Tab 2: Layers & Z-Index -->
      <div class="sp-tab-pane" id="pane-layers">
        <div class="sp-layer-actions">
          <button class="sp-layer-btn back" id="sp-btn-push-back" title="Send element to back (z-index: -1)">
            <span>⬇ Push to Back</span>
          </button>
          <button class="sp-layer-btn front" id="sp-btn-bring-front" title="Bring element to top layer (z-index: 9999)">
            <span>⬆ Bring to Front</span>
          </button>
        </div>

        <div class="sp-zindex-row">
          <span style="font-size:11px;font-weight:600;color:#94A3B8">Z-Index Stacking:</span>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="sp-step-btn" id="sp-z-down" title="Step Down (-1)">−</button>
            <input type="number" class="sp-zindex-input" id="sp-zindex-val" value="0">
            <button class="sp-step-btn" id="sp-z-up" title="Step Up (+1)">+</button>
          </div>
        </div>

        <div class="sp-layer-tree-label">DOM LAYER HIERARCHY (CLICK TO SELECT):</div>
        <div id="sp-layer-breadcrumbs"></div>
      </div>

      <!-- Tab 3: Live Code Editor -->
      <div class="sp-tab-pane" id="pane-code">
        <div class="sp-code-subtabs">
          <button class="sp-code-subtab active" id="sp-subtab-html">HTML</button>
          <button class="sp-code-subtab" id="sp-subtab-css">CSS</button>
        </div>
        <textarea class="sp-code-textarea" id="sp-code-val" spellcheck="false"></textarea>
        <button class="sp-apply-code-btn" id="sp-apply-code">Apply Live Changes</button>
      </div>

      <!-- Tab 4: Animations -->
      <div class="sp-tab-pane" id="pane-anim">
        <div class="sp-layer-tree-label">ACTIVE ANIMATIONS & KEYFRAMES:</div>
        <div class="sp-anim-info" id="sp-anim-info">No active CSS animation</div>

        <div class="sp-layer-tree-label" style="margin-top:10px">QUICK ANIMATION PRESETS:</div>
        <div class="sp-preset-grid">
          <button class="sp-preset-btn" data-preset="pulse">💫 Pulse</button>
          <button class="sp-preset-btn" data-preset="float">🎈 Float</button>
          <button class="sp-preset-btn" data-preset="glow">✨ Glow</button>
          <button class="sp-preset-btn" data-preset="bounce">⚡ Bounce</button>
        </div>
      </div>
    </div>
  `;

  document.documentElement.appendChild(root);

  /* ── Element References ── */
  const hoverBox      = root.querySelector("#sp-hover-box");
  const hoverLbl      = root.querySelector("#sp-hover-label");
  const selectBox     = root.querySelector("#sp-select-box");
  const selectBadge   = root.querySelector("#sp-select-badge");
  const toast         = root.querySelector("#sp-toast");
  const toastText     = root.querySelector("#sp-toast-text");
  const popup         = root.querySelector("#sp-element-popup");
  const popTag        = root.querySelector("#sp-pop-tag");
  const popName       = root.querySelector("#sp-pop-name");
  const popClose      = root.querySelector("#sp-pop-close");

  const textHex       = root.querySelector("#sp-text-hex");
  const textColor     = root.querySelector("#sp-text-color");
  const bgHex         = root.querySelector("#sp-bg-hex");
  const bgColor       = root.querySelector("#sp-bg-color");
  const borderHex     = root.querySelector("#sp-border-hex");
  const borderColor   = root.querySelector("#sp-border-color");

  const gradType      = root.querySelector("#sp-grad-type");
  const gradDir       = root.querySelector("#sp-grad-dir");
  const gradC1Hex     = root.querySelector("#sp-grad-c1-hex");
  const gradC1Color   = root.querySelector("#sp-grad-c1");
  const gradC2Hex     = root.querySelector("#sp-grad-c2-hex");
  const gradC2Color   = root.querySelector("#sp-grad-c2");
  const gradPreview   = root.querySelector("#sp-gradient-preview");
  const applyGradBtn  = root.querySelector("#sp-apply-gradient");

  const btnPushBack   = root.querySelector("#sp-btn-push-back");
  const btnBringFront = root.querySelector("#sp-btn-bring-front");
  const zDownBtn      = root.querySelector("#sp-z-down");
  const zUpBtn        = root.querySelector("#sp-z-up");
  const zInput        = root.querySelector("#sp-zindex-val");
  const breadcrumbs   = root.querySelector("#sp-layer-breadcrumbs");

  const subtabHtml    = root.querySelector("#sp-subtab-html");
  const subtabCss     = root.querySelector("#sp-subtab-css");
  const codeVal       = root.querySelector("#sp-code-val");
  const applyCodeBtn  = root.querySelector("#sp-apply-code");
  let activeCodeMode  = "html";

  const animInfo      = root.querySelector("#sp-anim-info");

  /* ── Presets Keyframe Styles Injected into document head ── */
  (function injectGlobalAnimStyles() {
    if (document.getElementById("sp-global-anims")) return;
    const s = document.createElement("style");
    s.id = "sp-global-anims";
    s.textContent = `
      @keyframes sp-pulse-anim { 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} }
      @keyframes sp-float-anim { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
      @keyframes sp-glow-anim { 0%,100%{box-shadow:0 0 5px #22D3EE;} 50%{box-shadow:0 0 20px #8B5CF6, 0 0 35px #22D3EE;} }
      @keyframes sp-bounce-anim { 0%,20%,50%,80%,100%{transform:translateY(0);} 40%{transform:translateY(-12px);} 60%{transform:translateY(-6px);} }
    `;
    document.head.appendChild(s);
  })();

  function showToast(msg, duration = 2500) {
    toastText.textContent = msg;
    toast.classList.add("sp-show");
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("sp-show"), duration);
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#000000";
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return rgb.startsWith("#") ? rgb : "#000000";
    return "#" + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, "0")).join("");
  }

  function isOwn(el) {
    return el === root || root.contains(el);
  }

  /* ── Position Popup next to element ── */
  function anchorPopup(el) {
    const r = el.getBoundingClientRect();
    const pw = 360, ph = 400;
    let top = r.bottom + 8;
    let left = r.left;

    // Boundary clamping
    if (top + ph > window.innerHeight) {
      top = Math.max(10, r.top - ph - 8);
    }
    if (left + pw > window.innerWidth) {
      left = Math.max(10, window.innerWidth - pw - 15);
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    popup.style.top = top + "px";
    popup.style.left = left + "px";
    popup.classList.add("sp-open");
  }

  /* ── Draggable Popup Header ── */
  (function initDraggablePopup() {
    const hdr = root.querySelector("#sp-pop-header");
    let dragging = false, ox = 0, oy = 0;
    hdr.addEventListener("mousedown", e => {
      if (e.target.id === "sp-pop-close") return;
      dragging = true;
      const r = popup.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      e.preventDefault();
    });
    window.addEventListener("mousemove", e => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - ox));
      const top  = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - oy));
      popup.style.left = left + "px";
      popup.style.top = top + "px";
    });
    window.addEventListener("mouseup", () => dragging = false);
  })();

  /* ── Tab Switching ── */
  root.querySelectorAll(".sp-pop-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      root.querySelectorAll(".sp-pop-tab").forEach(b => b.classList.remove("sp-active"));
      root.querySelectorAll(".sp-tab-pane").forEach(p => p.classList.remove("sp-active"));
      tabBtn.classList.add("sp-active");
      const targetPane = root.querySelector(`#pane-${tabBtn.dataset.tab}`);
      if (targetPane) targetPane.classList.add("sp-active");
    });
  });

  popClose.addEventListener("click", () => {
    popup.classList.remove("sp-open");
    selectBox.style.display = "none";
    selectedEl = null;
  });

  /* ── Select and Inspect Element ── */
  function selectElement(el) {
    if (!el || isOwn(el)) return;
    selectedEl = el;

    // 1. Update selection outline box
    const r = el.getBoundingClientRect();
    selectBox.style.display = "block";
    selectBox.style.left = r.left + "px";
    selectBox.style.top = r.top + "px";
    selectBox.style.width = r.width + "px";
    selectBox.style.height = r.height + "px";

    const tagStr = el.tagName.toLowerCase();
    const idStr = el.id ? "#" + el.id : "";
    const clsStr = (typeof el.className === "string" && el.className.trim())
      ? "." + el.className.trim().split(/\s+/)[0] : "";
    selectBadge.textContent = `${tagStr}${idStr}${clsStr} (${Math.round(r.width)}×${Math.round(r.height)})`;

    popTag.textContent = tagStr;
    popName.textContent = idStr || clsStr || "";

    // 2. Read Computed Styles for Color Tab
    const cs = window.getComputedStyle(el);
    const txtHex = rgbToHex(cs.color);
    textHex.value = txtHex;
    textColor.value = txtHex;

    const bgH = rgbToHex(cs.backgroundColor);
    bgHex.value = bgH;
    bgColor.value = bgH;

    const bdrH = rgbToHex(cs.borderColor);
    borderHex.value = bdrH;
    borderColor.value = bdrH;

    updateGradientPreview();

    // 3. Read Z-Index & Build Hierarchy Breadcrumbs
    const currentZ = parseInt(cs.zIndex);
    zInput.value = isNaN(currentZ) ? 0 : currentZ;
    buildBreadcrumbs(el);

    // 4. Update Live Code & Animations
    updateCodeEditorContent();
    updateAnimationInfo(el, cs);

    // 5. Open and Anchor Popup
    anchorPopup(el);
  }

  /* ── Gradient Preview & Application ── */
  function updateGradientPreview() {
    const type = gradType.value;
    const dir = gradDir.value;
    const c1 = gradC1Hex.value;
    const c2 = gradC2Hex.value;
    const gradVal = type === "linear" ? `linear-gradient(${dir}, ${c1}, ${c2})` : `radial-gradient(circle, ${c1}, ${c2})`;
    gradPreview.style.background = gradVal;
    return gradVal;
  }

  [gradType, gradDir].forEach(ctrl => ctrl.addEventListener("change", updateGradientPreview));
  gradC1Color.addEventListener("input", e => { gradC1Hex.value = e.target.value; updateGradientPreview(); });
  gradC1Hex.addEventListener("input", e => { gradC1Color.value = e.target.value; updateGradientPreview(); });
  gradC2Color.addEventListener("input", e => { gradC2Hex.value = e.target.value; updateGradientPreview(); });
  gradC2Hex.addEventListener("input", e => { gradC2Color.value = e.target.value; updateGradientPreview(); });

  applyGradBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    const gradVal = updateGradientPreview();
    selectedEl.style.backgroundImage = gradVal;
    showToast("✓ Applied gradient to element");
  });

  /* ── Live Color Binding ── */
  textColor.addEventListener("input", e => {
    textHex.value = e.target.value;
    if (selectedEl) selectedEl.style.color = e.target.value;
  });
  textHex.addEventListener("input", e => {
    textColor.value = e.target.value;
    if (selectedEl) selectedEl.style.color = e.target.value;
  });

  bgColor.addEventListener("input", e => {
    bgHex.value = e.target.value;
    if (selectedEl) selectedEl.style.backgroundColor = e.target.value;
  });
  bgHex.addEventListener("input", e => {
    bgColor.value = e.target.value;
    if (selectedEl) selectedEl.style.backgroundColor = e.target.value;
  });

  borderColor.addEventListener("input", e => {
    borderHex.value = e.target.value;
    if (selectedEl) {
      selectedEl.style.borderColor = e.target.value;
      if (getComputedStyle(selectedEl).borderStyle === "none") selectedEl.style.borderStyle = "solid";
    }
  });
  borderHex.addEventListener("input", e => {
    borderColor.value = e.target.value;
    if (selectedEl) {
      selectedEl.style.borderColor = e.target.value;
      if (getComputedStyle(selectedEl).borderStyle === "none") selectedEl.style.borderStyle = "solid";
    }
  });

  root.querySelectorAll(".sp-color-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      if (!selectedEl) return;
      const col = sw.dataset.col;
      selectedEl.style.backgroundColor = col;
      if (col !== "transparent") {
        bgHex.value = col;
        bgColor.value = col;
      } else {
        bgHex.value = "transparent";
      }
      showToast(`Set background: ${col}`);
    });
  });

  /* ── Layers Tab: Z-Index & Breadcrumbs ── */
  function ensurePositioned(el) {
    const pos = window.getComputedStyle(el).position;
    if (pos === "static") el.style.position = "relative";
  }

  btnPushBack.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    selectedEl.style.zIndex = "-1";
    zInput.value = -1;
    showToast("⬇ Pushed element to back (z-index: -1)");
  });

  btnBringFront.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    selectedEl.style.zIndex = "9999";
    zInput.value = 9999;
    showToast("⬆ Brought element to front (z-index: 9999)");
  });

  zUpBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    const cur = parseInt(zInput.value) || 0;
    const next = cur + 1;
    zInput.value = next;
    selectedEl.style.zIndex = next;
  });

  zDownBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    const cur = parseInt(zInput.value) || 0;
    const next = cur - 1;
    zInput.value = next;
    selectedEl.style.zIndex = next;
  });

  zInput.addEventListener("change", e => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    selectedEl.style.zIndex = e.target.value;
  });

  function buildBreadcrumbs(el) {
    breadcrumbs.innerHTML = "";
    const chain = [];
    let curr = el;
    while (curr && curr !== document.body && curr !== document.documentElement && !isOwn(curr)) {
      chain.unshift(curr);
      curr = curr.parentElement;
    }
    chain.forEach((node, idx) => {
      const tag = node.tagName.toLowerCase();
      const id = node.id ? "#" + node.id : "";
      const cls = (typeof node.className === "string" && node.className.trim())
        ? "." + node.className.trim().split(/\s+/)[0] : "";
      const btn = document.createElement("button");
      btn.className = "sp-crumb-tag" + (node === el ? " current" : "");
      btn.textContent = tag + id + cls;
      btn.addEventListener("click", () => selectElement(node));
      breadcrumbs.appendChild(btn);

      if (idx < chain.length - 1) {
        const sep = document.createElement("span");
        sep.className = "sp-crumb-sep";
        sep.textContent = ">";
        breadcrumbs.appendChild(sep);
      }
    });
  }

  /* ── Live Code Tab ── */
  subtabHtml.addEventListener("click", () => {
    activeCodeMode = "html";
    subtabHtml.classList.add("active");
    subtabCss.classList.remove("active");
    updateCodeEditorContent();
  });
  subtabCss.addEventListener("click", () => {
    activeCodeMode = "css";
    subtabCss.classList.add("active");
    subtabHtml.classList.remove("active");
    updateCodeEditorContent();
  });

  function updateCodeEditorContent() {
    if (!selectedEl) return;
    if (activeCodeMode === "html") {
      codeVal.value = selectedEl.outerHTML;
    } else {
      codeVal.value = selectedEl.getAttribute("style") || "";
    }
  }

  applyCodeBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    if (activeCodeMode === "html") {
      try {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = codeVal.value.trim();
        const newEl = wrapper.firstElementChild;
        if (newEl && selectedEl.parentNode) {
          undoStack.push({ type: "html", oldEl: selectedEl, newEl, parent: selectedEl.parentNode });
          selectedEl.parentNode.replaceChild(newEl, selectedEl);
          selectedEl = newEl;
          selectElement(selectedEl);
          showToast("✓ Hot-reloaded HTML changes live!");
        }
      } catch (err) {
        showToast("HTML syntax error", 2000);
      }
    } else {
      selectedEl.setAttribute("style", codeVal.value);
      selectElement(selectedEl);
      showToast("✓ Applied CSS live!");
    }
    applyCodeBtn.classList.add("applied");
    setTimeout(() => applyCodeBtn.classList.remove("applied"), 1200);
  });

  /* ── Animations Tab ── */
  function updateAnimationInfo(el, cs) {
    const animName = cs.animationName;
    if (!animName || animName === "none") {
      animInfo.textContent = "No CSS keyframe animation active on this element.";
    } else {
      animInfo.innerHTML = `<strong>Name:</strong> ${animName}<br><strong>Duration:</strong> ${cs.animationDuration}<br><strong>Timing:</strong> ${cs.animationTimingFunction}`;
    }
  }

  root.querySelectorAll(".sp-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!selectedEl) return;
      const preset = btn.dataset.preset;
      selectedEl.style.animation = `sp-${preset}-anim 1.5s ease-in-out infinite`;
      showToast(`⚡ Applied ${preset.toUpperCase()} animation!`);
    });
  });

  /* ══════════════════════════════════════════════════════════
     Free Live Drag Anywhere (Move Mode)
     ══════════════════════════════════════════════════════════ */
  let isDragging = false, dragStart = { x: 0, y: 0 }, dragTarget = null, initTransform = "";

  document.addEventListener("mousedown", e => {
    if (!isEnabled || isOwn(e.target)) return;
    if (activeToolMode === "move") {
      dragTarget = e.target;
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      initTransform = dragTarget.style.transform || "";
      ensurePositioned(dragTarget);
      dragTarget.classList.add("sp-free-dragging");
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener("mousemove", e => {
    if (isDragging && dragTarget) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
      // Keep select outline following
      if (dragTarget === selectedEl) {
        const r = dragTarget.getBoundingClientRect();
        selectBox.style.left = r.left + "px";
        selectBox.style.top = r.top + "px";
      }
    } else if (isEnabled) {
      // Hover Outline Tracker
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isOwn(el)) {
        hoverBox.style.display = "none";
        hoverLbl.style.display = "none";
        return;
      }
      hoveredEl = el;
      const r = el.getBoundingClientRect();
      hoverBox.style.display = "block";
      hoverBox.style.left = r.left + "px";
      hoverBox.style.top = r.top + "px";
      hoverBox.style.width = r.width + "px";
      hoverBox.style.height = r.height + "px";

      const tagStr = el.tagName.toLowerCase();
      const idStr = el.id ? "#" + el.id : "";
      const clsStr = (typeof el.className === "string" && el.className.trim())
        ? "." + el.className.trim().split(/\s+/)[0] : "";
      hoverLbl.textContent = `${tagStr}${idStr}${clsStr}`;
      hoverLbl.style.display = "block";
      hoverLbl.style.top = Math.max(4, r.top - 24) + "px";
      hoverLbl.style.left = Math.max(4, r.left) + "px";
    }
  }, true);

  document.addEventListener("mouseup", () => {
    if (isDragging && dragTarget) {
      dragTarget.classList.remove("sp-free-dragging");
      undoStack.push({
        type: "move",
        node: dragTarget,
        transform: initTransform
      });
      isDragging = false;
      dragTarget = null;
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Canvas Click Handler (Inspect, Delete, Palette, Layers)
     ══════════════════════════════════════════════════════════ */
  document.addEventListener("click", e => {
    if (!isEnabled || isOwn(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = e.target;

    if (activeToolMode === "delete") {
      undoStack.push({
        type: "delete",
        node: target,
        parent: target.parentNode,
        next: target.nextSibling
      });
      target.remove();
      if (target === selectedEl) {
        popup.classList.remove("sp-open");
        selectBox.style.display = "none";
        selectedEl = null;
      }
      showToast("✂️ Element deleted • Press Ctrl+Z to undo");
      return;
    }

    // Default or other tool modes: Select element & open floating editor
    selectElement(target);

    // Switch to corresponding tab if specific tool was picked in popup
    if (activeToolMode === "color") {
      root.querySelector(".sp-pop-tab[data-tab='style']").click();
    } else if (activeToolMode === "layers") {
      root.querySelector(".sp-pop-tab[data-tab='layers']").click();
    } else if (activeToolMode === "code") {
      root.querySelector(".sp-pop-tab[data-tab='code']").click();
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Global Shortcuts (Esc, Ctrl+Z, Alt+C)
     ══════════════════════════════════════════════════════════ */
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (popup.classList.contains("sp-open")) {
        popup.classList.remove("sp-open");
        selectBox.style.display = "none";
        selectedEl = null;
      } else if (isEnabled) {
        turnOffStylePeek();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (undoStack.length > 0) {
        e.preventDefault();
        const action = undoStack.pop();
        if (action.type === "delete" && action.parent) {
          action.parent.insertBefore(action.node, action.next || null);
          showToast("↺ Restored deleted element");
        } else if (action.type === "html" && action.parent) {
          action.parent.replaceChild(action.oldEl, action.newEl);
          selectedEl = action.oldEl;
          selectElement(selectedEl);
          showToast("↺ Restored previous HTML");
        } else if (action.type === "move" && action.node) {
          action.node.style.transform = action.transform || "";
          showToast("↺ Restored element position");
        }
      }
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      captureVisibleViewport();
    }
  });

  /* ══════════════════════════════════════════════════════════
     Activation / Deactivation Modes
     ══════════════════════════════════════════════════════════ */
  function turnOnStylePeek(mode = "inspect") {
    isEnabled = true;
    activeToolMode = mode;
    document.body.classList.toggle("sp-mode-move", mode === "move");
    showToast(`StylePeek ON (${mode.toUpperCase()}) • Hover & click elements`);
  }

  function turnOffStylePeek() {
    isEnabled = false;
    activeToolMode = "inspect";
    document.body.classList.remove("sp-mode-move");
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";
    selectBox.style.display = "none";
    popup.classList.remove("sp-open");
    selectedEl = null;
    showToast("StylePeek OFF • Page restored to normal");
  }

  /* ── Chrome Extension Messaging ── */
  chrome.runtime.onMessage.addListener((msg, _, res) => {
    if (msg.action === "turnOn") {
      turnOnStylePeek(msg.mode || "inspect");
      res({ active: isEnabled, mode: activeToolMode });
    } else if (msg.action === "turnOff") {
      turnOffStylePeek();
      res({ active: isEnabled });
    } else if (msg.action === "startTool") {
      turnOnStylePeek(msg.mode);
      res({ active: isEnabled, mode: activeToolMode });
    } else if (msg.action === "getStatus") {
      res({ active: isEnabled, mode: activeToolMode, hasSelection: !!selectedEl });
    } else if (msg.action === "captureViewport") {
      captureVisibleViewport();
      res({ success: true });
    }
    return true;
  });

  /* ══════════════════════════════════════════════════════════
     Visible Phone Viewport Extractor
     ══════════════════════════════════════════════════════════ */
  async function captureVisibleViewport() {
    showToast("📸 Capturing rendered phone viewport...");
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. Mark elements on the live DOM
    const allBodyEls = Array.from(document.body.querySelectorAll("*"));
    for (const el of allBodyEls) {
      if (isOwn(el)) continue;

      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
        el.setAttribute("data-sp-prune", "true");
        continue;
      }

      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const isOutside = (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw);
        if (isOutside) {
          el.setAttribute("data-sp-offscreen", "true");
        }
      }
    }

    // 2. Detach StylePeek root temporarily
    root.remove();
    const docClone = document.documentElement.cloneNode(true);
    document.documentElement.appendChild(root);

    // 3. Remove temporary attributes from live DOM
    for (const el of allBodyEls) {
      el.removeAttribute("data-sp-prune");
      el.removeAttribute("data-sp-offscreen");
    }

    // 4. Purge scripts, iframes, and StylePeek artifacts
    docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
    docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
    docClone.querySelectorAll("#sp-root, [id^='sp-'], .sp-popover, #sp-dock").forEach(e => e.remove());

    // 5. Prune offscreen / unrendered nodes
    docClone.querySelectorAll("[data-sp-prune='true']").forEach(e => e.remove());
    const offscreenNodes = Array.from(docClone.querySelectorAll("[data-sp-offscreen='true']"));
    for (let i = offscreenNodes.length - 1; i >= 0; i--) {
      const node = offscreenNodes[i];
      if (!node.parentNode) continue;
      const hasOnscreenChild = node.querySelector(":not([data-sp-offscreen='true'])");
      if (!hasOnscreenChild) {
        node.remove();
      } else {
        node.removeAttribute("data-sp-offscreen");
      }
    }
    docClone.querySelectorAll("[data-sp-offscreen]").forEach(e => e.removeAttribute("data-sp-offscreen"));

    // 6. Inlining Images into Base64
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
          } else {
            cImg.src = new URL(srcAttr, window.location.href).href;
          }
        } catch (err) {
          try { cImg.src = new URL(srcAttr, window.location.href).href; } catch(e){}
        }
      }
    }

    // 7. Inlining Stylesheets & Presets
    let fullCSS = `
/* ── StylePeek Studio: Mobile Fluid Viewport Export (${vw}x${vh}) ── */
* { box-sizing: border-box; }
html { margin: 0 auto; max-width: 100%; min-height: 100vh; }
body { margin: 0 auto; width: 100%; max-width: 100%; min-height: 100vh; }
`;

    const styleLinks = Array.from(document.querySelectorAll("link[rel='stylesheet']"));
    for (const link of styleLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      try {
        const absUrl = new URL(href, window.location.href).href;
        const res = await fetch(absUrl);
        if (res.ok) {
          const text = await res.text();
          fullCSS += `\n/* Inlined from ${href} */\n` + text + "\n";
        }
      } catch (e) {}
    }

    const styleTags = Array.from(document.querySelectorAll("style"));
    for (const st of styleTags) {
      if (st.closest && st.closest("#sp-root")) continue;
      fullCSS += "\n" + st.textContent + "\n";
    }

    // 8. Configure Head
    let cloneHead = docClone.querySelector("head");
    if (!cloneHead) {
      cloneHead = document.createElement("head");
      docClone.insertBefore(cloneHead, cloneBody);
    }
    cloneHead.querySelectorAll("link[rel='stylesheet'], style").forEach(el => el.remove());

    let baseEl = cloneHead.querySelector("base");
    if (!baseEl) {
      baseEl = document.createElement("base");
      cloneHead.insertBefore(baseEl, cloneHead.firstChild);
    }
    baseEl.href = window.location.origin + "/";

    let metaVp = cloneHead.querySelector("meta[name='viewport']");
    if (!metaVp) {
      metaVp = document.createElement("meta");
      metaVp.name = "viewport";
      cloneHead.appendChild(metaVp);
    }
    metaVp.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

    const styleEl = document.createElement("style");
    styleEl.textContent = fullCSS;
    cloneHead.appendChild(styleEl);

    const titleEl = cloneHead.querySelector("title") || document.createElement("title");
    titleEl.textContent = `Phone Viewport (${vw}x${vh}) - StylePeek`;
    if (!cloneHead.querySelector("title")) cloneHead.appendChild(titleEl);

    // 9. Download file cleanly
    const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;
    const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `phone-viewport-${vw}x${vh}-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { a.remove(); } catch (e) {}
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 1500);

    showToast(`✓ Downloaded ${a.download}`);
  }
})();
