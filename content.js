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
          <button class="sp-lock-tag" id="sp-btn-edit-text" title="Click to edit words live directly on the element" style="color:#38BDF8;border-color:#1E3A5F;">✏️ Edit Words</button>
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
            <div class="sp-color-card" id="sp-card-text">
              <span class="sp-color-label">Text Color</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-text-hex" value="#ffffff">
                <input type="color" class="sp-color-btn" id="sp-text-color" value="#ffffff">
              </div>
              <div class="sp-swatches-row" data-target="text">
                <div class="sp-color-swatch" style="background:#ffffff" data-col="#ffffff" title="White"></div>
                <div class="sp-color-swatch" style="background:#94a3b8" data-col="#94a3b8" title="Slate"></div>
                <div class="sp-color-swatch" style="background:#e7dbff" data-col="#e7dbff" title="Lavender"></div>
                <div class="sp-color-swatch" style="background:#38bdf8" data-col="#38bdf8" title="Sky Blue"></div>
                <div class="sp-color-swatch" style="background:#34d399" data-col="#34d399" title="Emerald"></div>
                <div class="sp-color-swatch" style="background:#fbbf24" data-col="#fbbf24" title="Amber"></div>
                <div class="sp-color-swatch" style="background:#f87171" data-col="#f87171" title="Red"></div>
                <div class="sp-color-swatch" style="background:#0f172a" data-col="#0f172a" title="Dark Slate"></div>
              </div>
            </div>

            <div class="sp-color-card" id="sp-card-bg">
              <span class="sp-color-label">Div Background Fill</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-bg-hex" value="#000000">
                <input type="color" class="sp-color-btn" id="sp-bg-color" value="#000000">
              </div>
              <div class="sp-swatches-row" data-target="bg">
                <div class="sp-color-swatch" style="background:#0f172a" data-col="#0f172a" title="Dark Slate"></div>
                <div class="sp-color-swatch" style="background:#1e293b" data-col="#1e293b" title="Slate 800"></div>
                <div class="sp-color-swatch" style="background:#ef4444" data-col="#ef4444" title="Red Fill"></div>
                <div class="sp-color-swatch" style="background:#8b5cf6" data-col="#8b5cf6" title="Purple Fill"></div>
                <div class="sp-color-swatch" style="background:#3b82f6" data-col="#3b82f6" title="Blue Fill"></div>
                <div class="sp-color-swatch" style="background:#10b981" data-col="#10b981" title="Emerald Fill"></div>
                <div class="sp-color-swatch" style="background:#ffffff" data-col="#ffffff" title="White Fill"></div>
                <div class="sp-color-swatch" style="background:transparent;border:1px dashed #64748b" data-col="transparent" title="Transparent"></div>
              </div>
            </div>

            <div class="sp-color-card" id="sp-card-border">
              <span class="sp-color-label">Border Color & Width</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-border-hex" value="#3b82f6">
                <input type="color" class="sp-color-btn" id="sp-border-color" value="#3b82f6">
              </div>
              <div class="sp-border-options-row">
                <select class="sp-border-select" id="sp-border-width" title="Border Width">
                  <option value="1px" selected>1px</option>
                  <option value="2px">2px</option>
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
              <div class="sp-swatches-row" data-target="border">
                <div class="sp-color-swatch" style="background:#38bdf8" data-col="#38bdf8" title="Cyan Blue"></div>
                <div class="sp-color-swatch" style="background:#8b5cf6" data-col="#8b5cf6" title="Purple"></div>
                <div class="sp-color-swatch" style="background:#ef4444" data-col="#ef4444" title="Red"></div>
                <div class="sp-color-swatch" style="background:#10b981" data-col="#10b981" title="Green"></div>
                <div class="sp-color-swatch" style="background:#f59e0b" data-col="#f59e0b" title="Amber"></div>
                <div class="sp-color-swatch" style="background:#ffffff" data-col="#ffffff" title="White"></div>
                <div class="sp-color-swatch" style="background:#334155" data-col="#334155" title="Slate"></div>
                <div class="sp-color-swatch" style="background:transparent;border:1px dashed #64748b" data-col="transparent" title="No Border"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Simplified Layers & Depth Studio -->
        <div class="sp-tab-pane" id="pane-layers">
          
          <!-- 1. LAYER NAVIGATION & SOLO VIEW -->
          <div class="sp-layer-card">
            <div class="sp-layer-card-header">
              <span>🧭 LAYER NAVIGATION & ISOLATION</span>
              <span class="sp-bg-badge" id="sp-cur-layer-badge">Selected Layer</span>
            </div>
            
            <div class="sp-layer-nav-grid">
              <button class="sp-layer-nav-btn" id="sp-btn-layer-up" title="Go one layer up to parent container">
                <span>⬆ Layer Up (Parent)</span>
              </button>
              <button class="sp-layer-nav-btn" id="sp-btn-layer-down" title="Go down one layer inside and view only this layer">
                <span>⬇ Layer Down (Inside & Solo)</span>
              </button>
              <button class="sp-layer-nav-btn" id="sp-btn-layer-prev" title="Select previous layer / element behind">
                <span>◂ Layer Behind</span>
              </button>
              <button class="sp-layer-nav-btn" id="sp-btn-layer-next" title="Select next layer / element in front">
                <span>▸ Layer In Front</span>
              </button>
            </div>

            <div class="sp-layer-solo-bar">
              <button class="sp-layer-solo-btn" id="sp-btn-solo-layer" title="Hide all outside elements to see only what is in this layer">
                <span id="sp-solo-icon">👁️</span>
                <span id="sp-solo-label">View Only This Layer (Solo View: OFF)</span>
              </button>
            </div>

            <div class="sp-layer-breadcrumb-row" id="sp-layer-breadcrumb">
              <!-- Dynamically populated clickable hierarchy path -->
            </div>
          </div>

          <!-- 2. PUT AN ELEMENT BEHIND / IN FRONT -->
          <div class="sp-layer-card">
            <div class="sp-layer-card-header">
              <span>🥞 PUT ELEMENT BEHIND / IN FRONT</span>
              <span class="sp-bg-badge">Stacking</span>
            </div>
            <div class="sp-layer-actions-grid">
              <button class="sp-layer-act-btn" id="sp-btn-put-behind" title="Put this element directly behind its neighboring element">
                <span>⬇ Put Behind Element</span>
              </button>
              <button class="sp-layer-act-btn" id="sp-btn-put-front" title="Put this element directly in front of its neighboring element">
                <span>⬆ Put in Front</span>
              </button>
              <button class="sp-layer-act-btn" id="sp-btn-push-back" title="Send element to very back (Word document style)">
                <span>⬇⬇ Send to Back</span>
              </button>
              <button class="sp-layer-act-btn" id="sp-btn-bring-front" title="Bring element to very top layer">
                <span>⬆⬆ Bring to Front</span>
              </button>
            </div>
            <div class="sp-zindex-bar">
              <span style="font-size:11px;color:#94A3B8;font-weight:600">Z-Index:</span>
              <button class="sp-step-btn" id="sp-z-down" title="Step Down (-1)">−</button>
              <input type="number" class="sp-zindex-input" id="sp-zindex-val" value="0">
              <button class="sp-step-btn" id="sp-z-up" title="Step Up (+1)">+</button>
              <button class="sp-layer-act-btn mini" id="sp-btn-send-canvas" title="Send behind entire page as root canvas wallpaper">🌐 Canvas BG</button>
            </div>
          </div>

          <!-- 3. CHANGE ELEMENT BACKGROUND (Color & Image) -->
          <div class="sp-layer-card">
            <div class="sp-layer-card-header">
              <span>🎨 ELEMENT BACKGROUND (COLOR & IMAGE)</span>
              <span class="sp-bg-badge" id="sp-bg-img-target-label">Selected Layer</span>
            </div>
            
            <div class="sp-bg-target-row">
              <button class="sp-bg-target-chip active" id="sp-btn-target-selected" title="Apply background to currently selected element">Selected Layer</button>
              <button class="sp-bg-target-chip" id="sp-btn-target-body" title="Apply background to Body canvas">Body Canvas</button>
              <button class="sp-bg-target-chip" id="sp-btn-target-html" title="Apply background to Root HTML">Root HTML</button>
            </div>

            <!-- Background Color Row -->
            <div class="sp-theme-color-row" style="margin-bottom:8px;">
              <span style="font-size:11px;color:#94A3B8;font-weight:600">Color:</span>
              <input type="text" class="sp-hex-input" id="sp-layer-bg-color-hex" placeholder="#0f172a" style="flex:1;">
              <input type="color" class="sp-color-btn" id="sp-layer-bg-color-picker" value="#0f172a">
              <button class="sp-bg-action-btn" id="sp-btn-apply-layer-color">Apply Color</button>
            </div>

            <!-- Background Image -->
            <div class="sp-bg-image-inputs">
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" class="sp-input" id="sp-layer-bg-url" placeholder="Paste image URL (https://... or data:)..." style="flex:1;">
                <button class="sp-bg-action-btn" id="sp-btn-apply-bg-img" title="Apply background image">Apply BG Img</button>
              </div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
                <label class="sp-file-label" style="flex:1;text-align:center;cursor:pointer;padding:5px 8px;font-size:11px;" title="Upload background image file from computer">
                  <span>📁 Upload Image File</span>
                  <input type="file" id="sp-layer-bg-file" accept="image/*" style="display:none">
                </label>
                <button class="sp-bg-action-btn sp-btn-danger" id="sp-btn-clear-bg-img" title="Remove background image">Remove BG</button>
              </div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:6px;font-size:11px;color:#94A3B8;">
                <span>Sizing:</span>
                <select id="sp-layer-bg-size" class="sp-select" style="flex:1;padding:2px 6px;height:24px;font-size:11px;">
                  <option value="cover" selected>Cover (Full stretch)</option>
                  <option value="contain">Contain (Fit inside)</option>
                  <option value="repeat">Repeat / Tile</option>
                  <option value="auto">Original Size</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 4. EDIT CODE · MAKE INTO IMAGE · PUT ELEMENT ON LAYER -->
          <div class="sp-layer-card">
            <div class="sp-layer-card-header">
              <span>⚡ LAYER CREATION & POWER TOOLS</span>
              <span class="sp-bg-badge">Layer Tools</span>
            </div>
            
            <div class="sp-layer-tools-grid">
              <button class="sp-layer-tool-btn" id="sp-btn-layer-code" title="Edit HTML and CSS code of this layer">
                <span class="sp-tool-icon">💻</span>
                <span class="sp-tool-text">Edit Layer Code</span>
              </button>
              <button class="sp-layer-tool-btn" id="sp-btn-layer-to-image" title="Convert this layer into an image on the webpage">
                <span class="sp-tool-icon">📷</span>
                <span class="sp-tool-text">Make into Image</span>
              </button>
            </div>

            <!-- Put an Element on this Layer -->
            <div class="sp-put-element-box">
              <span class="sp-put-label">➕ Put an element on this layer:</span>
              <div class="sp-put-btns-row">
                <button class="sp-put-chip" id="sp-btn-put-text">+ Text Word</button>
                <button class="sp-put-chip" id="sp-btn-put-card">+ Styled Card</button>
                <button class="sp-put-chip" id="sp-btn-put-image">+ Picture / Photo</button>
              </div>
            </div>
          </div>

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
  const btnEditText       = root.querySelector("#sp-btn-edit-text");

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

  const themeHex          = root.querySelector("#sp-theme-hex");
  const themeColor        = root.querySelector("#sp-theme-color");
  const btnApplyTheme     = root.querySelector("#sp-btn-apply-theme");
  const bgLayersList      = root.querySelector("#sp-bg-layers-list");
  const bgDetectedCount   = root.querySelector("#sp-bg-detected-count");

  const bgImgTargetLabel  = root.querySelector("#sp-bg-img-target-label");
  const btnTargetSelected = root.querySelector("#sp-btn-target-selected");
  const btnTargetBody     = root.querySelector("#sp-btn-target-body");
  const btnTargetHtml     = root.querySelector("#sp-btn-target-html");
  const layerBgUrlInput   = root.querySelector("#sp-layer-bg-url");
  const btnApplyBgImg     = root.querySelector("#sp-btn-apply-bg-img");
  const layerBgFileInput  = root.querySelector("#sp-layer-bg-file");
  const btnClearBgImg     = root.querySelector("#sp-btn-clear-bg-img");
  const layerBgSizeSelect = root.querySelector("#sp-layer-bg-size");
  let activeBgTargetMode  = "selected"; // "selected" | "body" | "html"

  const btnLayerUp        = root.querySelector("#sp-btn-layer-up");
  const btnLayerDown      = root.querySelector("#sp-btn-layer-down");
  const btnLayerPrev      = root.querySelector("#sp-btn-layer-prev");
  const btnLayerNext      = root.querySelector("#sp-btn-layer-next");
  const btnSoloLayer      = root.querySelector("#sp-btn-solo-layer");
  const soloIcon          = root.querySelector("#sp-solo-icon");
  const soloLabel         = root.querySelector("#sp-solo-label");
  const curLayerBadge     = root.querySelector("#sp-cur-layer-badge");
  const layerBreadcrumb   = root.querySelector("#sp-layer-breadcrumb");

  const btnPutBehind      = root.querySelector("#sp-btn-put-behind");
  const btnPutFront       = root.querySelector("#sp-btn-put-front");
  const btnPushBack       = root.querySelector("#sp-btn-push-back");
  const btnBringFront     = root.querySelector("#sp-btn-bring-front");
  const btnSendCanvas     = root.querySelector("#sp-btn-send-canvas");
  const zDownBtn          = root.querySelector("#sp-z-down");
  const zUpBtn            = root.querySelector("#sp-z-up");
  const zInput            = root.querySelector("#sp-zindex-val");

  const layerBgColorHex   = root.querySelector("#sp-layer-bg-color-hex");
  const layerBgColorPicker= root.querySelector("#sp-layer-bg-color-picker");
  const btnApplyLayerColor= root.querySelector("#sp-btn-apply-layer-color");

  const btnLayerCode      = root.querySelector("#sp-btn-layer-code");
  const btnLayerToImage   = root.querySelector("#sp-btn-layer-to-image");
  const btnPutText        = root.querySelector("#sp-btn-put-text");
  const btnPutCard        = root.querySelector("#sp-btn-put-card");
  const btnPutImage       = root.querySelector("#sp-btn-put-image");

  const btnAddImage       = root.querySelector("#sp-btn-add-image");
  const btnAddDiv         = root.querySelector("#sp-btn-add-div");
  const btnAddHtml        = root.querySelector("#sp-btn-add-html");

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
    if (!el) return;
    const cs = window.getComputedStyle(el);
    if (cs.position === "static" || !cs.position) el.style.setProperty("position", "relative", "important");
    if (cs.display === "inline") el.style.setProperty("display", "inline-block", "important");
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

  /* ── Draggable Floating Live Preview Panel (Full Topbar Draggable) ── */
  (function initDraggablePreview() {
    const topbar = root.querySelector(".sp-preview-panel-header");
    let isDraggingP = false, ox = 0, oy = 0;

    if (!topbar) return;

    topbar.addEventListener("mousedown", e => {
      // Don't drag if clicking buttons inside the actions container
      if (e.target.closest("button") || e.target.closest(".sp-preview-panel-actions")) return;

      isDraggingP = true;
      const r = previewPanel.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      previewPanel.style.left = r.left + "px";
      previewPanel.style.top = r.top + "px";
      previewPanel.style.right = "auto";
      previewPanel.style.bottom = "auto";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!isDraggingP) return;
      const left = Math.max(8, Math.min(window.innerWidth - previewPanel.offsetWidth - 8, e.clientX - ox));
      const top  = Math.max(8, Math.min(window.innerHeight - previewPanel.offsetHeight - 8, e.clientY - oy));
      previewPanel.style.left = left + "px";
      previewPanel.style.top = top + "px";
      previewPanel.style.right = "auto";
      previewPanel.style.bottom = "auto";
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
      borderWidthSelect.value = "1px";
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

    // Sync simplified layer background color inputs
    if (layerBgColorHex && layerBgColorPicker) {
      const currentBg = rgbToHex(cs.backgroundColor);
      if (currentBg && currentBg.startsWith("#")) {
        layerBgColorHex.value = currentBg;
        layerBgColorPicker.value = currentBg;
      }
    }

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
    
    // 1. Direct element text color
    el.style.setProperty("color", col, "important");

    // 2. Set on all descendant text elements so the letters inside actually change!
    const textEls = el.querySelectorAll("span, p, a, h1, h2, h3, h4, h5, h6, strong, b, em, i, small, label, button, div, li, td, th, input, textarea, code");
    textEls.forEach(child => {
      // If child has direct text or children, enforce color
      if (child.textContent && child.textContent.trim().length > 0) {
        child.style.setProperty("color", col, "important");
      }
    });

    // 3. For SVGs / icons inside or if the target itself is an SVG
    if (el instanceof SVGElement) {
      el.style.setProperty("fill", col, "important");
    }
    el.querySelectorAll("svg, svg path, svg circle, svg rect, svg polygon, svg line").forEach(icon => {
      icon.style.setProperty("fill", col, "important");
    });

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
    const finalW = width || borderWidthSelect.value || "1px";
    const finalS = style || borderStyleSelect.value || "solid";

    // 1. Explicit CSS border properties
    el.style.setProperty("border-color", col, "important");
    el.style.setProperty("border-style", finalS, "important");
    el.style.setProperty("border-width", finalW, "important");

    // 2. Also set outline & box-shadow ring so it cuts through Tailwind resets, clipping, and child fills!
    if (finalW !== "0px" && finalS !== "none") {
      el.style.setProperty("outline", `${finalW} ${finalS} ${col}`, "important");
      el.style.setProperty("box-shadow", `0 0 0 ${finalW} ${col}`, "important");
    } else {
      el.style.removeProperty("outline");
      el.style.removeProperty("box-shadow");
    }

    // 3. For SVG strokes
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

  /* ── Dedicated Swatches for Text, Background & Border ── */
  root.querySelectorAll(".sp-swatches-row .sp-color-swatch[data-col]").forEach(sw => {
    sw.addEventListener("click", () => {
      if (!selectedEl) return;
      const col = sw.dataset.col;
      const parentRow = sw.closest(".sp-swatches-row");
      const target = parentRow ? parentRow.dataset.target : "bg";

      if (target === "text") {
        textHex.value = col;
        textColor.value = (col === "transparent") ? "#ffffff" : col;
        applyTextToElement(selectedEl, col);
        showToast(`Set text color: ${col}`);
      } else if (target === "bg") {
        bgHex.value = col;
        if (col !== "transparent") bgColor.value = col;
        applyBgToElement(selectedEl, col);
        showToast(`Set background fill: ${col}`);
      } else if (target === "border") {
        if (col === "transparent") {
          borderHex.value = "transparent";
          borderWidthSelect.value = "0px";
          applyBorderToElement(selectedEl, "transparent", "0px", "none");
          showToast("Removed border");
        } else {
          borderHex.value = col;
          borderColor.value = col;
          if (borderWidthSelect.value === "0px") borderWidthSelect.value = "1px";
          applyBorderToElement(selectedEl, col, borderWidthSelect.value || "1px", borderStyleSelect.value || "solid");
          showToast(`Set border: ${borderWidthSelect.value || "1px"} ${col}`);
        }
      }
    });
  });

  /* ══════════════════════════════════════════════════════════
     Layers Tab: Background Pinpointing & HTML Themes
     ══════════════════════════════════════════════════════════ */
  function scanBackgroundLayers(el) {
    if (!bgLayersList && !themeHex && !themeColor && !bgDetectedCount) return;
    if (bgLayersList) bgLayersList.innerHTML = "";
    const bgLayers = [];

    // 1. Root <html> Theme
    const htmlEl = document.documentElement;
    const htmlCs = window.getComputedStyle(htmlEl);
    bgLayers.push({
      label: "Root Theme (HTML)",
      node: htmlEl,
      color: rgbToHex(htmlCs.backgroundColor),
      image: htmlCs.backgroundImage !== "none" ? htmlCs.backgroundImage : null
    });

    // 2. <body> Canvas
    const bodyEl = document.body;
    const bodyCs = window.getComputedStyle(bodyEl);
    bgLayers.push({
      label: "Document Canvas (Body)",
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

    if (bgDetectedCount) bgDetectedCount.textContent = `${bgLayers.length} Found`;

    if (bgLayersList) {
      bgLayersList.innerHTML = "";
      bgLayers.forEach(layer => {
        const row = document.createElement("div");
        row.className = "sp-bg-layer-item";

        const left = document.createElement("div");
        left.className = "sp-bg-layer-name";
        const imgBadge = layer.image ? `<span class="sp-bg-badge" style="font-size:9.5px;padding:1px 4px;background:#38BDF8;color:#0F172A;font-weight:700;">🖼️ Image BG</span>` : "";
        left.innerHTML = `<span class="sp-bg-layer-swatch" style="background:${layer.color}"></span><span>${layer.label}</span>${imgBadge}`;

        const pickBtn = document.createElement("button");
        pickBtn.className = "sp-bg-action-btn";
        pickBtn.textContent = "Select";
        pickBtn.addEventListener("click", () => {
          selectElement(layer.node);
          if (layer.node === document.body) {
            activeBgTargetMode = "body";
            syncBgTargetChips();
          } else if (layer.node === document.documentElement) {
            activeBgTargetMode = "html";
            syncBgTargetChips();
          } else {
            activeBgTargetMode = "selected";
            syncBgTargetChips();
          }
          showToast(`Targeted: ${layer.label}`);
        });

        row.appendChild(left);
        row.appendChild(pickBtn);
        bgLayersList.appendChild(row);
      });
    }

    // Initialize Theme Color Picker with current html/body background
    if (themeHex && themeColor) {
      themeHex.value = bgLayers[0].color || bgLayers[1].color || "#0f172a";
      themeColor.value = themeHex.value.startsWith("#") ? themeHex.value : "#0f172a";
    }
  }

  function syncBgTargetChips() {
    if (!btnTargetSelected || !btnTargetBody || !btnTargetHtml) return;
    btnTargetSelected.classList.toggle("active", activeBgTargetMode === "selected");
    btnTargetBody.classList.toggle("active", activeBgTargetMode === "body");
    btnTargetHtml.classList.toggle("active", activeBgTargetMode === "html");

    if (activeBgTargetMode === "selected") {
      bgImgTargetLabel.textContent = selectedEl ? "Selected Layer" : "Body Canvas";
    } else if (activeBgTargetMode === "body") {
      bgImgTargetLabel.textContent = "Body Canvas";
    } else {
      bgImgTargetLabel.textContent = "Root HTML";
    }
  }

  if (btnTargetSelected) {
    btnTargetSelected.addEventListener("click", () => {
      activeBgTargetMode = "selected";
      syncBgTargetChips();
    });
  }
  if (btnTargetBody) {
    btnTargetBody.addEventListener("click", () => {
      activeBgTargetMode = "body";
      syncBgTargetChips();
    });
  }
  if (btnTargetHtml) {
    btnTargetHtml.addEventListener("click", () => {
      activeBgTargetMode = "html";
      syncBgTargetChips();
    });
  }

  function applyLayerBgImage(url) {
    if (!url) {
      showToast("Please provide an image URL or choose a file");
      return;
    }

    let targetNode = selectedEl;
    let targetLabel = "Selected Element";

    if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
      targetNode = document.body;
      targetLabel = "Body Canvas";
    } else if (activeBgTargetMode === "html") {
      targetNode = document.documentElement;
      targetLabel = "Root HTML";
    }

    if (!targetNode) return;

    undoStack.push({
      type: "bg-image",
      node: targetNode,
      oldBgImage: targetNode.style.backgroundImage,
      oldBgSize: targetNode.style.backgroundSize,
      oldBgPosition: targetNode.style.backgroundPosition,
      oldBgRepeat: targetNode.style.backgroundRepeat
    });

    const sizeMode = (layerBgSizeSelect && layerBgSizeSelect.value) ? layerBgSizeSelect.value : "cover";
    targetNode.style.setProperty("background-image", `url("${url}")`, "important");

    if (sizeMode === "cover") {
      targetNode.style.setProperty("background-size", "cover", "important");
      targetNode.style.setProperty("background-position", "center center", "important");
      targetNode.style.setProperty("background-repeat", "no-repeat", "important");
    } else if (sizeMode === "contain") {
      targetNode.style.setProperty("background-size", "contain", "important");
      targetNode.style.setProperty("background-position", "center center", "important");
      targetNode.style.setProperty("background-repeat", "no-repeat", "important");
    } else if (sizeMode === "repeat") {
      targetNode.style.setProperty("background-size", "auto", "important");
      targetNode.style.setProperty("background-repeat", "repeat", "important");
    } else {
      targetNode.style.setProperty("background-size", "auto", "important");
      targetNode.style.setProperty("background-position", "center center", "important");
      targetNode.style.setProperty("background-repeat", "no-repeat", "important");
    }

    if (targetNode === document.body || targetNode === document.documentElement) {
      document.documentElement.style.setProperty("--background-image", `url("${url}")`);
    }

    if (selectedEl) {
      updateSandboxPreview(selectedEl);
      updateSelectBox(selectedEl);
    }
    showToast(`🖼️ Applied background image to ${targetLabel}!`);
  }

  function clearLayerBgImage() {
    let targetNode = selectedEl;
    let targetLabel = "Selected Element";

    if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
      targetNode = document.body;
      targetLabel = "Body Canvas";
    } else if (activeBgTargetMode === "html") {
      targetNode = document.documentElement;
      targetLabel = "Root HTML";
    }

    if (!targetNode) return;

    undoStack.push({
      type: "bg-image",
      node: targetNode,
      oldBgImage: targetNode.style.backgroundImage,
      oldBgSize: targetNode.style.backgroundSize,
      oldBgPosition: targetNode.style.backgroundPosition,
      oldBgRepeat: targetNode.style.backgroundRepeat
    });

    targetNode.style.removeProperty("background-image");
    targetNode.style.removeProperty("background-size");
    targetNode.style.removeProperty("background-position");
    targetNode.style.removeProperty("background-repeat");

    if (targetNode === document.body || targetNode === document.documentElement) {
      document.documentElement.style.removeProperty("--background-image");
    }

    if (selectedEl) {
      updateSandboxPreview(selectedEl);
      updateSelectBox(selectedEl);
    }
    showToast(`✓ Removed background image from ${targetLabel}`);
  }

  if (btnApplyBgImg) {
    btnApplyBgImg.addEventListener("click", () => {
      const url = layerBgUrlInput.value.trim();
      applyLayerBgImage(url);
    });
  }

  if (layerBgFileInput) {
    layerBgFileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          applyLayerBgImage(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnClearBgImg) {
    btnClearBgImg.addEventListener("click", clearLayerBgImage);
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

  if (themeColor && themeHex) {
    themeColor.addEventListener("input", e => {
      themeHex.value = e.target.value;
    });
    themeHex.addEventListener("input", e => {
      themeColor.value = e.target.value;
    });
  }
  if (btnApplyTheme && themeHex) {
    btnApplyTheme.addEventListener("click", () => {
      const val = themeHex.value.trim();
      if (val) setPageThemeBackground(val);
    });
  }

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

  function insertElementIntoLiveSite(newEl, toastMsg) {
    if (!newEl) return;
    ensurePositioned(newEl);

    // If an element is currently selected on the page, insert immediately next to it!
    if (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement)) {
      selectedEl.insertAdjacentElement("afterend", newEl);
    } else {
      // Find element at center of current viewport so insertion happens right where user is looking!
      let centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      while (centerEl && (isOwn(centerEl) || centerEl === document.documentElement || centerEl === document.body)) {
        centerEl = centerEl.parentElement;
      }
      if (centerEl && centerEl.parentElement && !isOwn(centerEl.parentElement)) {
        centerEl.insertAdjacentElement("afterend", newEl);
      } else {
        const mainContainer = document.querySelector("main") || document.querySelector("#root") || document.querySelector("#__next") || document.body;
        mainContainer.appendChild(newEl);
      }
    }

    // Scroll the live site smoothly to the newly inserted element
    try {
      newEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}

    selectElement(newEl);
    undoStack.push({ type: "delete", node: newEl, parent: newEl.parentElement });
    closeAddModal();
    if (toastMsg) showToast(toastMsg);
  }

  function insertCustomImage(src) {
    if (!src) return;

    // 1. If user has an existing <img> (or container with <img>) selected on the live website:
    // AUTOMATICALLY REPLACE THE LIVE IMAGE DIRECTLY ON THE WEBSITE!
    const targetImg = (selectedEl && selectedEl.tagName === "IMG")
      ? selectedEl
      : (selectedEl && selectedEl.querySelector("img") ? selectedEl.querySelector("img") : null);

    if (targetImg) {
      const oldSrc = targetImg.src;
      targetImg.src = src;
      undoStack.push({
        type: "img-replace",
        node: targetImg,
        oldSrc,
        newSrc: src
      });
      updateSelectBox(selectedEl);
      updateSandboxPreview(selectedEl);
      populateDualCodePanes(selectedEl);
      closeAddModal();
      showToast("✓ Live image replaced instantly on website!");
      return;
    }

    // 2. Otherwise insert a new picture directly into the live website at current view:
    const img = document.createElement("img");
    img.src = src;
    img.className = "sp-custom-element";
    img.style.position = "relative";
    img.style.width = "320px";
    img.style.maxWidth = "90vw";
    img.style.height = "auto";
    img.style.borderRadius = "10px";
    img.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5)";
    img.style.display = "block";
    img.style.margin = "20px auto";
    img.style.zIndex = "9999";

    insertElementIntoLiveSite(img, "🖼️ Picture added live to website! Drag anywhere or resize corners");
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
    box.style.border = "1px solid #38BDF8";
    box.style.borderRadius = "14px";
    box.style.fontSize = "16px";
    box.style.fontWeight = "600";
    box.style.boxShadow = "0 12px 30px rgba(0,0,0,0.4)";
    box.style.display = "inline-block";
    box.style.margin = "20px auto";

    insertElementIntoLiveSite(box, "📦 Inserted custom card box! Drag corners to stretch or edit style!");
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

    insertElementIntoLiveSite(h, "🔤 Inserted headline typography!");
  });

  btnInsertHtml.addEventListener("click", () => {
    const raw = addHtmlCodeArea.value.trim();
    if (!raw) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = raw;
    const newEl = wrap.firstElementChild || wrap;
    newEl.style.position = "relative";

    insertElementIntoLiveSite(newEl, "💻 Inserted custom HTML element!");
  });

  if (btnAddImage) btnAddImage.addEventListener("click", openAddModal);
  if (btnAddDiv) btnAddDiv.addEventListener("click", openAddModal);
  if (btnAddHtml) btnAddHtml.addEventListener("click", openAddModal);

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

  /* ══════════════════════════════════════════════════════════
     Simplified Layers & Depth Studio Handlers
     ══════════════════════════════════════════════════════════ */
  if (btnLayerUp) {
    btnLayerUp.addEventListener("click", () => {
      if (!selectedEl) return;
      const parent = selectedEl.parentElement;
      if (parent && !isOwn(parent) && parent !== document.documentElement) {
        selectElement(parent);
        showToast(`⬆ Selected layer up: <${parent.tagName.toLowerCase()}>`);
      } else {
        showToast("Already at top root layer");
      }
    });
  }

  if (btnLayerDown) {
    btnLayerDown.addEventListener("click", () => {
      if (!selectedEl) return;
      const child = Array.from(selectedEl.children).find(n => !isOwn(n));
      if (child) {
        selectElement(child);
        setLayerSolo(child, true);
        showToast("⬇ Entered inside layer & activated Solo View!");
      } else {
        showToast("This layer has no inner child elements");
      }
    });
  }

  if (btnLayerPrev) {
    btnLayerPrev.addEventListener("click", () => {
      if (!selectedEl) return;
      const prev = selectedEl.previousElementSibling;
      if (prev && !isOwn(prev)) {
        selectElement(prev);
        showToast(`◂ Selected layer behind: <${prev.tagName.toLowerCase()}>`);
      } else {
        showToast("No element behind this in layer");
      }
    });
  }

  if (btnLayerNext) {
    btnLayerNext.addEventListener("click", () => {
      if (!selectedEl) return;
      const next = selectedEl.nextElementSibling;
      if (next && !isOwn(next)) {
        selectElement(next);
        showToast(`▸ Selected layer in front: <${next.tagName.toLowerCase()}>`);
      } else {
        showToast("No element in front of this in layer");
      }
    });
  }

  function setLayerSolo(targetEl, enable) {
    document.querySelectorAll(".sp-layer-isolated").forEach(n => {
      n.style.removeProperty("visibility");
      n.classList.remove("sp-layer-isolated");
    });
    if (!enable || !targetEl) {
      isolatedLayerNode = null;
      if (soloBtn) soloBtn.classList.remove("active");
      if (btnSoloLayer) btnSoloLayer.classList.remove("active");
      if (soloLabel) soloLabel.textContent = "View Only This Layer (Solo View: OFF)";
      if (soloIcon) soloIcon.textContent = "👁️";
      return;
    }
    isolatedLayerNode = targetEl;
    let curr = targetEl;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const p = curr.parentElement;
      if (p) {
        Array.from(p.children).forEach(sibling => {
          if (sibling !== curr && !isOwn(sibling)) {
            sibling.style.setProperty("visibility", "hidden", "important");
            sibling.classList.add("sp-layer-isolated");
          }
        });
      }
      curr = p;
    }
    if (soloBtn) soloBtn.classList.add("active");
    if (btnSoloLayer) btnSoloLayer.classList.add("active");
    if (soloLabel) soloLabel.textContent = "Viewing Only This Layer (Solo View: ON)";
    if (soloIcon) soloIcon.textContent = "🎯";
  }

  if (btnSoloLayer) {
    btnSoloLayer.addEventListener("click", () => {
      if (!selectedEl) return;
      if (isolatedLayerNode === selectedEl) {
        setLayerSolo(selectedEl, false);
        showToast("Solo View OFF: Restored all canvas layers");
      } else {
        setLayerSolo(selectedEl, true);
        showToast("Solo View ON: Viewing only this layer!");
      }
    });
  }

  if (btnPutBehind) {
    btnPutBehind.addEventListener("click", () => {
      if (!selectedEl || !selectedEl.parentElement) return;
      const prev = selectedEl.previousElementSibling;
      if (prev && !isOwn(prev)) {
        undoStack.push({ type: "order", node: selectedEl, parent: selectedEl.parentElement, next: selectedEl.nextElementSibling });
        prev.insertAdjacentElement("beforebegin", selectedEl);
        updateSelectBox(selectedEl);
        showToast("⬇ Put element behind neighbor!");
      } else {
        ensurePositioned(selectedEl);
        const curZ = parseInt(selectedEl.style.zIndex) || 0;
        selectedEl.style.setProperty("z-index", (curZ - 1) + "", "important");
        if (zInput) zInput.value = curZ - 1;
        updateSelectBox(selectedEl);
        showToast("⬇ Lowered layer z-index (-1)");
      }
    });
  }

  if (btnPutFront) {
    btnPutFront.addEventListener("click", () => {
      if (!selectedEl || !selectedEl.parentElement) return;
      const next = selectedEl.nextElementSibling;
      if (next && !isOwn(next)) {
        undoStack.push({ type: "order", node: selectedEl, parent: selectedEl.parentElement, next: selectedEl.nextElementSibling });
        next.insertAdjacentElement("afterend", selectedEl);
        updateSelectBox(selectedEl);
        showToast("⬆ Put element in front of neighbor!");
      } else {
        ensurePositioned(selectedEl);
        const curZ = parseInt(selectedEl.style.zIndex) || 0;
        selectedEl.style.setProperty("z-index", (curZ + 1) + "", "important");
        if (zInput) zInput.value = curZ + 1;
        updateSelectBox(selectedEl);
        showToast("⬆ Increased layer z-index (+1)");
      }
    });
  }

  if (btnPushBack) {
    btnPushBack.addEventListener("click", () => {
      sendElementToBack(selectedEl);
    });
  }

  if (btnBringFront) {
    btnBringFront.addEventListener("click", () => {
      bringElementToFront(selectedEl);
    });
  }

  if (btnSendCanvas) {
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
  }

  if (zUpBtn) {
    zUpBtn.addEventListener("click", () => {
      if (!selectedEl) return;
      ensurePositioned(selectedEl);
      const next = (parseInt(zInput.value) || 0) + 1;
      zInput.value = next;
      selectedEl.style.setProperty("z-index", next, "important");
    });
  }

  if (zDownBtn) {
    zDownBtn.addEventListener("click", () => {
      if (!selectedEl) return;
      ensurePositioned(selectedEl);
      const next = (parseInt(zInput.value) || 0) - 1;
      zInput.value = next;
      selectedEl.style.setProperty("z-index", next, "important");
    });
  }

  if (zInput) {
    zInput.addEventListener("change", e => {
      if (!selectedEl) return;
      ensurePositioned(selectedEl);
      selectedEl.style.setProperty("z-index", e.target.value, "important");
    });
  }

  if (layerBgColorPicker && layerBgColorHex) {
    layerBgColorPicker.addEventListener("input", e => {
      layerBgColorHex.value = e.target.value;
    });
    layerBgColorHex.addEventListener("input", e => {
      layerBgColorPicker.value = e.target.value;
    });
  }

  if (btnApplyLayerColor) {
    btnApplyLayerColor.addEventListener("click", () => {
      let targetNode = selectedEl;
      let targetLabel = "Selected Element";

      if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
        targetNode = document.body;
        targetLabel = "Body Canvas";
      } else if (activeBgTargetMode === "html") {
        targetNode = document.documentElement;
        targetLabel = "Root HTML";
      }

      if (!targetNode) return;
      const col = layerBgColorHex ? layerBgColorHex.value.trim() : "";
      if (col) {
        undoStack.push({ type: "style", node: targetNode, prop: "background-color", oldVal: targetNode.style.backgroundColor });
        targetNode.style.setProperty("background-color", col, "important");
        targetNode.style.setProperty("background", col, "important");
        if (targetNode === document.body || targetNode === document.documentElement) {
          setPageThemeBackground(col);
        }
        if (selectedEl) {
          updateSelectBox(selectedEl);
          updateSandboxPreview(selectedEl);
        }
        showToast(`🎨 Set ${targetLabel} background to ${col}`);
      }
    });
  }

  if (btnLayerCode) {
    btnLayerCode.addEventListener("click", () => {
      if (!selectedEl) return;
      activeToolMode = "code";
      syncDockUI("code");
      drawer.classList.add("sp-open");
      const codeTab = root.querySelector(".sp-drawer-tab[data-tab='code']");
      if (codeTab) codeTab.click();
      populateDualCodePanes(selectedEl);
      showToast("💻 Opened code editor for selected layer!");
    });
  }

  if (btnLayerToImage) {
    btnLayerToImage.addEventListener("click", async () => {
      if (!selectedEl) return;
      const target = selectedEl;
      const r = target.getBoundingClientRect();
      const w = Math.max(20, Math.round(r.width));
      const h = Math.max(20, Math.round(r.height));

      showToast("📷 Converting layer into image...");
      try {
        const clone = target.cloneNode(true);
        clone.querySelectorAll("#sp-root, [id^='sp-']").forEach(n => n.remove());

        const s = new XMLSerializer().serializeToString(clone);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;">
              ${s}
            </div>
          </foreignObject>
        </svg>`;

        const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          const dataUrl = canvas.toDataURL("image/png");

          const newImg = document.createElement("img");
          newImg.src = dataUrl;
          newImg.className = target.className + " sp-custom-element";
          newImg.style.width = w + "px";
          newImg.style.height = h + "px";
          newImg.style.position = "relative";
          newImg.style.display = "block";

          undoStack.push({ type: "html", oldEl: target, newEl: newImg, parent: target.parentNode });
          target.parentNode.replaceChild(newImg, target);
          selectElement(newImg);
          showToast("📷 Converted layer into image on canvas!");
        };
        img.onerror = () => {
          showToast("Layer snapshot captured (ready on canvas)");
        };
        img.src = svgUrl;
      } catch (err) {
        showToast("Image conversion error: " + err.message);
      }
    });
  }

  if (btnPutText) {
    btnPutText.addEventListener("click", () => {
      if (!selectedEl) return;
      const p = document.createElement("p");
      p.className = "sp-custom-element";
      p.textContent = "New Text Block";
      p.style.fontSize = "16px";
      p.style.color = "#FFFFFF";
      p.style.margin = "8px 0";
      selectedEl.appendChild(p);
      selectElement(p);
      showToast("🔤 Added text to layer!");
    });
  }

  if (btnPutCard) {
    btnPutCard.addEventListener("click", () => {
      if (!selectedEl) return;
      const card = document.createElement("div");
      card.className = "sp-custom-element";
      card.textContent = "New Layer Card";
      card.style.padding = "16px 20px";
      card.style.background = "#1E293B";
      card.style.border = "1px solid #38BDF8";
      card.style.borderRadius = "8px";
      card.style.color = "#F8FAFC";
      card.style.margin = "8px 0";
      selectedEl.appendChild(card);
      selectElement(card);
      showToast("📦 Added card to layer!");
    });
  }

  if (btnPutImage) {
    btnPutImage.addEventListener("click", () => {
      openAddModal();
    });
  }

  /* ── Focused Relatives & Breadcrumbs ── */
  function buildBreadcrumbs(el) {
    if (!el) return;

    if (layerBreadcrumb) {
      layerBreadcrumb.innerHTML = "";
      const chain = [];
      let c = el;
      while (c && c !== document.documentElement && !isOwn(c)) {
        chain.unshift(c);
        c = c.parentElement;
      }
      chain.forEach((node, idx) => {
        const isLast = (idx === chain.length - 1);
        const tag = node.tagName.toLowerCase();
        const cls = getPrimaryClass(node);
        const btn = document.createElement("button");
        btn.className = "sp-crumb-chip" + (isLast ? " active" : "");
        btn.textContent = `${tag}${cls}`;
        btn.title = `Select <${tag}>`;
        btn.addEventListener("click", () => selectElement(node));
        layerBreadcrumb.appendChild(btn);
        if (!isLast) {
          const sep = document.createElement("span");
          sep.className = "sp-crumb-sep";
          sep.textContent = ">";
          layerBreadcrumb.appendChild(sep);
        }
      });
    }

    if (curLayerBadge) {
      curLayerBadge.textContent = `${el.tagName.toLowerCase()}${getPrimaryClass(el)}`;
    }

    if (layerBgColorHex && layerBgColorPicker) {
      const cs = window.getComputedStyle(el);
      const hex = rgbToHex(cs.backgroundColor);
      layerBgColorHex.value = hex;
      layerBgColorPicker.value = hex.startsWith("#") ? hex : "#0f172a";
    }

    // 5. Ancestor Tree in Collapsible Details
    if (ancestorsList) {
      const ancestors = [];
      let up = parent;
      while (up && up !== document.documentElement && !isOwn(up)) {
        ancestors.unshift(up);
        up = up.parentElement;
      }
      if (ancestors.length > 0) {
        ancestors.forEach((anc, idx) => {
          ancestorsList.appendChild(makeChip(anc, false, `${idx + 1}. `));
        });
      } else {
        ancestorsList.textContent = "Direct child of document";
      }
    }
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

  /* ══════════════════════════════════════════════════════════
     Direct Inline Word / Text Editing Engine
     ══════════════════════════════════════════════════════════ */
  let activeEditingNode = null;

  function isTextEditableCandidate(el) {
    if (!el || isOwn(el)) return false;
    const nonTextTags = [
      "IMG", "SVG", "CANVAS", "VIDEO", "AUDIO", "IFRAME", "PICTURE", "SOURCE",
      "PATH", "CIRCLE", "RECT", "POLYGON", "POLYLINE", "ELLIPSE", "LINE", "G",
      "HR", "BR", "INPUT", "TEXTAREA", "SELECT", "OBJECT", "EMBED"
    ];
    if (nonTextTags.includes(el.tagName)) return false;

    // Check if element is purely an image container or media wrapper with no meaningful text
    const text = (el.innerText || el.textContent || "").trim();
    if (!text) return false;

    // If it has children that are images and direct text length is 0, don't edit
    const hasMedia = el.querySelector("img, svg, canvas, video, iframe");
    if (hasMedia) {
      const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
      if (!hasDirectText) return false;
    }

    return true;
  }

  function startInlineTextEdit(targetEl) {
    if (!targetEl || isOwn(targetEl)) return;
    if (!isTextEditableCandidate(targetEl)) return;

    // Find the text-bearing node (element with direct text, or the element itself)
    let textEl = targetEl;
    if (targetEl.childNodes.length === 1 && targetEl.childNodes[0].nodeType === Node.TEXT_NODE) {
      textEl = targetEl;
    } else {
      const candidate = targetEl.closest("span, p, a, button, h1, h2, h3, h4, h5, h6, strong, b, em, i, small, label, li, td, th");
      if (candidate && !isOwn(candidate) && isTextEditableCandidate(candidate)) {
        textEl = candidate;
      }
    }

    if (!isTextEditableCandidate(textEl)) return;

    if (activeEditingNode && activeEditingNode !== textEl) {
      finishInlineTextEdit(activeEditingNode);
    }

    activeEditingNode = textEl;
    textEl._spOriginalText = textEl.innerText;
    textEl.contentEditable = "true";
    textEl.classList.add("sp-inline-editing");
    textEl.focus();

    // Place cursor at end of text
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

    showToast("✏️ Editing words live • Type new text, press Enter to finish");

    function onBlur() {
      finishInlineTextEdit(textEl);
      textEl.removeEventListener("blur", onBlur);
      textEl.removeEventListener("keydown", onKey);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        textEl.innerText = textEl._spOriginalText;
        textEl.blur();
      } else if (ev.key === "Enter" && !ev.shiftKey && !["P", "DIV"].includes(textEl.tagName)) {
        ev.preventDefault();
        textEl.blur();
      }
    }

    textEl.addEventListener("blur", onBlur);
    textEl.addEventListener("keydown", onKey);
  }

  function finishInlineTextEdit(node) {
    if (!node) return;
    node.contentEditable = "false";
    node.classList.remove("sp-inline-editing");
    if (node._spOriginalText !== undefined && node.innerText !== node._spOriginalText) {
      const oldText = node._spOriginalText;
      const newText = node.innerText;
      undoStack.push({
        type: "text",
        node,
        oldText,
        newText
      });
      delete node._spOriginalText;
      updateSandboxPreview(selectedEl);
      populateDualCodePanes(selectedEl);
      updateSelectBox(selectedEl);
      showToast("✓ Saved word edits to live site!");
    }
    if (activeEditingNode === node) activeEditingNode = null;
  }

  if (btnEditText) {
    btnEditText.addEventListener("click", () => {
      if (selectedEl && isTextEditableCandidate(selectedEl)) startInlineTextEdit(selectedEl);
      else showToast("Select a text element to edit words");
    });
  }

  // Prevent browser native HTML5 drag-and-drop on <a> links, buttons, and images
  document.addEventListener("dragstart", e => {
    if (isEnabled && !isOwn(e.target)) {
      e.preventDefault();
      return false;
    }
  }, true);

  let isDragging = false;
  let dragTarget = null;
  let dragOrigin = { mouseX: 0, mouseY: 0, elemX: 0, elemY: 0, scrollX: 0, scrollY: 0 };
  let isDragCandidate = false;
  let autoScrollRaf = null;
  let lastDragMouseEvent = null;

  function handleDragAutoScroll() {
    if (!isDragging || !dragTarget || !lastDragMouseEvent) {
      if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
      }
      return;
    }

    const e = lastDragMouseEvent;
    const edgeThreshold = 80;
    let scrollDelta = 0;

    if (e.clientY < edgeThreshold) {
      // Near or past top edge: smoothly autoscroll UP
      const intensity = Math.min(1, Math.max(0.2, (edgeThreshold - e.clientY) / edgeThreshold));
      scrollDelta = -Math.round(22 * intensity);
    } else if (e.clientY > window.innerHeight - edgeThreshold) {
      // Near or past bottom edge: smoothly autoscroll DOWN
      const intensity = Math.min(1, Math.max(0.2, (e.clientY - (window.innerHeight - edgeThreshold)) / edgeThreshold));
      scrollDelta = Math.round(22 * intensity);
    }

    if (scrollDelta !== 0) {
      const prevScrollY = window.scrollY || window.pageYOffset || 0;
      window.scrollBy(0, scrollDelta);
      const newScrollY = window.scrollY || window.pageYOffset || 0;

      const curScrollX = window.scrollX || window.pageXOffset || 0;
      const dScrollX = curScrollX - dragOrigin.scrollX;
      const dScrollY = newScrollY - dragOrigin.scrollY;

      const dx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX) + dScrollX;
      const dy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY) + dScrollY;
      dragTarget._spTranslate = { x: dx, y: dy };
      dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
      updateSelectBox(dragTarget);

      autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
    } else {
      autoScrollRaf = null;
    }
  }

  document.addEventListener("mousedown", e => {
    if (!isEnabled || isOwn(e.target)) return;

    // If currently editing text and user clicks outside or starts a drag, finish inline editing immediately!
    if (activeEditingNode) {
      if (activeEditingNode !== e.target && !activeEditingNode.contains(e.target)) {
        finishInlineTextEdit(activeEditingNode);
      }
    }

    // Allow dragging:
    // 1. In Move Mode (always)
    // 2. OR on any currently selected element or its handles
    // 3. OR on any clicked element (even if it contains letters / text)
    const isTargetOrChild = selectedEl && (selectedEl === e.target || selectedEl.contains(e.target));
    const shouldAllowDrag = (activeToolMode === "move") || isTargetOrChild || !selectedEl;

    if (shouldAllowDrag) {
      // Find drag target: if user clicked an element with letters, links, buttons, or custom elements
      const parentInteractive = e.target.closest("a, button, [role='button'], .sp-custom-element, img, svg, picture, figure, p, span, h1, h2, h3, h4, h5, h6, div, article, section");
      dragTarget = (selectedEl && (selectedEl === e.target || selectedEl.contains(e.target)))
        ? selectedEl
        : (parentInteractive || e.target);

      ensurePositioned(dragTarget);

      const curTranslate = getElementTranslate(dragTarget);
      dragOrigin = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elemX: curTranslate.x,
        elemY: curTranslate.y,
        scrollX: window.scrollX || window.pageXOffset || 0,
        scrollY: window.scrollY || window.pageYOffset || 0
      };

      isDragCandidate = true;
      isDragging = false;
    }
  }, true);

  document.addEventListener("mousemove", e => {
    if (!isEnabled) return;

    if (isDragCandidate && dragTarget) {
      lastDragMouseEvent = e;
      const dist = Math.hypot(e.clientX - dragOrigin.mouseX, e.clientY - dragOrigin.mouseY);
      // Once mouse moves more than 3px, treat as intentional drag
      if (dist > 3) {
        // If we were editing text, finish it now so drag moves cleanly
        if (activeEditingNode) finishInlineTextEdit(activeEditingNode);

        isDragging = true;
        dragTarget.classList.add("sp-free-dragging");

        const curScrollX = window.scrollX || window.pageXOffset || 0;
        const curScrollY = window.scrollY || window.pageYOffset || 0;
        const dScrollX = curScrollX - dragOrigin.scrollX;
        const dScrollY = curScrollY - dragOrigin.scrollY;

        const dx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX) + dScrollX;
        const dy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY) + dScrollY;
        dragTarget._spTranslate = { x: dx, y: dy };
        dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
        updateSelectBox(dragTarget);

        if (!autoScrollRaf && (e.clientY < 80 || e.clientY > window.innerHeight - 80)) {
          autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
        }
      }
    } else if (isEnabled && !isDragging && !isResizing) {
      // Suppress hoverBox completely when an element is already selected:
      // This enforces ONE DIV ONLY (the target outline) with ZERO conflicting outlines!
      if (selectedEl) {
        hoverBox.style.display = "none";
        hoverLbl.style.display = "none";
        return;
      }

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
    if (autoScrollRaf) {
      cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = null;
    }
    lastDragMouseEvent = null;

    if (isDragCandidate) {
      if (isDragging && dragTarget) {
        dragTarget.classList.remove("sp-free-dragging");
        undoStack.push({
          type: "move",
          node: dragTarget,
          translate: { ...dragTarget._spTranslate }
        });
        showToast("✓ Moved element!");
      }
      isDragging = false;
      isDragCandidate = false;
      dragTarget = null;
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Double-Click to Edit Letters & Words In-Place
     ══════════════════════════════════════════════════════════ */
  document.addEventListener("dblclick", e => {
    if (!isEnabled || isOwn(e.target)) return;
    if (isTextEditableCandidate(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      startInlineTextEdit(e.target);
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

    // Accidental Misclick Protection:
    if (selectedEl && isTargetLocked && target !== selectedEl && !selectedEl.contains(target)) {
      if (!unlockPending) {
        unlockPending = true;
        selectBadge.textContent = "🔓 Click again to switch target";
        showToast("Target protected • Click again to switch target", 1800);
        return;
      } else {
        unlockPending = false;
      }
    }

    // Single-click on any element selects it (showing the ONE single target div)
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
        } else if (action.type === "text" && action.node) {
          action.node.innerText = action.oldText;
          updateSandboxPreview(action.node);
          populateDualCodePanes(action.node);
          updateSelectBox(action.node);
          showToast("↺ Restored original words");
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
        } else if (action.type === "img-replace" && action.node) {
          action.node.src = action.oldSrc;
          updateSelectBox(action.node);
          updateSandboxPreview(action.node);
          populateDualCodePanes(action.node);
          showToast("↺ Restored original image");
        } else if (action.type === "bg-image" && action.node) {
          if (action.oldBgImage !== undefined) action.node.style.backgroundImage = action.oldBgImage;
          if (action.oldBgSize !== undefined) action.node.style.backgroundSize = action.oldBgSize;
          if (action.oldBgPosition !== undefined) action.node.style.backgroundPosition = action.oldBgPosition;
          if (action.oldBgRepeat !== undefined) action.node.style.backgroundRepeat = action.oldBgRepeat;
          updateSelectBox(action.node);
          updateSandboxPreview(action.node);
          showToast("↺ Restored previous background");
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
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
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
  }

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
    } else if (e.data.type === "STYLEPEEK_SELECT") {
      if (!isEnabled) turnOnStylePeek("inspect");
      const target = e.data.selector ? document.querySelector(e.data.selector) : null;
      if (target) selectElement(target);
    }
  });

  /* ══════════════════════════════════════════════════════════
     Breadth-First Search (BFS) Interactive Branch State Crawler
     ══════════════════════════════════════════════════════════ */
  async function exploreAndRecordAllBranchStates() {
    let cancelRequested = false;
    let pill = null;

    // Create live floating status pill during BFS exploration
    pill = document.createElement("div");
    pill.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      color: #F8FAFC;
      border: 1px solid #38BDF8;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.3);
      border-radius: 9999px;
      padding: 10px 22px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    `;
    pill.innerHTML = `
      <span style="display:inline-block;animation:sp-spin 1s linear infinite;">⚡</span>
      <span id="sp-bfs-msg">Exploring interactive panel branches...</span>
      <kbd style="background:rgba(255,255,255,0.15);padding:2px 7px;border-radius:4px;font-size:11px;border:1px solid rgba(255,255,255,0.25);">ESC to Finish</kbd>
    `;
    document.body.appendChild(pill);

    const onKeyEsc = e => {
      if (e.key === "Escape") {
        cancelRequested = true;
        const msgEl = pill ? pill.querySelector("#sp-bfs-msg") : null;
        if (msgEl) msgEl.textContent = "Finalizing recorded states...";
      }
    };
    window.addEventListener("keydown", onKeyEsc, true);

    // Prevent external navigation during crawler clicking
    const onNavIntercept = e => {
      const link = e.target.closest ? e.target.closest("a") : null;
      if (link && link.href) {
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#") && !href.startsWith("javascript:")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener("click", onNavIntercept, true);

    const prevBeforeUnload = window.onbeforeunload;
    window.onbeforeunload = e => { e.preventDefault(); return ""; };

    let bidCounter = 1;
    let cidCounter = 1;
    const visitedBids = new Set();
    const branchStates = [];
    const maxClicks = 60;
    let totalClicks = 0;

    function isCandidateTrigger(el) {
      if (!el || el.nodeType !== 1) return false;
      if (isOwn(el) || (el.closest && el.closest("#sp-root"))) return false;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;

      // Skip destructive buttons
      const txt = (el.textContent || el.value || el.getAttribute("title") || el.getAttribute("aria-label") || "").trim().toLowerCase();
      if (/^(log\s*out|sign\s*out|delete|remove|clear\s*data|cancel|destroy|buy\s*now|checkout|pay\b)/i.test(txt)) {
        return false;
      }

      // Skip external links
      if (el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          return false;
        }
      }

      // Check tag and role
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      if (["button", "summary"].includes(tag)) return true;
      if (["button", "tab", "switch", "menuitem"].includes(role)) return true;
      if (el.hasAttribute("data-toggle") || el.hasAttribute("data-bs-toggle") || el.hasAttribute("aria-expanded") || el.hasAttribute("aria-controls")) return true;
      if (el.classList && (el.classList.contains("tab") || el.classList.contains("nav-link") || el.classList.contains("accordion-button"))) return true;

      // Check computed pointer cursor
      try {
        const cs = window.getComputedStyle(el);
        if (cs.cursor === "pointer" && el.offsetWidth >= 12 && el.offsetHeight >= 12) {
          if (el.offsetWidth < window.innerWidth * 0.92 && el.offsetHeight < window.innerHeight * 0.92) {
            return true;
          }
        }
      } catch (e) {}

      return false;
    }

    function ensureBid(el) {
      if (!el.getAttribute("data-sp-bid")) {
        el.setAttribute("data-sp-bid", `b-${bidCounter++}`);
      }
      return el.getAttribute("data-sp-bid");
    }

    function ensureCid(el) {
      if (!el.getAttribute("data-sp-cid")) {
        el.setAttribute("data-sp-cid", `c-${cidCounter++}`);
      }
      return el.getAttribute("data-sp-cid");
    }

    function dispatchRealisticClick(el) {
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      } catch(e) {}
      const opts = { bubbles: true, cancelable: true, view: window };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      try { el.click(); } catch (e) {}
    }

    function getTriggerLabel(el) {
      let l = (el.textContent || el.getAttribute("title") || el.getAttribute("aria-label") || el.value || "").trim().replace(/\s+/g, " ");
      if (l.length > 28) l = l.slice(0, 26) + "…";
      return l || el.tagName.toLowerCase();
    }

    try {
      // Find visible candidate triggers at page start
      const allInitialTriggers = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!isCandidateTrigger(el)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const level1Queue = [];
      allInitialTriggers.forEach(el => {
        const bid = ensureBid(el);
        level1Queue.push({ el, bid, path: [bid], depth: 1 });
      });

      const level2Queue = [];
      const level3Queue = [];

      // ── Process Level 1: "clear the first level of all buttons it can see" ──
      for (let i = 0; i < level1Queue.length; i++) {
        if (cancelRequested || totalClicks >= maxClicks) break;
        const item = level1Queue[i];
        if (visitedBids.has(item.bid)) continue;
        visitedBids.add(item.bid);

        const lbl = getTriggerLabel(item.el);
        if (pill) {
          const msgEl = pill.querySelector("#sp-bfs-msg");
          if (msgEl) msgEl.textContent = `Level 1: Clearing branch ${i + 1}/${level1Queue.length} ("${lbl}")`;
        }

        const capturedMutations = [];
        const observer = new MutationObserver(records => {
          for (const rec of records) {
            const tgt = rec.target;
            if (!tgt || isOwn(tgt) || (tgt.closest && tgt.closest("#sp-root"))) continue;
            const cid = ensureCid(tgt);
            if (rec.type === "attributes") {
              capturedMutations.push({
                cid,
                type: "attr",
                attr: rec.attributeName,
                val: tgt.getAttribute(rec.attributeName),
                className: tgt.className
              });
            } else if (rec.type === "childList") {
              capturedMutations.push({
                cid,
                type: "child",
                innerHTML: tgt.innerHTML
              });
            }
          }
        });

        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class", "style", "aria-expanded", "aria-selected", "aria-hidden", "hidden", "open"],
          childList: true,
          subtree: true
        });

        dispatchRealisticClick(item.el);
        totalClicks++;
        await new Promise(r => setTimeout(r, 150));
        observer.disconnect();

        // Query newly revealed candidate triggers inside this branch
        const childBids = [];
        const currentlyVisibleTriggers = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!isCandidateTrigger(el)) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

        currentlyVisibleTriggers.forEach(childEl => {
          const childBid = ensureBid(childEl);
          if (!visitedBids.has(childBid)) {
            childBids.push(childBid);
            if (!level2Queue.some(q => q.bid === childBid)) {
              level2Queue.push({
                el: childEl,
                bid: childBid,
                path: [...item.path, childBid],
                parentBid: item.bid,
                depth: 2
              });
            }
          }
        });

        branchStates.push({
          bid: item.bid,
          path: item.path,
          label: lbl,
          depth: 1,
          mutations: capturedMutations,
          childBids
        });
      }

      // ── Process Level 2: "before going deep in the tree" ──
      if (!cancelRequested && level2Queue.length > 0) {
        for (let i = 0; i < level2Queue.length; i++) {
          if (cancelRequested || totalClicks >= maxClicks) break;
          const item = level2Queue[i];
          if (visitedBids.has(item.bid)) continue;
          visitedBids.add(item.bid);

          const lbl = getTriggerLabel(item.el);
          if (pill) {
            const msgEl = pill.querySelector("#sp-bfs-msg");
            if (msgEl) msgEl.textContent = `Level 2: Exploring sub-branch ${i + 1}/${level2Queue.length} ("${lbl}")`;
          }

          // Ensure parent branch is active
          if (item.parentBid) {
            const parentEl = document.querySelector(`[data-sp-bid="${item.parentBid}"]`);
            if (parentEl) {
              dispatchRealisticClick(parentEl);
              await new Promise(r => setTimeout(r, 100));
            }
          }

          const capturedMutations = [];
          const observer = new MutationObserver(records => {
            for (const rec of records) {
              const tgt = rec.target;
              if (!tgt || isOwn(tgt) || (tgt.closest && tgt.closest("#sp-root"))) continue;
              const cid = ensureCid(tgt);
              if (rec.type === "attributes") {
                capturedMutations.push({
                  cid,
                  type: "attr",
                  attr: rec.attributeName,
                  val: tgt.getAttribute(rec.attributeName),
                  className: tgt.className
                });
              } else if (rec.type === "childList") {
                capturedMutations.push({
                  cid,
                  type: "child",
                  innerHTML: tgt.innerHTML
                });
              }
            }
          });

          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class", "style", "aria-expanded", "aria-selected", "aria-hidden", "hidden", "open"],
            childList: true,
            subtree: true
          });

          const currentTarget = document.querySelector(`[data-sp-bid="${item.bid}"]`) || item.el;
          dispatchRealisticClick(currentTarget);
          totalClicks++;
          await new Promise(r => setTimeout(r, 150));
          observer.disconnect();

          const childBids = [];
          const currentlyVisibleTriggers = Array.from(document.querySelectorAll("*")).filter(el => {
            if (!isCandidateTrigger(el)) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });

          currentlyVisibleTriggers.forEach(childEl => {
            const childBid = ensureBid(childEl);
            if (!visitedBids.has(childBid)) {
              childBids.push(childBid);
              if (!level3Queue.some(q => q.bid === childBid)) {
                level3Queue.push({
                  el: childEl,
                  bid: childBid,
                  path: [...item.path, childBid],
                  parentPath: item.path,
                  depth: 3
                });
              }
            }
          });

          branchStates.push({
            bid: item.bid,
            path: item.path,
            label: lbl,
            depth: 2,
            mutations: capturedMutations,
            childBids
          });
        }
      }

      // ── Process Level 3 (Deep branches) ──
      if (!cancelRequested && level3Queue.length > 0) {
        for (let i = 0; i < level3Queue.length; i++) {
          if (cancelRequested || totalClicks >= maxClicks) break;
          const item = level3Queue[i];
          if (visitedBids.has(item.bid)) continue;
          visitedBids.add(item.bid);

          const lbl = getTriggerLabel(item.el);
          if (pill) {
            const msgEl = pill.querySelector("#sp-bfs-msg");
            if (msgEl) msgEl.textContent = `Level 3: Deep branch ${i + 1}/${level3Queue.length} ("${lbl}")`;
          }

          if (item.parentPath) {
            for (const ancestorBid of item.parentPath) {
              const ancEl = document.querySelector(`[data-sp-bid="${ancestorBid}"]`);
              if (ancEl) {
                dispatchRealisticClick(ancEl);
                await new Promise(r => setTimeout(r, 90));
              }
            }
          }

          const capturedMutations = [];
          const observer = new MutationObserver(records => {
            for (const rec of records) {
              const tgt = rec.target;
              if (!tgt || isOwn(tgt) || (tgt.closest && tgt.closest("#sp-root"))) continue;
              const cid = ensureCid(tgt);
              if (rec.type === "attributes") {
                capturedMutations.push({
                  cid,
                  type: "attr",
                  attr: rec.attributeName,
                  val: tgt.getAttribute(rec.attributeName),
                  className: tgt.className
                });
              } else if (rec.type === "childList") {
                capturedMutations.push({
                  cid,
                  type: "child",
                  innerHTML: tgt.innerHTML
                });
              }
            }
          });

          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class", "style", "aria-expanded", "aria-selected", "aria-hidden", "hidden", "open"],
            childList: true,
            subtree: true
          });

          const currentTarget = document.querySelector(`[data-sp-bid="${item.bid}"]`) || item.el;
          dispatchRealisticClick(currentTarget);
          totalClicks++;
          await new Promise(r => setTimeout(r, 150));
          observer.disconnect();

          branchStates.push({
            bid: item.bid,
            path: item.path,
            label: lbl,
            depth: 3,
            mutations: capturedMutations,
            childBids: []
          });
        }
      }

      // Re-activate first level 1 trigger to restore natural view
      if (level1Queue.length > 0) {
        const firstEl = document.querySelector(`[data-sp-bid="${level1Queue[0].bid}"]`);
        if (firstEl) {
          dispatchRealisticClick(firstEl);
          await new Promise(r => setTimeout(r, 100));
        }
      }

    } catch (err) {
      console.warn("BFS State Crawl warning:", err);
    } finally {
      window.removeEventListener("keydown", onKeyEsc, true);
      window.removeEventListener("click", onNavIntercept, true);
      window.onbeforeunload = prevBeforeUnload;
      if (pill) {
        try { pill.remove(); } catch(e) {}
      }
    }

    return branchStates;
  }

  /* ══════════════════════════════════════════════════════════
     Full-Page Site Auto-Scroll Capture & Download (Clean, No Extension Artifacts)
     ══════════════════════════════════════════════════════════ */
  async function captureVisibleViewport() {
    showToast("📸 Auto-scrolling & exploring interactive panel branches...");

    const origScrollX = window.scrollX || window.pageXOffset || 0;
    const origScrollY = window.scrollY || window.pageYOffset || 0;

    // 1. Auto-scroll through entire document so lazy-loaded images & cards render
    try {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight
      );
      const step = Math.max(300, Math.floor(window.innerHeight * 0.75));
      for (let pos = 0; pos < scrollHeight; pos += step) {
        window.scrollTo(0, pos);
        await new Promise(r => setTimeout(r, 50));
      }
      window.scrollTo(0, scrollHeight);
      await new Promise(r => setTimeout(r, 120));
      window.scrollTo(origScrollX, origScrollY);
      await new Promise(r => setTimeout(r, 80));
    } catch (e) {}

    // 2. Run Breadth-First Search (BFS) Interactive Branch State Exploration
    const recordedBranches = await exploreAndRecordAllBranchStates();

    // 3. Hide any active extension toasts & popovers before cloning
    if (toast) toast.classList.remove("sp-show");
    if (selectBox) selectBox.style.display = "none";
    if (hoverBox) hoverBox.style.display = "none";
    if (hoverLbl) hoverLbl.style.display = "none";

    // 4. Detach StylePeek root completely from live DOM
    root.remove();
    const docClone = document.documentElement.cloneNode(true);

    // Reattach root cleanly to live document
    document.documentElement.appendChild(root);
    if (isEnabled && selectedEl) updateSelectBox(selectedEl);

    // Clean up temporary live attributes from active page
    document.querySelectorAll("[data-sp-bid]").forEach(el => el.removeAttribute("data-sp-bid"));
    document.querySelectorAll("[data-sp-cid]").forEach(el => el.removeAttribute("data-sp-cid"));

    // 5. Purge scripts, iframes, and StylePeek extension elements
    docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
    docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
    docClone.querySelectorAll("#sp-root, [id^='sp-'], [class^='sp-'], [class*=' sp-'], .sp-popover, #sp-dock, #sp-sidebar-dock, #sp-drawer, #sp-inspect-preview-panel, #sp-error-modal, #sp-toast, #sp-select-box, #sp-hover-box, #sp-hover-label").forEach(e => e.remove());

    // 6. Clean residual attributes, preserving data-sp-bid and data-sp-cid for the offline runtime
    const allClonedNodes = Array.from(docClone.querySelectorAll("*"));
    for (const node of allClonedNodes) {
      if (!node.parentNode) continue;

      // Strip temporary data attributes (preserve sp-bid & sp-cid for offline runtime)
      Array.from(node.attributes || []).forEach(attr => {
        if (attr.name.startsWith("data-sp-") && attr.name !== "data-sp-bid" && attr.name !== "data-sp-cid") {
          node.removeAttribute(attr.name);
        }
      });

      // Strip extension classes
      if (node.classList) {
        node.classList.remove("sp-free-dragging", "sp-inline-editing", "sp-custom-element", "sp-layer-isolated");
        if (node.className === "") node.removeAttribute("class");
      }

      // Purge any residual extension text or navbar elements if present
      const txt = node.textContent || "";
      if (
        txt.includes("Capturing rendered phone") ||
        txt.includes("Color Palette ✕") ||
        txt.includes("With siblings Pick another") ||
        txt.includes("LIVE COMPONENT PREVIEW") ||
        (txt.includes("🔍") && txt.includes("✋") && txt.includes("🎨") && txt.includes("✂️"))
      ) {
        if (node !== docClone.body && node !== docClone) {
          node.remove();
        }
      }
    }

    // 7. Inlining Images into Base64 / Absolute URLs
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

    // 8. Inlining Stylesheets & Presets (Full Page)
    let fullCSS = `
/* ── StylePeek Studio: Full-Page Clean Site Export ── */
* { box-sizing: border-box; }
html { margin: 0; padding: 0; min-height: 100vh; width: 100%; }
body { margin: 0; padding: 0; min-height: 100vh; width: 100%; }
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

    // 9. Configure Head
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
    metaVp.content = "width=device-width, initial-scale=1.0";

    const styleEl = document.createElement("style");
    styleEl.textContent = fullCSS;
    cloneHead.appendChild(styleEl);

    // 10. Inject Offline Interactive State Data and Engine
    const stateDataScript = document.createElement("script");
    stateDataScript.id = "sp-state-data";
    stateDataScript.type = "application/json";
    stateDataScript.textContent = JSON.stringify(recordedBranches || []);
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

    var isExpandedAll = false;
    var originalStyles = new Map();

    var badge = document.createElement("div");
    badge.id = "sp-offline-badge";
    badge.style.cssText = "position:fixed;bottom:16px;right:16px;background:rgba(15,23,42,0.92);color:#F8FAFC;border:1px solid #38BDF8;box-shadow:0 8px 24px rgba(0,0,0,0.5);border-radius:12px;padding:8px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;z-index:999999;display:flex;align-items:center;gap:10px;backdrop-filter:blur(8px);user-select:none;";
    badge.innerHTML = '<span>⚡ StylePeek Offline App (<b>' + states.length + '</b> States)</span><span id="sp-cur-state" style="color:#38BDF8;font-weight:600;">Active: Default</span><button id="sp-btn-expand-all" style="background:#38BDF8;color:#0F172A;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;">Expand All</button>';
    document.body.appendChild(badge);

    var curStateLabel = badge.querySelector("#sp-cur-state");
    var btnExpand = badge.querySelector("#sp-btn-expand-all");

    btnExpand.addEventListener("click", function() {
      isExpandedAll = !isExpandedAll;
      btnExpand.textContent = isExpandedAll ? "Collapse" : "Expand All";
      btnExpand.style.background = isExpandedAll ? "#F43F5E" : "#38BDF8";
      btnExpand.style.color = isExpandedAll ? "#FFF" : "#0F172A";

      var panels = document.querySelectorAll("[data-sp-cid]");
      panels.forEach(function(p) {
        if (isExpandedAll) {
          if (!originalStyles.has(p)) originalStyles.set(p, p.style.cssText);
          p.style.setProperty("display", "block", "important");
          p.style.setProperty("opacity", "1", "important");
          p.style.setProperty("visibility", "visible", "important");
        } else {
          if (originalStyles.has(p)) {
            p.style.cssText = originalStyles.get(p);
          }
        }
      });
    });

    document.addEventListener("click", function(e) {
      var trigger = e.target.closest("[data-sp-bid]");
      if (!trigger) return;
      var bid = trigger.getAttribute("data-sp-bid");
      var state = stateMap[bid];
      if (!state) return;

      if (trigger.tagName === "A") {
        var href = trigger.getAttribute("href") || "";
        if (href.startsWith("#") || href.startsWith("javascript:")) {
          e.preventDefault();
        }
      }

      if (Array.isArray(state.mutations)) {
        state.mutations.forEach(function(m) {
          var target = document.querySelector('[data-sp-cid="' + m.cid + '"]');
          if (!target) return;
          if (m.className !== undefined) target.className = m.className;
          if (m.attr && m.val !== undefined) target.setAttribute(m.attr, m.val);
          if (m.innerHTML !== undefined) target.innerHTML = m.innerHTML;
        });
      }

      if (curStateLabel) {
        curStateLabel.textContent = "Active: " + (state.label || bid);
      }
    }, true);
  } catch(e) {
    console.error("StylePeek Offline Runtime init failed:", e);
  }
})();
`;
    cloneBody.appendChild(offlineRuntimeScript);

    // 11. Download full page file cleanly
    const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;
    const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const rawTitle = (document.title || "website").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `full-page-${rawTitle}-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { a.remove(); } catch (e) {}
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 1500);

    showToast(`✓ Downloaded interactive offline site with ${recordedBranches.length} states (${a.download})!`);
  }
})();
