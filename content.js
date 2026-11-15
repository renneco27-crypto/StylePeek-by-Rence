/**
 * StylePeek Studio — Main Controller & Studio Dock
 * content.js
 */

(function () {
  if (window.__stylePeekInjected) return;
  window.__stylePeekInjected = true;

  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

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

    <!-- Magnetic Snap Guidelines -->
    <div id="sp-snap-guide-h"></div>
    <div id="sp-snap-guide-v"></div>

    <!-- Right-Click Quick Dropdown Menu -->
    <div id="sp-context-menu">
      <div class="sp-ctx-header">
        <div class="sp-ctx-title-row">
          <span class="sp-ctx-tag" id="sp-ctx-tag">div</span>
          <span class="sp-ctx-name" id="sp-ctx-name">.element</span>
        </div>
        <span class="sp-ctx-coords" id="sp-ctx-coords">0×0 · X: 0 Y: 0</span>
      </div>

      <div class="sp-ctx-section">
        <button type="button" class="sp-ctx-item" data-action="edit-text">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.type}</span><span class="sp-ctx-label">Edit Text</span></span>
          <span class="sp-ctx-kbd">DblClick</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="transform-code">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.code}</span><span class="sp-ctx-label">Transform Code</span></span>
          <span class="sp-ctx-kbd">Code</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="open-style">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.palette}</span><span class="sp-ctx-label">Colors & Border</span></span>
          <span class="sp-ctx-kbd">C</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="open-palette">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.dropper}</span><span class="sp-ctx-label">Website Palette</span></span>
          <span class="sp-ctx-kbd">P</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="step-behind">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.stepDown}</span><span class="sp-ctx-label">Step Behind</span></span>
          <span class="sp-ctx-kbd">Step</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="move-to-back">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.layers}</span><span class="sp-ctx-label">Move to Back</span></span>
          <span class="sp-ctx-kbd">[</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="bring-to-front">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.stepUp}</span><span class="sp-ctx-label">Bring to Front</span></span>
          <span class="sp-ctx-kbd">]</span>
        </button>
      </div>

      <div class="sp-ctx-divider"></div>

      <div class="sp-ctx-section">
        <button type="button" class="sp-ctx-item" data-action="duplicate">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.box}</span><span class="sp-ctx-label">Duplicate Layer</span></span>
          <span class="sp-ctx-kbd">Ctrl+V</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="move">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.move}</span><span class="sp-ctx-label">Move Position</span></span>
          <span class="sp-ctx-kbd">M</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="resize">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.resize}</span><span class="sp-ctx-label">Stretch / Resize</span></span>
          <span class="sp-ctx-kbd">S</span>
        </button>
      </div>

      <div class="sp-ctx-divider"></div>

      <div class="sp-ctx-section">
        <button type="button" class="sp-ctx-item danger" data-action="delete">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.trash}</span><span class="sp-ctx-label">Delete Element</span></span>
          <span class="sp-ctx-kbd">Del</span>
        </button>
        <button type="button" class="sp-ctx-item" data-action="undo">
          <span class="sp-ctx-item-left"><span class="sp-ctx-icon">${SP_ICONS.undo}</span><span class="sp-ctx-label">Undo Last Action</span></span>
          <span class="sp-ctx-kbd">Ctrl+Z</span>
        </button>
      </div>
    </div>

    <!-- Dedicated Sleek Code Transform Modal -->
    <div id="sp-code-modal" class="sp-code-modal-overlay">
      <div class="sp-code-modal-card">
        <div class="sp-code-modal-header">
          <div class="sp-code-modal-title-row">
            <span class="sp-code-modal-badge" id="sp-code-modal-badge">&lt;div&gt;</span>
            <span class="sp-code-modal-title" id="sp-code-modal-title">Transform Element Code</span>
          </div>
          <button type="button" class="sp-code-modal-close" id="sp-code-modal-close" title="Close (Esc)">✕</button>
        </div>

        <div class="sp-code-modal-img-row" id="sp-code-modal-img-row" style="display:none;">
          <label class="sp-code-modal-label">Image Source URL:</label>
          <div class="sp-code-modal-img-inputs">
            <input type="text" class="sp-code-modal-input" id="sp-code-modal-img-url" placeholder="https://... or data:image/..." />
            <button type="button" class="sp-code-modal-btn-sub" id="sp-code-modal-img-apply">Update Image</button>
          </div>
        </div>

        <div class="sp-code-modal-editor-wrap">
          <div class="sp-code-modal-editor-bar">
            <span class="sp-code-modal-editor-lang">HTML · Live Code</span>
            <span class="sp-code-modal-editor-hint">Edit tag, attributes, classes or inner content</span>
          </div>
          <textarea class="sp-code-modal-textarea" id="sp-code-modal-textarea" spellcheck="false" placeholder="<element>...</element>"></textarea>
        </div>

        <div class="sp-code-modal-footer">
          <div class="sp-code-modal-shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to Apply live &middot; <kbd>Esc</kbd> to Cancel
          </div>
          <div class="sp-code-modal-actions">
            <button type="button" class="sp-code-modal-btn-cancel" id="sp-code-modal-cancel">Cancel</button>
            <button type="button" class="sp-code-modal-btn-apply" id="sp-code-modal-apply">Apply Code Changes &rarr;</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Tactile Sidebar Dock (CTRL+SPC UI Kit) -->
    <div id="sp-sidebar-dock">
      <div id="sp-dock-handle" title="Drag dock">${SP_ICONS.grip}</div>
      <button class="sp-dock-btn sp-dock-active" data-tool="inspect" title="Inspect & Select Element (I)">${SP_ICONS.inspect}</button>
      <button class="sp-dock-btn" data-tool="move" title="Move & Drag Any Layer (M)">${SP_ICONS.move}</button>
      <button class="sp-dock-btn" data-tool="resize" title="Stretch / Resize Element (S)">${SP_ICONS.resize}</button>
      <button class="sp-dock-btn add-btn" data-tool="add" id="sp-dock-add" title="Add Element or Picture (A)">${SP_ICONS.plus}</button>
      <button class="sp-dock-btn" data-tool="style" title="Colors & Style Inspector (C)">${SP_ICONS.palette}</button>
      <button class="sp-dock-btn" data-tool="palette" id="sp-dock-palette" title="Website Color Palette Picker (P)">${SP_ICONS.dropper}</button>
      <button class="sp-dock-btn" data-tool="delete" title="Delete Element (D)">${SP_ICONS.trash}</button>
      <button class="sp-dock-btn undo-btn" id="sp-dock-undo" title="Undo Last Action (Ctrl+Z)">${SP_ICONS.undo}</button>
      <div class="sp-dock-sep"></div>
      <button class="sp-dock-btn" id="sp-dock-view-mode" title="Toggle Console Taskbar / Floating Dock">${SP_ICONS.mobile}</button>
      <button class="sp-dock-btn" id="sp-dock-capture" title="Capture Visible Page (Alt+C)">${SP_ICONS.camera}</button>
      <button class="sp-dock-btn power-btn" id="sp-dock-power" title="Close Studio">${SP_ICONS.power}</button>
    </div>

    <!-- Mobile View Console Adjuster Tray (Docked above console taskbar) -->
    <div id="sp-mobile-adjuster">
      <div class="sp-mob-info-row">
        <div class="sp-mob-badge-group">
          <span class="sp-mob-tag" id="sp-mob-tag">div</span>
          <span class="sp-mob-name" id="sp-mob-name">.element</span>
          <span class="sp-mob-dim" id="sp-mob-dim">0×0</span>
        </div>
        <button type="button" class="sp-mob-close-btn" id="sp-mob-adjuster-close" title="Close Adjuster">✕</button>
      </div>
      <div class="sp-mob-controls-row">
        <div class="sp-mob-stepper-group">
          <button type="button" class="sp-mob-step-btn" id="sp-mob-w-minus" title="Shrink Width">-W</button>
          <button type="button" class="sp-mob-step-btn" id="sp-mob-w-plus" title="Enlarge Width">+W</button>
          <button type="button" class="sp-mob-step-btn" id="sp-mob-h-minus" title="Shrink Height">-H</button>
          <button type="button" class="sp-mob-step-btn" id="sp-mob-h-plus" title="Enlarge Height">+H</button>
        </div>
        <div class="sp-mob-scale-group">
          <button type="button" class="sp-mob-scale-btn" data-scale="0.5">0.5x</button>
          <button type="button" class="sp-mob-scale-btn" data-scale="1">1x</button>
          <button type="button" class="sp-mob-scale-btn" data-scale="1.5">1.5x</button>
          <button type="button" class="sp-mob-scale-btn" data-scale="2">2x</button>
        </div>
      </div>
      <div class="sp-mob-actions-row">
        <button type="button" class="sp-mob-action-pill" id="sp-mob-act-text">Edit Text</button>
        <button type="button" class="sp-mob-action-pill" id="sp-mob-act-style">Colors & Size</button>
        <button type="button" class="sp-mob-action-pill" id="sp-mob-act-code">Code</button>
        <button type="button" class="sp-mob-action-pill" id="sp-mob-act-delete">Delete</button>
        <button type="button" class="sp-mob-action-pill" id="sp-mob-act-undo">Undo</button>
      </div>
    </div>

    <!-- Style & Colors Drawer -->
    <div id="sp-drawer">
      <div id="sp-drawer-header">
        <div id="sp-drawer-drag-handle" title="Drag to move panel anywhere on screen">${SP_ICONS.grip}</div>
        <div class="sp-drawer-title-group">
          <span id="sp-drawer-tag">div</span>
          <span id="sp-drawer-name">.element</span>
          <button class="sp-lock-tag" id="sp-btn-edit-text" title="Click to edit words directly on the page">Edit Text</button>
          <button class="sp-lock-tag" id="sp-lock-btn" title="Target Lock protects from accidental clicks. Click to toggle.">Locked</button>
          <button class="sp-lock-tag" id="sp-btn-undo" title="Undo last change (Ctrl+Z)">Undo</button>
          <button class="sp-lock-tag" id="sp-btn-deselect" title="Deselect element">Reset</button>
        </div>
        <button class="sp-drawer-close-btn" id="sp-drawer-close" title="Close drawer (Esc)">${SP_ICONS.close}</button>
      </div>

      <div id="sp-drawer-body">
        <div class="sp-tab-pane sp-active" id="pane-style">
          <div class="sp-color-grid">
            <div class="sp-color-card" id="sp-card-text">
              <span class="sp-color-label">Text Color</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-text-hex" value="#1C1C1E">
                <input type="color" class="sp-color-btn" id="sp-text-color" value="#1C1C1E">
              </div>
              <div class="sp-swatches-row" data-target="text">
                <div class="sp-color-swatch" style="background:#1C1C1E" data-col="#1C1C1E" title="Charcoal Ink"></div>
                <div class="sp-color-swatch" style="background:#78716C" data-col="#78716C" title="Warm Stone"></div>
                <div class="sp-color-swatch" style="background:#FAF9F6" data-col="#FAF9F6" title="Alabaster"></div>
                <div class="sp-color-swatch" style="background:#C84B44" data-col="#C84B44" title="Coral Accent"></div>
                <div class="sp-color-swatch" style="background:#7CE0D3" data-col="#7CE0D3" title="Mint"></div>
                <div class="sp-color-swatch" style="background:#FFFFFF" data-col="#FFFFFF" title="Pure White"></div>
              </div>
            </div>

            <div class="sp-color-card" id="sp-card-bg">
              <span class="sp-color-label">Layer / Box Fill</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-bg-hex" value="#F4F3EE">
                <input type="color" class="sp-color-btn" id="sp-bg-color" value="#F4F3EE">
              </div>
              <div class="sp-swatches-row" data-target="bg">
                <div class="sp-color-swatch" style="background:#F4F3EE" data-col="#F4F3EE" title="Warm Cream"></div>
                <div class="sp-color-swatch" style="background:#EAE8E0" data-col="#EAE8E0" title="Warm Stone"></div>
                <div class="sp-color-swatch" style="background:#FAF9F6" data-col="#FAF9F6" title="Alabaster"></div>
                <div class="sp-color-swatch" style="background:#1C1C1E" data-col="#1C1C1E" title="Charcoal"></div>
                <div class="sp-color-swatch" style="background:#C84B44" data-col="#C84B44" title="Coral Accent"></div>
                <div class="sp-color-swatch" style="background:transparent;border:1px dashed #78716C" data-col="transparent" title="Transparent"></div>
              </div>
            </div>

            <div class="sp-color-card" id="sp-card-border">
              <span class="sp-color-label">Border Color & Width</span>
              <div class="sp-color-input-row">
                <input type="text" class="sp-hex-input" id="sp-border-hex" value="#DCD9CE">
                <input type="color" class="sp-color-btn" id="sp-border-color" value="#DCD9CE">
              </div>
              <div class="sp-border-options-row">
                <select class="sp-border-select" id="sp-border-width" title="Border Width">
                  <option value="1px" selected>1px</option>
                  <option value="2px">2px</option>
                  <option value="3px">3px</option>
                  <option value="4px">4px</option>
                  <option value="0px">None (0px)</option>
                </select>
                <select class="sp-border-select" id="sp-border-style" title="Border Style">
                  <option value="solid" selected>Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <div class="sp-swatches-row" data-target="border">
                <div class="sp-color-swatch" style="background:#DCD9CE" data-col="#DCD9CE" title="Sandstone Rule"></div>
                <div class="sp-color-swatch" style="background:#1C1C1E" data-col="#1C1C1E" title="Charcoal"></div>
                <div class="sp-color-swatch" style="background:#C84B44" data-col="#C84B44" title="Coral Accent"></div>
                <div class="sp-color-swatch" style="background:#7CE0D3" data-col="#7CE0D3" title="Mint"></div>
                <div class="sp-color-swatch" style="background:transparent;border:1px dashed #78716C" data-col="transparent" title="No Border"></div>
              </div>
            </div>

            <div class="sp-color-card" id="sp-card-dimensions">
              <span class="sp-color-label">Size & Dimensions (Icons & SVGs)</span>
              <div class="sp-dimension-inputs-row">
                <div class="sp-dimension-input-col">
                  <span class="sp-dim-label">Width</span>
                  <div class="sp-stepper-wrap">
                    <button type="button" class="sp-stepper-btn" id="sp-btn-w-minus">-</button>
                    <input type="number" class="sp-stepper-input" id="sp-input-width" value="24" min="8" max="2000">
                    <button type="button" class="sp-stepper-btn" id="sp-btn-w-plus">+</button>
                  </div>
                </div>
                <div class="sp-dimension-input-col">
                  <span class="sp-dim-label">Height</span>
                  <div class="sp-stepper-wrap">
                    <button type="button" class="sp-stepper-btn" id="sp-btn-h-minus">-</button>
                    <input type="number" class="sp-stepper-input" id="sp-input-height" value="24" min="8" max="2000">
                    <button type="button" class="sp-stepper-btn" id="sp-btn-h-plus">+</button>
                  </div>
                </div>
              </div>
              <div class="sp-scale-presets-row">
                <span class="sp-dim-label">Scale:</span>
                <button type="button" class="sp-scale-chip" data-scale="0.5">0.5x</button>
                <button type="button" class="sp-scale-chip" data-scale="0.75">0.75x</button>
                <button type="button" class="sp-scale-chip sp-active-chip" data-scale="1.0">1x</button>
                <button type="button" class="sp-scale-chip" data-scale="1.25">1.25x</button>
                <button type="button" class="sp-scale-chip" data-scale="1.5">1.5x</button>
                <button type="button" class="sp-scale-chip" data-scale="2.0">2x</button>
                <button type="button" class="sp-scale-chip" data-scale="3.0">3x</button>
              </div>
            </div>
          </div>

          <div class="sp-website-palette-bar">
            <div class="sp-website-palette-header">
              <span class="sp-color-label">Website Colors</span>
              <div class="sp-website-palette-actions">
                <button type="button" class="sp-text-arrow-btn" id="sp-btn-drawer-eyedropper" title="Pick color anywhere on screen (Eyedropper)">
                  Pick &rarr;
                </button>
                <button type="button" class="sp-text-arrow-btn" id="sp-btn-drawer-open-palette" title="Open full palette picker modal">
                  All Colors &rarr;
                </button>
              </div>
            </div>
            <div class="sp-website-swatches-strip" id="sp-drawer-website-swatches">
              <!-- Dynamically populated with top website colors -->
            </div>
          </div>

          <div class="sp-visbug-align-bar">
            <span class="sp-color-label">Alignment</span>
            <div class="sp-visbug-align-actions">
              <button type="button" class="sp-text-arrow-btn" data-vb-align="left">Left →</button>
              <button type="button" class="sp-text-arrow-btn" data-vb-align="center">Center →</button>
              <button type="button" class="sp-text-arrow-btn" data-vb-align="right">Right →</button>
              <button type="button" class="sp-text-arrow-btn" data-vb-align="between">Distribute →</button>
            </div>
          </div>

          <div class="sp-css-quick-box">
            <span class="sp-color-label">Element CSS Rules</span>
            <div class="sp-css-quick-row">
              <input type="text" class="sp-input" id="sp-element-css" placeholder="e.g. font-size: 20px; font-weight: bold;">
              <button type="button" class="sp-text-arrow-btn" id="sp-btn-apply-css">Apply →</button>
            </div>
          </div>

          <div class="sp-transform-code-box">
            <div class="sp-transform-code-header">
              <span class="sp-color-label">Transform Element Code</span>
              <button type="button" class="sp-text-arrow-btn" id="sp-btn-apply-transform">Apply Code →</button>
            </div>
            <textarea class="sp-transform-textarea" id="sp-transform-code" placeholder="<div>...</div> or text" rows="4"></textarea>
            <div class="sp-transform-code-footer">
              <span class="sp-transform-hint">Edits HTML/text to transform element live.</span>
              <button type="button" class="sp-text-arrow-btn" id="sp-btn-reset-transform">Reset →</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Toast Notification -->
    <div id="sp-toast"><span id="sp-toast-text"></span></div>
  `;

  root.style.display = "none";

  function ensureRootAttached() {
    if (!root.parentNode || !document.contains(root)) {
      const mountTarget = document.body || document.documentElement;
      mountTarget.appendChild(root);
    }
    // Also ensure #sp-panel is ready
    if (SP.panel && SP.panel.ensurePanelAttached) {
      SP.panel.ensurePanelAttached();
    }
  }

  ensureRootAttached();

  /* ── Element References ── */
  const sidebarDock = root.querySelector("#sp-sidebar-dock");
  const drawer = root.querySelector("#sp-drawer");
  const codeModal = root.querySelector("#sp-code-modal");
  const contextMenu = root.querySelector("#sp-context-menu");
  const dockCaptureBtn = root.querySelector("#sp-dock-capture");
  const dockPowerBtn = root.querySelector("#sp-dock-power");
  const dockUndoBtn = root.querySelector("#sp-dock-undo");

  /* ── Single Popup Manager ── */
  function closeAllPopups(except = null) {
    if (drawer && except !== "drawer") drawer.classList.remove("sp-open");
    if (codeModal && except !== "codeModal") codeModal.style.display = "none";
    if (contextMenu && except !== "contextMenu") contextMenu.style.display = "none";
    const panel = document.getElementById("sp-panel");
    if (panel && except !== panel && except !== "panel") panel.classList.remove("sp-open");
    const palModal = document.getElementById("sp-palette-modal");
    if (palModal && except !== "paletteModal") palModal.style.display = "none";
  }

  /* ── Sidebar Dock UI & Mode Switching ── */
  function syncDockUI(mode) {
    sidebarDock.querySelectorAll(".sp-dock-btn").forEach(b => {
      if (b.dataset.tool) {
        b.classList.toggle("sp-dock-active", b.dataset.tool === mode);
      }
    });
  }

  function turnOnStylePeek(mode = "inspect") {
    ensureRootAttached();
    root.style.setProperty("display", "block", "important");

    sidebarDock.style.setProperty("display", "flex", "important");
    sidebarDock.style.setProperty("visibility", "visible", "important");
    sidebarDock.style.setProperty("opacity", "1", "important");
    sidebarDock.style.setProperty("pointer-events", "auto", "important");

    // Reset position if off-screen
    const dockRect = sidebarDock.getBoundingClientRect();
    if (dockRect.right < 40 || dockRect.left > window.innerWidth || dockRect.bottom < 40 || dockRect.top > window.innerHeight) {
      sidebarDock.style.top = "76px";
      sidebarDock.style.right = "18px";
      sidebarDock.style.left = "auto";
    }

    state.isEnabled = true;
    state.activeToolMode = mode;
    syncDockUI(mode);

    document.body.classList.toggle("sp-mode-move", mode === "move");

    if (mode === "inspect") {
      showToast("Inspect mode active — click any element to inspect & preview");
    } else if (mode === "move") {
      showToast("Move mode active — drag any layer freely across the site");
    } else if (mode === "resize") {
      showToast("Resize mode active — drag element corners to stretch");
    } else if (mode === "style") {
      showToast("Colors & style drawer active");
      if (state.selectedEl) {
        closeAllPopups("drawer");
        drawer.classList.add("sp-open");
      }
    } else if (mode === "palette") {
      showToast("Website Color Palette active");
      if (typeof window.openPaletteModal === "function") window.openPaletteModal();
    }
  }

  function turnOffStylePeek() {
    state.isEnabled = false;
    state.activeToolMode = null;
    syncDockUI(null);
    document.body.classList.remove("sp-mode-move");
    if (typeof window.clearPassthroughFrontNodes === "function") window.clearPassthroughFrontNodes();
    if (typeof window.clearMultiSelection === "function") window.clearMultiSelection();
    state.isDeepLayerMode = false;
    state.selectedEl = null;
    closeAllPopups();

    const hoverBox = root.querySelector("#sp-hover-box");
    const hoverLbl = root.querySelector("#sp-hover-label");
    const selectBox = root.querySelector("#sp-select-box");
    if (hoverBox) hoverBox.style.display = "none";
    if (hoverLbl) hoverLbl.style.display = "none";
    if (selectBox) selectBox.style.display = "none";

    root.style.display = "none";
    showToast("StylePeek Studio closed");
  }

  /* ── Draggable Sidebar Dock ── */
  function initDraggableDock() {
    const handle = root.querySelector("#sp-dock-handle");
    let isDraggingDock = false, dockOffsetX = 0, dockOffsetY = 0;

    handle.addEventListener("mousedown", e => {
      isDraggingDock = true;
      const rect = sidebarDock.getBoundingClientRect();
      dockOffsetX = e.clientX - rect.left;
      dockOffsetY = e.clientY - rect.top;
      sidebarDock.style.right = "auto";
      sidebarDock.style.left = rect.left + "px";
      sidebarDock.style.top = rect.top + "px";
      handle.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("mousemove", e => {
      if (!isDraggingDock) return;
      const newX = Math.max(10, Math.min(window.innerWidth - sidebarDock.offsetWidth - 10, e.clientX - dockOffsetX));
      const newY = Math.max(10, Math.min(window.innerHeight - sidebarDock.offsetHeight - 10, e.clientY - dockOffsetY));
      sidebarDock.style.left = newX + "px";
      sidebarDock.style.top = newY + "px";
    }, true);

    window.addEventListener("mouseup", () => {
      if (isDraggingDock) {
        isDraggingDock = false;
        handle.style.cursor = "grab";
      }
    });
  }

  /* ── Dock Buttons Setup ── */
  function initDockButtons() {
    sidebarDock.querySelectorAll(".sp-dock-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (window.spPlayKeyClick) window.spPlayKeyClick(180);
        const tool = btn.dataset.tool;
        if (!tool) return;

        if (tool === "inspect" && state.activeToolMode === "inspect") {
          if (typeof window.turnOffInspectFeatures === "function") {
            window.turnOffInspectFeatures();
          }
          return;
        }

        state.activeToolMode = tool;
        syncDockUI(tool);
        document.body.classList.toggle("sp-mode-move", tool === "move");

        if (tool === "inspect") {
          showToast("Inspect mode active — click any element to preview");
        } else if (tool === "move") {
          showToast("Move mode active — drag any layer freely");
        } else if (tool === "resize") {
          showToast("Stretch / Resize mode active — drag element corners");
        } else if (tool === "add") {
          closeAllPopups();
          showToast("Click blank space to add text, or drop an image file");
        } else if (tool === "style") {
          closeAllPopups("drawer");
          drawer.classList.add("sp-open");
        } else if (tool === "palette") {
          closeAllPopups("paletteModal");
          if (typeof window.openPaletteModal === "function") window.openPaletteModal();
        } else if (tool === "delete") {
          showToast("Delete mode active — click any element to delete (Ctrl+Z to undo)");
        }
      });
    });

    dockUndoBtn?.addEventListener("click", () => {
      if (typeof window.performUndo === "function") window.performUndo();
    });

    dockCaptureBtn?.addEventListener("click", () => {
      if (typeof window.captureVisibleViewport === "function") window.captureVisibleViewport();
    });

    dockPowerBtn?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(140);
      turnOffStylePeek();
    });
  }

  /* ── Window PostMessage API Bridge ── */
  window.addEventListener("message", e => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "STYLEPEEK_TURN_ON") {
      turnOnStylePeek(e.data.mode || "inspect");
    } else if (e.data.type === "STYLEPEEK_TURN_OFF") {
      turnOffStylePeek();
    } else if (e.data.type === "STYLEPEEK_OPEN_ADD") {
      if (!state.isEnabled) turnOnStylePeek("inspect");
      state.activeToolMode = "add";
      syncDockUI("add");
      closeAllPopups();
      showToast("Click blank space to add text, or drag an image to drop");
    } else if (e.data.type === "STYLEPEEK_SELECT") {
      if (!state.isEnabled) turnOnStylePeek("inspect");
      const target = e.data.selector ? document.querySelector(e.data.selector) : null;
      if (target && typeof window.selectElement === "function") window.selectElement(target);
    }
  });

  /* ── Global Keyboard Shortcuts ── */
  window.addEventListener("keydown", e => {
    if (!state.isEnabled) return;
    const tag = (e.target.tagName || "").toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || e.target.isContentEditable;

    if (e.key === "Escape") {
      if (codeModal && codeModal.style.display !== "none") {
        if (typeof window.closeCodeModal === "function") window.closeCodeModal();
        return;
      }
      if (drawer && drawer.classList.contains("sp-open")) {
        drawer.classList.remove("sp-open");
        return;
      }
      const panel = document.getElementById("sp-panel");
      if (panel && panel.classList.contains("sp-open")) {
        if (typeof window.spClosePanel === "function") window.spClosePanel();
        return;
      }
      if (state.activeToolMode === "inspect") {
        if (typeof window.turnOffInspectFeatures === "function") window.turnOffInspectFeatures();
      } else {
        turnOffStylePeek();
      }
      return;
    }

    if (isTyping) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (typeof window.performUndo === "function") window.performUndo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (typeof window.selectAllElements === "function") window.selectAllElements();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      if (typeof window.copySelectedElement === "function") window.copySelectedElement();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      if (typeof window.pasteClipboardElement === "function") window.pasteClipboardElement();
      return;
    }

    if (e.key === "[") {
      e.preventDefault();
      if (state.selectedEl && typeof window.moveElementToBackArray === "function") {
        window.moveElementToBackArray(state.selectedEl);
      }
      return;
    }

    if (e.key === "]") {
      e.preventDefault();
      if (state.selectedEl && typeof window.bringElementToFrontArray === "function") {
        window.bringElementToFrontArray(state.selectedEl);
      }
      return;
    }

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      if (state.selectedEl || state.multiSelectedEls.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 50 : 10;
        if (typeof window.nudgeSelectedElements === "function") {
          window.nudgeSelectedElements(e.key, step);
        }
        return;
      }
    }

    if (e.altKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      if (typeof window.captureVisibleViewport === "function") window.captureVisibleViewport();
      return;
    }

    if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      turnOnStylePeek("inspect");
    } else if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      turnOnStylePeek("move");
    } else if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      turnOnStylePeek("resize");
    } else if (e.key.toLowerCase() === "c") {
      e.preventDefault();
      turnOnStylePeek("style");
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      if (typeof window.togglePaletteModal === "function") window.togglePaletteModal();
    } else if (e.key.toLowerCase() === "d" || e.key === "Delete") {
      if (state.selectedEl) {
        e.preventDefault();
        if (typeof window.deleteElementNode === "function") window.deleteElementNode(state.selectedEl);
      }
    }
  });

  /* ── Mobile Console Taskbar & Adjuster Engine ── */
  let isMobileTaskbarMode = window.innerWidth <= 768;

  function setMobileTaskbarMode(enable) {
    isMobileTaskbarMode = enable;
    if (sidebarDock) {
      sidebarDock.classList.toggle("sp-console-taskbar", enable);
    }
    if (root) {
      root.classList.toggle("sp-mobile-view", enable);
    }
    const modeBtn = root.querySelector("#sp-dock-view-mode");
    if (modeBtn) {
      modeBtn.innerHTML = enable ? SP_ICONS.desktop : SP_ICONS.mobile;
      modeBtn.title = enable ? "Switch to Floating Sidebar Dock" : "Switch to Mobile Console Taskbar";
    }
    if (enable) {
      sidebarDock.style.top = "auto";
      sidebarDock.style.left = "0";
      sidebarDock.style.right = "0";
      sidebarDock.style.bottom = "0";
    } else {
      sidebarDock.style.bottom = "auto";
      sidebarDock.style.top = "76px";
      sidebarDock.style.right = "18px";
      sidebarDock.style.left = "auto";
    }
  }

  function syncMobileAdjuster(el, w, h) {
    const adjuster = root.querySelector("#sp-mobile-adjuster");
    if (!adjuster) return;
    if (!el || !state.isEnabled) {
      adjuster.classList.remove("sp-mob-visible");
      return;
    }
    const tagStr = el.tagName ? el.tagName.toLowerCase() : "element";
    const clsStr = window.getPrimaryClass ? window.getPrimaryClass(el) : "";
    const mobTag = root.querySelector("#sp-mob-tag");
    const mobName = root.querySelector("#sp-mob-name");
    const mobDim = root.querySelector("#sp-mob-dim");
    if (mobTag) mobTag.textContent = tagStr;
    if (mobName) mobName.textContent = clsStr || (el.id ? "#" + el.id : "");
    if (mobDim) mobDim.textContent = `${Math.round(w)}×${Math.round(h)}`;

    // Show adjuster if on mobile view or taskbar mode
    if (isMobileTaskbarMode || window.innerWidth <= 768) {
      adjuster.classList.add("sp-mob-visible");
    }
  }
  window.syncMobileAdjuster = syncMobileAdjuster;

  function initMobileTaskbar() {
    setMobileTaskbarMode(window.innerWidth <= 768);

    window.addEventListener("resize", () => {
      if (window.innerWidth <= 768 && !isMobileTaskbarMode) {
        setMobileTaskbarMode(true);
      }
    });

    const modeBtn = root.querySelector("#sp-dock-view-mode");
    modeBtn?.addEventListener("click", () => {
      setMobileTaskbarMode(!isMobileTaskbarMode);
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      showToast(isMobileTaskbarMode ? "Switched to Mobile Console Taskbar" : "Switched to Floating Sidebar Dock");
    });

    // Wire Mobile Adjuster controls
    const adjuster = root.querySelector("#sp-mobile-adjuster");
    adjuster?.querySelector("#sp-mob-adjuster-close")?.addEventListener("click", () => {
      adjuster.classList.remove("sp-mob-visible");
    });

    function mobStepSize(deltaW, deltaH) {
      if (!state.selectedEl) {
        showToast("Select an element or icon first");
        return;
      }
      const r = state.selectedEl.getBoundingClientRect();
      const curW = Math.round(r.width);
      const curH = Math.round(r.height);
      const stepW = curW <= 24 ? Math.sign(deltaW) * 2 : deltaW;
      const stepH = curH <= 24 ? Math.sign(deltaH) * 2 : deltaH;
      const newW = Math.max(8, curW + stepW);
      const newH = Math.max(8, curH + stepH);

      if (window.applySizeToElement) {
        window.applySizeToElement(state.selectedEl, newW, newH);
      } else {
        state.selectedEl.style.width = newW + "px";
        state.selectedEl.style.height = newH + "px";
      }

      if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      syncMobileAdjuster(state.selectedEl, newW, newH);

      const inputW = document.getElementById("sp-input-width");
      const inputH = document.getElementById("sp-input-height");
      if (inputW) inputW.value = newW;
      if (inputH) inputH.value = newH;

      if (window.spPlayKeyClick) window.spPlayKeyClick(240);
    }

    adjuster?.querySelector("#sp-mob-w-minus")?.addEventListener("click", () => mobStepSize(-4, 0));
    adjuster?.querySelector("#sp-mob-w-plus")?.addEventListener("click", () => mobStepSize(4, 0));
    adjuster?.querySelector("#sp-mob-h-minus")?.addEventListener("click", () => mobStepSize(0, -4));
    adjuster?.querySelector("#sp-mob-h-plus")?.addEventListener("click", () => mobStepSize(0, 4));

    adjuster?.querySelectorAll(".sp-mob-scale-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!state.selectedEl) {
          showToast("Select an element or icon first");
          return;
        }
        const scale = parseFloat(btn.dataset.scale) || 1.0;
        const r = state.selectedEl.getBoundingClientRect();
        const baseW = Math.round(r.width);
        const baseH = Math.round(r.height);
        const scaledW = Math.max(8, Math.round(baseW * scale));
        const scaledH = Math.max(8, Math.round(baseH * scale));

        if (window.applySizeToElement) {
          window.applySizeToElement(state.selectedEl, scaledW, scaledH, scale);
        }
        if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
        syncMobileAdjuster(state.selectedEl, scaledW, scaledH);
        if (window.spPlayKeyClick) window.spPlayKeyClick(260);
        showToast(`Scaled to ${scale}x (${scaledW}×${scaledH}px)`);
      });
    });

    adjuster?.querySelector("#sp-mob-act-text")?.addEventListener("click", () => {
      if (state.selectedEl && typeof window.startInlineTextEdit === "function") {
        window.startInlineTextEdit(state.selectedEl);
      }
    });

    adjuster?.querySelector("#sp-mob-act-style")?.addEventListener("click", () => {
      if (drawer) {
        closeAllPopups("drawer");
        drawer.classList.add("sp-open");
      }
    });

    adjuster?.querySelector("#sp-mob-act-code")?.addEventListener("click", () => {
      if (state.selectedEl && typeof window.openCodeModal === "function") {
        window.openCodeModal(state.selectedEl);
      }
    });

    adjuster?.querySelector("#sp-mob-act-delete")?.addEventListener("click", () => {
      if (state.selectedEl && typeof window.deleteElementNode === "function") {
        window.deleteElementNode(state.selectedEl);
      }
    });

    adjuster?.querySelector("#sp-mob-act-undo")?.addEventListener("click", () => {
      if (typeof window.performUndo === "function") {
        window.performUndo();
      }
    });
  }

  /* ── Bootstrap Studio Submodules ── */
  initDraggableDock();
  initDockButtons();
  initMobileTaskbar();

  if (typeof window.initInspect === "function") window.initInspect();
  if (typeof window.initMove === "function") window.initMove();
  if (typeof window.initTransform === "function") window.initTransform();
  if (typeof window.initStyle === "function") window.initStyle();
  if (typeof window.initDeepLayers === "function") window.initDeepLayers();
  if (typeof window.initTechCapture === "function") window.initTechCapture();
  if (typeof window.ensurePaletteModalAttached === "function") window.ensurePaletteModalAttached();

  /* ── Export ── */
  SP.core = {
    ensureRootAttached,
    syncDockUI,
    turnOnStylePeek,
    turnOffStylePeek,
    closeAllPopups
  };

  window.ensureRootAttached = ensureRootAttached;
  window.syncDockUI = syncDockUI;
  window.turnOnStylePeek = turnOnStylePeek;
  window.turnOffStylePeek = turnOffStylePeek;
  window.closeAllPopups = closeAllPopups;
})();
