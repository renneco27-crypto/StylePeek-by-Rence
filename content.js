(function () {
  if (window.__stylePeekInjected) return;
  window.__stylePeekInjected = true;

  let inspecting = false, selectedEl = null, hoveredEl = null;
  let panes = {}, activeTab = "html", animatedAncestor = null;
  let panelPos = { top: "20px", right: "20px", left: null };
  let siblingsMode = false;
  let activeToolMode = "inspect"; // "inspect", "move", "palette", "typo", "delete"
  const undoStack = [];

  /* ── scaffold ── */
  const root = document.createElement("div");
  root.id = "sp-root";
  root.innerHTML = `

    <!-- Palette Popover -->
    <div id="sp-palette-popover" class="sp-popover">
      <div class="sp-pop-header">
        <span>🎨 Color Palette</span>
        <button class="sp-pop-close" id="sp-pal-close">✕</button>
      </div>
      <div class="sp-pop-row">
        <label>Text</label>
        <input type="color" class="sp-color-picker" id="sp-pal-text-picker" value="#ffffff">
        <input type="text" class="sp-pop-input" id="sp-pal-text-hex" style="width:75px" value="#ffffff">
      </div>
      <div class="sp-pop-row">
        <label>Background</label>
        <input type="color" class="sp-color-picker" id="sp-pal-bg-picker" value="#000000">
        <input type="text" class="sp-pop-input" id="sp-pal-bg-hex" style="width:75px" value="#000000">
      </div>
      <div class="sp-pop-row">
        <label>Border</label>
        <input type="color" class="sp-color-picker" id="sp-pal-border-picker" value="#3b82f6">
        <input type="text" class="sp-pop-input" id="sp-pal-border-hex" style="width:75px" value="#3b82f6">
      </div>
      <div class="sp-swatches">
        <div class="sp-swatch" style="background:#ffffff" data-col="#ffffff" title="White"></div>
        <div class="sp-swatch" style="background:#0f172a" data-col="#0f172a" title="Dark"></div>
        <div class="sp-swatch" style="background:#3b82f6" data-col="#3b82f6" title="Blue"></div>
        <div class="sp-swatch" style="background:#10b981" data-col="#10b981" title="Emerald"></div>
        <div class="sp-swatch" style="background:#f59e0b" data-col="#f59e0b" title="Amber"></div>
        <div class="sp-swatch" style="background:#ef4444" data-col="#ef4444" title="Rose"></div>
        <div class="sp-swatch" style="background:#8b5cf6" data-col="#8b5cf6" title="Purple"></div>
        <div class="sp-swatch" style="background:transparent;border:1px dashed #64748b" data-col="transparent" title="Transparent"></div>
      </div>
    </div>

    <!-- Typography Popover -->
    <div id="sp-typo-popover" class="sp-popover">
      <div class="sp-pop-header">
        <span>🔤 Typography</span>
        <button class="sp-pop-close" id="sp-typo-close">✕</button>
      </div>
      <div class="sp-pop-row">
        <label>Size</label>
        <input type="range" id="sp-typo-size-slider" min="10" max="72" value="16" style="flex:1">
        <span id="sp-typo-size-val" style="width:36px;text-align:right;font-size:11px">16px</span>
      </div>
      <div class="sp-pop-row">
        <label>Weight</label>
        <select class="sp-pop-input" id="sp-typo-weight" style="flex:1">
          <option value="300">Light (300)</option>
          <option value="400">Regular (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semibold (600)</option>
          <option value="700">Bold (700)</option>
          <option value="800">Extrabold (800)</option>
        </select>
      </div>
      <div class="sp-pop-row">
        <label>Family</label>
        <select class="sp-pop-input" id="sp-typo-family" style="flex:1">
          <option value="inherit">Inherit</option>
          <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">System Sans</option>
          <option value="'Inter', sans-serif">Inter</option>
          <option value="'Roboto', sans-serif">Roboto</option>
          <option value="Georgia, serif">Georgia / Serif</option>
          <option value="'SFMono-Regular', Menlo, Monaco, monospace">Monospace</option>
        </select>
      </div>
      <div class="sp-pop-row">
        <label>Align</label>
        <div style="display:flex;gap:4px">
          <button class="sp-pop-input" id="sp-align-left" style="cursor:pointer" title="Left">⬅</button>
          <button class="sp-pop-input" id="sp-align-center" style="cursor:pointer" title="Center">⬌</button>
          <button class="sp-pop-input" id="sp-align-right" style="cursor:pointer" title="Right">➡</button>
        </div>
      </div>
    </div>

    <div id="sp-hover-box"></div>
    <div id="sp-hover-label"></div>
    <div id="sp-select-box"></div>
    <div id="sp-toast"><span class="sp-dot"></span>Click any element — Esc to cancel</div>
    <div id="sp-panel">
      <div id="sp-header">
        <span id="sp-el-tag"></span>
        <span id="sp-el-name"></span>
        <div id="sp-header-btns">
          <button id="sp-codepen-btn">CodePen ↗</button>
          <button id="sp-close-btn">✕</button>
        </div>
      </div>
      <div id="sp-tabs">
        <button class="sp-tab sp-active" data-tab="html">HTML</button>
        <button class="sp-tab" data-tab="css">CSS</button>
        <button class="sp-tab" data-tab="js">JS</button>
        <button class="sp-tab" data-tab="anim">Animate</button>
      </div>
      <div id="sp-ancestor-bar">
        <span id="sp-ancestor-msg"></span>
        <button id="sp-ancestor-btn">Go to parent ↑</button>
      </div>
      <div id="sp-pane">
        <div id="sp-copy-bar">
          <div style="display:flex;align-items:center">
            <span id="sp-copy-label"></span>
            <span id="sp-live-badge" class="sp-live-indicator" style="display:none"><span class="sp-live-dot"></span>Live</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button id="sp-apply-btn">Apply (Ctrl+Enter)</button>
            <button id="sp-copy-btn">Copy</button>
          </div>
        </div>
        <textarea id="sp-code-editor" spellcheck="false"></textarea>
        <pre id="sp-code"></pre>
      </div>
      <div id="sp-footer">
        <button id="sp-siblings-btn" title="Include parent + all sibling elements in CodePen export">⊞ With siblings</button>
        <button id="sp-pick-btn">Pick another</button>
      </div>
    </div>`;
  document.documentElement.appendChild(root);

  const hoverBox    = root.querySelector("#sp-hover-box");
  const hoverLbl    = root.querySelector("#sp-hover-label");
  const selectBox   = root.querySelector("#sp-select-box");
  const toast       = root.querySelector("#sp-toast");
  const panel       = root.querySelector("#sp-panel");
  const elTag       = root.querySelector("#sp-el-tag");
  const elName      = root.querySelector("#sp-el-name");
  const codeEl      = root.querySelector("#sp-code");
  const codeEditor  = root.querySelector("#sp-code-editor");
  const applyBtn    = root.querySelector("#sp-apply-btn");
  const liveBadge   = root.querySelector("#sp-live-badge");
  const copyBtn     = root.querySelector("#sp-copy-btn");
  const copyLabel   = root.querySelector("#sp-copy-label");
  const ancestorBar = root.querySelector("#sp-ancestor-bar");
  const ancestorMsg = root.querySelector("#sp-ancestor-msg");
  const ancestorBtn = root.querySelector("#sp-ancestor-btn");

  const palPopover   = root.querySelector("#sp-palette-popover");
  const typoPopover  = root.querySelector("#sp-typo-popover");

  function applyPanelPos() {
    if (panelPos.left !== null) {
      panel.style.left = panelPos.left;
      panel.style.right = "auto";
      panel.style.top = panelPos.top;
    } else {
      panel.style.left = "auto";
      panel.style.right = panelPos.right;
      panel.style.top = panelPos.top;
    }
  }

  /* ── tabs ── */
  root.querySelectorAll(".sp-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll(".sp-tab").forEach(b => b.classList.remove("sp-active"));
      btn.classList.add("sp-active");
      activeTab = btn.dataset.tab;
      showPane(activeTab);
    });
  });

  function showPane(tab) {
    copyLabel.textContent = tab.toUpperCase();
    copyBtn.textContent = "Copy";
    copyBtn.classList.remove("sp-copied");

    if (tab === "html" || tab === "css") {
      codeEl.style.display = "none";
      codeEditor.style.display = "block";
      codeEditor.value = panes[tab] || "";
      applyBtn.style.display = "inline-flex";
      liveBadge.style.display = "inline-flex";
    } else {
      codeEditor.style.display = "none";
      codeEl.style.display = "block";
      codeEl.textContent = panes[tab] || "";
      applyBtn.style.display = "none";
      liveBadge.style.display = "none";
    }
  }

  function applyLiveChanges() {
    if (!selectedEl) return;
    if (activeTab === "html") {
      const newHtml = codeEditor.value.trim();
      if (!newHtml) return;
      try {
        const wrap = document.createElement("div");
        wrap.innerHTML = newHtml;
        const newEl = wrap.firstElementChild;
        if (newEl && selectedEl.parentNode) {
          undoStack.push({ type: "html", oldEl: selectedEl, newEl: newEl, parent: selectedEl.parentNode });
          selectedEl.parentNode.replaceChild(newEl, selectedEl);
          selectedEl = newEl;
          panes.html = selectedEl.outerHTML;

          const r = selectedEl.getBoundingClientRect();
          selectBox.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
          elTag.textContent  = selectedEl.tagName.toLowerCase();
          elName.textContent = tag(selectedEl);

          applyBtn.textContent = "Applied ✓";
          applyBtn.classList.add("sp-applied");
          setTimeout(() => {
            applyBtn.textContent = "Apply (Ctrl+Enter)";
            applyBtn.classList.remove("sp-applied");
          }, 1200);
        }
      } catch (err) {
        console.error("StylePeek HTML parse error:", err);
      }
    } else if (activeTab === "css") {
      const newCSS = codeEditor.value;
      panes.css = newCSS;
      let styleEl = document.getElementById("sp-live-override");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "sp-live-override";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = newCSS;

      applyBtn.textContent = "Applied ✓";
      applyBtn.classList.add("sp-applied");
      setTimeout(() => {
        applyBtn.textContent = "Apply (Ctrl+Enter)";
        applyBtn.classList.remove("sp-applied");
      }, 1200);
    }
  }

  applyBtn.addEventListener("click", applyLiveChanges);

  codeEditor.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      applyLiveChanges();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const start = codeEditor.selectionStart;
      const end = codeEditor.selectionEnd;
      codeEditor.value = codeEditor.value.substring(0, start) + "  " + codeEditor.value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
    }
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(panes[activeTab] || "").then(() => {
      copyBtn.textContent = "Copied ✓";
      copyBtn.classList.add("sp-copied");
      setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("sp-copied"); }, 1200);
    });
  });

  root.querySelector("#sp-close-btn").addEventListener("click", () => {
    panel.classList.remove("sp-open");
    selectBox.style.display = "none";
    selectedEl = null;
  });
  root.querySelector("#sp-pick-btn").addEventListener("click", startInspecting);
  root.querySelector("#sp-codepen-btn").addEventListener("click", openCodePen);
  ancestorBtn.addEventListener("click", () => { if (animatedAncestor) lock(animatedAncestor); });

  const siblingsBtn = root.querySelector("#sp-siblings-btn");
  siblingsBtn.addEventListener("click", () => {
    siblingsMode = !siblingsMode;
    siblingsBtn.classList.toggle("sp-siblings-active", siblingsMode);
    siblingsBtn.textContent = siblingsMode ? "⊞ With siblings ✓" : "⊞ With siblings";
    // Update the HTML pane preview to reflect the new export scope
    if (selectedEl) {
      if (siblingsMode && selectedEl.parentElement && !root.contains(selectedEl.parentElement)) {
        panes.html = selectedEl.parentElement.outerHTML;
      } else {
        panes.html = selectedEl.outerHTML;
      }
      if (activeTab === "html") showPane("html");
    }
  });

  /* ── drag ── */
  (function () {
    const hdr = root.querySelector("#sp-header");
    let drag = false, ox = 0, oy = 0;
    hdr.addEventListener("mousedown", e => {
      drag = true;
      const r = panel.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      e.preventDefault();
    });
    window.addEventListener("mousemove", e => {
      if (!drag) return;
      const left = Math.max(0, e.clientX - ox);
      const top  = Math.max(0, e.clientY - oy);
      panel.style.left = left + "px";
      panel.style.right = "auto";
      panel.style.top = top + "px";
      panelPos = { left: left + "px", top: top + "px", right: null };
    });
    window.addEventListener("mouseup", () => drag = false);
  })();

  /* ── messaging ── */
  chrome.runtime.onMessage.addListener((msg, _, res) => {
    if (msg.action === "toggleInspect") {
      inspecting ? setToolMode("none") : setToolMode("inspect");
      res({ inspecting: activeToolMode === "inspect", mode: activeToolMode });
    } else if (msg.action === "startTool") {
      setToolMode(msg.mode);
      res({ success: true, mode: activeToolMode });
    } else if (msg.action === "captureViewport") {
      captureVisibleViewport();
      res({ success: true });
    } else if (msg.action === "getStatus") {
      res({ inspecting: activeToolMode === "inspect", mode: activeToolMode, hasSelection: !!selectedEl });
    }
    return true;
  });

  function showToast(msg, duration = 2400) {
    toast.innerHTML = `<span class="sp-dot"></span>${msg}`;
    toast.classList.add("sp-show");
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove("sp-show"); }, duration);
  }

  /* ── Tool Popover Controls ── */
  root.querySelector("#sp-pal-close").addEventListener("click", () => palPopover.classList.remove("sp-pop-open"));
  root.querySelector("#sp-typo-close").addEventListener("click", () => typoPopover.classList.remove("sp-pop-open"));

  let currentToolTarget = null;

  function setToolMode(mode) {
    if (activeToolMode === mode && mode !== "none") {
      mode = "none";
    }
    activeToolMode = mode;
    palPopover.classList.remove("sp-pop-open");
    typoPopover.classList.remove("sp-pop-open");
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";

    if (mode === "inspect") {
      startInspecting();
      showToast("🔍 Inspect Mode: Hover & click to view/edit code (Esc to exit)");
    } else if (mode === "move") {
      stopInspecting();
      showToast("✋ Move Mode: Drag elements to reorder • Alt for free drag (Esc to exit)");
    } else if (mode === "palette") {
      stopInspecting();
      showToast("🎨 Palette Mode: Click any element to adjust colors (Esc to exit)");
    } else if (mode === "typo") {
      stopInspecting();
      showToast("🔤 Typography Mode: Click any element to adjust fonts (Esc to exit)");
    } else if (mode === "delete") {
      stopInspecting();
      showToast("✂️ Delete Mode: Click element to delete • Ctrl+Z undo (Esc to exit)");
    } else {
      stopInspecting();
      showToast("Normal Mode: Interact with buttons & page freely");
    }
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "#000000";
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return rgb.startsWith("#") ? rgb : "#000000";
    return "#" + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, "0")).join("");
  }

  function positionPopover(popover, targetEl) {
    const r = targetEl.getBoundingClientRect();
    let top = r.bottom + 8;
    let left = Math.max(10, Math.min(window.innerWidth - 270, r.left));
    if (top + 230 > window.innerHeight) {
      top = Math.max(10, r.top - 240);
    }
    popover.style.top = top + "px";
    popover.style.left = left + "px";
    popover.classList.add("sp-pop-open");
  }

  /* Palette Popover Binding */
  const palTextPicker = root.querySelector("#sp-pal-text-picker");
  const palTextHex    = root.querySelector("#sp-pal-text-hex");
  const palBgPicker   = root.querySelector("#sp-pal-bg-picker");
  const palBgHex      = root.querySelector("#sp-pal-bg-hex");
  const palBorderPicker = root.querySelector("#sp-pal-border-picker");
  const palBorderHex    = root.querySelector("#sp-pal-border-hex");

  function openPalette(el) {
    currentToolTarget = el;
    const cs = getComputedStyle(el);
    const hexColor = rgbToHex(cs.color);
    const hexBg    = rgbToHex(cs.backgroundColor);
    const hexBdr   = rgbToHex(cs.borderColor);

    palTextPicker.value = hexColor; palTextHex.value = hexColor;
    palBgPicker.value = hexBg; palBgHex.value = hexBg;
    palBorderPicker.value = hexBdr; palBorderHex.value = hexBdr;
    positionPopover(palPopover, el);
  }

  palTextPicker.addEventListener("input", e => {
    if (currentToolTarget) { currentToolTarget.style.color = e.target.value; palTextHex.value = e.target.value; }
  });
  palTextHex.addEventListener("change", e => {
    if (currentToolTarget) { currentToolTarget.style.color = e.target.value; palTextPicker.value = e.target.value; }
  });
  palBgPicker.addEventListener("input", e => {
    if (currentToolTarget) { currentToolTarget.style.backgroundColor = e.target.value; palBgHex.value = e.target.value; }
  });
  palBgHex.addEventListener("change", e => {
    if (currentToolTarget) { currentToolTarget.style.backgroundColor = e.target.value; palBgPicker.value = e.target.value; }
  });
  palBorderPicker.addEventListener("input", e => {
    if (currentToolTarget) {
      currentToolTarget.style.borderColor = e.target.value;
      if (getComputedStyle(currentToolTarget).borderStyle === "none") currentToolTarget.style.borderStyle = "solid";
      palBorderHex.value = e.target.value;
    }
  });
  palBorderHex.addEventListener("change", e => {
    if (currentToolTarget) {
      currentToolTarget.style.borderColor = e.target.value;
      if (getComputedStyle(currentToolTarget).borderStyle === "none") currentToolTarget.style.borderStyle = "solid";
      palBorderPicker.value = e.target.value;
    }
  });

  root.querySelectorAll(".sp-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      if (!currentToolTarget) return;
      const col = sw.dataset.col;
      currentToolTarget.style.backgroundColor = col;
      if (col !== "transparent") {
        palBgPicker.value = col;
        palBgHex.value = col;
      } else {
        palBgHex.value = "transparent";
      }
    });
  });

  /* Typography Popover Binding */
  const typoSizeSlider = root.querySelector("#sp-typo-size-slider");
  const typoSizeVal    = root.querySelector("#sp-typo-size-val");
  const typoWeight     = root.querySelector("#sp-typo-weight");
  const typoFamily     = root.querySelector("#sp-typo-family");

  function openTypo(el) {
    currentToolTarget = el;
    const cs = getComputedStyle(el);
    const sz = parseInt(cs.fontSize) || 16;
    typoSizeSlider.value = sz;
    typoSizeVal.textContent = sz + "px";
    typoWeight.value = cs.fontWeight || "400";
    positionPopover(typoPopover, el);
  }

  typoSizeSlider.addEventListener("input", e => {
    if (currentToolTarget) {
      currentToolTarget.style.fontSize = e.target.value + "px";
      typoSizeVal.textContent = e.target.value + "px";
    }
  });
  typoWeight.addEventListener("change", e => {
    if (currentToolTarget) currentToolTarget.style.fontWeight = e.target.value;
  });
  typoFamily.addEventListener("change", e => {
    if (currentToolTarget && e.target.value !== "inherit") currentToolTarget.style.fontFamily = e.target.value;
  });
  root.querySelector("#sp-align-left").addEventListener("click", () => {
    if (currentToolTarget) currentToolTarget.style.textAlign = "left";
  });
  root.querySelector("#sp-align-center").addEventListener("click", () => {
    if (currentToolTarget) currentToolTarget.style.textAlign = "center";
  });
  root.querySelector("#sp-align-right").addEventListener("click", () => {
    if (currentToolTarget) currentToolTarget.style.textAlign = "right";
  });

  /* Move Tool (Flow Reorder + Free Drag) */
  let isMoving = false, moveStart = { x: 0, y: 0 }, moveEl = null, moveParent = null, moveSibling = null;
  let originTransform = "";

  document.addEventListener("mousedown", e => {
    if (isOwn(e.target)) return;
    if (activeToolMode === "move") {
      moveEl = e.target;
      isMoving = true;
      moveStart = { x: e.clientX, y: e.clientY };
      moveParent = moveEl.parentNode;
      moveSibling = moveEl.nextSibling;
      originTransform = moveEl.style.transform || "";
      moveEl.classList.add("sp-dragging-active");
      e.preventDefault();
    }
  }, true);

  document.addEventListener("mousemove", e => {
    if (!isMoving || !moveEl) return;
    if (e.altKey) {
      // Free drag with Alt
      const dx = e.clientX - moveStart.x;
      const dy = e.clientY - moveStart.y;
      moveEl.style.position = "relative";
      moveEl.style.transform = `translate(${dx}px, ${dy}px)`;
    } else {
      // Flow Reorder among siblings
      const over = document.elementFromPoint(e.clientX, e.clientY);
      if (over && over !== moveEl && !isOwn(over) && over.parentNode === moveEl.parentNode) {
        const r = over.getBoundingClientRect();
        const midY = r.top + r.height / 2;
        if (e.clientY < midY) {
          over.parentNode.insertBefore(moveEl, over);
        } else {
          over.parentNode.insertBefore(moveEl, over.nextSibling);
        }
      }
    }
  }, true);

  document.addEventListener("mouseup", () => {
    if (isMoving && moveEl) {
      moveEl.classList.remove("sp-dragging-active");
      undoStack.push({
        type: "move",
        node: moveEl,
        parent: moveParent,
        sibling: moveSibling,
        transform: originTransform
      });
      isMoving = false;
      moveEl = null;
    }
  }, true);

  /* Unified Tool Click Handler */
  document.addEventListener("click", e => {
    if (isOwn(e.target)) return;
    if (activeToolMode === "palette") {
      e.preventDefault(); e.stopPropagation();
      openPalette(e.target);
    } else if (activeToolMode === "typo") {
      e.preventDefault(); e.stopPropagation();
      openTypo(e.target);
    } else if (activeToolMode === "delete") {
      e.preventDefault(); e.stopPropagation();
      const target = e.target;
      undoStack.push({
        type: "delete",
        node: target,
        parent: target.parentNode,
        next: target.nextSibling
      });
      target.remove();
      showToast("✂️ Element deleted. Press Ctrl+Z to undo.");
    }
  }, true);

  /* Undo & Keyboard Shortcuts */
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (palPopover.classList.contains("sp-pop-open") || typoPopover.classList.contains("sp-pop-open")) {
        palPopover.classList.remove("sp-pop-open");
        typoPopover.classList.remove("sp-pop-open");
      } else if (activeToolMode !== "none") {
        setToolMode("none");
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (undoStack.length > 0) {
        e.preventDefault();
        const action = undoStack.pop();
        if (action.type === "delete" && action.parent) {
          action.parent.insertBefore(action.node, action.next || null);
          showToast("Restored deleted element");
        } else if (action.type === "html" && action.parent) {
          action.parent.replaceChild(action.oldEl, action.newEl);
          selectedEl = action.oldEl;
          panes.html = selectedEl.outerHTML;
          showToast("Restored previous HTML");
        } else if (action.type === "move" && action.parent) {
          action.parent.insertBefore(action.node, action.sibling || null);
          action.node.style.transform = action.transform || "";
          showToast("Restored element position");
        }
      }
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      captureVisibleViewport();
    }
  });

  /* ── Visible Phone Viewport Extractor ── */
  async function captureVisibleViewport() {
    showToast("📸 Capturing rendered phone viewport...");
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. Mark elements on the live DOM to ensure 100% accurate node-by-node mapping
    const allBodyEls = Array.from(document.body.querySelectorAll("*"));
    for (const el of allBodyEls) {
      if (el.id === "sp-root" || (el.closest && el.closest("#sp-root"))) continue;

      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
        el.setAttribute("data-sp-prune", "true");
        continue;
      }

      // Check if offscreen (has dimension and is outside viewport)
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const isOutside = (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw);
        if (isOutside) {
          el.setAttribute("data-sp-offscreen", "true");
        }
      }
    }

    // 2. Safely detach StylePeek root so it CANNOT be in the clone
    root.remove();
    const docClone = document.documentElement.cloneNode(true);
    document.documentElement.appendChild(root);

    // 3. Remove temporary attributes from live DOM immediately
    for (const el of allBodyEls) {
      el.removeAttribute("data-sp-prune");
      el.removeAttribute("data-sp-offscreen");
    }

    // 4. In docClone, purge scripts, iframes, and any leftover StylePeek artifacts
    docClone.querySelectorAll("script, noscript").forEach(s => s.remove());
    docClone.querySelectorAll("iframe#google_esf, iframe").forEach(f => f.remove());
    docClone.querySelectorAll("#sp-root, [id^='sp-'], .sp-popover, #sp-dock").forEach(e => e.remove());

    // 5. Prune hidden and offscreen elements cleanly
    docClone.querySelectorAll("[data-sp-prune='true']").forEach(e => e.remove());
    const offscreenNodes = Array.from(docClone.querySelectorAll("[data-sp-offscreen='true']"));
    for (let i = offscreenNodes.length - 1; i >= 0; i--) {
      const node = offscreenNodes[i];
      if (!node.parentNode) continue;
      // If it contains on-screen children, keep the container so layout doesn't collapse
      const hasOnscreenChild = node.querySelector(":not([data-sp-offscreen='true'])");
      if (!hasOnscreenChild) {
        node.remove();
      } else {
        node.removeAttribute("data-sp-offscreen");
      }
    }
    docClone.querySelectorAll("[data-sp-offscreen]").forEach(e => e.removeAttribute("data-sp-offscreen"));

    // 6. Inlining Images into Base64 Data URLs
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

    // 7. Comprehensive Stylesheet Inlining (Tailwind, scoped CSS, fonts)
    let fullCSS = `
/* ── StylePeek Studio: Mobile Fluid Viewport Export (${vw}x${vh}) ── */
* { box-sizing: border-box; }
html {
  margin: 0 auto;
  max-width: 100%;
  min-height: 100vh;
}
body {
  margin: 0 auto;
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
}
`;

    // Fetch and inline all external <link rel="stylesheet"> files
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
      } catch (e) {
        console.warn("Could not inline CSS link:", href, e);
      }
    }

    // Inline all inline <style> blocks from the page
    const styleTags = Array.from(document.querySelectorAll("style"));
    for (const st of styleTags) {
      if (st.id === "sp-live-override") continue;
      if (st.closest && st.closest("#sp-root")) continue;
      fullCSS += "\n" + st.textContent + "\n";
    }

    // Include any live design override
    const liveStyle = document.getElementById("sp-live-override");
    if (liveStyle) {
      fullCSS += "\n/* ── Live Design Overrides ── */\n" + liveStyle.textContent + "\n";
    }

    // 8. Configure Head with Base tag and Inlined Styles
    let cloneHead = docClone.querySelector("head");
    if (!cloneHead) {
      cloneHead = document.createElement("head");
      docClone.insertBefore(cloneHead, cloneBody);
    }
    // Remove existing link stylesheets and style tags since they are now inlined
    cloneHead.querySelectorAll("link[rel='stylesheet'], style").forEach(el => el.remove());

    // Base tag so all relative font/image assets resolve
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

    // 9. Generate Final HTML and Download
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

  /* ── inspect ── */
  function startInspecting() {
    inspecting = true;
    document.documentElement.classList.add("sp-inspecting");
    toast.classList.add("sp-show");
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
  }
  function stopInspecting() {
    inspecting = false;
    document.documentElement.classList.remove("sp-inspecting");
    toast.classList.remove("sp-show");
    hoverBox.style.display = "none";
    hoverLbl.style.display = "none";
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
  }
  function isOwn(el) { return el === root || root.contains(el); }
  function onKey(e) { if (e.key === "Escape") stopInspecting(); }
  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwn(el)) return;
    hoveredEl = el;
    const r = el.getBoundingClientRect();
    hoverBox.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    hoverLbl.textContent = tag(el);
    let t = r.top - 22; if (t < 0) t = r.bottom + 4;
    hoverLbl.style.cssText = `display:block;top:${t}px;left:${Math.max(0, r.left)}px`;
  }
  function onClick(e) {
    if (isOwn(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    lock(hoveredEl || e.target);
    stopInspecting();
  }

  /* ── CSS mining ── */
  const PSEUDO_RE = /::?[\w-]+(\([^)]*\))?/g;

  // Mine rules that match a specific element (direct + pseudo-state on element itself)
  function mine(el) {
    const direct = [], pseudo = [], keyframes = {};
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      walkRules(rules, el, direct, pseudo, keyframes, "");
    }
    return { direct, pseudo, keyframes };
  }

  function walkRules(rules, el, direct, pseudo, keyframes, wrap) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) { keyframes[rule.name] = rule.cssText; continue; }
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
        const isPseudo = /:(?:hover|focus|active|visited|checked|disabled|focus-within|focus-visible)/i.test(part);
        let matches = false; try { matches = base && el.matches(base); } catch {}
        if (!matches) continue;
        const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
        (isPseudo ? pseudo : direct).push(text);
      }
    }
  }

  /**
   * mineAncestorHoverRules — collects rules whose selector is of the form
   * "ANCESTOR:hover .TARGET" (or :focus, :active, etc.) where ANCESTOR is
   * an actual ancestor of `el` in the DOM and .TARGET matches `el` or any
   * of its descendants.  These are the rules that drive "fan-out on hover"
   * animations and are invisible to the standard mine() call.
   */
  function mineAncestorHoverRules(el) {
    const results = [];
    // All selectors we care about: element itself + all descendants
    const subTree = [el, ...Array.from(el.querySelectorAll("*"))];
    // Build the ancestor chain (excluding document root and our own UI)
    const ancestors = [];
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      if (!root.contains(p)) ancestors.push(p);
      p = p.parentElement;
    }
    if (!ancestors.length) return results;

    const STATE_RE = /:(?:hover|focus|active|focus-within|focus-visible|checked|disabled)/i;

    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      collectAncestorHoverRules(rules, el, subTree, ancestors, results, "");
    }
    return results;
  }

  function collectAncestorHoverRules(rules, el, subTree, ancestors, results, wrap) {
    const STATE_RE = /:(?:hover|focus|active|focus-within|focus-visible|checked|disabled)/i;
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const w = rule.type === CSSRule.MEDIA_RULE
          ? `@media ${rule.conditionText || rule.media?.mediaText}`
          : `@supports ${rule.conditionText}`;
        collectAncestorHoverRules(rule.cssRules, el, subTree, ancestors, results, wrap ? `${wrap}\n${w}` : w);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      const selectorText = rule.selectorText || "";

      // We only care about selectors containing a state pseudo-class
      if (!STATE_RE.test(selectorText)) continue;

      for (const part of selectorText.split(",").map(s => s.trim())) {
        if (!STATE_RE.test(part)) continue;

        // Split on whitespace combinators to get [ancestorPart, ..., targetPart]
        // We handle: "ancestor:hover .target", "ancestor:hover > .target", etc.
        // Strategy: strip the state from the ancestor portion and check if an
        // ancestor matches, then check if the target portion matches any subtree el.
        const tokens = part.split(/\s+/);
        if (tokens.length < 2) continue;

        // The "trigger" token is the one with the state pseudo — usually not the last
        let triggerIdx = -1;
        for (let i = 0; i < tokens.length - 1; i++) {
          if (STATE_RE.test(tokens[i])) { triggerIdx = i; break; }
        }
        if (triggerIdx === -1) continue; // state is on the last/only token — already handled by mine()

        // Everything after the trigger token is the "target" selector
        const targetTokens = tokens.slice(triggerIdx + 1).filter(t => t !== ">" && t !== "~" && t !== "+");
        const targetSel = targetTokens.join(" ").replace(PSEUDO_RE, "").trim();
        if (!targetSel) continue;

        // The ancestor portion (without its state pseudo)
        const ancestorTokens = tokens.slice(0, triggerIdx + 1);
        const ancestorSel = ancestorTokens.join(" ").replace(STATE_RE, "").replace(PSEUDO_RE, "").trim();
        if (!ancestorSel) continue;

        // Does any ancestor of `el` match the ancestor selector?
        const ancestorMatches = ancestors.some(a => {
          try { return a.matches(ancestorSel); } catch { return false; }
        });
        if (!ancestorMatches) continue;

        // Does the target selector match `el` or any descendant?
        const targetMatches = subTree.some(t => {
          try { return t.matches(targetSel); } catch { return false; }
        });
        if (!targetMatches) continue;

        const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
        if (!results.includes(text)) results.push(text);
        break; // don't add the same rule for multiple comma parts
      }
    }
  }

  // Collect ALL rules needed to render this element + its descendants in CodePen
  // Walks every rule in every sheet and checks if it matches el or any child.
  // Also collects ancestor-driven hover/state rules (e.g. ".deck:hover .card { … }").
  // Falls back to computed styles snapshot when CSS Modules / runtime-injected styles
  // make stylesheet mining return nothing (common on React/Vue apps).
  function mineAllNeededRules(el) {
    const needed = new Set();
    const keyframes = {};

    // Collect all elements: the element itself + all descendants
    const allEls = [el, ...Array.from(el.querySelectorAll("*"))];

    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules || sheet.rules; } catch { continue; }
      if (!rules) continue;
      collectNeededRules(rules, allEls, needed, keyframes, "");
    }

    // Also pull in ancestor-driven hover/state rules so CodePen has the full animation
    const ancestorRules = mineAncestorHoverRules(el);
    ancestorRules.forEach(r => needed.add(r));

    const sheetCSS = [...needed].join("\n\n") + (Object.keys(keyframes).length ? "\n\n" + Object.values(keyframes).join("\n\n") : "");

    // ── CSS Modules / runtime-styles fallback ──
    // Detect if most classes on this subtree are hashed module names (e.g. "Button-module_root-xw+9D").
    // If so, stylesheet mining won't work; snapshot computed styles for every element instead.
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

  /**
   * buildComputedStyleCSS — snapshot getComputedStyle() for every element in the subtree.
   * Generates a clean class for each unique element and inline-ifies all computed properties.
   * Skips properties that are inherited defaults to keep the output readable.
   * Also attempts to capture :hover styles by temporarily forcing :hover via JS.
   */
  const SKIP_PROPS = new Set([
    "animation-delay","animation-duration","animation-fill-mode","animation-iteration-count",
    "animation-name","animation-play-state","animation-timing-function",
    "perspective-origin","transform-origin","border-image-outset","border-image-repeat",
    "border-image-slice","border-image-source","border-image-width",
    "column-count","column-fill","column-gap","column-rule-color","column-rule-style",
    "column-rule-width","column-span","column-width","content","counter-increment",
    "counter-reset","empty-cells","grid-auto-columns","grid-auto-flow","grid-auto-rows",
    "grid-column-end","grid-column-start","grid-row-end","grid-row-start",
    "grid-template-areas","grid-template-columns","grid-template-rows",
    "image-rendering","orphans","page-break-after","page-break-before",
    "page-break-inside","pointer-events","quotes","resize","speak","table-layout",
    "unicode-bidi","widows","word-spacing"
  ]);

  // Properties where we always emit the value regardless of what "inherit" gives
  const ALWAYS_EMIT = new Set([
    "display","position","top","right","bottom","left","z-index",
    "width","height","min-width","min-height","max-width","max-height",
    "margin","margin-top","margin-right","margin-bottom","margin-left",
    "padding","padding-top","padding-right","padding-bottom","padding-left",
    "background","background-color","background-image","background-size",
    "background-position","background-repeat","background-attachment",
    "border","border-radius","border-top","border-right","border-bottom","border-left",
    "border-color","border-width","border-style",
    "color","font-size","font-weight","font-family","font-style","line-height",
    "letter-spacing","text-align","text-decoration","text-transform","white-space",
    "flex","flex-direction","flex-wrap","flex-grow","flex-shrink","flex-basis",
    "align-items","align-content","align-self","justify-content","justify-self",
    "gap","row-gap","column-gap",
    "overflow","overflow-x","overflow-y","opacity","visibility",
    "cursor","box-shadow","text-shadow","outline","outline-offset",
    "transform","transition","animation","will-change","object-fit","object-position",
    "aspect-ratio","inset","grid","grid-area","clip-path","filter",
    "user-select","pointer-events"
  ]);

  function buildComputedStyleCSS(rootEl, allEls, existingKeyframes) {
    const lines = ["/* ── Computed styles snapshot (CSS Modules detected) ── */"];
    const elMap = new Map(); // element → generated class name
    let counter = 0;

    // Build a clean selector for each element: prefer id, fall back to generated .sp-el-N
    function getGenClass(el) {
      if (elMap.has(el)) return elMap.get(el);
      let sel;
      if (el === rootEl) {
        sel = el.id ? `#${el.id}` : `.sp-root`;
      } else {
        counter++;
        sel = `.sp-el-${counter}`;
      }
      elMap.set(el, sel);
      return sel;
    }

    // Emit a comment mapping original classes → generated selector so the user can match them up
    lines.push("/*");
    lines.push(" * Original class mapping:");
    allEls.forEach(el => {
      const origClasses = (el.className && typeof el.className === "string")
        ? el.className.trim() : "";
      if (origClasses) {
        const gen = getGenClass(el);
        lines.push(` *  ${gen}  ←  .${origClasses.split(/\s+/).join(".")}`);
      }
    });
    lines.push(" */\n");

    // Emit computed styles for each element
    allEls.forEach(el => {
      const sel = getGenClass(el);
      const cs = getComputedStyle(el);
      const props = [];

      for (const prop of Array.from(cs)) {
        if (SKIP_PROPS.has(prop)) continue;
        const val = cs.getPropertyValue(prop).trim();
        if (!val || val === "initial" || val === "unset") continue;
        if (!ALWAYS_EMIT.has(prop) && (val === "none" || val === "normal" || val === "auto" || val === "0px")) continue;
        props.push(`  ${prop}: ${val};`);
      }

      if (props.length) {
        lines.push(`${sel} {`);
        lines.push(...props);
        lines.push("}\n");
      }
    });

    // Also capture any transition/animation from computed styles for the root
    const rootCS = getComputedStyle(rootEl);
    const trans = rootCS.transition;
    const anim = rootCS.animationName;
    if (trans && trans !== "all 0s ease 0s") {
      lines.push(`/* transition on root: ${trans} */`);
    }
    if (anim && anim !== "none") {
      lines.push(`/* animation: ${anim} */`);
      // Try to grab matching keyframes from sheets
      for (const sheet of Array.from(document.styleSheets)) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule.type === CSSRule.KEYFRAMES_RULE && anim.split(",").map(s => s.trim()).includes(rule.name)) {
            lines.push(rule.cssText);
          }
        }
      }
    }

    // Rewrite the HTML so elements get the generated selectors instead of module classes
    // We'll emit a comment explaining how to use it
    lines.push("\n/* ── Usage: replace hashed classes in HTML with the sp-el-N classes above ── */");
    lines.push("/* ── Or use the HTML tab's inline styles for a quick copy ── */");

    return lines.join("\n");
  }

  function collectNeededRules(rules, allEls, needed, keyframes, wrap) {
    const STATE_RE = /:(?:hover|focus|active|focus-within|focus-visible|checked|disabled)/i;
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        keyframes[rule.name] = rule.cssText; continue;
      }
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        const w = rule.type === CSSRule.MEDIA_RULE
          ? `@media ${rule.conditionText || rule.media?.mediaText}`
          : `@supports ${rule.conditionText}`;
        collectNeededRules(rule.cssRules, allEls, needed, keyframes, wrap ? `${wrap}\n${w}` : w);
        continue;
      }
      if (rule.type !== CSSRule.STYLE_RULE) continue;

      const parts = (rule.selectorText || "").split(",").map(s => s.trim());
      for (const part of parts) {
        // Strip state pseudo-classes before matching so ".deck:hover .card" → ".deck .card"
        const base = part.replace(STATE_RE, "").replace(PSEUDO_RE, "").trim();
        if (!base) continue;
        // Check if any element in the subtree matches this selector
        const matched = allEls.some(el => { try { return el.matches(base); } catch { return false; } });
        if (matched) {
          const text = wrap ? `${wrap} {\n  ${rule.cssText}\n}` : rule.cssText;
          needed.add(text);
          break; // don't add the same rule multiple times for different comma parts
        }
      }
    }
  }

  function findAnimatedAncestor(el) {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      const hasAnim  = cs.animationName && cs.animationName !== "none";
      const hasTrans = cs.transitionDuration && cs.transitionDuration !== "0s"
        && cs.transitionProperty && cs.transitionProperty !== "none";
      const { direct, pseudo } = mine(p);
      const hasRules = direct.some(r => /transition|animation/.test(r)) || pseudo.length > 0;
      if (hasAnim || hasTrans || hasRules) return p;
      p = p.parentElement;
    }
    return null;
  }

  /* ── lock ── */
  function lock(el) {
    selectedEl = el;
    animatedAncestor = null;

    const r = el.getBoundingClientRect();
    selectBox.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    elTag.textContent  = el.tagName.toLowerCase();
    elName.textContent = tag(el);

    applyPanelPos();
    panel.classList.add("sp-open");

    const { direct, pseudo, keyframes } = mine(el);
    const cs = getComputedStyle(el);
    const animNames   = cs.animationName.split(",").map(s => s.trim()).filter(n => n && n !== "none");
    const hasTrans    = cs.transitionDuration !== "0s" && cs.transitionProperty !== "none";
    const hasRules    = direct.some(r => /transition|animation/.test(r)) || pseudo.length > 0;
    const hasAnything = animNames.length || hasTrans || hasRules;
    const cls = (el.className && typeof el.className === "string")
      ? el.className.trim().split(/\s+/).filter(Boolean) : [];

    /* ── HTML pane: just the element markup ── */
    panes.html = el.outerHTML;

    /* ── CSS pane: rules matching THIS element only (for reading) ── */
    const cssLines = [...direct, ...pseudo];
    animNames.forEach(n => { if (keyframes[n]) cssLines.push(keyframes[n]); });
    const twAnim = cls.filter(c =>
      /^(transition|animate|duration|ease|delay|hover:|focus:|active:|group-hover:)/.test(c));
    let cssOut = cssLines.join("\n\n");
    if (twAnim.length) {
      cssOut += (cssOut ? "\n\n" : "") +
        "/* Tailwind classes (reference only — not real CSS):\n" + twAnim.join("\n") + "\n*/";
    }
    panes.css = cssOut || `/* No CSS rules matched ${tag(el)} */`;

    /* ── JS pane: ONLY JS, no CSS mixed in ── */
    const handlers = Array.from(el.attributes).filter(a => a.name.startsWith("on")).map(a => `${a.name}="${a.value}"`);
    const sel = cls.length ? "." + cls[0] : el.tagName.toLowerCase();
    const jsLines = [];
    if (handlers.length) jsLines.push(`// Inline handlers\n${handlers.join("\n")}`);
    jsLines.push(`// Select this element\ndocument.querySelector('${sel}');`);
    jsLines.push(`// Click listener\ndocument.querySelector('${sel}').addEventListener('click', e => {\n  console.log(e.target);\n});`);
    jsLines.push(`// Framework: ${detectFW(el)}`);
    jsLines.push(`// addEventListener() calls are invisible to extensions.\n// Use DevTools → Elements → Event Listeners for the full list.`);
    panes.js = jsLines.join("\n\n");

    /* ── Animate pane ── */
    // Also collect hover/state rules driven by ancestor selectors (e.g. .deck:hover .card)
    const ancestorHoverRules = mineAncestorHoverRules(el);

    const animLines = [];
    if (hasTrans) animLines.push(`/* transition on element */\ntransition: ${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction} ${cs.transitionDelay};`);
    if (animNames.length) {
      const durs = cs.animationDuration.split(",").map(s => s.trim());
      const tims = cs.animationTimingFunction.split(",").map(s => s.trim());
      const dels = cs.animationDelay.split(",").map(s => s.trim());
      const its  = cs.animationIterationCount.split(",").map(s => s.trim());
      animNames.forEach((n, i) => {
        animLines.push(`animation: ${n} ${durs[i]||durs[0]} ${tims[i]||tims[0]} ${dels[i]||dels[0]} ${its[i]||its[0]};`);
        if (keyframes[n]) animLines.push(keyframes[n]);
      });
    }
    if (pseudo.length) {
      animLines.push("/* pseudo-state rules on element */");
      animLines.push(...pseudo);
    }
    if (ancestorHoverRules.length) {
      animLines.push("/* hover/state rules driven by ancestor (e.g. parent:hover .this) */");
      animLines.push(...ancestorHoverRules);
    }
    if (twAnim.length) animLines.push("/* Tailwind classes (reference only):\n" + twAnim.join("\n") + "\n*/");
    panes.anim = animLines.length ? animLines.join("\n\n") : `/* No animation or transition on ${tag(el)} */`;

    /* ── ancestor banner ── */
    // Show banner only if element itself has no animation/transition but ancestor-driven rules exist
    if (!hasAnything && ancestorHoverRules.length) {
      animatedAncestor = findAnimatedAncestor(el);
      if (animatedAncestor) {
        ancestorMsg.textContent = `Hover animation driven by parent: ${tag(animatedAncestor)} — captured in Animate tab ↓`;
        ancestorBar.style.display = "flex";
      } else {
        ancestorMsg.textContent = `Hover animation driven by ancestor — captured in Animate tab ↓`;
        ancestorBar.style.display = "flex";
      }
    } else if (!hasAnything && !ancestorHoverRules.length) {
      animatedAncestor = findAnimatedAncestor(el);
      if (animatedAncestor) {
        ancestorMsg.textContent = `Animation is on parent: ${tag(animatedAncestor)}`;
        ancestorBar.style.display = "flex";
      } else {
        ancestorBar.style.display = "none";
      }
    } else {
      ancestorBar.style.display = "none";
    }

    root.querySelectorAll(".sp-tab").forEach(b => b.classList.remove("sp-active"));
    root.querySelector('.sp-tab[data-tab="html"]').classList.add("sp-active");
    activeTab = "html";
    showPane("html");
  }

  /**
   * buildInlineStyleHTML — clone the element subtree and replace all class-based
   * styling with inline style attributes from getComputedStyle(). This produces
   * a fully self-contained HTML snapshot that renders correctly in CodePen even
   * when the original styles come from CSS Modules or runtime-injected stylesheets.
   *
   * Key properties we snapshot for visual fidelity:
   * layout, background, text, border, shadow, transform, flex/grid.
   * We skip inherited text props that would cascade naturally from body.
   */
  const INLINE_PROPS = [
    "display","position","top","right","bottom","left","z-index",
    "width","height","min-width","min-height","max-width","max-height",
    "margin","padding",
    "background","background-color","background-image","background-size",
    "background-position","background-repeat","background-clip",
    "border","border-radius","border-top","border-right","border-bottom","border-left",
    "border-color","border-width","border-style","border-collapse",
    "box-shadow","outline","outline-offset",
    "color","font-size","font-weight","font-family","font-style",
    "line-height","letter-spacing","text-align","text-decoration",
    "text-transform","white-space","word-break","overflow-wrap",
    "flex","flex-direction","flex-wrap","flex-grow","flex-shrink","flex-basis",
    "align-items","align-content","align-self","justify-content","justify-items","justify-self",
    "gap","row-gap","column-gap",
    "grid","grid-template-columns","grid-template-rows","grid-area",
    "overflow","overflow-x","overflow-y",
    "opacity","visibility","cursor",
    "transform","will-change","transition",
    "object-fit","object-position","aspect-ratio",
    "clip-path","filter","backdrop-filter",
    "vertical-align","list-style",
    "pointer-events","user-select","box-sizing"
  ];

  function buildInlineStyleHTML(rootEl) {
    // Clone the tree so we don't modify the real DOM
    const clone = rootEl.cloneNode(true);

    // Walk original and clone in parallel
    const origEls = [rootEl, ...Array.from(rootEl.querySelectorAll("*"))];
    const cloneEls = [clone, ...Array.from(clone.querySelectorAll("*"))];

    origEls.forEach((origEl, i) => {
      const cloneEl = cloneEls[i];
      if (!cloneEl) return;
      const cs = getComputedStyle(origEl);
      const inlineProps = [];

      for (const prop of INLINE_PROPS) {
        const val = cs.getPropertyValue(prop).trim();
        if (!val || val === "initial" || val === "unset") continue;
        inlineProps.push(`${prop}:${val}`);
      }

      if (inlineProps.length) {
        // Merge with any existing inline style
        const existing = cloneEl.getAttribute("style") || "";
        cloneEl.setAttribute("style", (existing ? existing + ";" : "") + inlineProps.join(";"));
      }

      // Remove hashed class attributes — they're meaningless without the module bundle
      // but keep semantic classes (no module pattern) for querySelector hooks
      const classes = Array.from(cloneEl.classList);
      const keepClasses = classes.filter(c => !/module_|module--|[A-Z].*-[a-zA-Z0-9]{5,8}$/.test(c));
      if (keepClasses.length !== classes.length) {
        if (keepClasses.length) {
          cloneEl.setAttribute("class", keepClasses.join(" "));
        } else {
          cloneEl.removeAttribute("class");
        }
      }
    });

    // Use a temp div to get the outer HTML of the clone
    const wrap = document.createElement("div");
    wrap.appendChild(clone);
    return `<!-- Inline-style snapshot by Style Peek (CSS Modules detected) -->\n` + wrap.innerHTML;
  }

  function openCodePen() {
    if (!selectedEl) return;

    // ── Determine export root: siblings mode uses the parent container ──
    const exportRoot = (siblingsMode && selectedEl.parentElement && !root.contains(selectedEl.parentElement))
      ? selectedEl.parentElement
      : selectedEl;

    // ── Detect CSS Modules (runtime-injected styles) ──
    const allEls = [exportRoot, ...Array.from(exportRoot.querySelectorAll("*"))];
    const allClasses = allEls.flatMap(e =>
      (e.className && typeof e.className === "string")
        ? e.className.trim().split(/\s+/).filter(Boolean) : []
    );
    const isModuleClass = (c) => /module_|module--|-[a-zA-Z0-9]{5,8}$/.test(c);
    const usesModules = allClasses.length > 0 &&
      allClasses.filter(isModuleClass).length / allClasses.length > 0.4;

    // ── HTML: for CSS Modules, inline all computed styles so CodePen renders correctly ──
    let htmlOut;
    if (usesModules) {
      htmlOut = buildInlineStyleHTML(exportRoot);
    } else {
      htmlOut = exportRoot.outerHTML;
    }

    // ── CSS: all rules for element + descendants + ancestor hover rules ──
    let cssOut = mineAllNeededRules(exportRoot);

    // Inject a body background that matches the page so dark components aren't invisible.
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const pageBg = (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent")
      ? bodyBg
      : (htmlBg && htmlBg !== "rgba(0, 0, 0, 0)" && htmlBg !== "transparent")
        ? htmlBg
        : "#ffffff";
    const bodyColor = getComputedStyle(document.body).color || "#000000";

    const bodyCSS = `/* ── Page context injected by Style Peek ── */
body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${pageBg};
  color: ${bodyColor};
  font-family: ${getComputedStyle(document.body).fontFamily || "sans-serif"};
  padding: 40px 20px;
}`;
    cssOut = bodyCSS + (cssOut ? "\n\n" + cssOut : "");

    // ── JS: extract real script blocks from the page that touch our element ──
    // Use exportRoot so siblings-mode scripts (referencing parent/sibling IDs) are captured too
    const elClasses = Array.from(exportRoot.classList);
    const elId = exportRoot.id;
    const childClasses = Array.from(exportRoot.querySelectorAll("[class]"))
      .flatMap(c => Array.from(c.classList)).filter(Boolean);
    const childIds = Array.from(exportRoot.querySelectorAll("[id]")).map(c => c.id).filter(Boolean);

    const allIdentifiers = [...new Set([
      ...(elId ? [elId, `#${elId}`, `'${elId}'`, `"${elId}"`] : []),
      ...elClasses.map(c => [c, `.${c}`, `'${c}'`, `"${c}"`]).flat(),
      ...childIds.map(id => [id, `#${id}`, `'${id}'`, `"${id}"`]).flat(),
      ...childClasses.map(c => [`.${c}`, `'${c}'`, `"${c}"`]).flat(),
    ])];

    const pageScripts = Array.from(document.querySelectorAll("script:not([src])"))
      .map(s => s.textContent.trim())
      .filter(text =>
        text.length > 10 &&
        !text.includes("__stylePeek") &&
        allIdentifiers.some(id => text.includes(id))
      );

    const jsOut = pageScripts.length
      ? pageScripts.join("\n\n")
      : `// No inline scripts found that reference this element.\n// Add interactivity here.`;

    const exportLabel = siblingsMode ? tag(exportRoot) + " (+ siblings)" : tag(exportRoot);
    const data = {
      title:  "Style Peek — " + exportLabel,
      html:   htmlOut,
      css:    cssOut  || "/* no styles found */",
      js:     jsOut
    };

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://codepen.io/pen/define";
    form.target = "_blank";
    const inp = document.createElement("input");
    inp.type  = "hidden";
    inp.name  = "data";
    inp.value = JSON.stringify(data);
    form.appendChild(inp);
    document.body.appendChild(form);
    form.submit();
    try { form.remove(); } catch (e) {}
  }

  /* ── helpers ── */
  function tag(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const c = (el.className && typeof el.className === "string")
      ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    if (c.length) s += "." + c.slice(0, 2).join(".");
    return s;
  }

  function detectFW(el) {
    const k = Object.keys(el);
    if (k.some(x => x.startsWith("__reactFiber"))) return "React";
    if (el.__vue__ || el.__vueParentComponent) return "Vue";
    if (Array.from(el.attributes).some(a => a.name.startsWith("data-v-"))) return "Vue (scoped)";
    if (Array.from(el.attributes).some(a => a.name.startsWith("_ngcontent"))) return "Angular";
    if (el.hasAttribute("x-data")) return "Alpine.js";
    return "None detected";
  }
})();
