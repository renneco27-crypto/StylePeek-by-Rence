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

  // Deep Layer & Stationary-Front State (Figma-style layer stepping behind front elements)
  let isDeepLayerMode = false;
  let keepFrontStationary = true;
  let deepLayerStack = [];
  let deepLayerIndex = 0;
  let passthroughFrontNodes = [];
  let dragStationaryChildren = [];

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
    image: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    box: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
    type: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    unlock: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
    stepDown: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    stepUp: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
  };

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

    <!-- Word Document-Style Magnetic Snap Guidelines -->
    <div id="sp-snap-guide-h"></div>
    <div id="sp-snap-guide-v"></div>

    <!-- Floating Tactile Sidebar Dock (CTRL+SPC UI Kit) -->
    <div id="sp-sidebar-dock">
      <div id="sp-dock-handle" title="Drag dock">${SP_ICONS.grip}</div>
      <button class="sp-dock-btn sp-dock-active" data-tool="inspect" title="Inspect & Select Element (I)">${SP_ICONS.inspect}</button>
      <button class="sp-dock-btn" data-tool="move" title="Move & Drag Any Layer (M)">${SP_ICONS.move}</button>
      <button class="sp-dock-btn" data-tool="resize" title="Stretch / Resize Element (S)">${SP_ICONS.resize}</button>
      <button class="sp-dock-btn add-btn" data-tool="add" id="sp-dock-add" title="Add Element or Picture (A)">${SP_ICONS.plus}</button>
      <button class="sp-dock-btn" data-tool="style" title="Colors & Style Inspector (C)">${SP_ICONS.palette}</button>
      <button class="sp-dock-btn" data-tool="delete" title="Delete Element (D)">${SP_ICONS.trash}</button>
      <button class="sp-dock-btn undo-btn" id="sp-dock-undo" title="Undo Last Action (Ctrl+Z)">${SP_ICONS.undo}</button>
      <div class="sp-dock-sep"></div>
      <button class="sp-dock-btn" id="sp-dock-capture" title="Capture Visible Page (Alt+C)">${SP_ICONS.camera}</button>
      <button class="sp-dock-btn power-btn" id="sp-dock-power" title="Close Studio">${SP_ICONS.power}</button>
    </div>

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

        <div id="sp-drawer-tabs">
          <button class="sp-drawer-tab sp-active" data-tab="style">Inspector & Style</button>
        </div>

        <button class="sp-drawer-close-btn" id="sp-drawer-close" title="Close drawer (Esc)">${SP_ICONS.close}</button>
      </div>

      <div id="sp-drawer-body">
        <!-- Tab 1: Simplified Colors, Div Fill, Border & VisBug Alignment -->
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
                <div class="sp-color-swatch" style="background:#15803D" data-col="#15803D" title="Forest"></div>
                <div class="sp-color-swatch" style="background:#B45309" data-col="#B45309" title="Amber"></div>
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
                <div class="sp-color-swatch" style="background:#7CE0D3" data-col="#7CE0D3" title="Mint"></div>
                <div class="sp-color-swatch" style="background:#FFFFFF" data-col="#FFFFFF" title="White"></div>
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
                <div class="sp-color-swatch" style="background:#DCD9CE" data-col="#DCD9CE" title="Sandstone Rule"></div>
                <div class="sp-color-swatch" style="background:#1C1C1E" data-col="#1C1C1E" title="Charcoal"></div>
                <div class="sp-color-swatch" style="background:#C84B44" data-col="#C84B44" title="Coral Accent"></div>
                <div class="sp-color-swatch" style="background:#7CE0D3" data-col="#7CE0D3" title="Mint"></div>
                <div class="sp-color-swatch" style="background:#78716C" data-col="#78716C" title="Stone"></div>
                <div class="sp-color-swatch" style="background:#FFFFFF" data-col="#FFFFFF" title="White"></div>
                <div class="sp-color-swatch" style="background:#15803D" data-col="#15803D" title="Forest"></div>
                <div class="sp-color-swatch" style="background:transparent;border:1px dashed #78716C" data-col="transparent" title="No Border"></div>
              </div>
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
              <span class="sp-transform-hint">Edits HTML/text to transform element or overwrite text.</span>
              <button type="button" class="sp-text-arrow-btn" id="sp-btn-reset-transform">Reset →</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="sp-toast"><span id="sp-toast-text"></span></div>
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
  const dockUndoBtn       = root.querySelector("#sp-dock-undo");
  const drawerUndoBtn     = root.querySelector("#sp-btn-undo");
  const snapGuideH        = root.querySelector("#sp-snap-guide-h");
  const snapGuideV        = root.querySelector("#sp-snap-guide-v");

  const previewPanel         = root.querySelector("#sp-inspect-preview-panel");
  const previewCloseBtn      = root.querySelector("#sp-preview-close");
  const sandboxViewport      = root.querySelector("#sp-sandbox-viewport");
  const btnContextToggle     = root.querySelector("#sp-btn-context-toggle");
  const btnRefreshPreview    = root.querySelector("#sp-btn-refresh-preview");
  const btnPreviewCode       = root.querySelector("#sp-btn-preview-code");
  const previewCodeDrawer    = root.querySelector("#sp-preview-code-drawer");
  const previewCodeEditor    = root.querySelector("#sp-preview-code-editor");
  const previewInfoBar       = root.querySelector("#sp-preview-info-bar");
  const btnPdrawerCopy       = root.querySelector("#sp-btn-pdrawer-copy");
  const btnPdrawerApply      = root.querySelector("#sp-btn-pdrawer-apply");
  const btnPdrawerClose      = root.querySelector("#sp-btn-pdrawer-close");
  let previewDrawerTab       = "element"; // "element", "parent", "neighbors"

  const transformCodeArea   = root.querySelector("#sp-transform-code");
  const btnApplyTransform   = root.querySelector("#sp-btn-apply-transform");
  const btnResetTransform   = root.querySelector("#sp-btn-reset-transform");
  const elementCssInput     = root.querySelector("#sp-element-css");
  const btnApplyCss         = root.querySelector("#sp-btn-apply-css");
  let spClipboardEl         = null;

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
  const btnKeepFrontStill = root.querySelector("#sp-btn-keep-front-still");
  const keepFrontLabel    = root.querySelector("#sp-keep-front-label");
  const btnDetachBg       = root.querySelector("#sp-btn-detach-bg");
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

  /* ── Strict Single Popup Manager ── */
  function closeAllPopups(except = null) {
    if (except !== "drawer" && drawer && drawer.classList.contains("sp-open")) {
      drawer.classList.remove("sp-open");
    }
    if (except !== "preview") {
      const liveModal = document.getElementById("sp-h2d-interactive-modal");
      if (liveModal) liveModal.remove();
    }
    if (except !== "panel" && previewPanel && previewPanel.classList.contains("sp-show")) {
      previewPanel.classList.remove("sp-show");
    }
    if (except !== "error" && errorModal && errorModal.classList.contains("sp-modal-show")) {
      closeErrorModal();
    }
  }

  function showToast(msg, duration = 2400) {
    if (!toast || !toastText) return;
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
    const parts = raw.split(/\s+/).filter(c => !c.startsWith("sp-"));
    const first = parts[0];
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
    if (!el) return false;
    if (el === root || root.contains(el)) return true;
    if (el.tagName && el.tagName.toLowerCase() === "vis-bug") return true;
    if (el.closest && el.closest("#sp-root, vis-bug, #__figma_h2d_chrome_extension_toolbar__, #sp-h2d-interactive-modal")) return true;
    return false;
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
      spPlayKeyClick(180);
      const tool = btn.dataset.tool;
      activeToolMode = tool;
      syncDockUI(tool);
      document.body.classList.toggle("sp-mode-move", tool === "move");

      if (tool === "add") {
        closeAllPopups();
        showToast("Click blank space to add text, or drag an image to drop");
        return;
      } else if (tool === "style") {
        closeAllPopups("drawer");
        drawer.classList.add("sp-open");
        root.querySelector(".sp-drawer-tab[data-tab='style']")?.click();
      } else if (tool === "inspect") {
        closeAllPopups();
        showToast("Inspect Mode: Click to select, Right-click for Style & Code");
      } else if (tool === "move") {
        closeAllPopups();
        showToast("Move Mode: Drag any element freely on canvas");
      } else if (tool === "resize") {
        closeAllPopups();
        showToast("Stretch Mode: Click element, then drag corner handles to stretch");
      } else if (tool === "delete") {
        closeAllPopups();
        showToast("Delete Mode: Click an element to remove (Ctrl+Z undo)");
      }
    });
  });

  dockCaptureBtn.addEventListener("click", () => {
    spPlayKeyClick(160);
    captureVisibleViewport();
  });

  dockPowerBtn.addEventListener("click", () => {
    spPlayKeyClick(140);
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

  if (previewCloseBtn && previewPanel) {
    previewCloseBtn.addEventListener("click", () => {
      previewPanel.classList.remove("sp-show");
    });
  }

  /* ── Tab Switching with Dynamic Width Expansion ── */
  root.querySelectorAll(".sp-drawer-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      spPlayKeyClick(190);
      root.querySelectorAll(".sp-drawer-tab").forEach(b => b.classList.remove("sp-active"));
      root.querySelectorAll(".sp-tab-pane").forEach(p => p.classList.remove("sp-active"));
      btn.classList.add("sp-active");
      const targetPane = root.querySelector(`#pane-${btn.dataset.tab}`);
      if (targetPane) targetPane.classList.add("sp-active");
      drawer.classList.remove("sp-expanded");
    });
  });

  /* ── VisBug Alignment Engine Hooked into StylePeek Drawer ── */
  root.querySelectorAll("[data-vb-align]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!selectedEl) {
        showToast("Select an element first");
        return;
      }
      spPlayKeyClick(175);
      const mode = btn.getAttribute("data-vb-align");
      const cs = window.getComputedStyle(selectedEl);
      const oldDisplay = selectedEl.style.display;
      const oldJustify = selectedEl.style.justifyContent;
      const oldAlign = selectedEl.style.alignItems;
      const oldTextAlign = selectedEl.style.textAlign;

      undoStack.push({
        type: "align",
        node: selectedEl,
        oldDisplay,
        oldJustify,
        oldAlign,
        oldTextAlign
      });

      const hasElementChildren = selectedEl.children && selectedEl.children.length > 0;
      if (hasElementChildren || cs.display.includes("flex") || cs.display.includes("grid")) {
        if (!cs.display.includes("flex") && !cs.display.includes("grid")) {
          selectedEl.style.setProperty("display", "flex", "important");
        }
        selectedEl.style.setProperty("align-items", "center", "important");
        if (mode === "left") {
          selectedEl.style.setProperty("justify-content", "flex-start", "important");
          selectedEl.style.setProperty("text-align", "left", "important");
        } else if (mode === "center") {
          selectedEl.style.setProperty("justify-content", "center", "important");
          selectedEl.style.setProperty("text-align", "center", "important");
        } else if (mode === "right") {
          selectedEl.style.setProperty("justify-content", "flex-end", "important");
          selectedEl.style.setProperty("text-align", "right", "important");
        } else if (mode === "between") {
          selectedEl.style.setProperty("justify-content", "space-between", "important");
        }
      } else {
        if (mode === "left") selectedEl.style.setProperty("text-align", "left", "important");
        else if (mode === "center") selectedEl.style.setProperty("text-align", "center", "important");
        else if (mode === "right") selectedEl.style.setProperty("text-align", "right", "important");
      }
      updateSelectBox(selectedEl);
      showToast(`Aligned ${mode}`);
    });
  });

  function updateLockBtnUI() {
    if (!lockBtn) return;
    lockBtn.textContent = isTargetLocked ? "Locked" : "Unlocked";
    lockBtn.classList.toggle("unlocked", !isTargetLocked);
  }

  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      spPlayKeyClick(165);
      isTargetLocked = !isTargetLocked;
      unlockPending = false;
      updateLockBtnUI();
      if (selectedEl) updateSelectBox(selectedEl);
      showToast(isTargetLocked ? "Target locked (protected from accidental clicks)" : "Target unlocked");
    });
  }

  if (deselectBtn) {
    deselectBtn.addEventListener("click", () => {
      spPlayKeyClick(150);
      clearPassthroughFrontNodes();
      isDeepLayerMode = false;
      selectedEl = null;
      selectBox.style.display = "none";
      selectBox.classList.remove("sp-deep-mode");
      drawer.classList.remove("sp-open");
      if (previewPanel) previewPanel.classList.remove("sp-show");
      isTargetLocked = false;
      unlockPending = false;
      showToast("Selection cleared");
    });
  }

  drawerClose.addEventListener("click", () => {
    drawer.classList.remove("sp-open");
    selectBox.style.display = "none";
    clearPassthroughFrontNodes();
    isDeepLayerMode = false;
    selectedEl = null;
    showToast("Studio drawer closed");
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
  function selectElement(el, preserveDeepStack = false) {
    if (!el || isOwn(el)) return;
    if (!preserveDeepStack) {
      clearPassthroughFrontNodes();
      isDeepLayerMode = false;
      selectBox.classList.remove("sp-deep-mode");
    }
    selectedEl = el;
    isTargetLocked = true;
    unlockPending = false;
    updateLockBtnUI();

    updateSelectBox(el);

    const tagStr = el.tagName.toLowerCase();
    const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
    const clsStr = getPrimaryClass(el);

    if (drawerTag) drawerTag.textContent = tagStr;
    if (drawerName) drawerName.textContent = idStr || clsStr || "";

    // Read Computed Styles
    const cs = window.getComputedStyle(el);
    const txtHex = rgbToHex(cs.color);
    if (textHex) textHex.value = txtHex;
    if (textColor) textColor.value = txtHex;

    const bgH = rgbToHex(cs.backgroundColor);
    if (bgHex) bgHex.value = bgH;
    if (bgColor) bgColor.value = bgH;

    const bdrH = rgbToHex(cs.borderColor);
    if (borderHex) borderHex.value = bdrH;
    if (borderColor) borderColor.value = bdrH;

    // Read Border Width & Style
    const bw = cs.borderWidth || "0px";
    if (borderWidthSelect) {
      if (["0px", "1px", "2px", "3px", "4px", "6px", "8px"].includes(bw)) {
        borderWidthSelect.value = bw;
      } else {
        borderWidthSelect.value = "1px";
      }
    }
    const bs = cs.borderStyle || "none";
    if (borderStyleSelect) {
      if (["solid", "dashed", "dotted", "double"].includes(bs)) {
        borderStyleSelect.value = bs;
      } else {
        borderStyleSelect.value = "solid";
      }
    }

    // Read Z-Index & Build Hierarchy
    try {
      const currentZ = parseInt(cs.zIndex);
      if (zInput) zInput.value = isNaN(currentZ) ? 0 : currentZ;
      if (!preserveDeepStack) {
        deepLayerStack = computeVisualLayerStack(el);
        deepLayerIndex = Math.max(0, deepLayerStack.indexOf(el));
      }
      buildBreadcrumbs(el);
    } catch (err) {}

    // Populate Transform Code & CSS Quick Inputs
    if (transformCodeArea) {
      transformCodeArea.value = el.outerHTML || el.textContent || "";
    }
    if (elementCssInput) {
      elementCssInput.value = el.getAttribute("style") || "";
    }

    // Drawer opens automatically ONLY when user is explicitly in "style" tool mode (or when right-clicked via contextmenu)
    if (activeToolMode === "style" && !isDragging && !justFinishedDrag) {
      closeAllPopups("drawer");
      drawer.classList.add("sp-open");
    }
  }

  function updateSelectBox(el) {
    if (!el) { selectBox.style.display = "none"; return; }
    const r = el.getBoundingClientRect();
    selectBox.style.display = "block";
    selectBox.style.left = r.left + "px";
    selectBox.style.top = r.top + "px";
    selectBox.style.width = r.width + "px";
    selectBox.style.height = r.height + "px";
    selectBox.classList.toggle("sp-deep-mode", isDeepLayerMode);

    const tagStr = el.tagName.toLowerCase();
    const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
    const clsStr = getPrimaryClass(el);
    const depthLabel = isDeepLayerMode ? ` · Deep Layer (${deepLayerIndex + 1}/${Math.max(1, deepLayerStack.length)})` : "";

    selectBadge.innerHTML = `<span>${tagStr}${idStr}${clsStr} (${Math.round(r.width)}×${Math.round(r.height)})${depthLabel}</span><button class="sp-badge-action-btn" id="sp-badge-btn-layer-behind" title="Step 1 layer behind front element">↓ Step Behind</button><button class="sp-badge-action-btn" id="sp-badge-btn-code" title="Transform Element Code / Overwrite">Code</button><button class="sp-badge-action-btn" id="sp-badge-btn-style" title="Open Style & Alignment (or Right-Click element)">Style</button>`;

    const badgeBehindBtn = selectBadge.querySelector("#sp-badge-btn-layer-behind");
    if (badgeBehindBtn) {
      badgeBehindBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        stepLayerDeeper();
      });
    }

    const badgeCodeBtn = selectBadge.querySelector("#sp-badge-btn-code");
    if (badgeCodeBtn) {
      badgeCodeBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeAllPopups("drawer");
        drawer.classList.add("sp-open");
        root.querySelector(".sp-drawer-tab[data-tab='style']")?.click();
        if (transformCodeArea) {
          transformCodeArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
          transformCodeArea.focus();
        }
      });
    }

    const badgeStyleBtn = selectBadge.querySelector("#sp-badge-btn-style");
    if (badgeStyleBtn) {
      badgeStyleBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeAllPopups("drawer");
        drawer.classList.add("sp-open");
        const styleTab = root.querySelector(".sp-drawer-tab[data-tab='style']");
        if (styleTab) styleTab.click();
      });
    }
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
        const imgBadge = layer.image ? `<span class="sp-bg-badge" style="font-size:9.5px;padding:1px 4px;background:#7CE0D3;color:#1C1C1E;font-weight:700;">Image BG</span>` : "";
        left.innerHTML = `<span class="sp-bg-layer-swatch" style="background:${layer.color}"></span><span>${layer.label}</span>${imgBadge}`;

        const pickBtn = document.createElement("button");
        pickBtn.className = "sp-bg-action-btn";
        pickBtn.textContent = "Target";
        pickBtn.addEventListener("click", () => {
          spPlayKeyClick(170);
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
          showToast(`Targeted background layer: ${layer.label}`);
        });

        row.appendChild(left);
        row.appendChild(pickBtn);
        bgLayersList.appendChild(row);
      });
    }

    if (themeHex && themeColor) {
      themeHex.value = bgLayers[0].color || bgLayers[1].color || "#F4F3EE";
      themeColor.value = themeHex.value.startsWith("#") ? themeHex.value : "#F4F3EE";
    }
  }

  function syncBgTargetChips() {
    if (!btnTargetSelected || !btnTargetBody || !btnTargetHtml) return;
    btnTargetSelected.classList.toggle("active", activeBgTargetMode === "selected");
    btnTargetBody.classList.toggle("active", activeBgTargetMode === "body");
    btnTargetHtml.classList.toggle("active", activeBgTargetMode === "html");

    if (activeBgTargetMode === "selected") {
      bgImgTargetLabel.textContent = selectedEl ? "Selected Layer" : "Page Body";
    } else if (activeBgTargetMode === "body") {
      bgImgTargetLabel.textContent = "Page Body";
    } else {
      bgImgTargetLabel.textContent = "Root Canvas";
    }
  }

  if (btnTargetSelected) {
    btnTargetSelected.addEventListener("click", () => {
      spPlayKeyClick(175);
      activeBgTargetMode = "selected";
      syncBgTargetChips();
    });
  }
  if (btnTargetBody) {
    btnTargetBody.addEventListener("click", () => {
      spPlayKeyClick(175);
      activeBgTargetMode = "body";
      syncBgTargetChips();
    });
  }
  if (btnTargetHtml) {
    btnTargetHtml.addEventListener("click", () => {
      spPlayKeyClick(175);
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
    let targetLabel = "Selected Layer";

    if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
      targetNode = document.body;
      targetLabel = "Page Body";
    } else if (activeBgTargetMode === "html") {
      targetNode = document.documentElement;
      targetLabel = "Root Canvas";
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
    showToast(`Applied background image to ${targetLabel}`);
  }

  function clearLayerBgImage() {
    let targetNode = selectedEl;
    let targetLabel = "Selected Layer";

    if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
      targetNode = document.body;
      targetLabel = "Page Body";
    } else if (activeBgTargetMode === "html") {
      targetNode = document.documentElement;
      targetLabel = "Root Canvas";
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
    showToast(`Removed background image from ${targetLabel}`);
  }

  if (btnApplyBgImg) {
    btnApplyBgImg.addEventListener("click", () => {
      spPlayKeyClick(165);
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
    btnClearBgImg.addEventListener("click", () => {
      spPlayKeyClick(150);
      clearLayerBgImage();
    });
  }

  function setPageThemeBackground(col) {
    document.documentElement.style.setProperty("background-color", col, "important");
    document.documentElement.style.setProperty("background", col, "important");
    document.body.style.setProperty("background-color", col, "important");
    document.body.style.setProperty("background", col, "important");

    document.documentElement.style.setProperty("--background", col);
    document.documentElement.style.setProperty("--bg", col);
    document.documentElement.style.setProperty("--color-background", col);
    document.documentElement.style.setProperty("--tw-bg-opacity", "1");

    showToast(`Set page background to ${col}`);
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
     Direct Insertion & Code Transformation Engine
     (Drag-and-Drop Image, Blank-Click Text, Code Transform, Duplication)
     ══════════════════════════════════════════════════════════ */
  function insertElementIntoLiveSite(newEl, toastMsg) {
    if (!newEl) return;
    ensurePositioned(newEl);

    if (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement)) {
      if (isDeepLayerMode && selectedEl !== document.body && selectedEl !== document.documentElement) {
        selectedEl.insertBefore(newEl, selectedEl.firstChild);
      } else {
        selectedEl.insertAdjacentElement("afterend", newEl);
      }
    } else {
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

    try {
      newEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}

    selectElement(newEl);
    undoStack.push({ type: "delete", node: newEl, parent: newEl.parentElement });
    if (toastMsg) showToast(toastMsg);
  }

  function insertDroppedImage(src, clientX, clientY) {
    if (!src) return;
    const img = document.createElement("img");
    img.className = "sp-custom-element";
    img.src = src;
    img.alt = "Inserted Image";
    img.style.position = "absolute";
    img.style.left = Math.round(clientX + (window.scrollX || 0) - 80) + "px";
    img.style.top = Math.round(clientY + (window.scrollY || 0) - 80) + "px";
    img.style.maxWidth = "340px";
    img.style.height = "auto";
    img.style.borderRadius = "8px";
    img.style.boxShadow = "0 8px 24px rgba(28,28,30,0.18)";
    img.style.display = "inline-block";
    img.style.zIndex = isDeepLayerMode ? "0" : "10000";
    img.style.cursor = "move";

    document.body.appendChild(img);
    ensurePositioned(img);
    undoStack.push({ type: "delete", node: img, parent: document.body });
    selectElement(img);
    spPlayKeyClick(240);
    showToast("Image placed on page — drag anywhere or stretch corners");
  }

  function insertNewTextAt(clientX, clientY, container) {
    const p = document.createElement("p");
    p.className = "sp-custom-element";
    p.textContent = "New Text";
    p.style.position = "absolute";
    p.style.left = Math.round(clientX + (window.scrollX || 0)) + "px";
    p.style.top = Math.round(clientY + (window.scrollY || 0)) + "px";
    p.style.fontSize = "18px";
    p.style.fontWeight = "600";
    p.style.color = "#1C1C1E";
    p.style.margin = "0";
    p.style.padding = "4px 8px";
    p.style.borderRadius = "4px";
    p.style.zIndex = isDeepLayerMode ? "0" : "10000";
    p.style.cursor = "text";
    p.style.minWidth = "60px";

    const targetParent = (container && container.nodeType === 1 && !isOwn(container)) ? container : document.body;
    targetParent.appendChild(p);

    ensurePositioned(p);
    undoStack.push({ type: "delete", node: p, parent: targetParent });
    selectElement(p);
    spPlayKeyClick(200);
    showToast("Text added — type your text directly");
    startInlineTextEdit(p);
  }

  function applyElementTransform() {
    if (!selectedEl) {
      showToast("Select an element first");
      return;
    }
    const newCode = (transformCodeArea?.value || "").trim();
    if (!newCode) return;

    const parent = selectedEl.parentElement;
    if (!parent || isOwn(parent)) {
      showToast("Cannot transform root container");
      return;
    }

    const temp = document.createElement("div");
    temp.innerHTML = newCode;
    const newEl = temp.firstElementChild;

    if (!newEl) {
      // User entered plain text without tags — overwrite the text inside it!
      const oldText = selectedEl.innerText || selectedEl.textContent;
      undoStack.push({
        type: "text",
        node: selectedEl,
        oldText: oldText,
        newText: newCode
      });
      selectedEl.textContent = newCode;
      updateSelectBox(selectedEl);
      spPlayKeyClick(210);
      showToast("Text updated");
      return;
    }

    // Preserve translate offset if already moved
    const trans = getElementTranslate(selectedEl);
    if (trans.x !== 0 || trans.y !== 0) {
      setElementTranslate(newEl, trans.x, trans.y);
    }
    ensurePositioned(newEl);
    newEl.classList.add("sp-custom-element");

    const oldEl = selectedEl;
    undoStack.push({
      type: "transform",
      oldEl: oldEl,
      newEl: newEl,
      parent: parent
    });

    parent.replaceChild(newEl, oldEl);
    selectElement(newEl);
    spPlayKeyClick(240);
    showToast("Element code transformed");
  }

  function applyCustomCss() {
    if (!selectedEl) {
      showToast("Select an element first");
      return;
    }
    const newCss = (elementCssInput?.value || "").trim();
    const oldStyle = selectedEl.getAttribute("style") || "";
    undoStack.push({
      type: "style",
      node: selectedEl,
      oldStyle: oldStyle
    });

    if (newCss) {
      selectedEl.style.cssText = newCss;
      ensurePositioned(selectedEl);
    } else {
      selectedEl.removeAttribute("style");
      ensurePositioned(selectedEl);
    }
    updateSelectBox(selectedEl);
    spPlayKeyClick(210);
    showToast("CSS applied to element");
  }

  function copySelectedElement() {
    if (!selectedEl || isOwn(selectedEl) || isPageRootOrFullWrapper(selectedEl)) {
      showToast("Select an element to copy");
      return;
    }
    spClipboardEl = selectedEl.cloneNode(true);
    spPlayKeyClick(220);
    showToast("Copied element (Ctrl+C)");
  }

  function pasteClipboardElement() {
    if (!spClipboardEl) {
      showToast("Nothing copied yet — press Ctrl+C to copy");
      return;
    }
    const replica = spClipboardEl.cloneNode(true);
    replica.classList.add("sp-custom-element");
    if (replica.id) {
      replica.id = replica.id + "-copy-" + Math.floor(Math.random() * 1000);
    }

    const refParent = (selectedEl && selectedEl.parentElement && !isOwn(selectedEl.parentElement))
      ? selectedEl.parentElement
      : document.body;

    if (selectedEl && selectedEl.nextSibling) {
      refParent.insertBefore(replica, selectedEl.nextSibling);
    } else {
      refParent.appendChild(replica);
    }

    ensurePositioned(replica);
    const origTrans = selectedEl ? getElementTranslate(selectedEl) : { x: 0, y: 0 };
    setElementTranslate(replica, origTrans.x + 20, origTrans.y + 20);

    undoStack.push({ type: "delete", node: replica, parent: refParent });
    selectElement(replica);
    spPlayKeyClick(240);
    showToast("Replicated element (Ctrl+V)");
  }

  if (btnApplyTransform) {
    btnApplyTransform.addEventListener("click", () => {
      spPlayKeyClick(170);
      applyElementTransform();
    });
  }

  if (btnResetTransform) {
    btnResetTransform.addEventListener("click", () => {
      spPlayKeyClick(150);
      if (selectedEl && transformCodeArea) {
        transformCodeArea.value = selectedEl.outerHTML || selectedEl.textContent || "";
        showToast("Code reset to current element");
      }
    });
  }

  if (btnApplyCss) {
    btnApplyCss.addEventListener("click", () => {
      spPlayKeyClick(170);
      applyCustomCss();
    });
  }

  if (elementCssInput) {
    elementCssInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyCustomCss();
      }
    });
  }

  if (transformCodeArea) {
    transformCodeArea.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        applyElementTransform();
      }
    });
  }

  // Automatic Drag & Drop of Images from Computer or Browser
  window.addEventListener("dragover", e => {
    if (!isEnabled) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, true);

  window.addEventListener("drop", e => {
    if (!isEnabled || isOwn(e.target)) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const imgFile = Array.from(files).find(f => f.type && f.type.startsWith("image/"));
      if (imgFile) {
        e.preventDefault();
        e.stopPropagation();
        const reader = new FileReader();
        reader.onload = ev => {
          insertDroppedImage(ev.target.result, e.clientX, e.clientY);
        };
        reader.readAsDataURL(imgFile);
        return;
      }
    }

    const textData = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "";
    if (textData && (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(textData.trim()) || textData.startsWith("data:image/"))) {
      e.preventDefault();
      e.stopPropagation();
      insertDroppedImage(textData.trim(), e.clientX, e.clientY);
      return;
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Figma-Style Deep Layer & Stationary-Front Engine
     (Step Behind Front Elements Without Moving Front Elements)
     ══════════════════════════════════════════════════════════ */
  function clearPassthroughFrontNodes() {
    passthroughFrontNodes.forEach(n => {
      try {
        n.classList.remove("sp-front-passthrough");
      } catch (e) {}
    });
    passthroughFrontNodes = [];
  }

  function computeVisualLayerStack(el) {
    if (!el || isOwn(el)) return [];
    const stack = [];
    const seen = new Set();

    function addLayer(node) {
      if (!node || node.nodeType !== 1 || isOwn(node) || seen.has(node)) return;
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "LINK") return;
      seen.add(node);
      stack.push(node);
    }

    // 1. Overlapping visual elements at the target's center point (front-to-back)
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

    // 2. Ensure the element itself and all its parent/ancestor layers up to <body> and <html> are included in order
    let curr = el;
    while (curr && curr.nodeType === 1 && !isOwn(curr)) {
      addLayer(curr);
      curr = curr.parentElement;
    }
    addLayer(document.body);
    addLayer(document.documentElement);

    return stack;
  }

  function applyDeepLayerSelection(newIdx) {
    if (!deepLayerStack.length) {
      if (selectedEl) deepLayerStack = computeVisualLayerStack(selectedEl);
      if (!deepLayerStack.length) return;
    }

    const clampedIdx = Math.max(0, Math.min(deepLayerStack.length - 1, newIdx));
    clearPassthroughFrontNodes();

    // Mark all layers in front of clampedIdx as pointer-events pass-through so the user can directly drag the deeper layer!
    for (let i = 0; i < clampedIdx; i++) {
      const frontNode = deepLayerStack[i];
      if (frontNode && frontNode !== document.body && frontNode !== document.documentElement) {
        frontNode.classList.add("sp-front-passthrough");
        passthroughFrontNodes.push(frontNode);
      }
    }

    deepLayerIndex = clampedIdx;
    isDeepLayerMode = clampedIdx > 0;
    const targetLayer = deepLayerStack[clampedIdx];
    selectElement(targetLayer, true);

    const tag = targetLayer.tagName.toLowerCase();
    const cls = getPrimaryClass(targetLayer);
    if (isDeepLayerMode) {
      showToast(`Layer ${clampedIdx + 1} of ${deepLayerStack.length}: <${tag}${cls}> (Behind front elements — drag freely without moving front)`);
    } else {
      showToast(`Front Layer (1 of ${deepLayerStack.length}): <${tag}${cls}>`);
    }
  }

  function stepLayerDeeper() {
    spPlayKeyClick(145);
    if (!selectedEl) {
      showToast("Click any element on the page first, then step behind it");
      return;
    }
    if (!deepLayerStack.length || deepLayerStack.indexOf(selectedEl) === -1) {
      deepLayerStack = computeVisualLayerStack(selectedEl);
      deepLayerIndex = Math.max(0, deepLayerStack.indexOf(selectedEl));
    }
    if (deepLayerIndex < deepLayerStack.length - 1) {
      applyDeepLayerSelection(deepLayerIndex + 1);
    } else {
      showToast("Already at the deepest background layer (Root Canvas)");
    }
  }

  function stepLayerForward() {
    spPlayKeyClick(195);
    if (!selectedEl) return;
    if (!deepLayerStack.length || deepLayerStack.indexOf(selectedEl) === -1) {
      deepLayerStack = computeVisualLayerStack(selectedEl);
      deepLayerIndex = Math.max(0, deepLayerStack.indexOf(selectedEl));
    }
    if (deepLayerIndex > 0) {
      applyDeepLayerSelection(deepLayerIndex - 1);
    } else {
      const firstChild = Array.from(selectedEl.children || []).find(c => !isOwn(c) && !c.classList.contains("sp-detached-bg-layer"));
      if (firstChild) {
        selectElement(firstChild, false);
        showToast(`Selected front child element: <${firstChild.tagName.toLowerCase()}${getPrimaryClass(firstChild)}>`);
      } else {
        showToast("Already at the frontmost element");
      }
    }
  }

  function syncKeepFrontBtnUI() {
    if (!btnKeepFrontStill || !keepFrontLabel) return;
    btnKeepFrontStill.classList.toggle("active", keepFrontStationary);
    keepFrontLabel.textContent = keepFrontStationary
      ? "Keep Front Elements Still: ON"
      : "Keep Front Elements Still: OFF";
  }

  if (btnKeepFrontStill) {
    btnKeepFrontStill.addEventListener("click", () => {
      spPlayKeyClick(175);
      keepFrontStationary = !keepFrontStationary;
      syncKeepFrontBtnUI();
      showToast(keepFrontStationary
        ? "Front elements will stay stationary when you drag a background container"
        : "Front elements will move together with their parent container");
    });
  }

  // Detach Background Box: creates a dedicated movable background layer behind the front elements
  function detachBackgroundBox() {
    spPlayKeyClick(160);
    if (!selectedEl || selectedEl === document.body || selectedEl === document.documentElement) {
      showToast("Select a card or section container first to detach its background box");
      return;
    }

    const target = selectedEl;
    ensurePositioned(target);

    const existingBg = Array.from(target.children).find(c => c.classList && c.classList.contains("sp-detached-bg-layer"));
    if (existingBg) {
      isDeepLayerMode = true;
      selectElement(existingBg, true);
      showToast("Selected detached background box — drag or restyle it independently");
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

    // Elevate existing foreground children so they sit cleanly in front of the detached background box
    Array.from(target.children).forEach(child => {
      if (!isOwn(child)) {
        ensurePositioned(child);
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

    undoStack.push({
      type: "detach-bg",
      container: target,
      bgLayer,
      oldBg,
      oldBgColor
    });

    isDeepLayerMode = true;
    selectElement(bgLayer, true);
    showToast("Detached background box as its own layer — drag or recolor it freely behind the front elements");
  }

  if (btnDetachBg) {
    btnDetachBg.addEventListener("click", detachBackgroundBox);
  }

  /* ══════════════════════════════════════════════════════════
     Layers Tab: Non-Destructive Send to Back & Bring to Front
     ══════════════════════════════════════════════════════════ */
  function sendElementToBack(el) {
    if (!el || !el.parentElement) return;
    spPlayKeyClick(150);
    const parent = el.parentElement;
    undoStack.push({
      type: "order",
      node: el,
      parent,
      next: el.nextElementSibling,
      oldZ: el.style.zIndex
    });

    ensurePositioned(el);
    // Keep z-index at 0 and elevate sibling layers to z-index >= 1 so the element sits behind siblings without vanishing behind an opaque <body>!
    el.style.setProperty("z-index", "0", "important");
    Array.from(parent.children).forEach(sib => {
      if (sib !== el && !isOwn(sib)) {
        ensurePositioned(sib);
        const sibZ = parseInt(window.getComputedStyle(sib).zIndex) || 0;
        if (sibZ <= 0) sib.style.setProperty("z-index", "1", "important");
      }
    });
    parent.insertBefore(el, parent.firstChild);
    if (zInput) zInput.value = 0;
    updateSelectBox(el);
    showToast("Sent layer behind all sibling elements in this section");
  }

  function bringElementToFront(el) {
    if (!el || !el.parentElement) return;
    spPlayKeyClick(185);
    const parent = el.parentElement;
    undoStack.push({
      type: "order",
      node: el,
      parent,
      next: el.nextElementSibling,
      oldZ: el.style.zIndex
    });

    ensurePositioned(el);
    el.style.setProperty("z-index", "50", "important");
    parent.appendChild(el);
    if (zInput) zInput.value = 50;
    updateSelectBox(el);
    showToast("Brought layer to the front");
  }

  /* ══════════════════════════════════════════════════════════
     Simplified Layers & Depth Studio Handlers
     ══════════════════════════════════════════════════════════ */
  if (btnLayerUp) {
    btnLayerUp.addEventListener("click", stepLayerForward);
  }

  if (btnLayerDown) {
    btnLayerDown.addEventListener("click", stepLayerDeeper);
  }

  if (btnLayerPrev) {
    btnLayerPrev.addEventListener("click", () => {
      spPlayKeyClick(165);
      if (!selectedEl) return;
      const prev = selectedEl.previousElementSibling;
      if (prev && !isOwn(prev)) {
        selectElement(prev);
        showToast(`Selected previous sibling: <${prev.tagName.toLowerCase()}>`);
      } else {
        showToast("No previous sibling on this level");
      }
    });
  }

  if (btnLayerNext) {
    btnLayerNext.addEventListener("click", () => {
      spPlayKeyClick(165);
      if (!selectedEl) return;
      const next = selectedEl.nextElementSibling;
      if (next && !isOwn(next)) {
        selectElement(next);
        showToast(`Selected next sibling: <${next.tagName.toLowerCase()}>`);
      } else {
        showToast("No next sibling on this level");
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
      if (btnSoloLayer) btnSoloLayer.classList.remove("active");
      if (soloLabel) soloLabel.textContent = "Isolate This Layer Only (Off)";
      if (soloIcon) soloIcon.innerHTML = SP_ICONS.eye;
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
    if (btnSoloLayer) btnSoloLayer.classList.add("active");
    if (soloLabel) soloLabel.textContent = "Isolating Only This Layer (On)";
    if (soloIcon) soloIcon.innerHTML = SP_ICONS.eye;
  }

  if (btnSoloLayer) {
    btnSoloLayer.addEventListener("click", () => {
      spPlayKeyClick(170);
      if (!selectedEl) return;
      if (isolatedLayerNode === selectedEl) {
        setLayerSolo(selectedEl, false);
        showToast("Restored all surrounding page layers");
      } else {
        setLayerSolo(selectedEl, true);
        showToast("Isolated selected layer");
      }
    });
  }

  if (btnPutBehind) {
    btnPutBehind.addEventListener("click", () => {
      spPlayKeyClick(155);
      if (!selectedEl || !selectedEl.parentElement) return;
      const prev = selectedEl.previousElementSibling;
      if (prev && !isOwn(prev)) {
        undoStack.push({ type: "order", node: selectedEl, parent: selectedEl.parentElement, next: selectedEl.nextElementSibling, oldZ: selectedEl.style.zIndex });
        prev.insertAdjacentElement("beforebegin", selectedEl);
        updateSelectBox(selectedEl);
        showToast("Moved layer 1 step behind neighbor");
      } else {
        ensurePositioned(selectedEl);
        const curZ = parseInt(selectedEl.style.zIndex) || 0;
        const nextZ = Math.max(0, curZ - 1);
        selectedEl.style.setProperty("z-index", nextZ + "", "important");
        if (zInput) zInput.value = nextZ;
        updateSelectBox(selectedEl);
        showToast(`Lowered layer depth (${nextZ})`);
      }
    });
  }

  if (btnPutFront) {
    btnPutFront.addEventListener("click", () => {
      spPlayKeyClick(175);
      if (!selectedEl || !selectedEl.parentElement) return;
      const next = selectedEl.nextElementSibling;
      if (next && !isOwn(next)) {
        undoStack.push({ type: "order", node: selectedEl, parent: selectedEl.parentElement, next: selectedEl.nextElementSibling, oldZ: selectedEl.style.zIndex });
        next.insertAdjacentElement("afterend", selectedEl);
        updateSelectBox(selectedEl);
        showToast("Moved layer 1 step in front of neighbor");
      } else {
        ensurePositioned(selectedEl);
        const curZ = parseInt(selectedEl.style.zIndex) || 0;
        selectedEl.style.setProperty("z-index", (curZ + 1) + "", "important");
        if (zInput) zInput.value = curZ + 1;
        updateSelectBox(selectedEl);
        showToast(`Raised layer depth (${curZ + 1})`);
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
      spPlayKeyClick(150);
      if (!selectedEl) return;
      undoStack.push({
        type: "order",
        node: selectedEl,
        parent: selectedEl.parentElement,
        next: selectedEl.nextElementSibling,
        oldZ: selectedEl.style.zIndex
      });
      document.body.insertBefore(selectedEl, document.body.firstChild);
      selectedEl.style.setProperty("position", "fixed", "important");
      selectedEl.style.setProperty("top", "0", "important");
      selectedEl.style.setProperty("left", "0", "important");
      selectedEl.style.setProperty("width", "100vw", "important");
      selectedEl.style.setProperty("height", "100vh", "important");
      selectedEl.style.setProperty("z-index", "0", "important");
      selectedEl.style.setProperty("object-fit", "cover", "important");
      selectedEl.style.setProperty("pointer-events", "none", "important");
      updateSelectBox(selectedEl);
      showToast("Placed element as full-page background");
    });
  }

  if (zUpBtn) {
    zUpBtn.addEventListener("click", () => {
      spPlayKeyClick(180);
      if (!selectedEl) return;
      ensurePositioned(selectedEl);
      const next = (parseInt(zInput.value) || 0) + 1;
      zInput.value = next;
      selectedEl.style.setProperty("z-index", next, "important");
    });
  }

  if (zDownBtn) {
    zDownBtn.addEventListener("click", () => {
      spPlayKeyClick(150);
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
      spPlayKeyClick(170);
      let targetNode = selectedEl;
      let targetLabel = "Selected Layer";

      if (activeBgTargetMode === "body" || (!targetNode && activeBgTargetMode === "selected")) {
        targetNode = document.body;
        targetLabel = "Page Body";
      } else if (activeBgTargetMode === "html") {
        targetNode = document.documentElement;
        targetLabel = "Root Canvas";
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
        showToast(`Set ${targetLabel} background to ${col}`);
      }
    });
  }

  if (btnLayerCode) {
    btnLayerCode.addEventListener("click", () => {
      spPlayKeyClick(175);
      if (!selectedEl) return;
      activeToolMode = "code";
      syncDockUI("code");
      drawer.classList.add("sp-open");
      const codeTab = root.querySelector(".sp-drawer-tab[data-tab='code']");
      if (codeTab) codeTab.click();
      populateDualCodePanes(selectedEl);
      showToast("Opened code editor for selected layer");
    });
  }

  if (btnLayerToImage) {
    btnLayerToImage.addEventListener("click", async () => {
      spPlayKeyClick(165);
      if (!selectedEl) return;
      const target = selectedEl;
      const r = target.getBoundingClientRect();
      const w = Math.max(20, Math.round(r.width));
      const h = Math.max(20, Math.round(r.height));

      showToast("Flattening layer into image...");
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
          showToast("Converted layer into draggable image");
        };
        img.onerror = () => {
          showToast("Layer snapshot captured");
        };
        img.src = svgUrl;
      } catch (err) {
        showToast("Image conversion error: " + err.message);
      }
    });
  }

  if (btnPutText) {
    btnPutText.addEventListener("click", () => {
      spPlayKeyClick(170);
      const container = selectedEl || document.body;
      const p = document.createElement("p");
      p.className = "sp-custom-element";
      p.textContent = "New Text Block";
      p.style.fontSize = "16px";
      p.style.fontWeight = "600";
      p.style.color = "inherit";
      p.style.margin = "8px 0";
      ensurePositioned(p);
      container.appendChild(p);
      undoStack.push({ type: "delete", node: p, parent: container });
      selectElement(p);
      showToast("Added text block to layer — double-click to edit words");
    });
  }

  if (btnPutCard) {
    btnPutCard.addEventListener("click", () => {
      spPlayKeyClick(170);
      const container = selectedEl || document.body;
      const card = document.createElement("div");
      card.className = "sp-custom-element";
      card.textContent = "New Layer Card";
      card.style.padding = "16px 20px";
      card.style.background = "#FAF9F6";
      card.style.border = "1px solid #DCD9CE";
      card.style.borderRadius = "10px";
      card.style.color = "#1C1C1E";
      card.style.fontWeight = "600";
      card.style.margin = "8px 0";
      ensurePositioned(card);
      container.appendChild(card);
      undoStack.push({ type: "delete", node: card, parent: container });
      selectElement(card);
      showToast("Added card box to layer — drag anywhere or restyle");
    });
  }

  if (btnPutImage) {
    btnPutImage.addEventListener("click", () => {
      spPlayKeyClick(170);
      showToast("Drag an image file directly onto the page to add it");
    });
  }

  /* ── Visual Layer Stack Pills & Breadcrumbs ── */
  function buildBreadcrumbs(el) {
    if (!el) return;

    const stackToRender = (deepLayerStack && deepLayerStack.length > 0 && deepLayerStack.includes(el))
      ? deepLayerStack
      : computeVisualLayerStack(el);

    if (layerBreadcrumb) {
      layerBreadcrumb.innerHTML = "";
      stackToRender.forEach((node, idx) => {
        const isCurrent = (node === el);
        const tag = node.tagName.toLowerCase();
        const cls = getPrimaryClass(node);
        const depthTag = idx === 0 ? "Front: " : `L${idx + 1}: `;
        const btn = document.createElement("button");
        btn.className = "sp-crumb-chip" + (isCurrent ? " active" : "");
        btn.textContent = `${depthTag}${tag}${cls}`;
        btn.title = idx === 0
          ? `Select front element <${tag}${cls}>`
          : `Step behind to Layer ${idx + 1} (<${tag}${cls}>) — Front elements stay still`;
        btn.addEventListener("click", () => {
          spPlayKeyClick(170);
          deepLayerStack = stackToRender;
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

    if (curLayerBadge) {
      const idx = stackToRender.indexOf(el);
      const tag = el.tagName.toLowerCase();
      const cls = getPrimaryClass(el);
      if (idx > 0) {
        curLayerBadge.textContent = `Layer ${idx + 1}/${stackToRender.length} (Behind Front): ${tag}${cls}`;
      } else {
        curLayerBadge.textContent = `Front (1/${Math.max(1, stackToRender.length)}): ${tag}${cls}`;
      }
    }

    if (layerBgColorHex && layerBgColorPicker) {
      const cs = window.getComputedStyle(el);
      const hex = rgbToHex(cs.backgroundColor);
      layerBgColorHex.value = hex;
      layerBgColorPicker.value = hex.startsWith("#") ? hex : "#F4F3EE";
    }
  }

  /* ══════════════════════════════════════════════════════════
     Interactive Live Component Sandbox Preview
     ══════════════════════════════════════════════════════════ */
  function updateSandboxPreview(el) {
    if (!sandboxViewport) return;
    sandboxViewport.innerHTML = "";
    if (!el) {
      sandboxViewport.innerHTML = '<span style="color:#78716C;font-size:11px">No element selected</span>';
      return;
    }

    try {
      let previewTarget;
      if (sandboxMode === "context" && el.parentElement && !isOwn(el.parentElement)) {
        previewTarget = el.parentElement.cloneNode(true);
        previewTarget.querySelectorAll("script, noscript, #sp-root, [id^='sp-']").forEach(n => n.remove());
        const tag = el.tagName.toLowerCase();
        const match = previewTarget.querySelector(tag) || previewTarget.firstElementChild;
        if (match) match.style.outline = "2px dashed #C84B44";
      } else {
        previewTarget = el.cloneNode(true);
        previewTarget.querySelectorAll("script, noscript, #sp-root, [id^='sp-']").forEach(n => n.remove());
      }

      previewTarget.style.pointerEvents = "auto";
      previewTarget.style.margin = "auto";
      sandboxViewport.appendChild(previewTarget);
    } catch (e) {
      sandboxViewport.innerHTML = '<span style="color:#78716C;font-size:11px">Preview unavailable</span>';
    }

    if (previewCodeDrawer && previewCodeDrawer.classList.contains("sp-pdrawer-open")) {
      updatePreviewCodeDrawer(el);
    }
  }

  if (btnContextToggle) {
    btnContextToggle.addEventListener("click", () => {
      spPlayKeyClick(170);
      sandboxMode = (sandboxMode === "component") ? "context" : "component";
      btnContextToggle.textContent = (sandboxMode === "component") ? "View: Component" : "View: Parent & Context";
      btnContextToggle.classList.toggle("active", sandboxMode === "context");
      updateSandboxPreview(selectedEl);
      showToast(`Preview mode: ${sandboxMode}`);
    });
  }

  if (btnRefreshPreview) {
    btnRefreshPreview.addEventListener("click", () => {
      spPlayKeyClick(170);
      updateSandboxPreview(selectedEl);
      showToast("Refreshed preview");
    });
  }

  function populateDualCodePanes() {}
  function updatePreviewCodeDrawer() {}
  function closeErrorModal() {
    if (errorModal) errorModal.classList.remove("sp-modal-show");
    pendingAutoFixFn = null;
  }

  /* ══════════════════════════════════════════════════════════
     VisBug Smart Element Picker & Independent CSS `translate` Engine
     (Prevents Dragging Full Page & Prevents Animated Buttons From Resetting!)
     ══════════════════════════════════════════════════════════ */
  function isPageRootOrFullWrapper(el) {
    if (!el || el.nodeType !== 1 || isOwn(el)) return true;
    const tag = el.tagName.toLowerCase();
    if (tag === "html" || tag === "body" || tag === "main") return true;
    const id = (el.id && typeof el.id === "string") ? el.id.toLowerCase() : "";
    if (["root", "app", "__next", "__nuxt", "page", "wrapper", "smooth-wrapper", "smooth-content"].includes(id)) {
      return true;
    }
    const r = el.getBoundingClientRect();
    if (r.width >= window.innerWidth * 0.90 && r.height >= window.innerHeight * 0.85) {
      return true;
    }
    return false;
  }

  function visbugPickElement(clientX, clientY) {
    const hits = document.elementsFromPoint(clientX, clientY);
    let fallback = null;
    for (const node of hits) {
      if (!node || node.nodeType !== 1 || isOwn(node)) continue;
      const tag = node.tagName.toLowerCase();
      if (tag === "html" || tag === "body" || tag === "script" || tag === "style") continue;
      const cs = window.getComputedStyle(node);
      if (cs.pointerEvents === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
      if (!isPageRootOrFullWrapper(node)) {
        return node;
      }
      if (!fallback) fallback = node;
    }
    return fallback || document.elementFromPoint(clientX, clientY);
  }

  function getElementTranslate(el) {
    if (!el) return { x: 0, y: 0 };
    if (el._spTranslate) return el._spTranslate;
    const cssTrans = el.style ? el.style.getPropertyValue("translate") : "";
    if (cssTrans && cssTrans !== "none") {
      const parts = cssTrans.trim().split(/\s+/);
      const x = parseFloat(parts[0]) || 0;
      const y = parseFloat(parts[1]) || 0;
      return { x, y };
    }
    const tr = (el.style && el.style.transform) ? el.style.transform : "";
    const match = tr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (match) {
      return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }
    return { x: 0, y: 0 };
  }

  function setElementTranslate(el, x, y) {
    if (!el || !el.style) return;
    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    el._spTranslate = { x: rx, y: ry };
    // Use independent CSS `translate` property with !important so any `:active` / `:hover` / keyframe
    // `transform` animations on stubborn buttons compose ON TOP of our new position and never snap back!
    if (rx !== 0 || ry !== 0) {
      el.style.setProperty("translate", `${rx}px ${ry}px`, "important");
    } else {
      el.style.removeProperty("translate");
    }
    // Clean any legacy inline translate() we might have written to style.transform
    if (el.style.transform && /^translate\([-\d.]+px,\s*[-\d.]+px\)$/.test(el.style.transform.trim())) {
      el.style.removeProperty("transform");
    }
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

    // Word Document-Style Precise Text Selection:
    // If the clicked target is or has a specific leaf text node/span, edit THAT specific element directly
    // so neighboring spans with different fonts in the same div are NEVER overwritten!
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
    textEl._spOriginalHtml = textEl.innerHTML;
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

    showToast("✏️ Editing words live • Enter for new line div with matching font, Esc to cancel");

    function onBlur() {
      finishInlineTextEdit(textEl);
      textEl.removeEventListener("blur", onBlur);
      textEl.removeEventListener("keydown", onKey);
      textEl.removeEventListener("beforeinput", onBeforeInput);
    }

    // When writing past a different font, inherit its font attributes just like Microsoft Word
    function onBeforeInput(ev) {
      if (ev.inputType === "insertText" && ev.data) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          let refNode = null;
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            refNode = range.startContainer.parentElement;
          } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            const children = range.startContainer.childNodes;
            if (range.startOffset > 0 && children[range.startOffset - 1]) {
              refNode = children[range.startOffset - 1];
            } else if (children[range.startOffset]) {
              refNode = children[range.startOffset];
            }
          }

          if (refNode && refNode.nodeType === Node.ELEMENT_NODE && refNode !== textEl) {
            const cs = window.getComputedStyle(refNode);
            // If typing outside the styled span, wrap into a matching span so the font is preserved
            if (range.startContainer === textEl) {
              ev.preventDefault();
              const newSpan = document.createElement("span");
              newSpan.style.fontFamily = cs.fontFamily;
              newSpan.style.fontSize = cs.fontSize;
              newSpan.style.fontWeight = cs.fontWeight;
              newSpan.style.fontStyle = cs.fontStyle;
              newSpan.style.color = cs.color;
              newSpan.textContent = ev.data;
              range.insertNode(newSpan);

              const newRange = document.createRange();
              newRange.setStart(newSpan.firstChild, newSpan.textContent.length);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
            }
          }
        }
      }
    }

    // Word Document-Style Enter Key: creates a new div line inheriting current font attributes!
    function onKey(ev) {
      if (ev.key === "Escape") {
        textEl.innerHTML = textEl._spOriginalHtml;
        textEl.blur();
      } else if (ev.key === "Enter") {
        if (!ev.shiftKey) {
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
    }

    textEl.addEventListener("blur", onBlur);
    textEl.addEventListener("keydown", onKey);
    textEl.addEventListener("beforeinput", onBeforeInput);
  }

  function finishInlineTextEdit(node) {
    if (!node) return;
    node.contentEditable = "false";
    node.classList.remove("sp-inline-editing");
    if (node._spOriginalHtml !== undefined && node.innerHTML !== node._spOriginalHtml) {
      const oldHtml = node._spOriginalHtml;
      const newHtml = node.innerHTML;
      undoStack.push({
        type: "text",
        node,
        oldHtml,
        newHtml,
        oldText: node._spOriginalText,
        newText: node.innerText
      });
      delete node._spOriginalHtml;
      delete node._spOriginalText;
      updateSandboxPreview(selectedEl);
      populateDualCodePanes(selectedEl);
      updateSelectBox(selectedEl);
      showToast("✓ Saved word edits • Formatted lines & fonts preserved!");
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
  let justFinishedDrag = false;
  let dragTarget = null;
  let dragOrigin = { mouseX: 0, mouseY: 0, elemX: 0, elemY: 0, scrollX: 0, scrollY: 0 };
  let isDragCandidate = false;
  let autoScrollRaf = null;
  let lastDragMouseEvent = null;
  let maxDragDist = 0;

  // Smart Break-Free Snapper:
  let snapDwellCountX = 0;
  let snapDwellCountY = 0;
  let lastSnapTargetX = null;
  let lastSnapTargetY = null;
  let snapReleasedX = false;
  let snapReleasedY = false;

  function applyStationaryChildrenCounterMove(dx, dy) {
    if (!dragStationaryChildren || !dragStationaryChildren.length) return;
    const deltaMoveX = dx - dragOrigin.elemX;
    const deltaMoveY = dy - dragOrigin.elemY;
    for (const item of dragStationaryChildren) {
      const cx = item.origX - deltaMoveX;
      const cy = item.origY - deltaMoveY;
      setElementTranslate(item.el, cx, cy);
    }
  }

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
      const intensity = Math.min(1, Math.max(0.2, (edgeThreshold - e.clientY) / edgeThreshold));
      scrollDelta = -Math.round(22 * intensity);
    } else if (e.clientY > window.innerHeight - edgeThreshold) {
      const intensity = Math.min(1, Math.max(0.2, (e.clientY - (window.innerHeight - edgeThreshold)) / edgeThreshold));
      scrollDelta = Math.round(22 * intensity);
    }

    if (scrollDelta !== 0) {
      window.scrollBy(0, scrollDelta);
      const newScrollY = window.scrollY || window.pageYOffset || 0;

      const curScrollX = window.scrollX || window.pageXOffset || 0;
      const dScrollX = curScrollX - dragOrigin.scrollX;
      const dScrollY = newScrollY - dragOrigin.scrollY;

      const dx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX) + dScrollX;
      const dy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY) + dScrollY;
      setElementTranslate(dragTarget, dx, dy);
      applyStationaryChildrenCounterMove(dx, dy);
      updateSelectBox(dragTarget);

      autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
    } else {
      autoScrollRaf = null;
    }
  }

  // Intercept pointerdown in capture phase so stubborn buttons with JS pointerdown/press animations
  // do not snap back or trigger page press handlers while StylePeek Studio is active
  document.addEventListener("pointerdown", e => {
    if (!isEnabled || isOwn(e.target) || activeEditingNode) return;
    if (e.button === 0) {
      e.stopPropagation();
    }
  }, true);

  document.addEventListener("mousedown", e => {
    if (!isEnabled || isOwn(e.target)) return;
    if (e.button !== 0) return; // Only left-click initiates selection/drag

    if (activeEditingNode) {
      if (activeEditingNode !== e.target && !activeEditingNode.contains(e.target)) {
        finishInlineTextEdit(activeEditingNode);
      }
      return;
    }

    // Stop page mousedown handlers so animated buttons don't think they are being clicked by the site
    e.stopPropagation();

    // NEVER start element dragging when in Stretch (resize) or Delete mode, or while resizing handles!
    if (isResizing || activeToolMode === "resize" || activeToolMode === "delete") {
      isDragCandidate = false;
      isDragging = false;
      dragTarget = null;
      return;
    }

    const picked = visbugPickElement(e.clientX, e.clientY) || e.target;
    const isTargetOrChild = selectedEl && (selectedEl === picked || selectedEl === e.target || selectedEl.contains(e.target));
    const shouldAllowDrag = (activeToolMode === "move") || isDeepLayerMode || isTargetOrChild;

    if (shouldAllowDrag) {
      const parentInteractive = picked.closest("a, button, [role='button'], .sp-custom-element, img, svg, picture, figure, p, span, h1, h2, h3, h4, h5, h6");
      let candidate = (selectedEl && (isDeepLayerMode || selectedEl === picked || selectedEl === e.target || selectedEl.contains(e.target)))
        ? selectedEl
        : (parentInteractive || picked);

      // NEVER allow dragging the entire page or full-viewport wrapper!
      if (!isDeepLayerMode && isPageRootOrFullWrapper(candidate)) {
        if (parentInteractive && !isPageRootOrFullWrapper(parentInteractive)) {
          candidate = parentInteractive;
        } else if (!isPageRootOrFullWrapper(picked)) {
          candidate = picked;
        } else {
          isDragCandidate = false;
          dragTarget = null;
          return;
        }
      }

      dragTarget = candidate;
      ensurePositioned(dragTarget);

      // Prepare Stationary Front Children if keepFrontStationary is enabled and we are dragging a deeper container layer
      dragStationaryChildren = [];
      if (keepFrontStationary && isDeepLayerMode && dragTarget !== document.body && dragTarget !== document.documentElement) {
        const directKids = Array.from(dragTarget.children || []).filter(
          c => !isOwn(c) && !c.classList.contains("sp-detached-bg-layer") && c.tagName !== "SCRIPT" && c.tagName !== "STYLE"
        );
        if (directKids.length > 0) {
          dragTarget.style.setProperty("overflow", "visible", "important");
          for (const kid of directKids) {
            ensurePositioned(kid);
            const kt = getElementTranslate(kid);
            dragStationaryChildren.push({
              el: kid,
              origX: kt.x,
              origY: kt.y
            });
          }
        }
      }

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
      justFinishedDrag = false;
      maxDragDist = 0;
      snapDwellCountX = 0;
      snapDwellCountY = 0;
      lastSnapTargetX = null;
      lastSnapTargetY = null;
      snapReleasedX = false;
      snapReleasedY = false;
    }
  }, true);

  document.addEventListener("mousemove", e => {
    if (!isEnabled) return;

    if (isDragCandidate && dragTarget && !isResizing && activeToolMode !== "resize" && activeToolMode !== "delete") {
      lastDragMouseEvent = e;
      const dist = Math.hypot(e.clientX - dragOrigin.mouseX, e.clientY - dragOrigin.mouseY);
      // Once mouse moves more than 3px, treat as intentional drag
      if (dist > 3) {
        // If we were editing text, finish it now so drag moves cleanly
        if (activeEditingNode) finishInlineTextEdit(activeEditingNode);

        if (!isDragging) {
          isDragging = true;
          // While dragging: keep drawer hidden!
          if (drawer) drawer.classList.remove("sp-open");
          if (previewPanel) previewPanel.classList.remove("sp-show");
        }
        maxDragDist = Math.max(maxDragDist, dist);
        dragTarget.classList.add("sp-free-dragging");

        const curScrollX = window.scrollX || window.pageXOffset || 0;
        const curScrollY = window.scrollY || window.pageYOffset || 0;
        const dScrollX = curScrollX - dragOrigin.scrollX;
        const dScrollY = curScrollY - dragOrigin.scrollY;

        let rawDx = dragOrigin.elemX + (e.clientX - dragOrigin.mouseX) + dScrollX;
        let rawDy = dragOrigin.elemY + (e.clientY - dragOrigin.mouseY) + dScrollY;

        let dx = rawDx;
        let dy = rawDy;

        let snappedH = false;
        let snappedV = false;
        let snapLineY = 0;
        let snapLineX = 0;

        // Holding Alt key completely bypasses snapping for 100% free dragging
        const snappingEnabled = !e.altKey;
        const SNAP_THRESHOLD = 5;

        if (snappingEnabled) {
          if (maxDragDist <= 12) {
            if (Math.abs(rawDx - dragOrigin.elemX) <= SNAP_THRESHOLD) {
              dx = dragOrigin.elemX;
              snappedV = true;
              snapLineX = dragOrigin.mouseX;
            }
            if (Math.abs(rawDy - dragOrigin.elemY) <= SNAP_THRESHOLD) {
              dy = dragOrigin.elemY;
              snappedH = true;
              snapLineY = dragOrigin.mouseY;
            }
          }

          const parent = dragTarget.parentElement;
          if (parent && !isOwn(parent)) {
            const pRect = parent.getBoundingClientRect();
            const tRect = dragTarget.getBoundingClientRect();
            const curTrans = getElementTranslate(dragTarget);

            const proposedLeft = tRect.left + (dx - curTrans.x);
            const proposedRight = proposedLeft + tRect.width;
            const proposedCenterX = proposedLeft + tRect.width / 2;

            let targetCandidateX = null;
            let targetOffsetDeltaX = 0;
            let lineCandidateX = 0;

            if (Math.abs(proposedLeft - pRect.left) <= SNAP_THRESHOLD) {
              targetCandidateX = "left";
              targetOffsetDeltaX = (pRect.left - proposedLeft);
              lineCandidateX = pRect.left;
            } else if (Math.abs(proposedCenterX - (pRect.left + pRect.width / 2)) <= SNAP_THRESHOLD) {
              targetCandidateX = "center";
              targetOffsetDeltaX = ((pRect.left + pRect.width / 2) - proposedCenterX);
              lineCandidateX = pRect.left + pRect.width / 2;
            } else if (Math.abs(proposedRight - pRect.right) <= SNAP_THRESHOLD) {
              targetCandidateX = "right";
              targetOffsetDeltaX = (pRect.right - proposedRight);
              lineCandidateX = pRect.right;
            }

            if (targetCandidateX !== null) {
              if (lastSnapTargetX === targetCandidateX) {
                snapDwellCountX++;
                if (snapDwellCountX > 2) {
                  snapReleasedX = true;
                }
              } else {
                lastSnapTargetX = targetCandidateX;
                snapDwellCountX = 1;
                snapReleasedX = false;
              }

              if (!snapReleasedX && !snappedV) {
                dx += targetOffsetDeltaX;
                snappedV = true;
                snapLineX = lineCandidateX;
              }
            } else {
              lastSnapTargetX = null;
              snapDwellCountX = 0;
              snapReleasedX = false;
            }

            const proposedTop = tRect.top + (dy - curTrans.y);
            const proposedBottom = proposedTop + tRect.height;
            const proposedCenterY = proposedTop + tRect.height / 2;

            let targetCandidateY = null;
            let targetOffsetDeltaY = 0;
            let lineCandidateY = 0;

            if (Math.abs(proposedTop - pRect.top) <= SNAP_THRESHOLD) {
              targetCandidateY = "top";
              targetOffsetDeltaY = (pRect.top - proposedTop);
              lineCandidateY = pRect.top;
            } else if (Math.abs(proposedCenterY - (pRect.top + pRect.height / 2)) <= SNAP_THRESHOLD) {
              targetCandidateY = "center";
              targetOffsetDeltaY = ((pRect.top + pRect.height / 2) - proposedCenterY);
              lineCandidateY = pRect.top + pRect.height / 2;
            } else if (Math.abs(proposedBottom - pRect.bottom) <= SNAP_THRESHOLD) {
              targetCandidateY = "bottom";
              targetOffsetDeltaY = (pRect.bottom - proposedBottom);
              lineCandidateY = pRect.bottom;
            }

            if (targetCandidateY !== null) {
              if (lastSnapTargetY === targetCandidateY) {
                snapDwellCountY++;
                if (snapDwellCountY > 2) {
                  snapReleasedY = true;
                }
              } else {
                lastSnapTargetY = targetCandidateY;
                snapDwellCountY = 1;
                snapReleasedY = false;
              }

              if (!snapReleasedY && !snappedH) {
                dy += targetOffsetDeltaY;
                snappedH = true;
                snapLineY = lineCandidateY;
              }
            } else {
              lastSnapTargetY = null;
              snapDwellCountY = 0;
              snapReleasedY = false;
            }
          }
        }

        if (snapGuideV) {
          if (snappedV) {
            snapGuideV.style.display = "block";
            snapGuideV.style.left = snapLineX + "px";
          } else {
            snapGuideV.style.display = "none";
          }
        }
        if (snapGuideH) {
          if (snappedH) {
            snapGuideH.style.display = "block";
            snapGuideH.style.top = snapLineY + "px";
          } else {
            snapGuideH.style.display = "none";
          }
        }

        setElementTranslate(dragTarget, dx, dy);
        applyStationaryChildrenCounterMove(dx, dy);
        updateSelectBox(dragTarget);

        if (!autoScrollRaf && (e.clientY < 80 || e.clientY > window.innerHeight - 80)) {
          autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
        }
      }
    } else if (isEnabled && !isDragging && !isResizing) {
      if (snapGuideH) snapGuideH.style.display = "none";
      if (snapGuideV) snapGuideV.style.display = "none";

      if (selectedEl) {
        hoverBox.style.display = "none";
        hoverLbl.style.display = "none";
        return;
      }

      const el = visbugPickElement(e.clientX, e.clientY);
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

    if (snapGuideH) snapGuideH.style.display = "none";
    if (snapGuideV) snapGuideV.style.display = "none";

    if (isDragCandidate) {
      if (isDragging && dragTarget) {
        dragTarget.classList.remove("sp-free-dragging");
        const stationarySnap = dragStationaryChildren.map(item => ({
          el: item.el,
          origX: item.origX,
          origY: item.origY,
          newX: item.el._spTranslate ? item.el._spTranslate.x : 0,
          newY: item.el._spTranslate ? item.el._spTranslate.y : 0
        }));
        undoStack.push({
          type: "move",
          node: dragTarget,
          oldTranslate: { x: dragOrigin.elemX, y: dragOrigin.elemY },
          translate: { ...(dragTarget._spTranslate || { x: 0, y: 0 }) },
          stationaryChildren: stationarySnap
        });
        showToast(stationarySnap.length > 0
          ? "Moved background layer while keeping front elements still (Ctrl+Z to undo)"
          : "Moved layer (Ctrl+Z to undo)");
        justFinishedDrag = true;
        setTimeout(() => { justFinishedDrag = false; }, 250);
      }
      isDragging = false;
      isDragCandidate = false;
      dragTarget = null;
      dragStationaryChildren = [];
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
     Canvas Click & Right-Click Handler (VisBug Smart Picker)
     ══════════════════════════════════════════════════════════ */
  
  // Right-click opens our clean StylePeek Inspector & Alignment drawer for the target element
  document.addEventListener("contextmenu", e => {
    if (!isEnabled || isOwn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = visbugPickElement(e.clientX, e.clientY) || e.target;
    selectElement(target);
    closeAllPopups("drawer");
    if (drawer) {
      drawer.classList.add("sp-open");
      root.querySelector(".sp-drawer-tab[data-tab='style']")?.click();
      if (transformCodeArea) {
        transformCodeArea.focus();
        transformCodeArea.select();
      }
    }
    showToast("Inspector opened — edit CSS or code below");
  }, true);

  document.addEventListener("click", e => {
    if (!isEnabled || isOwn(e.target)) return;

    if (justFinishedDrag) {
      justFinishedDrag = false;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    const target = visbugPickElement(e.clientX, e.clientY) || e.target;

    // Check if user clicked on blank space or in add mode -> add text directly!
    if (activeToolMode === "add" || isPageRootOrFullWrapper(target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      insertNewTextAt(e.clientX, e.clientY, document.body);
      return;
    }

    if (activeToolMode === "move") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!isPageRootOrFullWrapper(target)) {
        selectedEl = target;
        isTargetLocked = false;
        unlockPending = false;
        updateSelectBox(selectedEl);
      }
      closeAllPopups();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (activeToolMode === "delete") {
      if (isPageRootOrFullWrapper(target)) {
        showToast("Cannot delete page root container");
        return;
      }
      undoStack.push({
        type: "delete",
        node: target,
        parent: target.parentNode,
        next: target.nextSibling
      });
      target.remove();
      if (target === selectedEl) {
        closeAllPopups();
        selectBox.style.display = "none";
        selectedEl = null;
      }
      showToast("Element deleted (Ctrl+Z to undo)");
      return;
    }

    // Accidental Misclick Protection:
    if (selectedEl && isTargetLocked && target !== selectedEl && !selectedEl.contains(target)) {
      if (!unlockPending) {
        unlockPending = true;
        selectBadge.textContent = "Click again to switch target";
        showToast("Target locked — click again to switch target", 1800);
        return;
      } else {
        unlockPending = false;
      }
    }

    selectElement(target);

    if (activeToolMode === "style") {
      closeAllPopups("drawer");
      drawer.classList.add("sp-open");
      root.querySelector(".sp-drawer-tab[data-tab='style']")?.click();
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     Undo Engine & Actions
     ══════════════════════════════════════════════════════════ */
  function performUndo() {
    spPlayKeyClick(150);
    if (!undoStack.length) {
      showToast("Nothing to undo");
      return;
    }
    const action = undoStack.pop();
    if (action.type === "delete" && action.parent) {
      action.parent.insertBefore(action.node, action.next || null);
      showToast("Restored deleted element");
    } else if ((action.type === "html" || action.type === "transform") && action.parent) {
      action.parent.replaceChild(action.oldEl, action.newEl);
      selectedEl = action.oldEl;
      selectElement(selectedEl);
      showToast("Restored previous code");
    } else if (action.type === "style" && action.node) {
      if (action.oldStyle) {
        action.node.setAttribute("style", action.oldStyle);
      } else {
        action.node.removeAttribute("style");
      }
      ensurePositioned(action.node);
      selectElement(action.node);
      showToast("Restored previous CSS styles");
    } else if (action.type === "text" && action.node) {
      if (action.oldHtml !== undefined) {
        action.node.innerHTML = action.oldHtml;
      } else if (action.oldText !== undefined) {
        action.node.innerText = action.oldText;
      }
      updateSelectBox(action.node);
      showToast("Restored original text");
    } else if (action.type === "move" && action.node) {
      const prev = action.oldTranslate || { x: 0, y: 0 };
      setElementTranslate(action.node, prev.x, prev.y);
      if (Array.isArray(action.stationaryChildren)) {
        for (const sc of action.stationaryChildren) {
          if (sc.el) {
            setElementTranslate(sc.el, sc.origX || 0, sc.origY || 0);
          }
        }
      }
      updateSelectBox(action.node);
      showToast("Restored original position");
    } else if (action.type === "align" && action.node) {
      action.node.style.display = action.oldDisplay || "";
      action.node.style.justifyContent = action.oldJustify || "";
      action.node.style.alignItems = action.oldAlign || "";
      action.node.style.textAlign = action.oldTextAlign || "";
      updateSelectBox(action.node);
      showToast("Restored alignment");
    } else if (action.type === "order" && action.node && action.parent) {
      action.parent.insertBefore(action.node, action.next || null);
      if (action.oldZ !== undefined) {
        action.node.style.zIndex = action.oldZ;
      }
      updateSelectBox(action.node);
      showToast("Restored layer order");
    } else if (action.type === "detach-bg" && action.container) {
      if (action.bgLayer && action.bgLayer.parentNode) action.bgLayer.remove();
      action.container.style.background = action.oldBg || "";
      action.container.style.backgroundColor = action.oldBgColor || "";
      selectElement(action.container);
      showToast("Restored container background");
    } else if (action.type === "resize" && action.node) {
      action.node.style.width = action.oldW;
      action.node.style.height = action.oldH;
      updateSelectBox(action.node);
      showToast("Restored original dimensions");
    } else if (action.type === "img-replace" && action.node) {
      action.node.src = action.oldSrc;
      updateSelectBox(action.node);
      showToast("Restored original image");
    } else if (action.type === "style" && action.node) {
      if (action.oldVal !== undefined) action.node.style[action.prop] = action.oldVal;
      updateSelectBox(action.node);
      showToast(`Restored original ${action.prop}`);
    } else if (action.type === "bg-image" && action.node) {
      if (action.oldBgImage !== undefined) action.node.style.backgroundImage = action.oldBgImage;
      if (action.oldBgSize !== undefined) action.node.style.backgroundSize = action.oldBgSize;
      if (action.oldBgPosition !== undefined) action.node.style.backgroundPosition = action.oldBgPosition;
      if (action.oldBgRepeat !== undefined) action.node.style.backgroundRepeat = action.oldBgRepeat;
      updateSelectBox(action.node);
      showToast("Restored previous background");
    }
  }

  if (dockUndoBtn) dockUndoBtn.addEventListener("click", performUndo);
  if (drawerUndoBtn) drawerUndoBtn.addEventListener("click", performUndo);

  /* ══════════════════════════════════════════════════════════
     Global Shortcuts
     ══════════════════════════════════════════════════════════ */
  window.addEventListener("keydown", e => {
    const isTyping = e.target.tagName === "TEXTAREA" ||
                     e.target.tagName === "INPUT" ||
                     e.target.isContentEditable ||
                     (e.target.closest && e.target.closest("[contenteditable='true']")) ||
                     activeEditingNode;

    if (isTyping) {
      if (e.key === "Escape" && activeEditingNode) {
        finishInlineTextEdit(activeEditingNode);
      }
      return;
    }

    if (e.key === "Escape") {
      const liveModal = document.getElementById("sp-h2d-interactive-modal");
      if (liveModal) {
        liveModal.remove();
        return;
      }
      if (errorModal && errorModal.classList.contains("sp-modal-show")) {
        closeErrorModal();
      } else if ((drawer && drawer.classList.contains("sp-open")) || (previewPanel && previewPanel.classList.contains("sp-show"))) {
        closeAllPopups();
        selectBox.style.display = "none";
        clearPassthroughFrontNodes();
        isDeepLayerMode = false;
        selectedEl = null;
      } else {
        turnOffStylePeek();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      performUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !e.shiftKey) {
      if (selectedEl) {
        e.preventDefault();
        copySelectedElement();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && !e.shiftKey) {
      if (spClipboardEl) {
        e.preventDefault();
        pasteClipboardElement();
      }
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      captureVisibleViewport();
    } else if (isEnabled) {
      const k = e.key.toLowerCase();
      if (k === "i") {
        activeToolMode = "inspect"; syncDockUI("inspect"); showToast("Inspect Mode");
      } else if (k === "m") {
        activeToolMode = "move"; syncDockUI("move"); document.body.classList.add("sp-mode-move"); showToast("Move Mode");
      } else if (k === "s") {
        activeToolMode = "resize"; syncDockUI("resize"); document.body.classList.remove("sp-mode-move"); showToast("Stretch Mode");
      } else if (k === "a") {
        activeToolMode = "add"; syncDockUI("add"); closeAllPopups();
        showToast("Click blank space to add text, or drag an image to drop");
      } else if (k === "c") {
        activeToolMode = "style"; syncDockUI("style"); closeAllPopups("drawer"); drawer.classList.add("sp-open"); root.querySelector(".sp-drawer-tab[data-tab='style']")?.click();
      } else if (k === "d") {
        activeToolMode = "delete"; syncDockUI("delete"); showToast("Delete Mode");
      } else if (e.key === "[" && selectedEl) {
        e.preventDefault();
        stepLayerDeeper();
      } else if (e.key === "]" && selectedEl) {
        e.preventDefault();
        stepLayerForward();
      }
    }
  });

  /* ══════════════════════════════════════════════════════════
     Activation / Deactivation
     ══════════════════════════════════════════════════════════ */
  function turnOnStylePeek(mode = "inspect") {
    isEnabled = true;
    root.style.display = "block";
    const mappedMode = (mode === "color" || mode === "layers" || mode === "code") ? "inspect" : mode;
    activeToolMode = mappedMode;
    syncDockUI(mappedMode);
    document.body.classList.toggle("sp-mode-move", mappedMode === "move");
    if (mappedMode === "style") {
      drawer.classList.add("sp-open");
      const tabBtn = root.querySelector(".sp-drawer-tab[data-tab='style']");
      if (tabBtn) tabBtn.click();
    } else {
      drawer.classList.remove("sp-open");
    }
    showToast(`Live Studio Active (${mappedMode.toUpperCase()})`);
  }

  function turnOffStylePeek() {
    isEnabled = false;
    activeToolMode = "inspect";
    document.body.classList.remove("sp-mode-move");
    clearPassthroughFrontNodes();
    isDeepLayerMode = false;
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";
    selectBox.style.display = "none";
    selectBox.classList.remove("sp-deep-mode");
    if (drawer) drawer.classList.remove("sp-open");
    if (previewPanel) previewPanel.classList.remove("sp-show");
    selectedEl = null;
    isTargetLocked = false;
    unlockPending = false;
    closeAllPopups();

    document.querySelectorAll(".sp-layer-isolated").forEach(n => {
      n.classList.remove("sp-layer-isolated");
      n.style.visibility = "";
    });
    isolatedLayerNode = null;

    root.style.display = "none";
    showToast("Live Studio closed");
  }

  /* ══════════════════════════════════════════════════════════
     Website TechStack Detector Engine
     (from ngpdngfmjfnkdjlgdallobombenfdckg)
     ══════════════════════════════════════════════════════════ */
  function detectPageJsGlobals(techCatalog) {
    try {
      const results = {};
      const allGlobals = [];
      for (const [, catData] of Object.entries(techCatalog || {})) {
        for (const tech of catData.technologies || []) {
          if (tech.patterns && tech.patterns.js) {
            const jsVars = Array.isArray(tech.patterns.js) ? tech.patterns.js : [tech.patterns.js];
            for (const g of jsVars) {
              allGlobals.push({ tech: tech.name, prop: g });
            }
          }
        }
      }
      const script = document.createElement("script");
      const eventId = "__sp_ts_detect_" + Math.random().toString(36).slice(2);
      script.textContent = `
        (function() {
          const found = {};
          const checks = ${JSON.stringify(allGlobals)};
          for (const { tech, prop } of checks) {
            try {
              const parts = prop.split('.');
              let val = window;
              for (const p of parts) {
                val = val?.[p];
              }
              if (val !== undefined && val !== null && val !== false) {
                found[tech] = true;
              }
            } catch(e) {}
          }
          document.documentElement.setAttribute('${eventId}', JSON.stringify(found));
        })();
      `;
      document.documentElement.appendChild(script);
      script.remove();
      const raw = document.documentElement.getAttribute(eventId);
      document.documentElement.removeAttribute(eventId);
      if (raw) Object.assign(results, JSON.parse(raw));
      return results;
    } catch {
      return {};
    }
  }

  function detectTechnologiesOnPage(responseHeaders = {}) {
    const TECH_CATALOG =
      (typeof technologies !== "undefined" ? technologies : null) ||
      (typeof window !== "undefined" && window.technologies ? window.technologies : null);
    if (!TECH_CATALOG) {
      return { success: false, grouped: {}, technologies: [], count: 0 };
    }

    const jsGlobalHits = detectPageJsGlobals(TECH_CATALOG);
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[href]'));
    const metas = Array.from(document.querySelectorAll("meta"));
    const cookies = document.cookie || "";
    const detectedTechs = [];
    const grouped = {};

    function checkPatterns(tech) {
      if (!tech || !tech.patterns) return false;
      const checks = [];

      if (tech.patterns.js) {
        const jsVars = Array.isArray(tech.patterns.js) ? tech.patterns.js : [tech.patterns.js];
        checks.push(
          Boolean(jsGlobalHits[tech.name]) ||
            jsVars.some(varName => typeof window[varName] !== "undefined")
        );
      }

      if (tech.patterns.dom) {
        try {
          checks.push(document.querySelector(tech.patterns.dom) !== null);
        } catch {
          checks.push(false);
        }
      }

      if (tech.patterns.script) {
        checks.push(scripts.some(script => tech.patterns.script.test(script.src)));
      }

      if (tech.patterns.css) {
        checks.push(links.some(link => tech.patterns.css.test(link.href)));
      }

      if (tech.patterns.meta) {
        checks.push(
          metas.some(meta => {
            const nameMatch =
              !tech.patterns.meta.name ||
              meta.getAttribute("name") === tech.patterns.meta.name ||
              meta.getAttribute("property") === tech.patterns.meta.name;
            const contentMatch =
              !tech.patterns.meta.content ||
              (meta.getAttribute("content") &&
                tech.patterns.meta.content.test(meta.getAttribute("content")));
            return nameMatch && contentMatch;
          })
        );
      }

      if (tech.patterns.cookie) {
        checks.push(cookies.includes(tech.patterns.cookie));
      }

      return checks.some(c => c === true);
    }

    for (const [categoryKey, categoryData] of Object.entries(TECH_CATALOG)) {
      const catLabel = `${categoryData.icon || "🔧"} ${categoryData.name || categoryKey}`;
      for (const tech of categoryData.technologies || []) {
        if (checkPatterns(tech)) {
          const item = {
            name: tech.name,
            icon: tech.icon || categoryData.icon || "⚡",
            category: categoryKey,
            categoryName: catLabel,
            color: "#38bdf8",
            description: categoryData.name || categoryKey
          };
          detectedTechs.push(item);
          if (!grouped[catLabel]) grouped[catLabel] = [];
          grouped[catLabel].push(item);
        }
      }
    }

    // Also inspect HTTP response headers if provided (Cloudflare, Vercel, Netlify, Nginx, Next.js)
    const headerRules = [
      { header: "cf-ray", name: "Cloudflare", icon: "☁️", cat: "☁️ Hosting & CDN" },
      { header: "x-vercel-id", name: "Vercel", icon: "▲", cat: "☁️ Hosting & CDN" },
      { header: "x-nf-request-id", name: "Netlify", icon: "🌐", cat: "☁️ Hosting & CDN" },
      { header: "x-powered-by", regex: /next\.js/i, name: "Next.js", icon: "▲", cat: "⚛️ Frontend Frameworks & Libraries" },
      { header: "x-powered-by", regex: /express/i, name: "Express.js", icon: "🚂", cat: "🔧 Other Tools & Libraries" },
      { header: "server", regex: /cloudflare/i, name: "Cloudflare", icon: "☁️", cat: "☁️ Hosting & CDN" },
      { header: "server", regex: /nginx/i, name: "Nginx", icon: "🟩", cat: "☁️ Hosting & CDN" }
    ];
    for (const hr of headerRules) {
      const val = responseHeaders && responseHeaders[hr.header];
      if (val && (!hr.regex || hr.regex.test(val))) {
        if (!detectedTechs.some(t => t.name === hr.name)) {
          const item = {
            name: hr.name,
            icon: hr.icon,
            category: "hosting",
            categoryName: hr.cat,
            color: "#38bdf8",
            description: `Detected via HTTP header (${hr.header})`
          };
          detectedTechs.push(item);
          if (!grouped[hr.cat]) grouped[hr.cat] = [];
          grouped[hr.cat].push(item);
        }
      }
    }

    return {
      success: true,
      grouped,
      technologies: detectedTechs,
      count: detectedTechs.length,
      url: window.location.href,
      hostname: window.location.hostname || "local-file"
    };
  }

  /* ══════════════════════════════════════════════════════════
     Ad-Safe Tree Button-Clicking State Crawler + Undo Engine
     ══════════════════════════════════════════════════════════ */
  const AD_SELECTOR_PATTERNS = [
    "ins.adsbygoogle",
    "[id^='google_ads']",
    "iframe#google_esf",
    "[data-ad-client]",
    "[data-ad-slot]",
    "[data-ad-format]",
    "[data-google-query-id]",
    "[id*='adsense' i]",
    "[class*='adsense' i]",
    "[id*='ad-slot' i]",
    "[class*='ad-slot' i]",
    "[class*='ad-banner' i]",
    "[class*='ad-container' i]",
    "[data-ad]",
    "amp-ad"
  ].join(", ");

  const AD_URL_REGEX = /(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google|google\.com\/aclk|google\.com\/url\?|gclid=|utm_medium=cpc|taboola\.com|outbrain\.com|criteo\.com|amazon-adsystem\.com|adnxs\.com)/i;

  function isAdOrRedirectElement(el) {
    if (!el || el.nodeType !== 1) return true;
    try {
      if (el.matches(AD_SELECTOR_PATTERNS) || (el.closest && el.closest(AD_SELECTOR_PATTERNS))) {
        return true;
      }
    } catch {}
    const checkAttrs = ["href", "src", "data-url", "data-href", "onclick", "action"];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      for (const attr of checkAttrs) {
        const val = cur.getAttribute(attr) || "";
        if (val && AD_URL_REGEX.test(val)) return true;
      }
      const idCls = `${cur.id || ""} ${typeof cur.className === "string" ? cur.className : ""}`;
      if (/\b(adsbygoogle|adsense|google_ads|doubleclick|sponsored-ad|ad-unit|taboola|outbrain)\b/i.test(idCls)) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }

  async function exploreAndRecordAllBranchStates() {
    let cancelRequested = false;
    let pill = document.createElement("div");
    pill.setAttribute("data-h2d-ignore", "true");
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
    `;
    pill.innerHTML = `
      <span style="display:inline-block;">⚡</span>
      <span id="sp-bfs-msg">Scanning home screen & tree-crawling buttons (Ads skipped)...</span>
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

    const onNavIntercept = e => {
      const link = e.target.closest ? e.target.closest("a, form") : null;
      if (link) {
        if (link.tagName === "FORM") {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const href = link.getAttribute("href") || "";
        if (!href.startsWith("#") && !href.startsWith("javascript:")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener("click", onNavIntercept, true);
    window.addEventListener("submit", onNavIntercept, true);

    const prevBeforeUnload = window.onbeforeunload;
    const prevWindowOpen = window.open;
    window.onbeforeunload = e => { e.preventDefault(); return ""; };
    try { window.open = () => null; } catch {}

    let bidCounter = 1;
    let cidCounter = 1;
    const visitedBids = new Set();
    const branchStates = [];
    const maxClicks = 50;
    let totalClicks = 0;

    function isCandidateTrigger(el) {
      if (!el || el.nodeType !== 1) return false;
      if (isOwn(el) || (el.closest && el.closest("#sp-root, #__figma_h2d_chrome_extension_toolbar__, vis-bug"))) return false;
      if (el === pill || pill.contains(el)) return false;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
      if (isAdOrRedirectElement(el)) return false;

      const txt = (el.textContent || el.value || el.getAttribute("title") || el.getAttribute("aria-label") || "").trim().toLowerCase();
      if (/^(log\s*out|sign\s*out|delete|remove|clear\s*data|cancel|destroy|buy\s*now|checkout|pay\b|subscribe|sponsor|advertisement|ad\b)/i.test(txt)) {
        return false;
      }

      if (el.tagName === "A") {
        const href = (el.getAttribute("href") || "").trim();
        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
          return false;
        }
      }

      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      if (["button", "summary"].includes(tag)) return true;
      if (["button", "tab", "switch", "menuitem"].includes(role)) return true;
      if (el.hasAttribute("data-toggle") || el.hasAttribute("data-bs-toggle") || el.hasAttribute("aria-expanded") || el.hasAttribute("aria-controls")) return true;
      if (el.classList && (el.classList.contains("tab") || el.classList.contains("nav-link") || el.classList.contains("accordion-button"))) return true;

      try {
        const cs = window.getComputedStyle(el);
        if (cs.cursor === "pointer" && el.offsetWidth >= 14 && el.offsetHeight >= 14) {
          if (el.offsetWidth < window.innerWidth * 0.9 && el.offsetHeight < window.innerHeight * 0.5) {
            return true;
          }
        }
      } catch {}
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
      } catch {}
      const opts = { bubbles: true, cancelable: true, view: window };
      el.dispatchEvent(new PointerEvent("pointerdown", opts));
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new PointerEvent("pointerup", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      try { el.click(); } catch {}
    }

    function getTriggerLabel(el) {
      let l = (el.textContent || el.getAttribute("title") || el.getAttribute("aria-label") || el.value || "").trim().replace(/\s+/g, " ");
      if (l.length > 28) l = l.slice(0, 26) + "…";
      return l || el.tagName.toLowerCase();
    }

    async function clickCaptureAndUndo(item, depthLabel) {
      const lbl = getTriggerLabel(item.el);
      if (pill) {
        const msgEl = pill.querySelector("#sp-bfs-msg");
        if (msgEl) msgEl.textContent = `${depthLabel}: Pressing "${lbl}" & capturing panel state...`;
      }

      const capturedMutations = [];
      const undoRecords = [];
      const preHtmlMap = new Map();

      const observer = new MutationObserver(records => {
        for (const rec of records) {
          const tgt = rec.target;
          if (!tgt || tgt.nodeType !== 1 || isOwn(tgt) || tgt === pill || pill.contains(tgt)) continue;
          if (isAdOrRedirectElement(tgt)) continue;
          const cid = ensureCid(tgt);
          if (rec.type === "attributes") {
            const attrName = rec.attributeName;
            if (!attrName || attrName.startsWith("data-sp-")) continue;
            capturedMutations.push({
              cid,
              type: "attr",
              attr: attrName,
              val: tgt.getAttribute(attrName),
              className: typeof tgt.className === "string" ? tgt.className : undefined
            });
            undoRecords.push({
              node: tgt,
              type: "attr",
              attr: attrName,
              oldValue: rec.oldValue
            });
          } else if (rec.type === "childList") {
            if (!preHtmlMap.has(tgt)) {
              preHtmlMap.set(tgt, tgt.innerHTML);
            }
            capturedMutations.push({
              cid,
              type: "child",
              innerHTML: tgt.innerHTML
            });
            undoRecords.push({
              node: tgt,
              type: "childList",
              addedNodes: Array.from(rec.addedNodes),
              removedNodes: Array.from(rec.removedNodes),
              nextSibling: rec.nextSibling
            });
          }
        }
      });

      observer.observe(document.body, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ["class", "style", "aria-expanded", "aria-selected", "aria-hidden", "hidden", "open", "data-state"],
        childList: true,
        subtree: true
      });

      const currentTarget = document.querySelector(`[data-sp-bid="${item.bid}"]`) || item.el;
      dispatchRealisticClick(currentTarget);
      totalClicks++;
      await new Promise(r => setTimeout(r, 140));
      observer.disconnect();

      // Discover newly revealed child triggers inside this opened state before undoing
      const childItems = [];
      if (item.depth < 3) {
        const visibleNow = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!isCandidateTrigger(el)) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        for (const childEl of visibleNow) {
          const childBid = ensureBid(childEl);
          if (!visitedBids.has(childBid)) {
            childItems.push({
              el: childEl,
              bid: childBid,
              path: [...item.path, childBid],
              parentPath: item.path,
              depth: item.depth + 1
            });
          }
        }
      }

      if (capturedMutations.length > 0) {
        branchStates.push({
          bid: item.bid,
          path: item.path,
          label: lbl,
          depth: item.depth,
          mutations: capturedMutations,
          childBids: childItems.map(c => c.bid)
        });
      }

      // UNDO / REVERT back to the main screen state!
      for (let u = undoRecords.length - 1; u >= 0; u--) {
        const rec = undoRecords[u];
        try {
          if (rec.type === "attr") {
            if (rec.oldValue === null) {
              rec.node.removeAttribute(rec.attr);
            } else {
              rec.node.setAttribute(rec.attr, rec.oldValue);
            }
          } else if (rec.type === "childList") {
            rec.addedNodes.forEach(n => {
              if (n.parentNode === rec.node) rec.node.removeChild(n);
            });
            rec.removedNodes.forEach(n => {
              rec.node.insertBefore(n, rec.nextSibling || null);
            });
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 40));

      return childItems;
    }

    try {
      const allInitialTriggers = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!isCandidateTrigger(el)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const level1Queue = allInitialTriggers.map(el => {
        const bid = ensureBid(el);
        return { el, bid, path: [bid], depth: 1 };
      });
      const level2Queue = [];
      const level3Queue = [];

      // Level 1: Home screen buttons
      for (let i = 0; i < level1Queue.length; i++) {
        if (cancelRequested || totalClicks >= maxClicks) break;
        const item = level1Queue[i];
        if (visitedBids.has(item.bid)) continue;
        visitedBids.add(item.bid);
        const discovered = await clickCaptureAndUndo(item, `Level 1 (${i + 1}/${level1Queue.length})`);
        for (const d of discovered) {
          if (!level2Queue.some(q => q.bid === d.bid)) level2Queue.push(d);
        }
      }

      // Level 2: Sub-branch buttons inside panels/drawers/popups
      for (let i = 0; i < level2Queue.length; i++) {
        if (cancelRequested || totalClicks >= maxClicks) break;
        const item = level2Queue[i];
        if (visitedBids.has(item.bid)) continue;
        visitedBids.add(item.bid);

        // Replay parent path to reach Level 2 trigger, then click & undo all back to main screen
        for (const ancBid of item.parentPath || []) {
          const ancEl = document.querySelector(`[data-sp-bid="${ancBid}"]`);
          if (ancEl) {
            dispatchRealisticClick(ancEl);
            await new Promise(r => setTimeout(r, 70));
          }
        }
        const discovered = await clickCaptureAndUndo(item, `Level 2 (${i + 1}/${level2Queue.length})`);
        for (const d of discovered) {
          if (!level3Queue.some(q => q.bid === d.bid)) level3Queue.push(d);
        }
      }

      // Restore initial home screen state if any Level 1 tab was toggled
      if (level1Queue.length > 0) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    } catch (err) {
      console.warn("[StylePeek] Tree State Crawl warning:", err);
    } finally {
      window.removeEventListener("keydown", onKeyEsc, true);
      window.removeEventListener("click", onNavIntercept, true);
      window.removeEventListener("submit", onNavIntercept, true);
      window.onbeforeunload = prevBeforeUnload;
      try { window.open = prevWindowOpen; } catch {}
      if (pill) {
        try { pill.remove(); } catch {}
      }
    }

    return branchStates;
  }

  /* ── Chrome Extension Messaging ── */
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _, res) => {
      if (!msg || typeof msg !== "object") return false;
      if (msg.action === "turnOn") {
        turnOnStylePeek(msg.mode || "inspect");
        res({ active: isEnabled, mode: activeToolMode });
      } else if (msg.action === "turnOff" || msg.action === "disableAllModes") {
        if (isEnabled) turnOffStylePeek();
        res({ active: isEnabled });
      } else if (msg.action === "toggleInspect") {
        if (isEnabled && activeToolMode === "inspect") {
          turnOffStylePeek();
        } else {
          turnOnStylePeek("inspect");
        }
        res({ active: isEnabled, mode: activeToolMode });
      } else if (msg.action === "toggleDrag") {
        if (isEnabled && activeToolMode === "move") {
          turnOffStylePeek();
        } else {
          turnOnStylePeek("move");
        }
        res({ active: isEnabled, mode: activeToolMode });
      } else if (msg.action === "startTool") {
        turnOnStylePeek(msg.mode);
        res({ active: isEnabled, mode: activeToolMode });
      } else if (msg.action === "getStatus") {
        res({ active: isEnabled, mode: activeToolMode, hasSelection: !!selectedEl });
      } else if (msg.action === "captureViewport") {
        captureVisibleViewport();
        res({ success: true });
      } else if (msg.action === "detectTechStack" || msg.type === "DETECT_TECH") {
        const result = detectTechnologiesOnPage(msg.headers || {});
        res(result);
      } else if (msg.action === "crawlTreeStates") {
        exploreAndRecordAllBranchStates().then(states => {
          res({ ok: true, states });
        }).catch(err => {
          res({ ok: false, states: [], error: err?.message || String(err) });
        });
        return true;
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
      activeToolMode = "add";
      syncDockUI("add");
      closeAllPopups();
      showToast("Click blank space to add text, or drag an image to drop");
    } else if (e.data.type === "STYLEPEEK_SELECT") {
      if (!isEnabled) turnOnStylePeek("inspect");
      const target = e.data.selector ? document.querySelector(e.data.selector) : null;
      if (target) selectElement(target);
    }
  });

  /* ══════════════════════════════════════════════════════════
     Full-Page Site Auto-Scroll Capture & Download (Clean, No Extension Artifacts)
     ══════════════════════════════════════════════════════════ */
  async function captureVisibleViewport() {
    showToast("📸 Capturing rendered slide / viewport cleanly...");

    try {
      const origScrollX = window.scrollX || window.pageXOffset || 0;
      const origScrollY = window.scrollY || window.pageYOffset || 0;

      // 1. Gently load images (auto-scroll only if tall multi-screen page)
      try {
        const scrollHeight = Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0,
          window.innerHeight
        );
        if (scrollHeight > window.innerHeight + 120) {
          const step = Math.max(350, Math.floor(window.innerHeight * 0.8));
          for (let pos = 0; pos < scrollHeight; pos += step) {
            window.scrollTo(0, pos);
            await new Promise(r => setTimeout(r, 40));
          }
          window.scrollTo(0, scrollHeight);
          await new Promise(r => setTimeout(r, 100));
          window.scrollTo(origScrollX, origScrollY);
          await new Promise(r => setTimeout(r, 60));
        }
      } catch (e) {}

      // 1b. Run Ad-Safe Tree Button-Clicking State Crawler & Undo back to main screen
      const recordedBranches = await exploreAndRecordAllBranchStates();

      // 2. Hide any active extension toasts & popovers before cloning
      if (toast) toast.classList.remove("sp-show");
      if (selectBox) selectBox.style.display = "none";
      if (hoverBox) hoverBox.style.display = "none";
      if (hoverLbl) hoverLbl.style.display = "none";

      // 3. Detach StylePeek root completely from live DOM
      if (root.parentNode) root.remove();
      const docClone = document.documentElement.cloneNode(true);

      // Reattach root cleanly to live document
      document.documentElement.appendChild(root);
      if (isEnabled && selectedEl) updateSelectBox(selectedEl);

      // Clean temporary live attributes from active page
      document.querySelectorAll("[data-sp-bid]").forEach(el => el.removeAttribute("data-sp-bid"));
      document.querySelectorAll("[data-sp-cid]").forEach(el => el.removeAttribute("data-sp-cid"));

      // 4. Purge scripts, iframes, Google AdSense / ads, and StylePeek extension elements
      docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
      docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
      try {
        docClone.querySelectorAll(AD_SELECTOR_PATTERNS).forEach(ad => ad.remove());
      } catch {}
      docClone.querySelectorAll("#sp-root, [id^='sp-'], [class^='sp-'], [class*=' sp-'], .sp-popover, #sp-dock, #sp-sidebar-dock, #sp-drawer, #sp-inspect-preview-panel, #sp-error-modal, #sp-toast, #sp-select-box, #sp-hover-box, #sp-hover-label").forEach(e => e.remove());

      // 5. Clean residual attributes, preserving data-sp-bid and data-sp-cid for offline interactive playback
      const allClonedNodes = Array.from(docClone.querySelectorAll("*"));
      for (const node of allClonedNodes) {
        if (!node.parentNode) continue;

        // Strip temporary data attributes (except data-sp-bid & data-sp-cid)
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

      // 6. Inlining Images into Base64 / Absolute URLs
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
            } else if (srcAttr) {
              cImg.src = new URL(srcAttr, window.location.href).href;
            }
          } catch (err) {
            try { if (srcAttr) cImg.src = new URL(srcAttr, window.location.href).href; } catch(e){}
          }
        }
      }

      // 7. Inlining Stylesheets & Presets (Full Page)
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
        let inlined = false;
        try {
          if (link.sheet && link.sheet.cssRules) {
            const rulesText = Array.from(link.sheet.cssRules).map(r => r.cssText).join("\n");
            if (rulesText) {
              fullCSS += `\n/* Inlined from sheet ${href} */\n` + rulesText + "\n";
              inlined = true;
            }
          }
        } catch (e) {}

        if (!inlined) {
          try {
            const absUrl = new URL(href, window.location.href).href;
            const res = await fetch(absUrl);
            if (res.ok) {
              const text = await res.text();
              fullCSS += `\n/* Inlined from fetch ${href} */\n` + text + "\n";
            }
          } catch (e) {}
        }
      }

      const styleTags = Array.from(document.querySelectorAll("style"));
      for (const st of styleTags) {
        if (st.closest && st.closest("#sp-root")) continue;
        fullCSS += "\n" + (st.textContent || "") + "\n";
      }

      // 8. Configure Head
      let cloneHead = docClone.querySelector("head");
      if (!cloneHead) {
        cloneHead = document.createElement("head");
        docClone.insertBefore(cloneHead, cloneBody);
      }
      cloneHead.querySelectorAll("link[rel='stylesheet'], style").forEach(el => el.remove());

      // Only set base href if web origin is valid and not local file / null
      if (window.location.protocol.startsWith("http") && window.location.origin && window.location.origin !== "null") {
        let baseEl = cloneHead.querySelector("base");
        if (!baseEl) {
          baseEl = document.createElement("base");
          cloneHead.insertBefore(baseEl, cloneHead.firstChild);
        }
        baseEl.href = window.location.origin + "/";
      }

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

      // 8b. Inject Offline Interactive State Data and Engine if button states were recorded
      if (Array.isArray(recordedBranches) && recordedBranches.length > 0) {
        const stateDataScript = document.createElement("script");
        stateDataScript.id = "sp-state-data";
        stateDataScript.type = "application/json";
        stateDataScript.textContent = JSON.stringify(recordedBranches);
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
    document.addEventListener("click", function(e) {
      var trigger = e.target.closest ? e.target.closest("[data-sp-bid]") : null;
      if (!trigger) return;
      var bid = trigger.getAttribute("data-sp-bid");
      var state = stateMap[bid];
      if (!state) return;
      if (trigger.tagName === "A") {
        var href = trigger.getAttribute("href") || "";
        if (href.startsWith("#") || href.startsWith("javascript:")) e.preventDefault();
      }
      if (Array.isArray(state.mutations)) {
        state.mutations.forEach(function(m) {
          var target = document.querySelector('[data-sp-cid="' + m.cid + '"]');
          if (!target) return;
          if (m.className !== undefined) target.className = m.className;
          if (m.attr && m.val !== undefined) {
            if (m.val === null) target.removeAttribute(m.attr);
            else target.setAttribute(m.attr, m.val);
          }
          if (m.innerHTML !== undefined) target.innerHTML = m.innerHTML;
        });
      }
    }, true);
  } catch(e) {}
})();
`;
        cloneBody.appendChild(offlineRuntimeScript);
      }

      // 9. Download full page file cleanly (Local HTML + Web)
      const finalHtml = "<!DOCTYPE html>\n" + docClone.outerHTML;
      const rawTitle = (document.title || "website").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30) || "slide";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `slide-${rawTitle}-${timestamp}.html`;

      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);

      // Convert to Data URL using FileReader (Guaranteed to handle all UTF-8 characters and binary data)
      const dataUrl = await new Promise((resolve) => {
        try {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(blobUrl);
          reader.readAsDataURL(blob);
        } catch (e) {
          resolve(blobUrl);
        }
      });

      // Priority 1: Native chrome.downloads API via background service worker (Works 100% on file:/// and web)
      let downloaded = false;
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          downloaded = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "downloadFile",
              url: dataUrl,
              filename: filename
            }, response => {
              if (chrome.runtime.lastError || !response || (!response.ok && !response.success)) {
                resolve(false);
              } else {
                resolve(true);
              }
            });
            setTimeout(() => resolve(false), 1200);
          });
        }
      } catch (err) {
        console.warn("[StylePeek] Chrome download service worker not reached:", err);
      }

      // Priority 2: Direct Anchor Click with Data URL (Works on local files when blob: URLs are restricted)
      if (!downloaded) {
        try {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 1000);
          downloaded = true;
        } catch (err) {
          console.warn("[StylePeek] Data URL anchor click failed:", err);
        }
      }

      // Priority 3: Blob URL Anchor Click (Standard web fallback)
      if (!downloaded) {
        try {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { a.remove(); } catch (e) {}
            try { URL.revokeObjectURL(blobUrl); } catch (e) {}
          }, 1500);
          downloaded = true;
        } catch (err) {
          console.warn("[StylePeek] Blob anchor click failed:", err);
        }
      }

      if (downloaded) {
        showToast(`✓ Downloaded slide cleanly (${filename})!`);
      } else {
        showToast("⚠️ Could not trigger download. Check browser download permissions.");
      }
    } catch (err) {
      console.error("[StylePeek] captureVisibleViewport fatal error:", err);
      showToast("❌ Capture error: " + (err.message || "Failed to save"));
    }
  }
})();
