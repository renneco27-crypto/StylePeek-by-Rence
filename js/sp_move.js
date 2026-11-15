/**
 * StylePeek Studio — VisBug Element Mover & Drag Engine
 * js/sp_move.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  let snapGuideH = null;
  let snapGuideV = null;

  // Drag State
  let isDragCandidate = false;
  let isDragging = false;
  let dragTarget = null;
  let dragOrigin = { mouseX: 0, mouseY: 0, elemX: 0, elemY: 0, scrollX: 0, scrollY: 0, multiStarts: null };
  let lastDragMouseEvent = null;
  let autoScrollRaf = null;
  let justFinishedDrag = false;

  function ensureMoveAttached() {
    snapGuideH = document.getElementById("sp-snap-guide-h");
    snapGuideV = document.getElementById("sp-snap-guide-v");
  }

  function isPageRootOrFullWrapper(el) {
    if (!el || el.nodeType !== 1 || (window.isOwn && window.isOwn(el))) return true;
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
      if (!node || node.nodeType !== 1 || (window.isOwn && window.isOwn(node))) continue;
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
    if (rx !== 0 || ry !== 0) {
      el.style.setProperty("translate", `${rx}px ${ry}px`, "important");
    } else {
      el.style.removeProperty("translate");
    }
    if (el.style.transform && /^translate\([-\d.]+px,\s*[-\d.]+px\)$/.test(el.style.transform.trim())) {
      el.style.removeProperty("transform");
    }
  }

  /* ── Multi-Selection State Helpers ── */
  function clearMultiSelection() {
    for (const el of state.multiSelectedEls) {
      if (el && el.classList) el.classList.remove("sp-multi-selected");
    }
    state.multiSelectedEls.clear();
  }

  function updateMultiSelectUI() {
    document.querySelectorAll(".sp-multi-selected").forEach(n => {
      if (!state.multiSelectedEls.has(n)) n.classList.remove("sp-multi-selected");
    });
    for (const el of state.multiSelectedEls) {
      el.classList.add("sp-multi-selected");
    }

    const selectBox = document.getElementById("sp-select-box");
    const selectBadge = document.getElementById("sp-select-badge");

    if (state.multiSelectedEls.size === 0) {
      state.selectedEl = null;
      if (selectBox) selectBox.style.display = "none";
      return;
    }

    if (state.multiSelectedEls.size === 1) {
      state.selectedEl = Array.from(state.multiSelectedEls)[0];
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      return;
    }

    if (!selectBox || !selectBadge) return;

    let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
    for (const el of state.multiSelectedEls) {
      const r = el.getBoundingClientRect();
      minLeft = Math.min(minLeft, r.left);
      minTop = Math.min(minTop, r.top);
      maxRight = Math.max(maxRight, r.right);
      maxBottom = Math.max(maxBottom, r.bottom);
    }

    const boxW = Math.max(20, Math.round(maxRight - minLeft));
    const boxH = Math.max(20, Math.round(maxBottom - minTop));
    selectBox.style.display = "block";
    selectBox.style.left = minLeft + "px";
    selectBox.style.top = minTop + "px";
    selectBox.style.width = boxW + "px";
    selectBox.style.height = boxH + "px";
    selectBox.classList.remove("sp-deep-mode");

    if (minTop < 36) {
      selectBadge.style.top = "4px";
    } else {
      selectBadge.style.top = "-34px";
    }

    const pageX = Math.round(minLeft + (window.scrollX || window.pageXOffset || 0));
    const pageY = Math.round(minTop + (window.scrollY || window.pageYOffset || 0));

    selectBadge.innerHTML = `<div class="sp-badge-info"><span class="sp-badge-tag">${state.multiSelectedEls.size} elements</span><span class="sp-badge-dim">(${boxW}×${boxH})</span><span class="sp-badge-coords">· X: ${pageX} Y: ${pageY}</span><span class="sp-badge-depth">· Multi-Select (Drag or Arrow keys to move)</span></div><div class="sp-badge-sep"></div><div class="sp-badge-actions"><button type="button" class="sp-badge-action-btn" id="sp-badge-btn-clear-multi" title="Clear multi-selection">Deselect All</button></div>`;

    selectBadge.querySelector("#sp-badge-btn-clear-multi")?.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      clearMultiSelection();
      state.selectedEl = null;
      if (selectBox) selectBox.style.display = "none";
    });
  }

  function selectAllElements() {
    clearMultiSelection();

    const bodyKids = Array.from(document.body.children).filter(el => {
      if (!el || (window.isOwn && window.isOwn(el))) return false;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"].includes(el.tagName)) return false;
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    });

    const mainContainers = document.querySelectorAll("main, [role='main'], #__next, #root, .app, #app, [class*='container'], [class*='layout'], [class*='wrapper']");
    const containerKids = [];
    mainContainers.forEach(container => {
      if (!window.isOwn || !window.isOwn(container)) {
        Array.from(container.children).forEach(k => {
          if ((!window.isOwn || !window.isOwn(k)) && !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(k.tagName)) {
            containerKids.push(k);
          }
        });
      }
    });

    const movedElements = Array.from(document.querySelectorAll(".sp-custom-element, [style*='translate'], [style*='transform']")).filter(el => !window.isOwn || !window.isOwn(el));

    const allCandidates = Array.from(new Set([...bodyKids, ...containerKids, ...movedElements]));
    const finalSet = allCandidates.length > 0 ? allCandidates : bodyKids;
    for (const el of finalSet) {
      state.multiSelectedEls.add(el);
    }

    if (state.multiSelectedEls.size > 0) {
      state.selectedEl = Array.from(state.multiSelectedEls)[0];
      updateMultiSelectUI();
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      if (window.showToast) window.showToast(`Selected all ${state.multiSelectedEls.size} elements (Drag or Arrow keys to move)`);
    } else {
      if (window.showToast) window.showToast("No selectable elements found on page");
    }
  }

  function nudgeSelectedElements(key, step = 10) {
    const targets = (state.multiSelectedEls.size > 0)
      ? Array.from(state.multiSelectedEls)
      : (state.selectedEl ? [state.selectedEl] : []);

    if (targets.length === 0) return;

    let dx = 0;
    let dy = 0;
    if (key === "ArrowLeft") dx = -step;
    else if (key === "ArrowRight") dx = step;
    else if (key === "ArrowUp") dy = -step;
    else if (key === "ArrowDown") dy = step;

    const undoItems = [];
    for (const el of targets) {
      if (window.ensurePositioned) window.ensurePositioned(el);
      const cur = getElementTranslate(el);
      const newX = cur.x + dx;
      const newY = cur.y + dy;
      setElementTranslate(el, newX, newY);
      undoItems.push({ el, oldX: cur.x, oldY: cur.y, newX, newY });
    }

    state.undoStack.push({
      type: "multi-move",
      items: undoItems
    });

    updateMultiSelectUI();
    if (window.spPlayKeyClick) window.spPlayKeyClick(140);
  }

  /* ── Drag Auto Scroll ── */
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
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(dragTarget);
      autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
    } else {
      autoScrollRaf = null;
    }
  }

  /* ── Drag End Handler ── */
  function handleDragEnd() {
    if (autoScrollRaf) {
      cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = null;
    }
    lastDragMouseEvent = null;

    ensureMoveAttached();
    if (snapGuideH) snapGuideH.style.display = "none";
    if (snapGuideV) snapGuideV.style.display = "none";

    if (isDragCandidate) {
      if (isDragging && dragTarget) {
        dragTarget.classList.remove("sp-free-dragging");
        if (dragOrigin.multiStarts && dragOrigin.multiStarts.size > 1) {
          const multiItems = [];
          for (const [el, startT] of dragOrigin.multiStarts.entries()) {
            multiItems.push({
              el,
              oldX: startT.x,
              oldY: startT.y,
              newX: getElementTranslate(el).x,
              newY: getElementTranslate(el).y
            });
          }
          state.undoStack.push({
            type: "multi-move",
            items: multiItems
          });
          if (window.showToast) window.showToast(`Moved ${multiItems.length} elements together (Ctrl+Z to undo)`);
          updateMultiSelectUI();
        } else {
          state.undoStack.push({
            type: "move",
            node: dragTarget,
            oldTranslate: { x: dragOrigin.elemX, y: dragOrigin.elemY },
            translate: { ...(dragTarget._spTranslate || { x: 0, y: 0 }) }
          });
          if (window.showToast) window.showToast("Moved layer (Ctrl+Z to undo)");
        }
        justFinishedDrag = true;
        setTimeout(() => { justFinishedDrag = false; }, 250);
      }
      isDragging = false;
      isDragCandidate = false;
      dragTarget = null;
      SP.isDragging = false;
    }
  }

  /* ── Mouse Drag Event Initializers ── */
  function initMoveListeners() {
    document.addEventListener("mousedown", e => {
      if (!state.isEnabled || (window.isOwn && window.isOwn(e.target))) return;
      if (!state.activeToolMode || state.activeToolMode === "off") return;
      if (e.button !== 0) return;

      if (state.activeToolMode === "delete") return;

      const pick = visbugPickElement(e.clientX, e.clientY) || e.target;
      if (isPageRootOrFullWrapper(pick)) return;

      dragTarget = pick;
      isDragCandidate = true;
      isDragging = false;
      const initialTrans = getElementTranslate(dragTarget);
      const multiStarts = new Map();
      if (state.multiSelectedEls.has(dragTarget) && state.multiSelectedEls.size > 1) {
        for (const el of state.multiSelectedEls) {
          multiStarts.set(el, getElementTranslate(el));
        }
      }

      dragOrigin = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elemX: initialTrans.x,
        elemY: initialTrans.y,
        scrollX: window.scrollX || window.pageXOffset || 0,
        scrollY: window.scrollY || window.pageYOffset || 0,
        multiStarts
      };
    }, true);

    window.addEventListener("mousemove", e => {
      if (!isDragCandidate || !dragTarget) return;

      const deltaX = Math.abs(e.clientX - dragOrigin.mouseX);
      const deltaY = Math.abs(e.clientY - dragOrigin.mouseY);

      if (!isDragging) {
        if (deltaX >= 4 || deltaY >= 4) {
          isDragging = true;
          SP.isDragging = true;
          dragTarget.classList.add("sp-free-dragging");
          if (window.ensurePositioned) window.ensurePositioned(dragTarget);
        } else {
          return;
        }
      }

      lastDragMouseEvent = e;
      const curScrollX = window.scrollX || window.pageXOffset || 0;
      const curScrollY = window.scrollY || window.pageYOffset || 0;
      const dScrollX = curScrollX - dragOrigin.scrollX;
      const dScrollY = curScrollY - dragOrigin.scrollY;

      const moveX = (e.clientX - dragOrigin.mouseX) + dScrollX;
      const moveY = (e.clientY - dragOrigin.mouseY) + dScrollY;

      if (dragOrigin.multiStarts && dragOrigin.multiStarts.size > 1) {
        for (const [el, startT] of dragOrigin.multiStarts.entries()) {
          setElementTranslate(el, startT.x + moveX, startT.y + moveY);
        }
        updateMultiSelectUI();
      } else {
        const dx = dragOrigin.elemX + moveX;
        const dy = dragOrigin.elemY + moveY;
        setElementTranslate(dragTarget, dx, dy);
        if (typeof window.updateSelectBox === "function") window.updateSelectBox(dragTarget);
      }

      if (!autoScrollRaf) {
        autoScrollRaf = requestAnimationFrame(handleDragAutoScroll);
      }
    }, true);

    window.addEventListener("mouseup", handleDragEnd, true);
    window.addEventListener("blur", handleDragEnd);
  }

  function initMove() {
    ensureMoveAttached();
    initMoveListeners();
  }

  /* ── Export ── */
  SP.move = {
    initMove,
    isPageRootOrFullWrapper,
    visbugPickElement,
    getElementTranslate,
    setElementTranslate,
    clearMultiSelection,
    updateMultiSelectUI,
    selectAllElements,
    nudgeSelectedElements,
    handleDragEnd
  };

  window.isPageRootOrFullWrapper = isPageRootOrFullWrapper;
  window.visbugPickElement = visbugPickElement;
  window.getElementTranslate = getElementTranslate;
  window.setElementTranslate = setElementTranslate;
  window.clearMultiSelection = clearMultiSelection;
  window.updateMultiSelectUI = updateMultiSelectUI;
  window.selectAllElements = selectAllElements;
  window.nudgeSelectedElements = nudgeSelectedElements;
  window.handleDragEnd = handleDragEnd;
  window.initMove = initMove;
})();
