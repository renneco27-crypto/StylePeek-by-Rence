/**
 * StylePeek Studio — Inspect & Selection Engine
 * js/sp_inspect.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  let hoverBox = null;
  let hoverLbl = null;
  let selectBox = null;
  let selectBadge = null;
  let contextMenu = null;
  let ctxTag = null;
  let ctxName = null;
  let ctxCoords = null;

  // 4-corner stretch / resize state
  let isResizing = false;
  let resizeDir = "";
  let resizeStart = { mouseX: 0, mouseY: 0, width: 0, height: 0, startStyleW: "", startStyleH: "", transX: 0, transY: 0 };
  let justFinishedDrag = false;

  function ensureInspectAttached() {
    hoverBox = document.getElementById("sp-hover-box");
    hoverLbl = document.getElementById("sp-hover-label");
    selectBox = document.getElementById("sp-select-box");
    selectBadge = document.getElementById("sp-select-badge");
    contextMenu = document.getElementById("sp-context-menu");
    if (contextMenu) {
      ctxTag = contextMenu.querySelector("#sp-ctx-tag");
      ctxName = contextMenu.querySelector("#sp-ctx-name");
      ctxCoords = contextMenu.querySelector("#sp-ctx-coords");
    }
  }

  /* ── Event Freezing & Host Guard ── */
  function shouldGuardHostEvent(e) {
    if (!state.isEnabled) return false;
    if (!state.activeToolMode || state.activeToolMode === "off") return false;
    if (window.isOwn && window.isOwn(e.target)) return false;
    if (SP.activeEditingNode && (SP.activeEditingNode === e.target || SP.activeEditingNode.contains(e.target))) return false;
    return true;
  }

  function turnOffInspectFeatures() {
    state.activeToolMode = null;
    if (typeof window.syncDockUI === "function") window.syncDockUI(null);
    document.body.classList.remove("sp-mode-move");
    if (typeof window.clearPassthroughFrontNodes === "function") window.clearPassthroughFrontNodes();
    if (typeof window.clearMultiSelection === "function") window.clearMultiSelection();
    state.isDeepLayerMode = false;
    if (hoverBox) hoverBox.style.display = "none";
    if (hoverLbl) hoverLbl.style.display = "none";
    if (selectBox) {
      selectBox.style.display = "none";
      selectBox.classList.remove("sp-deep-mode");
    }
    state.selectedEl = null;
    state.isTargetLocked = false;
    state.unlockPending = false;
    if (typeof window.closeAllPopups === "function") window.closeAllPopups();
    if (typeof window.showToast === "function") window.showToast("Inspect mode off — features paused, studio navbar kept open");
  }

  /* ── Update Select Box & Badge ── */
  function updateSelectBox(el) {
    ensureInspectAttached();
    if (!selectBox) return;
    if (!el || el.nodeType !== 1) {
      selectBox.style.display = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    selectBox.style.display = "block";
    selectBox.style.left = r.left + "px";
    selectBox.style.top = r.top + "px";
    selectBox.style.width = r.width + "px";
    selectBox.style.height = r.height + "px";
    selectBox.classList.toggle("sp-deep-mode", state.isDeepLayerMode);

    if (selectBadge) {
      if (r.top < 36) {
        selectBadge.style.top = "4px";
      } else {
        selectBadge.style.top = "-34px";
      }

      const tagStr = el.tagName.toLowerCase();
      const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
      const clsStr = window.getPrimaryClass ? window.getPrimaryClass(el) : "";
      const depthLabel = state.isDeepLayerMode
        ? ` · Deep Layer (${state.deepLayerIndex + 1}/${Math.max(1, state.deepLayerStack.length)})`
        : "";

      const pageX = Math.round(r.left + (window.scrollX || window.pageXOffset || 0));
      const pageY = Math.round(r.top + (window.scrollY || window.pageYOffset || 0));

      selectBadge.innerHTML = `<div class="sp-badge-info"><span class="sp-badge-tag">${tagStr}</span>${idStr ? `<span class="sp-badge-id">${idStr}</span>` : ""}${clsStr ? `<span class="sp-badge-class">${clsStr}</span>` : ""}<span class="sp-badge-dim">(${Math.round(r.width)}×${Math.round(r.height)})</span><span class="sp-badge-coords">· X: ${pageX} Y: ${pageY}</span>${depthLabel ? `<span class="sp-badge-depth">${depthLabel}</span>` : ""}</div><div class="sp-badge-sep"></div><div class="sp-badge-actions"><button type="button" class="sp-badge-action-btn" id="sp-badge-btn-layer-behind" title="Step 1 layer behind front element">↓ Step Behind</button><button type="button" class="sp-badge-action-btn" id="sp-badge-btn-code" title="Transform Element Code / Overwrite">Code</button><button type="button" class="sp-badge-action-btn" id="sp-badge-btn-style" title="Open Style & Alignment">Style</button></div>`;

      selectBadge.querySelector("#sp-badge-btn-layer-behind")?.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        if (typeof window.stepLayerDeeper === "function") window.stepLayerDeeper();
      });

      selectBadge.querySelector("#sp-badge-btn-code")?.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        if (typeof window.openCodeModal === "function") window.openCodeModal(state.selectedEl || el);
      });

      selectBadge.querySelector("#sp-badge-btn-style")?.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        const drawer = document.getElementById("sp-drawer");
        if (drawer) {
          if (typeof window.closeAllPopups === "function") window.closeAllPopups("drawer");
          drawer.classList.add("sp-open");
        }
      });
    }
  }

  function clearSelection() {
    state.selectedEl = null;
    state.isTargetLocked = false;
    state.unlockPending = false;
    if (selectBox) selectBox.style.display = "none";
    if (typeof window.clearMultiSelection === "function") window.clearMultiSelection();
    if (typeof window.syncMobileAdjuster === "function") window.syncMobileAdjuster(null, 0, 0);
  }

  /* ── Select and Inspect Element ── */
  function selectElement(el, preserveDeepStack = false, openPanel = true) {
    if (!el || (window.isOwn && window.isOwn(el))) return;
    ensureInspectAttached();

    if (!preserveDeepStack) {
      if (typeof window.clearPassthroughFrontNodes === "function") window.clearPassthroughFrontNodes();
      state.isDeepLayerMode = false;
      if (selectBox) selectBox.classList.remove("sp-deep-mode");
    }

    if (typeof window.clearMultiSelection === "function") window.clearMultiSelection();
    state.multiSelectedEls.add(el);
    el.classList.add("sp-multi-selected");
    state.selectedEl = el;
    state.isTargetLocked = true;
    state.unlockPending = false;

    updateSelectBox(el);

    // Sync styles into drawer if drawer inputs exist
    const drawerTag = document.getElementById("sp-drawer-tag");
    const drawerName = document.getElementById("sp-drawer-name");
    const tagStr = el.tagName.toLowerCase();
    const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
    const clsStr = window.getPrimaryClass ? window.getPrimaryClass(el) : "";
    if (drawerTag) drawerTag.textContent = tagStr;
    if (drawerName) drawerName.textContent = idStr || clsStr || "";

    // Read Computed Styles
    const cs = window.getComputedStyle(el);
    const textHex = document.getElementById("sp-text-hex");
    const textColor = document.getElementById("sp-text-color");
    const bgHex = document.getElementById("sp-bg-hex");
    const bgColor = document.getElementById("sp-bg-color");
    const borderHex = document.getElementById("sp-border-hex");
    const borderColor = document.getElementById("sp-border-color");

    if (window.rgbToHex) {
      const txtH = window.rgbToHex(cs.color);
      if (textHex) textHex.value = txtH;
      if (textColor) textColor.value = txtH;
      const bgH = window.rgbToHex(cs.backgroundColor);
      if (bgHex) bgHex.value = bgH;
      if (bgColor) bgColor.value = bgH;
      const bdrH = window.rgbToHex(cs.borderColor);
      if (borderHex) borderHex.value = bdrH;
      if (borderColor) borderColor.value = bdrH;
    }

    // Populate quick transform & CSS inputs
    const transformCodeArea = document.getElementById("sp-transform-code");
    if (transformCodeArea) transformCodeArea.value = el.outerHTML || el.textContent || "";
    const elementCssInput = document.getElementById("sp-element-css");
    if (elementCssInput) elementCssInput.value = el.getAttribute("style") || "";

    // Deep layer breadcrumbs
    if (!preserveDeepStack && typeof window.computeVisualLayerStack === "function") {
      state.deepLayerStack = window.computeVisualLayerStack(el);
      state.deepLayerIndex = Math.max(0, state.deepLayerStack.indexOf(el));
    }
    if (typeof window.buildBreadcrumbs === "function") window.buildBreadcrumbs(el);

    // Sync Width & Height into Style Drawer and Mobile Adjuster
    const curW = Math.round(r.width);
    const curH = Math.round(r.height);
    const inputW = document.getElementById("sp-input-width");
    const inputH = document.getElementById("sp-input-height");
    if (inputW) inputW.value = curW;
    if (inputH) inputH.value = curH;
    if (typeof window.syncMobileAdjuster === "function") {
      window.syncMobileAdjuster(el, curW, curH);
    }

    // Drawer opens if in style tool mode
    if (state.activeToolMode === "style" && !justFinishedDrag) {
      const drawer = document.getElementById("sp-drawer");
      if (drawer) {
        if (typeof window.closeAllPopups === "function") window.closeAllPopups("drawer");
        drawer.classList.add("sp-open");
      }
    }

    // If inspect mode is active and not dragging, also open/update #sp-panel
    if (openPanel && state.activeToolMode === "inspect" && typeof window.spOpenPanel === "function") {
      window.spOpenPanel(el);
    }

    if (window.spPlayKeyClick) window.spPlayKeyClick(220);
  }

  /* ── Context Menu ── */
  function openContextMenu(clientX, clientY, targetEl) {
    ensureInspectAttached();
    if (!contextMenu) return;
    const r = targetEl ? targetEl.getBoundingClientRect() : { width: 0, height: 0, left: clientX, top: clientY };
    const pageX = Math.round(r.left + (window.scrollX || window.pageXOffset || 0));
    const pageY = Math.round(r.top + (window.scrollY || window.pageYOffset || 0));

    const tag = targetEl ? targetEl.tagName.toLowerCase() : "element";
    const name = targetEl ? (targetEl.id ? "#" + targetEl.id : (window.getPrimaryClass ? window.getPrimaryClass(targetEl) : "")) : "";
    if (ctxTag) ctxTag.textContent = tag;
    if (ctxName) ctxName.textContent = name;
    if (ctxCoords) ctxCoords.textContent = `${Math.round(r.width)}×${Math.round(r.height)} · X: ${pageX} Y: ${pageY}`;

    contextMenu.style.display = "block";
    const menuW = 200;
    const menuH = 340;
    const posX = Math.max(10, Math.min(window.innerWidth - menuW - 10, clientX));
    const posY = Math.max(10, Math.min(window.innerHeight - menuH - 10, clientY));
    contextMenu.style.left = posX + "px";
    contextMenu.style.top = posY + "px";

    if (window.spPlayKeyClick) window.spPlayKeyClick(250);
  }

  function closeContextMenu() {
    if (contextMenu) contextMenu.style.display = "none";
  }

  function initContextMenu() {
    ensureInspectAttached();
    if (!contextMenu) return;
    contextMenu.addEventListener("click", e => {
      const item = e.target.closest(".sp-ctx-item");
      if (!item) return;
      e.stopPropagation();
      closeContextMenu();
      const action = item.dataset.action;
      const target = state.selectedEl || state.hoveredEl;
      if (!target && action !== "undo") return;

      if (action === "edit-text") {
        if (typeof window.startInlineTextEdit === "function") window.startInlineTextEdit(target);
      } else if (action === "transform-code") {
        if (typeof window.openCodeModal === "function") window.openCodeModal(target);
      } else if (action === "open-style") {
        const drawer = document.getElementById("sp-drawer");
        if (drawer) {
          if (typeof window.closeAllPopups === "function") window.closeAllPopups("drawer");
          drawer.classList.add("sp-open");
        }
      } else if (action === "open-palette") {
        if (typeof window.openPaletteModal === "function") window.openPaletteModal();
      } else if (action === "step-behind") {
        if (typeof window.stepLayerDeeper === "function") window.stepLayerDeeper();
      } else if (action === "move-to-back") {
        if (typeof window.moveElementToBackArray === "function") window.moveElementToBackArray(target);
      } else if (action === "bring-to-front") {
        if (typeof window.bringElementToFrontArray === "function") window.bringElementToFrontArray(target);
      } else if (action === "duplicate") {
        if (typeof window.copySelectedElement === "function") window.copySelectedElement();
        if (typeof window.pasteClipboardElement === "function") window.pasteClipboardElement();
      } else if (action === "move") {
        if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek("move");
      } else if (action === "resize") {
        if (typeof window.turnOnStylePeek === "function") window.turnOnStylePeek("resize");
      } else if (action === "delete") {
        if (typeof window.deleteElementNode === "function") window.deleteElementNode(target);
      } else if (action === "undo") {
        if (typeof window.performUndo === "function") window.performUndo();
      }
    });
  }

  /* ── 4-Corner Live Resizing / Stretching ── */
  function handleResizeStart(clientX, clientY, dir, e) {
    if (!state.selectedEl) return;
    isResizing = true;
    resizeDir = dir;
    const r = state.selectedEl.getBoundingClientRect();
    const curTrans = window.getElementTranslate ? window.getElementTranslate(state.selectedEl) : { x: 0, y: 0 };
    resizeStart = {
      mouseX: clientX,
      mouseY: clientY,
      width: r.width,
      height: r.height,
      startStyleW: state.selectedEl.style.width,
      startStyleH: state.selectedEl.style.height,
      transX: curTrans.x,
      transY: curTrans.y
    };
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }

  function handleResizeMove(clientX, clientY) {
    if (!isResizing || !state.selectedEl) return;
    const deltaX = clientX - resizeStart.mouseX;
    const deltaY = clientY - resizeStart.mouseY;

    let newW = resizeStart.width;
    let newH = resizeStart.height;
    let newX = resizeStart.transX;
    let newY = resizeStart.transY;

    if (resizeDir === "se") {
      newW = Math.max(8, Math.round(resizeStart.width + deltaX));
      newH = Math.max(8, Math.round(resizeStart.height + deltaY));
    } else if (resizeDir === "sw") {
      newW = Math.max(8, Math.round(resizeStart.width - deltaX));
      newH = Math.max(8, Math.round(resizeStart.height + deltaY));
      const actualDeltaW = newW - resizeStart.width;
      newX = resizeStart.transX - actualDeltaW;
    } else if (resizeDir === "ne") {
      newW = Math.max(8, Math.round(resizeStart.width + deltaX));
      newH = Math.max(8, Math.round(resizeStart.height - deltaY));
      const actualDeltaH = newH - resizeStart.height;
      newY = resizeStart.transY - actualDeltaH;
    } else if (resizeDir === "nw") {
      newW = Math.max(8, Math.round(resizeStart.width - deltaX));
      newH = Math.max(8, Math.round(resizeStart.height - deltaY));
      const actualDeltaW = newW - resizeStart.width;
      const actualDeltaH = newH - resizeStart.height;
      newX = resizeStart.transX - actualDeltaW;
      newY = resizeStart.transY - actualDeltaH;
    }

    if (window.applySizeToElement) {
      window.applySizeToElement(state.selectedEl, newW, newH);
    } else {
      state.selectedEl.style.width = newW + "px";
      state.selectedEl.style.height = newH + "px";
    }

    if (window.setElementTranslate) window.setElementTranslate(state.selectedEl, newX, newY);
    updateSelectBox(state.selectedEl);

    // Sync to Style Drawer and Mobile Adjuster inputs if present
    const inputW = document.getElementById("sp-input-width");
    const inputH = document.getElementById("sp-input-height");
    if (inputW) inputW.value = newW;
    if (inputH) inputH.value = newH;
    const mobDim = document.getElementById("sp-mob-dim");
    if (mobDim) mobDim.textContent = `${newW}×${newH}`;
  }

  function handleResizeEnd() {
    if (isResizing && state.selectedEl) {
      isResizing = false;
      justFinishedDrag = true;
      setTimeout(() => { justFinishedDrag = false; }, 250);
      const curTrans = window.getElementTranslate ? window.getElementTranslate(state.selectedEl) : { x: 0, y: 0 };
      state.undoStack.push({
        type: "resize",
        node: state.selectedEl,
        oldW: resizeStart.startStyleW,
        oldH: resizeStart.startStyleH,
        newW: state.selectedEl.style.width,
        newH: state.selectedEl.style.height,
        oldTranslate: { x: resizeStart.transX, y: resizeStart.transY },
        newTranslate: { x: curTrans.x, y: curTrans.y }
      });
      if (window.showToast) window.showToast(`Stretched element to ${state.selectedEl.style.width} × ${state.selectedEl.style.height}`);
    }
  }

  function initResizeHandles() {
    ensureInspectAttached();
    if (!selectBox) return;

    selectBox.querySelectorAll(".sp-resize-handle").forEach(handle => {
      // Mouse down
      handle.addEventListener("mousedown", e => {
        handleResizeStart(e.clientX, e.clientY, handle.dataset.dir, e);
      });
      // Touch start for mobile view
      handle.addEventListener("touchstart", e => {
        const touch = e.touches[0];
        if (touch) handleResizeStart(touch.clientX, touch.clientY, handle.dataset.dir, e);
      }, { passive: false });
    });

    // Mouse move & up
    window.addEventListener("mousemove", e => {
      handleResizeMove(e.clientX, e.clientY);
    }, true);

    window.addEventListener("mouseup", () => {
      handleResizeEnd();
    });

    // Touch move & end for mobile view
    window.addEventListener("touchmove", e => {
      if (!isResizing) return;
      const touch = e.touches[0];
      if (touch) {
        handleResizeMove(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("touchend", () => {
      handleResizeEnd();
    });
  }

  /* ── Window Event Interception & Hover Tracking ── */
  function initHoverAndWindowGuards() {
    window.addEventListener("pointerdown", e => {
      if (!shouldGuardHostEvent(e)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "select" || tag === "button" || tag === "a" || e.target.closest("label, a, button, input[type='file'], [type='file']")) {
        e.preventDefault();
      }
    }, true);

    window.addEventListener("auxclick", e => {
      if (!shouldGuardHostEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    window.addEventListener("submit", e => {
      if (!state.isEnabled || !state.activeToolMode || state.activeToolMode === "off") return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    // Hover box tracker
    window.addEventListener("mousemove", e => {
      if (!state.isEnabled || isResizing || SP.isDragging) return;
      ensureInspectAttached();
      if (!state.activeToolMode || state.activeToolMode === "off" || state.selectedEl) {
        if (hoverBox) hoverBox.style.display = "none";
        if (hoverLbl) hoverLbl.style.display = "none";
        return;
      }
      const el = window.visbugPickElement ? window.visbugPickElement(e.clientX, e.clientY) : e.target;
      if (!el || (window.isOwn && window.isOwn(el))) {
        if (hoverBox) hoverBox.style.display = "none";
        if (hoverLbl) hoverLbl.style.display = "none";
        return;
      }
      state.hoveredEl = el;
      const r = el.getBoundingClientRect();
      if (hoverBox) {
        hoverBox.style.display = "block";
        hoverBox.style.left = r.left + "px";
        hoverBox.style.top = r.top + "px";
        hoverBox.style.width = r.width + "px";
        hoverBox.style.height = r.height + "px";
      }
      if (hoverLbl) {
        const tagStr = el.tagName.toLowerCase();
        const idStr = (el.id && typeof el.id === "string") ? "#" + el.id : "";
        const clsStr = window.getPrimaryClass ? window.getPrimaryClass(el) : "";
        hoverLbl.textContent = `${tagStr}${idStr}${clsStr}`;
        hoverLbl.style.display = "block";
        hoverLbl.style.top = Math.max(4, r.top - 24) + "px";
        hoverLbl.style.left = Math.max(4, r.left) + "px";
      }
    }, true);

    // Context menu opening (Dropdown pops up instantly without heavy sync operations)
    document.addEventListener("contextmenu", e => {
      if (!state.isEnabled || (window.isOwn && window.isOwn(e.target))) return;
      e.preventDefault();
      e.stopPropagation();
      const target = (window.visbugPickElement ? window.visbugPickElement(e.clientX, e.clientY) : null) || e.target;
      if (window.isPageRootOrFullWrapper && window.isPageRootOrFullWrapper(target)) {
        if (!state.selectedEl) clearSelection();
      } else {
        selectElement(target, false, false);
      }
      if (typeof window.closeAllPopups === "function") window.closeAllPopups("contextMenu");
      openContextMenu(e.clientX, e.clientY, state.selectedEl || target);
    }, true);

    // Canvas click
    document.addEventListener("click", e => {
      if (!state.isEnabled || (window.isOwn && window.isOwn(e.target))) return;
      if (SP.activeEditingNode && (SP.activeEditingNode === e.target || SP.activeEditingNode.contains(e.target))) return;
      if (!state.activeToolMode || state.activeToolMode === "off") return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      closeContextMenu();
      if (justFinishedDrag) {
        justFinishedDrag = false;
        return;
      }

      const target = (window.visbugPickElement ? window.visbugPickElement(e.clientX, e.clientY) : null) || e.target;
      if (state.activeToolMode === "add") {
        if (typeof window.insertNewTextAt === "function") window.insertNewTextAt(e.clientX, e.clientY, document.body);
        return;
      }

      // Ctrl+Click multi-selection toggle
      if (e.ctrlKey || e.metaKey) {
        if (target && (!window.isPageRootOrFullWrapper || !window.isPageRootOrFullWrapper(target))) {
          if (state.multiSelectedEls.has(target)) {
            state.multiSelectedEls.delete(target);
            target.classList.remove("sp-multi-selected");
            if (state.selectedEl === target) {
              state.selectedEl = state.multiSelectedEls.size > 0 ? Array.from(state.multiSelectedEls)[state.multiSelectedEls.size - 1] : null;
            }
            if (window.showToast) window.showToast(`Excluded element (${state.multiSelectedEls.size} remaining)`);
          } else {
            state.multiSelectedEls.add(target);
            target.classList.add("sp-multi-selected");
            state.selectedEl = target;
            if (window.showToast) window.showToast(`Included element (${state.multiSelectedEls.size} selected)`);
          }
          if (typeof window.updateMultiSelectUI === "function") window.updateMultiSelectUI();
          return;
        }
      }

      if (window.isPageRootOrFullWrapper && window.isPageRootOrFullWrapper(target)) {
        clearSelection();
        if (hoverBox) hoverBox.style.display = "none";
        if (hoverLbl) hoverLbl.style.display = "none";
        if (typeof window.closeAllPopups === "function") window.closeAllPopups();
        return;
      }

      if (state.activeToolMode === "delete") {
        if (typeof window.deleteElementNode === "function") window.deleteElementNode(target);
        return;
      }

      selectElement(target);
    }, true);
  }

  function initInspect() {
    ensureInspectAttached();
    initContextMenu();
    initResizeHandles();
    initHoverAndWindowGuards();
  }

  /* ── Export ── */
  SP.inspect = {
    initInspect,
    selectElement,
    clearSelection,
    updateSelectBox,
    openContextMenu,
    closeContextMenu,
    shouldGuardHostEvent,
    turnOffInspectFeatures
  };

  window.selectElement = selectElement;
  window.clearSelection = clearSelection;
  window.updateSelectBox = updateSelectBox;
  window.openContextMenu = openContextMenu;
  window.closeContextMenu = closeContextMenu;
  window.shouldGuardHostEvent = shouldGuardHostEvent;
  window.turnOffInspectFeatures = turnOffInspectFeatures;
  window.initInspect = initInspect;
})();
