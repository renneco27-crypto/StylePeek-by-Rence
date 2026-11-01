(function () {
  if (window.__stylePeekInjected) return;
  window.__stylePeekInjected = true;

  let isEnabled = false;
  let activeToolMode = "inspect"; // "inspect", "move", "color", "layers", "code", "delete"
  let selectedEl = null;
  let hoveredEl = null;
  const undoStack = [];

  // Morphing States (GSAP & Figma Compatible)
  let stateA = null;
  let stateB = null;
  let currentMorphState = "A";

  /* ── Scaffold Studio Drawer ── */
  const root = document.createElement("div");
  root.id = "sp-root";
  root.innerHTML = `
    <!-- Outlines -->
    <div id="sp-hover-box"></div>
    <div id="sp-hover-label"></div>
    <div id="sp-select-box">
      <div id="sp-select-badge"></div>
    </div>

    <!-- Toast Notification -->
    <div id="sp-toast"><span class="sp-dot"></span><span id="sp-toast-text"></span></div>

    <!-- Bottom Studio Drawer -->
    <div id="sp-drawer">
      <div id="sp-drawer-header">
        <div id="sp-drawer-drag-handle" title="Drag to move panel anywhere on screen">⋮⋮</div>
        <div class="sp-drawer-title-group">
          <span id="sp-drawer-tag">div</span>
          <span id="sp-drawer-name">.element</span>
          <button class="sp-lock-tag" id="sp-lock-btn" title="Target Lock protects from accidental clicks. Click to toggle.">🔒 Locked</button>
        </div>

        <div id="sp-drawer-tabs">
          <button class="sp-drawer-tab sp-active" data-tab="style">🎨 Style</button>
          <button class="sp-drawer-tab" data-tab="layers">🥞 Layers</button>
          <button class="sp-drawer-tab" data-tab="code">💻 Code</button>
          <button class="sp-drawer-tab" data-tab="morph">⚡ Morph / GSAP</button>
        </div>

        <button class="sp-drawer-close-btn" id="sp-drawer-close" title="Close drawer (Esc)">✕</button>
      </div>

      <div id="sp-drawer-body">
        <!-- Tab 1: Simplified Colors & Hex -->
        <div class="sp-tab-pane sp-active" id="pane-style">
          <div class="sp-color-grid">
            <div class="sp-color-card">
              <span class="sp-color-label">Text Color</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-text-hex" value="#ffffff">
                <input type="color" class="sp-color-btn" id="sp-text-color" value="#ffffff">
              </div>
            </div>

            <div class="sp-color-card">
              <span class="sp-color-label">Background</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-bg-hex" value="#000000">
                <input type="color" class="sp-color-btn" id="sp-bg-color" value="#000000">
              </div>
            </div>

            <div class="sp-color-card">
              <span class="sp-color-label">Border Color</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-border-hex" value="#3b82f6">
                <input type="color" class="sp-color-btn" id="sp-border-color" value="#3b82f6">
              </div>
            </div>
          </div>

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

        <!-- Tab 2: Layers & DOM Hierarchy Breadcrumbs -->
        <div class="sp-tab-pane" id="pane-layers">
          <div class="sp-layers-controls">
            <button class="sp-layer-btn back" id="sp-btn-push-back" title="Push element behind other layers">
              <span>⬇ Push to Back</span>
            </button>
            <button class="sp-layer-btn front" id="sp-btn-bring-front" title="Bring element to top layer">
              <span>⬆ Bring to Front</span>
            </button>

            <div class="sp-zindex-box">
              <span style="font-size:10.5px;color:#94A3B8;font-weight:600">Z-Index:</span>
              <button class="sp-step-btn" id="sp-z-down" title="Step Down (-1)">−</button>
              <input type="number" class="sp-zindex-input" id="sp-zindex-val" value="0">
              <button class="sp-step-btn" id="sp-z-up" title="Step Up (+1)">+</button>
            </div>
          </div>

          <div class="sp-tree-label">DOM LAYER HIERARCHY (CLICK TO JUMP LAYERS):</div>
          <div id="sp-dom-breadcrumbs"></div>
        </div>

        <!-- Tab 3: Live Code Editor -->
        <div class="sp-tab-pane" id="pane-code">
          <div class="sp-code-bar">
            <div class="sp-code-subtabs">
              <button class="sp-code-subtab active" id="sp-subtab-html">HTML</button>
              <button class="sp-code-subtab" id="sp-subtab-css">CSS</button>
            </div>
            <span style="font-size:10px;color:#64748B">Instant live hot-reload</span>
          </div>
          <textarea class="sp-code-textarea" id="sp-code-val" spellcheck="false"></textarea>
          <button class="sp-apply-code-btn" id="sp-apply-code">Apply Live Changes</button>
        </div>

        <!-- Tab 4: Morph & GSAP / Figma Compatible -->
        <div class="sp-tab-pane" id="pane-morph">
          <div class="sp-morph-grid">
            <button class="sp-morph-btn" id="sp-capture-state-a" title="Capture current resting state">
              <span>📸 Set State A (Resting)</span>
            </button>
            <button class="sp-morph-btn" id="sp-capture-state-b" title="Capture current modified state">
              <span>📸 Set State B (Active)</span>
            </button>
          </div>

          <button class="sp-morph-action-btn" id="sp-trigger-morph">
            <span>✨ Morph State A ⇄ State B (Live Transition)</span>
          </button>

          <div class="sp-tree-label">GSAP FLIP / TWEEN CODE (CLICK TO COPY):</div>
          <div class="sp-gsap-box" id="sp-gsap-code">// Click Set State A & State B above to generate GSAP morph code</div>
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
  const drawer        = root.querySelector("#sp-drawer");
  const drawerTag     = root.querySelector("#sp-drawer-tag");
  const drawerName    = root.querySelector("#sp-drawer-name");
  const drawerClose   = root.querySelector("#sp-drawer-close");
  const lockBtn       = root.querySelector("#sp-lock-btn");

  let isTargetLocked = true;
  let unlockPending = false;

  const textHex       = root.querySelector("#sp-text-hex");
  const textColor     = root.querySelector("#sp-text-color");
  const bgHex         = root.querySelector("#sp-bg-hex");
  const bgColor       = root.querySelector("#sp-bg-color");
  const borderHex     = root.querySelector("#sp-border-hex");
  const borderColor   = root.querySelector("#sp-border-color");

  const btnPushBack   = root.querySelector("#sp-btn-push-back");
  const btnBringFront = root.querySelector("#sp-btn-bring-front");
  const zDownBtn      = root.querySelector("#sp-z-down");
  const zUpBtn        = root.querySelector("#sp-z-up");
  const zInput        = root.querySelector("#sp-zindex-val");
  const breadcrumbs   = root.querySelector("#sp-dom-breadcrumbs");

  const subtabHtml    = root.querySelector("#sp-subtab-html");
  const subtabCss     = root.querySelector("#sp-subtab-css");
  const codeVal       = root.querySelector("#sp-code-val");
  const applyCodeBtn  = root.querySelector("#sp-apply-code");
  let activeCodeMode  = "html";

  const btnStateA     = root.querySelector("#sp-capture-state-a");
  const btnStateB     = root.querySelector("#sp-capture-state-b");
  const btnMorph      = root.querySelector("#sp-trigger-morph");
  const gsapCodeBox   = root.querySelector("#sp-gsap-code");

  function showToast(msg, duration = 2400) {
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

  function ensurePositioned(el) {
    const pos = window.getComputedStyle(el).position;
    if (pos === "static") el.style.position = "relative";
  }

  /* ── Tab Switching ── */
  root.querySelectorAll(".sp-drawer-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".sp-drawer-tab").forEach(b => b.classList.remove("sp-active"));
      root.querySelectorAll(".sp-tab-pane").forEach(p => p.classList.remove("sp-active"));
      btn.classList.add("sp-active");
      const targetPane = root.querySelector(`#pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add("sp-active");
    });
  });

  function updateLockBtnUI() {
    if (!lockBtn) return;
    lockBtn.textContent = isTargetLocked ? "🔒 Locked" : "🔓 Unlocked";
    lockBtn.classList.toggle("unlocked", !isTargetLocked);
  }

  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      isTargetLocked = !isTargetLocked;
      unlockPending = false;
      updateLockBtnUI();
      if (selectedEl) updateSelectBox(selectedEl);
      showToast(isTargetLocked ? "🔒 Target Locked (Safe from misclicks)" : "🔓 Target Unlocked (Single click changes target)");
    });
  }

  drawerClose.addEventListener("click", () => {
    drawer.classList.remove("sp-open");
    selectBox.style.display = "none";
    selectedEl = null;
    isTargetLocked = true;
    unlockPending = false;
  });

  /* ── Draggable Popup / Drawer Header ── */
  (function initDraggableDrawer() {
    const hdr = root.querySelector("#sp-drawer-header");
    let isDraggingDrawer = false, ox = 0, oy = 0;

    hdr.addEventListener("mousedown", e => {
      // Don't drag if clicking buttons, tabs, or inputs
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".sp-drawer-tab")) return;

      isDraggingDrawer = true;
      const r = drawer.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;

      // Unlock from fixed bottom styling so it floats freely
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
      const top  = Math.max(10, Math.min(window.innerHeight - 50, e.clientY - oy));
      drawer.style.left = left + "px";
      drawer.style.top = top + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      isDraggingDrawer = false;
    });
  })();

  /* ── Select and Inspect Element ── */
  function selectElement(el) {
    if (!el || isOwn(el)) return;
    selectedEl = el;
    isTargetLocked = true;
    unlockPending = false;
    updateLockBtnUI();

    updateSelectBox(el);

    const tagStr = el.tagName.toLowerCase();
    const idStr = el.id ? "#" + el.id : "";
    const clsStr = (typeof el.className === "string" && el.className.trim())
      ? "." + el.className.trim().split(/\s+/)[0] : "";

    drawerTag.textContent = tagStr;
    drawerName.textContent = idStr || clsStr || "";

    // Read Styles for Color Tab
    const cs = window.getComputedStyle(el);
    const txtHex = rgbToHex(cs.color);
    textHex.value = txtHex; textColor.value = txtHex;

    const bgH = rgbToHex(cs.backgroundColor);
    bgHex.value = bgH; bgColor.value = bgH;

    const bdrH = rgbToHex(cs.borderColor);
    borderHex.value = bdrH; borderColor.value = bdrH;

    // Read Z-Index & Build Hierarchy
    const currentZ = parseInt(cs.zIndex);
    zInput.value = isNaN(currentZ) ? 0 : currentZ;
    buildBreadcrumbs(el);

    // Update Code Tab
    updateCodeEditorContent();

    // Reset morph states for newly selected element
    stateA = null;
    stateB = null;
    gsapCodeBox.textContent = `// Target: ${tagStr}${idStr}${clsStr}\n// Click 'Set State A' & 'Set State B' to generate GSAP morph code`;

    drawer.classList.add("sp-open");
  }

  function updateSelectBox(el) {
    if (!el) { selectBox.style.display = "none"; return; }
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
    const lockIcon = isTargetLocked ? " 🔒" : "";
    selectBadge.textContent = `${tagStr}${idStr}${clsStr} (${Math.round(r.width)}×${Math.round(r.height)})${lockIcon}`;
  }

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
        bgHex.value = col; bgColor.value = col;
      } else {
        bgHex.value = "transparent";
      }
      showToast(`Set background: ${col}`);
    });
  });

  /* ── Layers Tab: Z-Index & Breadcrumbs ── */
  btnPushBack.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    selectedEl.style.zIndex = "-1";
    zInput.value = -1;
    showToast("⬇ Pushed element behind (z-index: -1)");
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
    const next = (parseInt(zInput.value) || 0) + 1;
    zInput.value = next;
    selectedEl.style.zIndex = next;
  });

  zDownBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    const next = (parseInt(zInput.value) || 0) - 1;
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

  /* ── Code Tab ── */
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
          showToast("✓ Hot-reloaded HTML live!");
        }
      } catch (err) {
        showToast("HTML syntax error", 2000);
      }
    } else {
      selectedEl.setAttribute("style", codeVal.value);
      selectElement(selectedEl);
      showToast("✓ Applied CSS live!");
    }
  });

  /* ── Morphing & GSAP / Figma Compatibility (State A ↔ State B) ── */
  function captureState(el) {
    const cs = window.getComputedStyle(el);
    const tr = getElementTranslate(el);
    return {
      x: tr.x,
      y: tr.y,
      transform: el.style.transform || "",
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      width: el.offsetWidth,
      height: el.offsetHeight,
      opacity: cs.opacity,
      boxShadow: cs.boxShadow
    };
  }

  btnStateA.addEventListener("click", () => {
    if (!selectedEl) return;
    stateA = captureState(selectedEl);
    btnStateA.style.borderColor = "#10B981";
    btnStateA.style.color = "#10B981";
    showToast("✓ State A (Resting) captured!");
    updateGSAPCode();
  });

  btnStateB.addEventListener("click", () => {
    if (!selectedEl) return;
    stateB = captureState(selectedEl);
    btnStateB.style.borderColor = "#22D3EE";
    btnStateB.style.color = "#22D3EE";
    showToast("✓ State B (Active) captured!");
    updateGSAPCode();
  });

  function updateGSAPCode() {
    if (!stateA || !stateB || !selectedEl) return;
    const tag = selectedEl.tagName.toLowerCase();
    const selector = selectedEl.id ? `#${selectedEl.id}` : (selectedEl.className ? `.${selectedEl.className.trim().split(/\s+/)[0]}` : tag);
    const code = `// ⚡ GSAP Tween (State A → State B)
gsap.to("${selector}", {
  x: ${stateB.x},
  y: ${stateB.y},
  backgroundColor: "${stateB.backgroundColor}",
  duration: 0.4,
  ease: "power2.out"
});`;
    gsapCodeBox.textContent = code;
  }

  gsapCodeBox.addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gsapCodeBox.textContent);
      showToast("📋 Copied GSAP code to clipboard!");
    }
  });

  btnMorph.addEventListener("click", () => {
    if (!selectedEl) return;
    if (!stateA || !stateB) {
      showToast("Please capture State A and State B first!");
      return;
    }

    // Apply smooth CSS morph transition
    selectedEl.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    const targetState = currentMorphState === "A" ? stateB : stateA;
    currentMorphState = currentMorphState === "A" ? "B" : "A";

    selectedEl.style.transform = `translate(${targetState.x}px, ${targetState.y}px)`;
    selectedEl._spTranslate = { x: targetState.x, y: targetState.y };
    selectedEl.style.backgroundColor = targetState.backgroundColor;
    updateSelectBox(selectedEl);
    showToast(`✨ Morphed to State ${currentMorphState}!`);
  });

  /* ══════════════════════════════════════════════════════════
     Free Live Dragging (No Snapping Back!)
     ══════════════════════════════════════════════════════════ */
  function getElementTranslate(el) {
    if (el._spTranslate) return el._spTranslate;
    const tr = el.style.transform || "";
    const match = tr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (match) {
      return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }
    return { x: 0, y: 0 };
  }

  let isDragging = false;
  let dragTarget = null;
  let dragOrigin = { mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 };

  document.addEventListener("mousedown", e => {
    if (!isEnabled || isOwn(e.target)) return;

    if (activeToolMode === "move") {
      dragTarget = (selectedEl && (selectedEl === e.target || selectedEl.contains(e.target)))
        ? selectedEl : e.target;

      isDragging = true;
      ensurePositioned(dragTarget);

      const curTranslate = getElementTranslate(dragTarget);
      dragOrigin = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elemX: curTranslate.x,
        elemY: curTranslate.y
      };

      dragTarget.classList.add("sp-free-dragging");
      selectElement(dragTarget);
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener("mousemove", e => {
    if (isDragging && dragTarget) {
      const dx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX);
      const dy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY);
      dragTarget._spTranslate = { x: dx, y: dy };
      dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
      updateSelectBox(dragTarget);
    } else if (isEnabled && !isDragging) {
      // Hover Outline Tracker (if target not locked in move mode)
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
        translate: { ...dragTarget._spTranslate }
      });
      isDragging = false;
      dragTarget = null;
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Canvas Click Handler
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
        drawer.classList.remove("sp-open");
        selectBox.style.display = "none";
        selectedEl = null;
      }
      showToast("✂️ Element deleted • Press Ctrl+Z to undo");
      return;
    }

    // Accidental Misclick Protection:
    if (selectedEl && isTargetLocked) {
      if (target === selectedEl || selectedEl.contains(target)) {
        // Clicked inside the target or its direct children: keep target locked!
        unlockPending = false;
        selectElement(selectedEl);
        return;
      }

      // Clicked outside target:
      if (!unlockPending) {
        // 1st click outside: protect target!
        unlockPending = true;
        selectBadge.textContent = "🔓 Click again to switch target";
        showToast("Target protected • Click again to switch target", 1800);
        return;
      } else {
        // 2nd click outside ("the next next click"): now distarget and switch!
        unlockPending = false;
      }
    }

    selectElement(target);

    // Switch to corresponding tab if specific tool was picked in popup
    if (activeToolMode === "color") {
      root.querySelector(".sp-drawer-tab[data-tab='style']").click();
    } else if (activeToolMode === "layers") {
      root.querySelector(".sp-drawer-tab[data-tab='layers']").click();
    } else if (activeToolMode === "code") {
      root.querySelector(".sp-drawer-tab[data-tab='code']").click();
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Global Shortcuts
     ══════════════════════════════════════════════════════════ */
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (drawer.classList.contains("sp-open")) {
        drawer.classList.remove("sp-open");
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
          action.node._spTranslate = { x: 0, y: 0 };
          action.node.style.transform = "";
          updateSelectBox(action.node);
          showToast("↺ Restored original element position");
        }
      }
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      captureVisibleViewport();
    }
  });

  /* ══════════════════════════════════════════════════════════
     Activation / Deactivation
     ══════════════════════════════════════════════════════════ */
  function turnOnStylePeek(mode = "inspect") {
    isEnabled = true;
    activeToolMode = mode;
    document.body.classList.toggle("sp-mode-move", mode === "move");
    showToast(`StylePeek ON (${mode.toUpperCase()}) • Click any element`);
  }

  function turnOffStylePeek() {
    isEnabled = false;
    activeToolMode = "inspect";
    document.body.classList.remove("sp-mode-move");
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";
    selectBox.style.display = "none";
    drawer.classList.remove("sp-open");
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
    docClone.querySelectorAll("#sp-root, [id^='sp-'], .sp-popover, #sp-dock, #sp-drawer").forEach(e => e.remove());

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
