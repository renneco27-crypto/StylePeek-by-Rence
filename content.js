(function () {
  if (window.__stylePeekInjected) return;
  window.__stylePeekInjected = true;

  let isEnabled = false;
  let activeToolMode = "inspect"; // "inspect", "move", "resize", "style", "layers", "code", "delete"
  let selectedEl = null;
  let hoveredEl = null;
  const undoStack = [];

  // Morphing & Preview States
  let currentMorphState = "A";
  let sandboxMode = "component"; // "component" or "context"
  let isolatedLayerNode = null;

  /* ── Scaffold Studio Root, Dock, Drawer, Floating Preview & Modal ── */
  const root = document.createElement("div");
  root.id = "sp-root";
  root.innerHTML = `
    <!-- Outlines with 4 Corner Resizers -->
    <div id="sp-hover-box"></div>
    <div id="sp-hover-label"></div>
    <div id="sp-select-box">
      <div id="sp-select-badge"></div>
      <div class="sp-resize-handle nw" data-dir="nw" title="Drag corner to stretch"></div>
      <div class="sp-resize-handle ne" data-dir="ne" title="Drag corner to stretch"></div>
      <div class="sp-resize-handle se" data-dir="se" title="Drag corner to stretch"></div>
      <div class="sp-resize-handle sw" data-dir="sw" title="Drag corner to stretch"></div>
    </div>

    <!-- Floating Tool Sidebar Dock (Visible ONLY when StylePeek is ON) -->
    <div id="sp-sidebar-dock">
      <div id="sp-dock-handle" title="Drag dock">⋮⋮</div>
      <button class="sp-dock-btn sp-dock-active" data-tool="inspect" title="Inspect & Select Element (I)">🔍</button>
      <button class="sp-dock-btn" data-tool="move" title="Free Live Drag (M)">✋</button>
      <button class="sp-dock-btn" data-tool="resize" title="Stretch / Resize Element (S)">↔️</button>
      <button class="sp-dock-btn add-btn" data-tool="add" id="sp-dock-add" title="Add Element or Picture (A)">➕</button>
      <button class="sp-dock-btn" data-tool="style" title="Colors & Border Styling (C)">🎨</button>
      <button class="sp-dock-btn" data-tool="layers" title="Layers, Backgrounds & Send to Back (L)">🥞</button>
      <button class="sp-dock-btn" data-tool="code" title="Code Studio & Live Morph (K)">💻</button>
      <button class="sp-dock-btn" data-tool="delete" title="Delete Element (D)">✂️</button>
      <div class="sp-dock-sep"></div>
      <button class="sp-dock-btn" id="sp-dock-capture" title="Capture Visible Phone Viewport (Alt+C)">📸</button>
      <button class="sp-dock-btn power-btn" id="sp-dock-power" title="Turn OFF StylePeek">⭕</button>
    </div>

    <!-- Add Element or Picture Modal (Hallmark Spacious UX) -->
    <div id="sp-add-element-modal">
      <div class="sp-add-modal-header">
        <span class="sp-add-modal-title">➕ ADD ELEMENT OR PICTURE</span>
        <button class="sp-modal-x" id="sp-add-modal-close" title="Close">✕</button>
      </div>
      <div class="sp-add-modal-body">
        <!-- Photo / Picture Card -->
        <div class="sp-add-card">
          <div class="sp-add-card-header">
            <span class="sp-add-card-icon">🖼️</span>
            <div class="sp-add-card-info">
              <strong>Add Photo / Picture</strong>
              <span>Upload image from your computer or enter URL to place on canvas</span>
            </div>
          </div>
          <div class="sp-add-input-row">
            <input type="text" class="sp-input" id="sp-add-img-url" placeholder="Paste image URL (https://...) or data:image...">
            <button class="sp-primary-btn" id="sp-btn-insert-img-url">Insert URL</button>
          </div>
          <div class="sp-add-file-row">
            <label class="sp-file-label" title="Upload image from computer">
              📁 Choose Picture from Computer
              <input type="file" id="sp-add-img-file" accept="image/*" style="display:none">
            </label>
          </div>
        </div>

        <!-- Quick Elements Grid -->
        <div class="sp-add-card-grid">
          <div class="sp-add-card mini">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="sp-add-card-icon">📦</span>
              <div class="sp-add-card-info">
                <strong>Styled Card / Div</strong>
                <span>Container with padding & border</span>
              </div>
            </div>
            <button class="sp-secondary-btn" id="sp-btn-insert-box">+ Insert</button>
          </div>

          <div class="sp-add-card mini">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="sp-add-card-icon">🔤</span>
              <div class="sp-add-card-info">
                <strong>Heading / Text</strong>
                <span>Typography headline block</span>
              </div>
            </div>
            <button class="sp-secondary-btn" id="sp-btn-insert-heading">+ Insert</button>
          </div>
        </div>

        <!-- Custom Code Card -->
        <div class="sp-add-card">
          <div class="sp-add-card-header">
            <span class="sp-add-card-icon">💻</span>
            <div class="sp-add-card-info">
              <strong>Custom HTML Snippet</strong>
              <span>Paste custom HTML markup to render directly</span>
            </div>
          </div>
          <textarea class="sp-code-area-mini" id="sp-add-html-code" placeholder="<div class='custom-card'>Hello World</div>"></textarea>
          <button class="sp-primary-btn" id="sp-btn-insert-html" style="align-self:flex-end;">Insert HTML</button>
        </div>
      </div>
    </div>

    <!-- Dedicated Floating Live Inspect Preview Panel (Independent from Code Tab) -->
    <div id="sp-inspect-preview-panel">
      <div class="sp-preview-panel-header">
        <div id="sp-preview-drag-handle" title="Drag preview window">⋮⋮</div>
        <span class="sp-preview-panel-title">🔍 LIVE COMPONENT PREVIEW</span>
        <div class="sp-preview-panel-actions">
          <button class="sp-sandbox-btn" id="sp-btn-context-toggle" title="Toggle Parent & Context">View: Component</button>
          <button class="sp-sandbox-btn" id="sp-btn-refresh-preview" title="Refresh">↺</button>
          <button class="sp-preview-close-btn" id="sp-preview-close" title="Close Preview">✕</button>
        </div>
      </div>
      <div class="sp-sandbox-viewport" id="sp-sandbox-viewport"></div>
    </div>

    <!-- Toast Notification -->
    <div id="sp-toast"><span class="sp-dot"></span><span id="sp-toast-text"></span></div>

    <!-- Modal Error Inspection Alert -->
    <div id="sp-error-modal">
      <div class="sp-error-title-row">
        <span>⚠️ Code Syntax Error Detected</span>
        <button class="sp-error-close-x" id="sp-modal-x" title="Close (Esc)">✕</button>
      </div>
      <div class="sp-error-msg-box" id="sp-error-msg">Syntax Error Details</div>
      <div class="sp-error-fix-box" id="sp-error-fix">Suggested Fix: ...</div>
      <div class="sp-modal-actions">
        <button class="sp-modal-close-btn" id="sp-modal-dismiss">Dismiss</button>
        <button class="sp-modal-fix-btn" id="sp-modal-auto-fix">⚡ Apply Suggested Fix</button>
      </div>
    </div>

    <!-- Studio Drawer -->
    <div id="sp-drawer">
      <div id="sp-drawer-header">
        <div id="sp-drawer-drag-handle" title="Drag to move panel anywhere on screen">⋮⋮</div>
        <div class="sp-drawer-title-group">
          <span id="sp-drawer-tag">div</span>
          <span id="sp-drawer-name">.element</span>
          <button class="sp-lock-tag" id="sp-lock-btn" title="Target Lock protects from accidental clicks. Click to toggle.">🔒 Locked</button>
          <button class="sp-lock-tag" id="sp-btn-deselect" title="Deselect element / reset target" style="color:#F87171;border-color:#4B1D24;">✕ Reset</button>
        </div>

        <div id="sp-drawer-tabs">
          <button class="sp-drawer-tab sp-active" data-tab="style">🎨 Style</button>
          <button class="sp-drawer-tab" data-tab="layers">🥞 Layers</button>
          <button class="sp-drawer-tab" data-tab="code">💻 Code & Morph</button>
        </div>

        <button class="sp-drawer-close-btn" id="sp-drawer-close" title="Close drawer (Esc)">✕</button>
      </div>

      <div id="sp-drawer-body">
        <!-- Tab 1: Simplified Colors, Div Fill & Explicit Border Controls -->
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
              <span class="sp-color-label">Div Background Fill</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-bg-hex" value="#000000">
                <input type="color" class="sp-color-btn" id="sp-bg-color" value="#000000">
              </div>
            </div>

            <div class="sp-color-card">
              <span class="sp-color-label">Border Color & Width</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-border-hex" value="#3b82f6">
                <input type="color" class="sp-color-btn" id="sp-border-color" value="#3b82f6">
              </div>
              <div class="sp-border-options-row">
                <select class="sp-border-select" id="sp-border-width" title="Border Width">
                  <option value="1px">1px</option>
                  <option value="2px" selected>2px</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                  <option value="6px">6px</option>
                  <option value="0px">None (0px)</option>
                </select>
                <select class="sp-border-select" id="sp-border-style" title="Border Style">
                  <option value="solid" selected>Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </select>
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

        <!-- Tab 2: Layers, Background Pinpoint & Word-style Send to Back -->
        <div class="sp-tab-pane" id="pane-layers">
          <!-- Root & Theme Background Pinpointing Card -->
          <div class="sp-bg-pinpoint-card">
            <div class="sp-bg-layer-header">
              <span>🎯 PINPOINT BACKGROUNDS & HTML THEMES</span>
              <span class="sp-bg-badge" id="sp-bg-detected-count">Detected</span>
            </div>
            <div id="sp-bg-layers-list">
              <!-- Dynamically populated background layers: <html>, <body>, wrapper -->
            </div>
            <div class="sp-theme-color-row">
              <span style="font-size:11px;color:#94A3B8;font-weight:600">Theme Background:</span>
              <input type="text" class="sp-hex-input" id="sp-theme-hex" placeholder="#0f172a">
              <input type="color" class="sp-color-btn" id="sp-theme-color" value="#0f172a">
              <button class="sp-bg-action-btn" id="sp-btn-apply-theme" title="Apply background color to HTML & Body theme">Apply Theme</button>
            </div>
          </div>

          <!-- Add Custom Elements to Page -->
          <div class="sp-add-elements-card">
            <div class="sp-tree-label">➕ ADD CUSTOM ELEMENT (DRAG & SEND TO BACK):</div>
            <div class="sp-add-btn-row">
              <button class="sp-add-btn" id="sp-btn-add-image">🖼️ Add Photo / Image</button>
              <button class="sp-add-btn" id="sp-btn-add-div">📦 Add Box / Div</button>
              <button class="sp-add-btn" id="sp-btn-add-html">💻 Add Custom HTML</button>
            </div>
          </div>

          <!-- Send to Back & Stacking Controls -->
          <div class="sp-layers-controls">
            <button class="sp-layer-btn back" id="sp-btn-push-back" title="Send element to very back (Word document style)">
              <span>⬇ Send to Back</span>
            </button>
            <button class="sp-layer-btn front" id="sp-btn-bring-front" title="Bring element to top layer">
              <span>⬆ Bring to Front</span>
            </button>
            <button class="sp-layer-btn" id="sp-btn-send-canvas" title="Send element behind entire page as root background">
              <span>🌐 To Canvas BG</span>
            </button>

            <div class="sp-zindex-box">
              <span style="font-size:10.5px;color:#94A3B8;font-weight:600">Z-Index:</span>
              <button class="sp-step-btn" id="sp-z-down" title="Step Down (-1)">−</button>
              <input type="number" class="sp-zindex-input" id="sp-zindex-val" value="0">
              <button class="sp-step-btn" id="sp-z-up" title="Step Up (+1)">+</button>
            </div>
          </div>

          <div class="sp-tree-label">DOM LAYER HIERARCHY (👁️ VISIBILITY · 🎯 ISOLATE · CLICK TO JUMP):</div>
          <div id="sp-dom-breadcrumbs"></div>
        </div>

        <!-- Tab 3: Split Dual-Editor (Full Height, Unobstructed) -->
        <div class="sp-tab-pane" id="pane-code">
          <div class="sp-split-container">
            <!-- Left Column: State A -->
            <div class="sp-split-col">
              <div class="sp-split-header">
                <span>STATE A (CURRENT HTML · CSS · JS)</span>
              </div>
              <textarea class="sp-code-area" id="sp-code-a" spellcheck="false" placeholder="State A Code..."></textarea>
            </div>

            <!-- Center Actions -->
            <div class="sp-split-center-actions">
              <button class="sp-animate-btn" id="sp-btn-run-anim" title="Run animation morphing State A to State B (or apply State A if B is blank)">
                <span>⚡ Animate</span>
                <span style="font-size:9.5px;opacity:0.85">Morph A ⇄ B</span>
              </button>

              <button class="sp-apply-split-btn" id="sp-btn-apply-code" title="Apply current code to canvas element">
                <span>✓ Apply Code</span>
              </button>

              <button class="sp-copy-gsap-btn" id="sp-btn-copy-gsap" title="Copy production GSAP animation code">
                <span>📋 Copy GSAP</span>
              </button>
            </div>

            <!-- Right Column: State B -->
            <div class="sp-split-col">
              <div class="sp-split-header target">
                <span>STATE B (OPTIONAL MORPH TARGET)</span>
              </div>
              <textarea class="sp-code-area" id="sp-code-b" spellcheck="false" placeholder="Leave blank to just render State A..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.style.display = "none";
  document.documentElement.appendChild(root);

  /* ── Element References ── */
  const hoverBox          = root.querySelector("#sp-hover-box");
  const hoverLbl          = root.querySelector("#sp-hover-label");
  const selectBox         = root.querySelector("#sp-select-box");
  const selectBadge       = root.querySelector("#sp-select-badge");
  const sidebarDock       = root.querySelector("#sp-sidebar-dock");
  const dockCaptureBtn    = root.querySelector("#sp-dock-capture");
  const dockPowerBtn      = root.querySelector("#sp-dock-power");

  const previewPanel      = root.querySelector("#sp-inspect-preview-panel");
  const previewCloseBtn   = root.querySelector("#sp-preview-close");
  const sandboxViewport   = root.querySelector("#sp-sandbox-viewport");
  const btnContextToggle  = root.querySelector("#sp-btn-context-toggle");
  const btnRefreshPreview = root.querySelector("#sp-btn-refresh-preview");

  const addModal          = root.querySelector("#sp-add-element-modal");
  const addModalClose     = root.querySelector("#sp-add-modal-close");
  const addImgUrlInput    = root.querySelector("#sp-add-img-url");
  const btnInsertImgUrl   = root.querySelector("#sp-btn-insert-img-url");
  const addImgFileInput   = root.querySelector("#sp-add-img-file");
  const btnInsertBox      = root.querySelector("#sp-btn-insert-box");
  const btnInsertHeading  = root.querySelector("#sp-btn-insert-heading");
  const addHtmlCodeArea   = root.querySelector("#sp-add-html-code");
  const btnInsertHtml     = root.querySelector("#sp-btn-insert-html");

  const toast             = root.querySelector("#sp-toast");
  const toastText         = root.querySelector("#sp-toast-text");
  const drawer            = root.querySelector("#sp-drawer");
  const drawerTag         = root.querySelector("#sp-drawer-tag");
  const drawerName        = root.querySelector("#sp-drawer-name");
  const drawerClose       = root.querySelector("#sp-drawer-close");
  const lockBtn           = root.querySelector("#sp-lock-btn");
  const deselectBtn       = root.querySelector("#sp-btn-deselect");

  const errorModal        = root.querySelector("#sp-error-modal");
  const errorModalX       = root.querySelector("#sp-modal-x");
  const errorMsgEl        = root.querySelector("#sp-error-msg");
  const errorFixEl        = root.querySelector("#sp-error-fix");
  const modalDismiss      = root.querySelector("#sp-modal-dismiss");
  const modalAutoFix      = root.querySelector("#sp-modal-auto-fix");
  let pendingAutoFixFn    = null;

  const textHex           = root.querySelector("#sp-text-hex");
  const textColor         = root.querySelector("#sp-text-color");
  const bgHex             = root.querySelector("#sp-bg-hex");
  const bgColor           = root.querySelector("#sp-bg-color");
  const borderHex         = root.querySelector("#sp-border-hex");
  const borderColor       = root.querySelector("#sp-border-color");
  const borderWidthSelect = root.querySelector("#sp-border-width");
  const borderStyleSelect = root.querySelector("#sp-border-style");

  const bgLayersList      = root.querySelector("#sp-bg-layers-list");
  const bgDetectedCount   = root.querySelector("#sp-bg-detected-count");
  const themeHex          = root.querySelector("#sp-theme-hex");
  const themeColor        = root.querySelector("#sp-theme-color");
  const btnApplyTheme     = root.querySelector("#sp-btn-apply-theme");

  const btnAddImage       = root.querySelector("#sp-btn-add-image");
  const btnAddDiv         = root.querySelector("#sp-btn-add-div");
  const btnAddHtml        = root.querySelector("#sp-btn-add-html");

  const btnPushBack       = root.querySelector("#sp-btn-push-back");
  const btnBringFront     = root.querySelector("#sp-btn-bring-front");
  const btnSendCanvas     = root.querySelector("#sp-btn-send-canvas");
  const zDownBtn          = root.querySelector("#sp-z-down");
  const zUpBtn            = root.querySelector("#sp-z-up");
  const zInput            = root.querySelector("#sp-zindex-val");
  const breadcrumbs       = root.querySelector("#sp-dom-breadcrumbs");

  const codeAreaA         = root.querySelector("#sp-code-a");
  const codeAreaB         = root.querySelector("#sp-code-b");
  const btnRunAnim        = root.querySelector("#sp-btn-run-anim");
  const btnApplyCode      = root.querySelector("#sp-btn-apply-code");
  const btnCopyGsap       = root.querySelector("#sp-btn-copy-gsap");

  let isTargetLocked      = true;
  let unlockPending       = false;

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

  function getClassName(el) {
    if (!el) return "";
    if (typeof el.className === "string") return el.className;
    if (el.className && typeof el.className.baseVal === "string") return el.className.baseVal;
    if (typeof el.getAttribute === "function") return el.getAttribute("class") || "";
    return "";
  }

  function getPrimaryClass(el) {
    const raw = getClassName(el).trim();
    if (!raw) return "";
    const first = raw.split(/\s+/)[0];
    return first ? `.${first}` : "";
  }

  function getElementSelector(el) {
    if (!el || !el.tagName) return "div";
    const tag = el.tagName.toLowerCase();
    if (el.id && typeof el.id === "string") return `#${el.id}`;
    const cls = getPrimaryClass(el);
    return cls || tag;
  }

  function isOwn(el) {
    return el === root || root.contains(el);
  }

  function ensurePositioned(el) {
    const pos = window.getComputedStyle(el).position;
    if (pos === "static" || !pos) el.style.position = "relative";
  }

  /* ── Sidebar Dock Mode Switching & Sync ── */
  function syncDockUI(mode) {
    root.querySelectorAll(".sp-dock-btn[data-tool]").forEach(b => {
      b.classList.toggle("sp-dock-active", b.dataset.tool === mode);
    });
  }

  root.querySelectorAll(".sp-dock-btn[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      activeToolMode = tool;
      syncDockUI(tool);
      document.body.classList.toggle("sp-mode-move", tool === "move");

      if (tool === "add") {
        openAddModal();
        return;
      } else if (tool === "style") {
        drawer.classList.add("sp-open");
        root.querySelector(".sp-drawer-tab[data-tab='style']").click();
      } else if (tool === "layers") {
        drawer.classList.add("sp-open");
        root.querySelector(".sp-drawer-tab[data-tab='layers']").click();
      } else if (tool === "code") {
        drawer.classList.add("sp-open");
        root.querySelector(".sp-drawer-tab[data-tab='code']").click();
      } else if (tool === "inspect") {
        showToast("🔍 Inspect Mode • Click any element to open editor");
        if (selectedEl) previewPanel.classList.add("sp-show");
      } else if (tool === "move") {
        showToast("✋ Move Mode • Drag any element freely on canvas");
      } else if (tool === "resize") {
        showToast("↔️ Resize Mode • Drag outline corner handles to stretch");
      } else if (tool === "delete") {
        showToast("✂️ Delete Mode • Click element to remove (Ctrl+Z undo)");
      }
    });
  });

  dockCaptureBtn.addEventListener("click", () => {
    captureVisibleViewport();
  });

  dockPowerBtn.addEventListener("click", () => {
    turnOffStylePeek();
  });

  /* ── Draggable Sidebar Dock ── */
  (function initDraggableDock() {
    const dockHandle = root.querySelector("#sp-dock-handle");
    let isDraggingDock = false, ox = 0, oy = 0;

    dockHandle.addEventListener("mousedown", e => {
      isDraggingDock = true;
      const r = sidebarDock.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      sidebarDock.style.right = "auto";
      sidebarDock.style.left = r.left + "px";
      sidebarDock.style.top = r.top + "px";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!isDraggingDock) return;
      const left = Math.max(8, Math.min(window.innerWidth - sidebarDock.offsetWidth - 8, e.clientX - ox));
      const top  = Math.max(8, Math.min(window.innerHeight - sidebarDock.offsetHeight - 8, e.clientY - oy));
      sidebarDock.style.left = left + "px";
      sidebarDock.style.top = top + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      isDraggingDock = false;
    });
  })();

  /* ── Draggable Floating Live Preview Panel ── */
  (function initDraggablePreview() {
    const handle = root.querySelector("#sp-preview-drag-handle");
    let isDraggingP = false, ox = 0, oy = 0;

    handle.addEventListener("mousedown", e => {
      isDraggingP = true;
      const r = previewPanel.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      previewPanel.style.left = r.left + "px";
      previewPanel.style.top = r.top + "px";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!isDraggingP) return;
      const left = Math.max(8, Math.min(window.innerWidth - previewPanel.offsetWidth - 8, e.clientX - ox));
      const top  = Math.max(8, Math.min(window.innerHeight - previewPanel.offsetHeight - 8, e.clientY - oy));
      previewPanel.style.left = left + "px";
      previewPanel.style.top = top + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      isDraggingP = false;
    });
  })();

  previewCloseBtn.addEventListener("click", () => {
    previewPanel.classList.remove("sp-show");
  });

  /* ── Tab Switching with Dynamic Width Expansion ── */
  root.querySelectorAll(".sp-drawer-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".sp-drawer-tab").forEach(b => b.classList.remove("sp-active"));
      root.querySelectorAll(".sp-tab-pane").forEach(p => p.classList.remove("sp-active"));
      btn.classList.add("sp-active");
      const targetPane = root.querySelector(`#pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add("sp-active");

      // Expand drawer width in Code mode for split dual-editor
      if (btn.dataset.tab === "code") {
        drawer.classList.add("sp-expanded");
      } else {
        drawer.classList.remove("sp-expanded");
      }
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
      showToast(isTargetLocked ? "🔒 Target Locked (Safe from accidental clicks)" : "🔓 Target Unlocked");
    });
  }

  if (deselectBtn) {
    deselectBtn.addEventListener("click", () => {
      selectedEl = null;
      selectBox.style.display = "none";
      drawer.classList.remove("sp-open");
      previewPanel.classList.remove("sp-show");
      isTargetLocked = false;
      unlockPending = false;
      showToast("✕ Selection cleared");
    });
  }

  drawerClose.addEventListener("click", () => {
    drawer.classList.remove("sp-open");
    selectBox.style.display = "none";
    selectedEl = null;
    showToast("Drawer closed • Select any element to reopen");
  });

  /* ── Draggable Popup / Drawer Header ── */
  (function initDraggableDrawer() {
    const hdr = root.querySelector("#sp-drawer-header");
    let isDraggingDrawer = false, ox = 0, oy = 0;

    hdr.addEventListener("mousedown", e => {
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
    const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
    const clsStr = getPrimaryClass(el);

    drawerTag.textContent = tagStr;
    drawerName.textContent = idStr || clsStr || "";

    // Read Computed Styles
    const cs = window.getComputedStyle(el);
    const txtHex = rgbToHex(cs.color);
    textHex.value = txtHex; textColor.value = txtHex;

    const bgH = rgbToHex(cs.backgroundColor);
    bgHex.value = bgH; bgColor.value = bgH;

    const bdrH = rgbToHex(cs.borderColor);
    borderHex.value = bdrH; borderColor.value = bdrH;

    // Read Border Width & Style
    const bw = cs.borderWidth || "0px";
    if (["0px", "1px", "2px", "3px", "4px", "6px", "8px"].includes(bw)) {
      borderWidthSelect.value = bw;
    } else {
      borderWidthSelect.value = "2px";
    }
    const bs = cs.borderStyle || "none";
    if (["solid", "dashed", "dotted", "double"].includes(bs)) {
      borderStyleSelect.value = bs;
    } else {
      borderStyleSelect.value = "solid";
    }

    // Read Z-Index & Build Hierarchy
    const currentZ = parseInt(cs.zIndex);
    zInput.value = isNaN(currentZ) ? 0 : currentZ;
    buildBreadcrumbs(el);

    // Scan & Pinpoint Background Layers
    scanBackgroundLayers(el);

    // Build Combined All-in-One Code Blocks (State A & State B)
    populateDualCodePanes(el);

    // Open dedicated live preview panel
    updateSandboxPreview(el);
    previewPanel.classList.add("sp-show");

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
    const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
    const clsStr = getPrimaryClass(el);
    const lockIcon = isTargetLocked ? " 🔒" : "";
    selectBadge.textContent = `${tagStr}${idStr}${clsStr} (${Math.round(r.width)}×${Math.round(r.height)})${lockIcon}`;
  }

  /* ── 4-Corner Live Resizing / Stretching ── */
  let isResizing = false;
  let resizeDir = "";
  let resizeStart = { mouseX: 0, mouseY: 0, width: 0, height: 0, startStyleW: "", startStyleH: "" };

  selectBox.querySelectorAll(".sp-resize-handle").forEach(handle => {
    handle.addEventListener("mousedown", e => {
      if (!selectedEl) return;
      isResizing = true;
      resizeDir = handle.dataset.dir;
      const r = selectedEl.getBoundingClientRect();
      resizeStart = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: r.width,
        height: r.height,
        startStyleW: selectedEl.style.width,
        startStyleH: selectedEl.style.height
      };
      e.preventDefault();
      e.stopPropagation();
    });
  });

  window.addEventListener("mousemove", e => {
    if (!isResizing || !selectedEl) return;
    const deltaX = e.clientX - resizeStart.mouseX;
    const deltaY = e.clientY - resizeStart.mouseY;

    let newW = resizeStart.width;
    let newH = resizeStart.height;

    if (resizeDir === "se") {
      newW += deltaX; newH += deltaY;
    } else if (resizeDir === "sw") {
      newW -= deltaX; newH += deltaY;
    } else if (resizeDir === "ne") {
      newW += deltaX; newH -= deltaY;
    } else if (resizeDir === "nw") {
      newW -= deltaX; newH -= deltaY;
    }

    newW = Math.max(16, Math.round(newW));
    newH = Math.max(16, Math.round(newH));

    selectedEl.style.width = newW + "px";
    selectedEl.style.height = newH + "px";
    updateSelectBox(selectedEl);
    updateSandboxPreview(selectedEl);
  }, true);

  window.addEventListener("mouseup", () => {
    if (isResizing && selectedEl) {
      isResizing = false;
      undoStack.push({
        type: "resize",
        node: selectedEl,
        oldW: resizeStart.startStyleW,
        oldH: resizeStart.startStyleH,
        newW: selectedEl.style.width,
        newH: selectedEl.style.height
      });
      showToast(`↔️ Stretched element to ${selectedEl.style.width} × ${selectedEl.style.height}`);
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Style Tab: Explicit Border, Fill & Text Handlers
     ══════════════════════════════════════════════════════════ */
  function applyTextToElement(el, col) {
    if (!el) return;
    el.style.setProperty("color", col, "important");
    if (el instanceof SVGElement && el.tagName.toLowerCase() === "text") {
      el.style.setProperty("fill", col, "important");
    }
    updateSandboxPreview(el);
  }

  textColor.addEventListener("input", e => {
    textHex.value = e.target.value;
    applyTextToElement(selectedEl, e.target.value);
  });
  textHex.addEventListener("input", e => {
    textColor.value = e.target.value;
    applyTextToElement(selectedEl, e.target.value);
  });

  function applyBgToElement(el, col) {
    if (!el) return;
    el.style.setProperty("background-color", col, "important");
    el.style.setProperty("background", col, "important");
    if (el instanceof SVGElement) {
      el.style.setProperty("fill", col, "important");
    }
    updateSandboxPreview(el);
  }

  bgColor.addEventListener("input", e => {
    bgHex.value = e.target.value;
    applyBgToElement(selectedEl, e.target.value);
  });
  bgHex.addEventListener("input", e => {
    bgColor.value = e.target.value;
    applyBgToElement(selectedEl, e.target.value);
  });

  function applyBorderToElement(el, col, width, style) {
    if (!el) return;
    const finalW = width || borderWidthSelect.value || "2px";
    const finalS = style || borderStyleSelect.value || "solid";
    el.style.setProperty("border-color", col, "important");
    el.style.setProperty("border-style", finalS, "important");
    el.style.setProperty("border-width", finalW, "important");
    if (el instanceof SVGElement) {
      el.style.setProperty("stroke", col, "important");
      el.style.setProperty("stroke-width", finalW, "important");
    }
    updateSandboxPreview(el);
  }

  borderColor.addEventListener("input", e => {
    borderHex.value = e.target.value;
    applyBorderToElement(selectedEl, e.target.value);
  });
  borderHex.addEventListener("input", e => {
    borderColor.value = e.target.value;
    applyBorderToElement(selectedEl, e.target.value);
  });
  borderWidthSelect.addEventListener("change", e => {
    applyBorderToElement(selectedEl, borderHex.value, e.target.value);
  });
  borderStyleSelect.addEventListener("change", e => {
    applyBorderToElement(selectedEl, borderHex.value, null, e.target.value);
  });

  root.querySelectorAll(".sp-color-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      if (!selectedEl) return;
      const col = sw.dataset.col;
      applyBgToElement(selectedEl, col);
      if (col !== "transparent") {
        bgHex.value = col; bgColor.value = col;
      } else {
        bgHex.value = "transparent";
      }
      showToast(`Set background fill: ${col}`);
    });
  });

  /* ══════════════════════════════════════════════════════════
     Layers Tab: Background Pinpointing & HTML Themes
     ══════════════════════════════════════════════════════════ */
  function scanBackgroundLayers(el) {
    bgLayersList.innerHTML = "";
    const bgLayers = [];

    // 1. Root <html> Theme
    const htmlEl = document.documentElement;
    const htmlCs = window.getComputedStyle(htmlEl);
    bgLayers.push({
      label: "Root Theme (<html>)",
      node: htmlEl,
      color: rgbToHex(htmlCs.backgroundColor),
      image: htmlCs.backgroundImage !== "none" ? htmlCs.backgroundImage : null
    });

    // 2. <body> Canvas
    const bodyEl = document.body;
    const bodyCs = window.getComputedStyle(bodyEl);
    bgLayers.push({
      label: "Document Canvas (<body>)",
      node: bodyEl,
      color: rgbToHex(bodyCs.backgroundColor),
      image: bodyCs.backgroundImage !== "none" ? bodyCs.backgroundImage : null
    });

    // 3. Ancestor containers with background
    let curr = el ? el.parentElement : null;
    while (curr && curr !== bodyEl && curr !== htmlEl && !isOwn(curr)) {
      const cs = window.getComputedStyle(curr);
      const isOpaque = cs.backgroundColor && cs.backgroundColor !== "transparent" && cs.backgroundColor !== "rgba(0, 0, 0, 0)";
      const hasBgImage = cs.backgroundImage && cs.backgroundImage !== "none";
      if (isOpaque || hasBgImage) {
        const tag = curr.tagName.toLowerCase();
        const id = (curr.id && typeof curr.id === "string") ? "#" + curr.id : "";
        const cls = getPrimaryClass(curr);
        bgLayers.push({
          label: `${tag}${id}${cls} (Container)`,
          node: curr,
          color: rgbToHex(cs.backgroundColor),
          image: hasBgImage ? cs.backgroundImage : null
        });
      }
      curr = curr.parentElement;
    }

    bgDetectedCount.textContent = `${bgLayers.length} Found`;

    bgLayers.forEach(layer => {
      const row = document.createElement("div");
      row.className = "sp-bg-layer-item";

      const left = document.createElement("div");
      left.className = "sp-bg-layer-name";
      left.innerHTML = `<span class="sp-bg-layer-swatch" style="background:${layer.color}"></span><span>${layer.label}</span>`;

      const pickBtn = document.createElement("button");
      pickBtn.className = "sp-bg-action-btn";
      pickBtn.textContent = "Select";
      pickBtn.addEventListener("click", () => {
        selectElement(layer.node);
        showToast(`Targeted: ${layer.label}`);
      });

      row.appendChild(left);
      row.appendChild(pickBtn);
      bgLayersList.appendChild(row);
    });

    // Initialize Theme Color Picker with current html/body background
    themeHex.value = bgLayers[0].color || bgLayers[1].color || "#0f172a";
    themeColor.value = themeHex.value.startsWith("#") ? themeHex.value : "#0f172a";
  }

  function setPageThemeBackground(col) {
    document.documentElement.style.setProperty("background-color", col, "important");
    document.documentElement.style.setProperty("background", col, "important");
    document.body.style.setProperty("background-color", col, "important");
    document.body.style.setProperty("background", col, "important");

    // Tailwind & Next.js Theme Variables Override:
    document.documentElement.style.setProperty("--background", col);
    document.documentElement.style.setProperty("--bg", col);
    document.documentElement.style.setProperty("--color-background", col);
    document.documentElement.style.setProperty("--tw-bg-opacity", "1");

    showToast(`🎨 Set Page Theme Background to ${col}`);
  }

  themeColor.addEventListener("input", e => {
    themeHex.value = e.target.value;
  });
  themeHex.addEventListener("input", e => {
    themeColor.value = e.target.value;
  });
  btnApplyTheme.addEventListener("click", () => {
    const val = themeHex.value.trim();
    if (val) setPageThemeBackground(val);
  });

  /* ══════════════════════════════════════════════════════════
     Add Custom Elements Modal & Insertion Handlers
     ══════════════════════════════════════════════════════════ */
  function openAddModal() {
    addModal.classList.add("sp-show");
  }
  function closeAddModal() {
    addModal.classList.remove("sp-show");
  }

  addModalClose.addEventListener("click", closeAddModal);

  function insertCustomImage(src) {
    if (!src) return;
    const img = document.createElement("img");
    img.src = src;
    img.className = "sp-custom-element";
    img.style.position = "relative";
    img.style.width = "320px";
    img.style.height = "auto";
    img.style.borderRadius = "10px";
    img.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5)";
    img.style.display = "block";
    img.style.margin = "20px auto";

    const insertParent = (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement))
      ? selectedEl.parentElement : document.body;
    insertParent.appendChild(img);

    selectElement(img);
    undoStack.push({ type: "delete", node: img, parent: insertParent });
    closeAddModal();
    showToast("🖼️ Inserted picture! Drag corners to stretch, or click '⬇ Send to Back'!");
  }

  addImgFileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        insertCustomImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  });

  btnInsertImgUrl.addEventListener("click", () => {
    const url = addImgUrlInput.value.trim();
    if (url) {
      insertCustomImage(url);
      addImgUrlInput.value = "";
    } else {
      showToast("Please enter an image URL");
    }
  });

  btnInsertBox.addEventListener("click", () => {
    const box = document.createElement("div");
    box.className = "sp-custom-element";
    box.textContent = "Custom Card Layer";
    box.style.position = "relative";
    box.style.padding = "24px 28px";
    box.style.background = "#131C2E";
    box.style.color = "#F8FAFC";
    box.style.border = "2px solid #38BDF8";
    box.style.borderRadius = "14px";
    box.style.fontSize = "16px";
    box.style.fontWeight = "600";
    box.style.boxShadow = "0 12px 30px rgba(0,0,0,0.4)";
    box.style.display = "inline-block";
    box.style.margin = "20px auto";

    const insertParent = (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement))
      ? selectedEl.parentElement : document.body;
    insertParent.appendChild(box);

    selectElement(box);
    undoStack.push({ type: "delete", node: box, parent: insertParent });
    closeAddModal();
    showToast("📦 Inserted custom card box! Drag corners to stretch or edit style!");
  });

  btnInsertHeading.addEventListener("click", () => {
    const h = document.createElement("h2");
    h.className = "sp-custom-element";
    h.textContent = "New Headline";
    h.style.position = "relative";
    h.style.color = "#FFFFFF";
    h.style.fontSize = "32px";
    h.style.fontWeight = "800";
    h.style.margin = "16px auto";
    h.style.display = "block";

    const insertParent = (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement))
      ? selectedEl.parentElement : document.body;
    insertParent.appendChild(h);

    selectElement(h);
    undoStack.push({ type: "delete", node: h, parent: insertParent });
    closeAddModal();
    showToast("🔤 Inserted headline typography!");
  });

  btnInsertHtml.addEventListener("click", () => {
    const raw = addHtmlCodeArea.value.trim();
    if (!raw) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = raw;
    const newEl = wrap.firstElementChild || wrap;
    newEl.style.position = "relative";

    const insertParent = (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement))
      ? selectedEl.parentElement : document.body;
    insertParent.appendChild(newEl);

    selectElement(newEl);
    undoStack.push({ type: "delete", node: newEl, parent: insertParent });
    closeAddModal();
    showToast("💻 Inserted custom HTML element!");
  });

  btnAddImage.addEventListener("click", openAddModal);
  btnAddDiv.addEventListener("click", openAddModal);
  btnAddHtml.addEventListener("click", openAddModal);

  /* ══════════════════════════════════════════════════════════
     Layers Tab: Word-Style Send to Back & Stacking
     ══════════════════════════════════════════════════════════ */
  function sendElementToBack(el) {
    if (!el) return;
    ensurePositioned(el);
    el.style.setProperty("z-index", "-999999", "important");
    if (el.parentElement) {
      el.parentElement.insertBefore(el, el.parentElement.firstChild);
    }
    zInput.value = -999999;
    updateSelectBox(el);
    showToast("⬇ Sent element to very back (Word-style)");
  }

  function bringElementToFront(el) {
    if (!el) return;
    ensurePositioned(el);
    el.style.setProperty("z-index", "2147483640", "important");
    if (el.parentElement) {
      el.parentElement.appendChild(el);
    }
    zInput.value = 2147483640;
    updateSelectBox(el);
    showToast("⬆ Brought element to very front");
  }

  btnPushBack.addEventListener("click", () => {
    sendElementToBack(selectedEl);
  });

  btnBringFront.addEventListener("click", () => {
    bringElementToFront(selectedEl);
  });

  btnSendCanvas.addEventListener("click", () => {
    if (!selectedEl) return;
    document.body.insertBefore(selectedEl, document.body.firstChild);
    selectedEl.style.setProperty("position", "fixed", "important");
    selectedEl.style.setProperty("top", "0", "important");
    selectedEl.style.setProperty("left", "0", "important");
    selectedEl.style.setProperty("width", "100vw", "important");
    selectedEl.style.setProperty("height", "100vh", "important");
    selectedEl.style.setProperty("z-index", "-999999", "important");
    selectedEl.style.setProperty("object-fit", "cover", "important");
    updateSelectBox(selectedEl);
    showToast("🌐 Sent element behind entire site as Canvas Background!");
  });

  zUpBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    const next = (parseInt(zInput.value) || 0) + 1;
    zInput.value = next;
    selectedEl.style.setProperty("z-index", next, "important");
  });

  zDownBtn.addEventListener("click", () => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    const next = (parseInt(zInput.value) || 0) - 1;
    zInput.value = next;
    selectedEl.style.setProperty("z-index", next, "important");
  });

  zInput.addEventListener("change", e => {
    if (!selectedEl) return;
    ensurePositioned(selectedEl);
    selectedEl.style.setProperty("z-index", e.target.value, "important");
  });

  /* ── DOM Breadcrumbs with 👁️ Visibility & 🎯 Solo Isolation ── */
  function buildBreadcrumbs(el) {
    breadcrumbs.innerHTML = "";
    const chain = [];
    let curr = el;
    while (curr && curr !== document.documentElement && !isOwn(curr)) {
      chain.unshift(curr);
      curr = curr.parentElement;
    }

    chain.forEach((node, idx) => {
      const tag = node.tagName.toLowerCase();
      const id = (node.id && typeof node.id === "string") ? "#" + node.id : "";
      const cls = getPrimaryClass(node);

      const row = document.createElement("div");
      row.className = "sp-crumb-row" + (node === el ? " current" : "");

      // 👁️ Toggle Visibility Button
      const eyeBtn = document.createElement("button");
      eyeBtn.className = "sp-layer-eye-btn";
      eyeBtn.title = "Toggle layer visibility (hide/show)";
      eyeBtn.textContent = (node.style.visibility === "hidden" || node.style.display === "none") ? "🙈" : "👁️";
      eyeBtn.addEventListener("click", e => {
        e.stopPropagation();
        if (node.style.visibility === "hidden" || node.style.display === "none") {
          node.style.visibility = "";
          node.style.display = "";
          eyeBtn.textContent = "👁️";
          showToast(`Unhid layer: ${tag}${id}`);
        } else {
          node.style.visibility = "hidden";
          eyeBtn.textContent = "🙈";
          showToast(`Hid layer: ${tag}${id}`);
        }
      });

      // 🎯 Solo Isolate Button
      const soloBtn = document.createElement("button");
      soloBtn.className = "sp-layer-solo-btn";
      soloBtn.title = "Solo this layer (hide all other siblings)";
      soloBtn.textContent = (isolatedLayerNode === node) ? "🎯 On" : "🎯";
      soloBtn.addEventListener("click", e => {
        e.stopPropagation();
        if (isolatedLayerNode === node) {
          // Restore all
          document.querySelectorAll(".sp-layer-isolated").forEach(n => {
            n.classList.remove("sp-layer-isolated");
            n.style.visibility = "";
          });
          isolatedLayerNode = null;
          soloBtn.textContent = "🎯";
          showToast("Restored all layers");
        } else {
          // Hide siblings
          if (node.parentElement) {
            Array.from(node.parentElement.children).forEach(child => {
              if (child !== node && !isOwn(child)) {
                child.classList.add("sp-layer-isolated");
                child.style.visibility = "hidden";
              }
            });
          }
          isolatedLayerNode = node;
          soloBtn.textContent = "🎯 On";
          showToast(`🎯 Solo active: showing only ${tag}${id}`);
        }
      });

      // Layer Selection Tag
      const btn = document.createElement("button");
      btn.className = "sp-crumb-tag";
      btn.textContent = tag + id + cls;
      btn.addEventListener("click", () => selectElement(node));

      row.appendChild(eyeBtn);
      row.appendChild(soloBtn);
      row.appendChild(btn);
      breadcrumbs.appendChild(row);

      if (idx < chain.length - 1) {
        const sep = document.createElement("span");
        sep.className = "sp-crumb-sep";
        sep.textContent = ">";
        breadcrumbs.appendChild(sep);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     Interactive Live Component Sandbox Preview
     ══════════════════════════════════════════════════════════ */
  function updateSandboxPreview(el) {
    if (!sandboxViewport) return;
    sandboxViewport.innerHTML = "";
    if (!el) {
      sandboxViewport.innerHTML = '<span style="color:#64748B;font-size:11px">No element selected</span>';
      return;
    }

    try {
      let previewTarget;
      if (sandboxMode === "context" && el.parentElement && !isOwn(el.parentElement)) {
        previewTarget = el.parentElement.cloneNode(true);
        previewTarget.querySelectorAll("script, noscript, #sp-root, [id^='sp-']").forEach(n => n.remove());
        const tag = el.tagName.toLowerCase();
        const match = previewTarget.querySelector(tag) || previewTarget.firstElementChild;
        if (match) match.style.outline = "2px dashed #A855F7";
      } else {
        previewTarget = el.cloneNode(true);
        previewTarget.querySelectorAll("script, noscript, #sp-root, [id^='sp-']").forEach(n => n.remove());
      }

      previewTarget.style.pointerEvents = "auto";
      previewTarget.style.margin = "auto";
      sandboxViewport.appendChild(previewTarget);
    } catch (e) {
      sandboxViewport.innerHTML = '<span style="color:#64748B;font-size:11px">Preview unavailable</span>';
    }
  }

  btnContextToggle.addEventListener("click", () => {
    sandboxMode = (sandboxMode === "component") ? "context" : "component";
    btnContextToggle.textContent = (sandboxMode === "component") ? "View: Component" : "View: Parent & Context";
    btnContextToggle.classList.toggle("active", sandboxMode === "context");
    updateSandboxPreview(selectedEl);
    showToast(`Sandbox view: ${sandboxMode.toUpperCase()}`);
  });

  btnRefreshPreview.addEventListener("click", () => {
    updateSandboxPreview(selectedEl);
    showToast("↺ Refreshed Sandbox Preview");
  });

  /* ══════════════════════════════════════════════════════════
     Combined All-in-One Format & Dual Code Panes (State A & B)
     ══════════════════════════════════════════════════════════ */
  function getConnectedJsForElement(el) {
    const onclick = (typeof el.getAttribute === "function" ? el.getAttribute("onclick") : "") || "";
    const cs = window.getComputedStyle(el);
    const animName = cs.animationName;
    const selector = getElementSelector(el);

    if (onclick) {
      return `// Inline Click Event:\n${onclick}`;
    }
    if (animName && animName !== "none") {
      return `// Active CSS Animation: ${animName}\n// GSAP Equivalent:\ngsap.to("${selector}", {\n  duration: ${parseFloat(cs.animationDuration) || 0.4},\n  ease: "power2.out"\n});`;
    }
    return `// GSAP Morph Animation:\ngsap.to("${selector}", {\n  scale: 1.05,\n  duration: 0.4,\n  ease: "power2.out"\n});`;
  }

  function generateSnippet(el, isTargetState = false) {
    const cs = window.getComputedStyle(el);
    const selector = getElementSelector(el);
    const html = el.outerHTML;
    const inlineCss = el.getAttribute("style") || `background: ${cs.backgroundColor}; color: ${cs.color};`;

    if (!isTargetState) {
      return `<!-- State A (Initial HTML) -->\n${html}\n\n<style>\n/* State A Styles */\n${selector} {\n  ${inlineCss}\n}\n</style>\n\n<script>\n${getConnectedJsForElement(el)}\n</script>`;
    } else {
      return `<!-- State B (Optional Morph Target) -->\n${html}\n\n<style>\n/* State B Morphed Styles */\n${selector} {\n  transform: scale(1.06) translateY(-4px);\n  box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);\n}\n</style>\n\n<script>\n// GSAP Target Morph Action:\ngsap.to("${selector}", {\n  scale: 1.06,\n  y: -4,\n  duration: 0.4,\n  ease: "back.out(1.5)"\n});\n</script>`;
    }
  }

  function populateDualCodePanes(el) {
    codeAreaA.value = generateSnippet(el, false);
    codeAreaB.value = generateSnippet(el, true);
  }

  /* ══════════════════════════════════════════════════════════
     Safe Static Syntax Validator (NO new Function / NO eval!)
     ══════════════════════════════════════════════════════════ */
  function parseSnippetParts(codeText) {
    let html = codeText || "";
    let css = "";
    let js = "";

    const styleMatch = codeText.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      css = styleMatch[1].trim();
      html = html.replace(styleMatch[0], "");
    }

    const scriptMatch = codeText.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      js = scriptMatch[1].trim();
      html = html.replace(scriptMatch[0], "");
    }

    html = html.replace(/<!--[\s\S]*?-->/g, "").trim();

    return { html, css, js };
  }

  function validateJsSyntaxSafely(jsCode) {
    const stack = [];
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < jsCode.length; i++) {
      const char = jsCode[i];
      const next = jsCode[i + 1] || "";
      const prev = jsCode[i - 1] || "";

      if (inLineComment) {
        if (char === "\n") inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === "*" && next === "/") { inBlockComment = false; i++; }
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
        if (char === "/" && next === "/") { inLineComment = true; i++; continue; }
        if (char === "/" && next === "*") { inBlockComment = true; i++; continue; }
      }

      if (char === "'" && !inDoubleQuote && !inBacktick && prev !== "\\") {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && !inSingleQuote && !inBacktick && prev !== "\\") {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== "\\") {
        inBacktick = !inBacktick;
        continue;
      }

      if (inSingleQuote || inDoubleQuote || inBacktick) continue;

      if (char === "(" || char === "{" || char === "[") {
        stack.push({ char, index: i });
      } else if (char === ")" || char === "}" || char === "]") {
        if (stack.length === 0) {
          return {
            valid: false,
            error: `Unexpected closing '${char}' without matching opening bracket.`,
            fix: `Remove the stray '${char}' or add the opening counterpart.`
          };
        }
        const last = stack.pop();
        const expected = last.char === "(" ? ")" : (last.char === "{" ? "}" : "]");
        if (char !== expected) {
          return {
            valid: false,
            error: `Mismatched bracket: expected '${expected}' to close '${last.char}', but found '${char}'.`,
            fix: `Replace '${char}' with '${expected}'.`
          };
        }
      }
    }

    if (inSingleQuote || inDoubleQuote || inBacktick) {
      const q = inSingleQuote ? "'" : (inDoubleQuote ? '"' : "`");
      return {
        valid: false,
        error: `Unterminated string literal (missing closing ${q}).`,
        fix: `Close the string with a matching ${q}.`
      };
    }

    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      const match = unclosed.char === "(" ? ")" : (unclosed.char === "{" ? "}" : "]");
      return {
        valid: false,
        error: `Unclosed bracket '${unclosed.char}'.`,
        fix: `Add missing closing '${match}' at the end of the script.`
      };
    }

    return { valid: true };
  }

  function validateSnippet(codeText) {
    const parts = parseSnippetParts(codeText);

    // 1. HTML Validation
    if (parts.html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(parts.html, "text/html");
      const errNode = doc.querySelector("parsererror");
      if (errNode) {
        return {
          valid: false,
          type: "HTML",
          error: "Malformed HTML tags or unclosed element.",
          fix: "Ensure all opening tags like <div> have matching closing tags </div>.",
          repaired: parts.html.replace(/<([^/>]+)>$/g, "<$1></$1>")
        };
      }
    }

    // 2. CSS Validation
    if (parts.css) {
      const openCount = (parts.css.match(/\{/g) || []).length;
      const closeCount = (parts.css.match(/\}/g) || []).length;
      if (openCount !== closeCount) {
        return {
          valid: false,
          type: "CSS",
          error: `Unbalanced CSS braces: ${openCount} '{' vs ${closeCount} '}'.`,
          fix: "Add missing '}' at the end of the CSS rule block.",
          repaired: parts.css + "\n}".repeat(Math.max(0, openCount - closeCount))
        };
      }
    }

    // 3. JavaScript Syntax Validation (Safe Static Analysis, No CSP Violation)
    if (parts.js) {
      const jsRes = validateJsSyntaxSafely(parts.js);
      if (!jsRes.valid) {
        return {
          valid: false,
          type: "JS",
          error: jsRes.error,
          fix: jsRes.fix,
          repaired: parts.js + ";"
        };
      }
    }

    return { valid: true, parts };
  }

  function showErrorModal(res, onFixCallback) {
    errorMsgEl.innerHTML = `<strong>[${res.type} Error]:</strong> ${res.error}`;
    errorFixEl.innerHTML = `<strong>Suggested Correction:</strong> ${res.fix}`;
    pendingAutoFixFn = onFixCallback;
    errorModal.classList.add("sp-modal-show");
  }

  function closeErrorModal() {
    errorModal.classList.remove("sp-modal-show");
    pendingAutoFixFn = null;
  }

  errorModalX.addEventListener("click", closeErrorModal);
  modalDismiss.addEventListener("click", closeErrorModal);

  modalAutoFix.addEventListener("click", () => {
    if (pendingAutoFixFn) {
      pendingAutoFixFn();
    }
    closeErrorModal();
    closeAddModal();
    showToast("✓ Applied suggested code fix!");
  });

  /* ── Applying Code Live ── */
  btnApplyCode.addEventListener("click", () => {
    if (!selectedEl) return;
    const rawCode = codeAreaA.value;
    const check = validateSnippet(rawCode);

    if (!check.valid) {
      showErrorModal(check, () => {
        codeAreaA.value = rawCode + (check.type === "CSS" ? "\n}" : "");
        btnApplyCode.click();
      });
      return;
    }

    // Apply HTML
    const parts = check.parts;
    if (parts.html) {
      try {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = parts.html;
        const newEl = wrapper.firstElementChild;
        if (newEl && selectedEl.parentNode) {
          undoStack.push({ type: "html", oldEl: selectedEl, newEl, parent: selectedEl.parentNode });
          selectedEl.parentNode.replaceChild(newEl, selectedEl);
          selectedEl = newEl;
          selectElement(selectedEl);
        }
      } catch (e) {}
    }

    // Apply CSS styles
    if (parts.css) {
      let liveStyle = document.getElementById("sp-live-override");
      if (!liveStyle) {
        liveStyle = document.createElement("style");
        liveStyle.id = "sp-live-override";
        document.head.appendChild(liveStyle);
      }
      liveStyle.textContent += "\n" + parts.css;
    }

    updateSandboxPreview(selectedEl);
    showToast("✓ Applied live code to element & canvas!");
  });

  /* ── Live Animation Morphing (State A ⇄ State B, CSP-Safe) ── */
  btnRunAnim.addEventListener("click", () => {
    if (!selectedEl) return;

    const rawB = codeAreaB.value.trim();
    const partsB = parseSnippetParts(rawB);

    // If State B is left blank, directly apply State A
    if (!partsB.html && !partsB.css && !partsB.js) {
      btnApplyCode.click();
      showToast("✓ Rendered State A to canvas & preview!");
      return;
    }

    // Validate State B code safely
    const checkB = validateSnippet(rawB);
    if (!checkB.valid) {
      showErrorModal(checkB, () => {
        codeAreaB.value = rawB + (checkB.type === "CSS" ? "\n}" : "");
        btnRunAnim.click();
      });
      return;
    }

    selectedEl.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";

    if (currentMorphState === "A") {
      currentMorphState = "B";

      if (partsB.css) {
        let liveMorphStyle = document.getElementById("sp-morph-override");
        if (!liveMorphStyle) {
          liveMorphStyle = document.createElement("style");
          liveMorphStyle.id = "sp-morph-override";
          document.head.appendChild(liveMorphStyle);
        }
        liveMorphStyle.textContent = partsB.css;
      }

      selectedEl.style.transform = "scale(1.08) translateY(-6px)";
      selectedEl.style.boxShadow = "0 12px 30px rgba(139, 92, 246, 0.45)";
      btnRunAnim.style.background = "linear-gradient(135deg, #06B6D4, #10B981)";
      showToast("✨ Morphed to State B (Active)!");
    } else {
      currentMorphState = "A";
      const liveMorphStyle = document.getElementById("sp-morph-override");
      if (liveMorphStyle) liveMorphStyle.textContent = "";

      selectedEl.style.transform = "none";
      selectedEl.style.boxShadow = "";
      btnRunAnim.style.background = "linear-gradient(135deg, #8B5CF6, #06B6D4)";
      showToast("✨ Morphed back to State A (Initial)!");
    }

    updateSelectBox(selectedEl);
    updateSandboxPreview(selectedEl);
  });

  btnCopyGsap.addEventListener("click", () => {
    if (!selectedEl) return;
    const selector = getElementSelector(selectedEl);
    const code = `// ⚡ GSAP Production Animation (Morph A → B)
gsap.to("${selector}", {
  scale: 1.08,
  y: -6,
  duration: 0.4,
  ease: "back.out(1.5)"
});`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast("📋 Copied GSAP code to clipboard!");
    }
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
    if (!isEnabled) return;
    if (isDragging && dragTarget) {
      const dx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX);
      const dy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY);
      dragTarget._spTranslate = { x: dx, y: dy };
      dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
      updateSelectBox(dragTarget);
    } else if (isEnabled && !isDragging && !isResizing) {
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
      const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
      const clsStr = getPrimaryClass(el);
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
     Canvas Click Handler (Accidental Misclick Protected & Unlocked)
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
        previewPanel.classList.remove("sp-show");
        selectBox.style.display = "none";
        selectedEl = null;
      }
      showToast("✂️ Element deleted • Press Ctrl+Z to undo");
      return;
    }

    // Accidental Misclick Protection & Background Layer Trap Fix:
    if (selectedEl && isTargetLocked) {
      if (target === selectedEl) {
        unlockPending = false;
        return;
      }

      // If user clicks a child element inside a selected parent/background layer:
      // IMMEDIATELY select the child! This fixes the purple outline getting stuck on layers.
      if (selectedEl.contains(target)) {
        unlockPending = false;
        selectElement(target);
        return;
      }

      // Clicked completely outside target:
      if (!unlockPending) {
        unlockPending = true;
        selectBadge.textContent = "🔓 Click again to switch target";
        showToast("Target protected • Click again to switch target", 1800);
        return;
      } else {
        unlockPending = false;
      }
    }

    selectElement(target);

    if (activeToolMode === "style") {
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
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    if (e.key === "Escape") {
      if (errorModal.classList.contains("sp-modal-show")) {
        closeErrorModal();
    closeAddModal();
      } else if (addModal.classList.contains("sp-show")) {
        closeAddModal();
      } else if (drawer.classList.contains("sp-open") || previewPanel.classList.contains("sp-show")) {
        drawer.classList.remove("sp-open");
        previewPanel.classList.remove("sp-show");
        selectBox.style.display = "none";
        selectedEl = null;
      } else {
        turnOffStylePeek();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
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
          showToast("↺ Restored original position");
        } else if (action.type === "resize" && action.node) {
          action.node.style.width = action.oldW;
          action.node.style.height = action.oldH;
          updateSelectBox(action.node);
          updateSandboxPreview(action.node);
          showToast("↺ Restored original dimensions");
        }
      }
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      captureVisibleViewport();
    } else if (isEnabled) {
      const k = e.key.toLowerCase();
      if (k === "i") {
        activeToolMode = "inspect"; syncDockUI("inspect"); showToast("🔍 Inspect Mode");
      } else if (k === "m") {
        activeToolMode = "move"; syncDockUI("move"); document.body.classList.add("sp-mode-move"); showToast("✋ Move Mode");
      } else if (k === "s") {
        activeToolMode = "resize"; syncDockUI("resize"); showToast("↔️ Resize / Stretch Mode");
      } else if (k === "a") {
        openAddModal();
      } else if (k === "c") {
        activeToolMode = "style"; syncDockUI("style"); drawer.classList.add("sp-open"); root.querySelector(".sp-drawer-tab[data-tab='style']").click();
      } else if (k === "l") {
        activeToolMode = "layers"; syncDockUI("layers"); drawer.classList.add("sp-open"); root.querySelector(".sp-drawer-tab[data-tab='layers']").click();
      } else if (k === "k") {
        activeToolMode = "code"; syncDockUI("code"); drawer.classList.add("sp-open"); root.querySelector(".sp-drawer-tab[data-tab='code']").click();
      } else if (k === "d") {
        activeToolMode = "delete"; syncDockUI("delete"); showToast("✂️ Delete Mode");
      }
    }
  });

  /* ══════════════════════════════════════════════════════════
     Activation / Deactivation
     ══════════════════════════════════════════════════════════ */
  function turnOnStylePeek(mode = "inspect") {
    isEnabled = true;
    root.style.display = "block";
    const mappedMode = (mode === "color") ? "style" : mode;
    activeToolMode = mappedMode;
    syncDockUI(mappedMode);
    document.body.classList.toggle("sp-mode-move", mappedMode === "move");
    if (mappedMode === "style" || mappedMode === "layers" || mappedMode === "code") {
      drawer.classList.add("sp-open");
      const tabBtn = root.querySelector(`.sp-drawer-tab[data-tab='${mappedMode}']`);
      if (tabBtn) tabBtn.click();
    }
    showToast(`StylePeek ON (${mappedMode.toUpperCase()}) • Sidebar dock active`);
  }

  function turnOffStylePeek() {
    isEnabled = false;
    activeToolMode = "inspect";
    document.body.classList.remove("sp-mode-move");
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";
    selectBox.style.display = "none";
    drawer.classList.remove("sp-open");
    previewPanel.classList.remove("sp-show");
    selectedEl = null;
    isTargetLocked = false;
    unlockPending = false;
    closeErrorModal();
    closeAddModal();

    // Restore isolated layers if any
    document.querySelectorAll(".sp-layer-isolated").forEach(n => {
      n.classList.remove("sp-layer-isolated");
      n.style.visibility = "";
    });
    isolatedLayerNode = null;

    root.style.display = "none"; // Completely hides dock, drawer, outlines
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

  /* ── Window PostMessage API (DevTools / Console / Scripting bridge) ── */
  window.addEventListener("message", e => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "STYLEPEEK_TURN_ON") {
      turnOnStylePeek(e.data.mode || "inspect");
    } else if (e.data.type === "STYLEPEEK_TURN_OFF") {
      turnOffStylePeek();
    } else if (e.data.type === "STYLEPEEK_OPEN_ADD") {
      if (!isEnabled) turnOnStylePeek("inspect");
      openAddModal();
    }
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
    root.style.display = "none";
    document.documentElement.appendChild(root);
    if (isEnabled) root.style.display = "block";

    // 3. Remove temporary attributes from live DOM
    for (const el of allBodyEls) {
      el.removeAttribute("data-sp-prune");
      el.removeAttribute("data-sp-offscreen");
    }

    // 4. Purge scripts, iframes, and StylePeek artifacts
    docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
    docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
    docClone.querySelectorAll("#sp-root, [id^='sp-'], .sp-popover, #sp-dock, #sp-sidebar-dock, #sp-drawer, #sp-inspect-preview-panel, #sp-error-modal").forEach(e => e.remove());

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
