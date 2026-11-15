/**
 * StylePeek Studio — Transform, Insert, Reorder & Undo Engine
 * js/sp_transform.js
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;
  const state = SP.state;

  let codeModal = null;
  let codeModalBadge = null;
  let codeModalTitle = null;
  let codeModalImgRow = null;
  let codeModalImgUrl = null;
  let codeModalImgApply = null;
  let codeModalTextarea = null;
  let codeModalApply = null;
  let codeModalCancel = null;
  let codeModalClose = null;

  function ensureTransformAttached() {
    codeModal = document.getElementById("sp-code-modal");
    if (codeModal) {
      codeModalBadge = codeModal.querySelector("#sp-code-modal-badge");
      codeModalTitle = codeModal.querySelector("#sp-code-modal-title");
      codeModalImgRow = codeModal.querySelector("#sp-code-modal-img-row");
      codeModalImgUrl = codeModal.querySelector("#sp-code-modal-img-url");
      codeModalImgApply = codeModal.querySelector("#sp-code-modal-img-apply");
      codeModalTextarea = codeModal.querySelector("#sp-code-modal-textarea");
      codeModalApply = codeModal.querySelector("#sp-code-modal-apply");
      codeModalCancel = codeModal.querySelector("#sp-code-modal-cancel");
      codeModalClose = codeModal.querySelector("#sp-code-modal-close");
    }
  }

  /* ── Blank-Click Text Insert & Element Insertion ── */
  function insertElementIntoLiveSite(newEl, toastMsg) {
    if (!newEl) return;
    if (window.ensurePositioned) window.ensurePositioned(newEl);

    if (state.selectedEl && state.selectedEl.parentElement && (!window.isOwn || !window.isOwn(state.selectedEl.parentElement))) {
      if (state.isDeepLayerMode && state.selectedEl !== document.body && state.selectedEl !== document.documentElement) {
        state.selectedEl.insertBefore(newEl, state.selectedEl.firstChild);
      } else {
        state.selectedEl.insertAdjacentElement("afterend", newEl);
      }
    } else {
      let centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      while (centerEl && ((window.isOwn && window.isOwn(centerEl)) || centerEl === document.documentElement || centerEl === document.body)) {
        centerEl = centerEl.parentElement;
      }
      if (centerEl && centerEl.parentElement && (!window.isOwn || !window.isOwn(centerEl.parentElement))) {
        centerEl.insertAdjacentElement("afterend", newEl);
      } else {
        const mainContainer = document.querySelector("main") || document.querySelector("#root") || document.querySelector("#__next") || document.body;
        mainContainer.appendChild(newEl);
      }
    }

    try {
      newEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {}

    if (typeof window.selectElement === "function") window.selectElement(newEl);
    state.undoStack.push({ type: "delete", node: newEl, parent: newEl.parentElement });
    if (toastMsg && window.showToast) window.showToast(toastMsg);
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
    img.style.zIndex = state.isDeepLayerMode ? "0" : "10000";
    img.style.cursor = "move";

    document.body.appendChild(img);
    if (window.ensurePositioned) window.ensurePositioned(img);
    state.undoStack.push({ type: "delete", node: img, parent: document.body });
    if (typeof window.selectElement === "function") window.selectElement(img);
    if (window.spPlayKeyClick) window.spPlayKeyClick(240);
    if (window.showToast) window.showToast("Image placed on page — drag anywhere or stretch corners");
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
    p.style.zIndex = state.isDeepLayerMode ? "0" : "10000";
    p.style.cursor = "text";
    p.style.minWidth = "60px";

    const targetParent = (container && container.nodeType === 1 && (!window.isOwn || !window.isOwn(container))) ? container : document.body;
    targetParent.appendChild(p);

    if (window.ensurePositioned) window.ensurePositioned(p);
    state.undoStack.push({ type: "delete", node: p, parent: targetParent });
    if (typeof window.selectElement === "function") window.selectElement(p);
    if (window.spPlayKeyClick) window.spPlayKeyClick(200);
    if (window.showToast) window.showToast("Text inserted — double-click to edit");
  }

  /* ── Sleek Code Transform Modal ── */
  function openCodeModal(target) {
    ensureTransformAttached();
    const el = target || state.selectedEl || window.__spLastH2DElement;
    if (!el || (window.isOwn && window.isOwn(el)) || (window.isPageRootOrFullWrapper && window.isPageRootOrFullWrapper(el))) {
      if (window.showToast) window.showToast("Select an element to transform code");
      return;
    }

    const root = document.getElementById("sp-root");
    if (root && root.style.display === "none") {
      root.style.setProperty("display", "block", "important");
    }

    if (typeof window.closeAllPopups === "function") window.closeAllPopups("codeModal");

    const tag = el.tagName.toLowerCase();
    if (codeModalBadge) codeModalBadge.textContent = `<${tag}>`;
    if (codeModalTitle) {
      codeModalTitle.textContent = tag === "img" ? "Transform Image Code & URL" : (tag === "button" ? "Transform Button Code" : "Transform Element Code");
    }

    if (tag === "img") {
      if (codeModalImgRow) codeModalImgRow.style.display = "flex";
      if (codeModalImgUrl) codeModalImgUrl.value = el.currentSrc || el.src || el.getAttribute("src") || "";
    } else {
      if (codeModalImgRow) codeModalImgRow.style.display = "none";
    }

    if (codeModalTextarea) {
      const clone = el.cloneNode(true);
      clone.classList.remove("sp-multi-selected", "sp-front-passthrough", "sp-layer-isolated");
      clone.querySelectorAll("#sp-root, [id^='sp-'], [class^='sp-']").forEach(n => n.remove());
      codeModalTextarea.value = clone.outerHTML || el.outerHTML || el.textContent || "";
    }

    if (codeModal) {
      codeModal.style.display = "flex";
      if (window.spPlayKeyClick) window.spPlayKeyClick(200);
      setTimeout(() => { codeModalTextarea?.focus(); }, 50);
    }
  }

  function closeCodeModal() {
    if (codeModal) codeModal.style.display = "none";
  }

  function applyCodeModalTransform() {
    if (!state.selectedEl) return;
    const newCode = (codeModalTextarea?.value || "").trim();
    if (!newCode) return;
    executeElementTransform(state.selectedEl, newCode, true);
  }

  /* ── Robust HTML Snippet & Document Parser ── */
  function parseTransformedHtml(newCode, refEl) {
    const raw = (newCode || "").trim();
    if (!raw) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    const styles = doc.querySelectorAll("style");
    styles.forEach(s => {
      if (s.textContent.trim()) {
        const pageStyle = document.createElement("style");
        pageStyle.textContent = s.textContent;
        document.head.appendChild(pageStyle);
      }
    });

    const isVisual = el => el && el.nodeType === Node.ELEMENT_NODE &&
      !["META", "SCRIPT", "TITLE", "LINK", "HEAD", "HTML", "BASE"].includes(el.tagName.toUpperCase());

    const bodyElements = Array.from(doc.body.children).filter(isVisual);
    if (bodyElements.length === 1) {
      return document.importNode(bodyElements[0], true);
    }
    if (bodyElements.length > 1) {
      const wrapperTag = refEl && refEl.tagName && !["IMG", "INPUT", "HR", "BR"].includes(refEl.tagName.toUpperCase())
        ? refEl.tagName.toLowerCase()
        : "div";
      const wrapper = document.createElement(wrapperTag);
      bodyElements.forEach(el => wrapper.appendChild(document.importNode(el, true)));
      return wrapper;
    }

    const allVisual = Array.from(doc.querySelectorAll("*")).filter(isVisual);
    if (allVisual.length === 1) {
      return document.importNode(allVisual[0], true);
    }
    if (allVisual.length > 1) {
      const topVisual = allVisual.find(el => el.parentElement === doc.body || el.parentElement === doc.documentElement) || allVisual[0];
      return document.importNode(topVisual, true);
    }

    const textContent = (doc.body.textContent || "").trim();
    return { isPlainText: true, text: textContent || raw };
  }

  function executeElementTransform(oldEl, newCode, isModal = false) {
    if (!oldEl) return;
    const parent = oldEl.parentElement;
    if (!parent || (window.isOwn && window.isOwn(parent))) {
      if (window.showToast) window.showToast("Cannot transform root container");
      return;
    }

    const parsed = parseTransformedHtml(newCode, oldEl);
    if (!parsed) {
      if (window.showToast) window.showToast("No valid content to apply");
      return;
    }

    if (parsed.isPlainText) {
      const oldText = oldEl.innerText || oldEl.textContent;
      state.undoStack.push({
        type: "text",
        node: oldEl,
        oldText: oldText,
        newText: parsed.text
      });
      oldEl.textContent = parsed.text;
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(oldEl);
      if (window.spPlayKeyClick) window.spPlayKeyClick(210);
      if (isModal) closeCodeModal();
      if (window.showToast) window.showToast("Element text updated live");
      return;
    }

    const newEl = parsed;
    if (["META", "HEAD", "TITLE"].includes(newEl.tagName.toUpperCase())) {
      if (window.showToast) window.showToast("Cannot replace with headless meta/head element");
      return;
    }

    const trans = window.getElementTranslate ? window.getElementTranslate(oldEl) : { x: 0, y: 0 };
    if (trans.x !== 0 || trans.y !== 0) {
      if (window.setElementTranslate) window.setElementTranslate(newEl, trans.x, trans.y);
    }
    const nextSib = oldEl.nextElementSibling;
    state.undoStack.push({
      type: "transform",
      oldEl: oldEl,
      newEl: newEl,
      parent: parent,
      nextSibling: nextSib
    });

    parent.replaceChild(newEl, oldEl);
    state.selectedEl = newEl;
    if (typeof window.selectElement === "function") window.selectElement(newEl);
    if (window.spPlayKeyClick) window.spPlayKeyClick(220);
    if (isModal) closeCodeModal();
    if (window.showToast) window.showToast("Transformed element into new HTML structure");
  }

  function applyElementTransform() {
    const area = document.getElementById("sp-transform-code");
    if (!area || !state.selectedEl) return;
    const code = area.value.trim();
    if (!code) return;
    executeElementTransform(state.selectedEl, code, false);
  }

  function deleteElementNode(target) {
    const el = target || state.selectedEl;
    if (!el || (window.isOwn && window.isOwn(el))) return;
    if (window.isPageRootOrFullWrapper && window.isPageRootOrFullWrapper(el)) {
      if (window.showToast) window.showToast("Cannot delete page root container");
      return;
    }
    state.undoStack.push({
      type: "delete",
      node: el,
      parent: el.parentNode,
      next: el.nextSibling
    });
    el.remove();
    if (el === state.selectedEl) {
      state.selectedEl = null;
      const selectBox = document.getElementById("sp-select-box");
      if (selectBox) selectBox.style.display = "none";
      if (typeof window.closeAllPopups === "function") window.closeAllPopups();
    }
    if (window.spPlayKeyClick) window.spPlayKeyClick(140);
    if (window.showToast) window.showToast("Element deleted (Ctrl+Z to undo)");
  }

  function copySelectedElement() {
    if (!state.selectedEl) return;
    SP.clipboardElement = state.selectedEl.cloneNode(true);
    if (window.showToast) window.showToast("Element copied (Ctrl+V to paste)");
  }

  function pasteClipboardElement() {
    if (!SP.clipboardElement) return;
    const clone = SP.clipboardElement.cloneNode(true);
    insertElementIntoLiveSite(clone, "Pasted duplicate element");
  }

  /* ── 5-Layer Bounded Array Reordering ── */
  function getLocalLayerStack(el) {
    if (!el || !el.parentElement || (window.isOwn && window.isOwn(el))) return { parent: null, stack: [] };
    const parent = el.parentElement;

    const siblings = Array.from(parent.children).filter(c => {
      if (!c || (window.isOwn && window.isOwn(c))) return false;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(c.tagName)) return false;
      const cs = window.getComputedStyle(c);
      if (cs.display === "none") return false;
      return true;
    });

    if (siblings.length <= 5) {
      return { parent, stack: siblings };
    }

    const idx = siblings.indexOf(el);
    let start = Math.max(0, idx - 2);
    let end = Math.min(siblings.length, start + 5);
    if (end - start < 5) start = Math.max(0, end - 5);
    return { parent, stack: siblings.slice(start, end) };
  }

  function moveElementToBackArray(el) {
    if (!el || (window.isOwn && window.isOwn(el))) return;
    const { parent, stack } = getLocalLayerStack(el);
    if (!parent || !stack.length) {
      if (window.showToast) window.showToast("Cannot reorder element");
      return;
    }

    if (window.spPlayKeyClick) window.spPlayKeyClick(150);

    const undoItems = stack.map(node => ({
      node,
      oldZ: node.style.zIndex,
      nextSibling: node.nextElementSibling,
      parent: node.parentElement
    }));
    state.undoStack.push({
      type: "layer-reorder",
      items: undoItems
    });

    const newStack = stack.filter(node => node !== el);
    newStack.unshift(el);

    newStack.forEach((node, i) => {
      if (window.ensurePositioned) window.ensurePositioned(node);
      const layerNum = i + 1;
      node.style.setProperty("z-index", String(layerNum), "important");
    });

    const nextInStack = newStack[1];
    if (nextInStack && nextInStack.parentElement === parent) {
      parent.insertBefore(el, nextInStack);
    } else {
      parent.insertBefore(el, parent.firstChild);
    }

    if (typeof window.updateSelectBox === "function") window.updateSelectBox(el);
    if (window.showToast) window.showToast(`Moved to back (Layer 1 of ${newStack.length} in layer array)`);
  }

  function bringElementToFrontArray(el) {
    if (!el || (window.isOwn && window.isOwn(el))) return;
    const { parent, stack } = getLocalLayerStack(el);
    if (!parent || !stack.length) {
      if (window.showToast) window.showToast("Cannot reorder element");
      return;
    }

    if (window.spPlayKeyClick) window.spPlayKeyClick(185);

    const undoItems = stack.map(node => ({
      node,
      oldZ: node.style.zIndex,
      nextSibling: node.nextElementSibling,
      parent: node.parentElement
    }));
    state.undoStack.push({
      type: "layer-reorder",
      items: undoItems
    });

    const newStack = stack.filter(node => node !== el);
    newStack.push(el);

    newStack.forEach((node, i) => {
      if (window.ensurePositioned) window.ensurePositioned(node);
      const layerNum = i + 1;
      node.style.setProperty("z-index", String(layerNum), "important");
    });

    const prevInStack = newStack[newStack.length - 2];
    if (prevInStack && prevInStack.nextElementSibling) {
      parent.insertBefore(el, prevInStack.nextElementSibling);
    } else {
      parent.appendChild(el);
    }

    if (typeof window.updateSelectBox === "function") window.updateSelectBox(el);
    if (window.showToast) window.showToast(`Brought to front (Layer ${newStack.length} of ${newStack.length} in layer array)`);
  }

  function sendElementToBack(el) {
    moveElementToBackArray(el);
  }

  function bringElementToFront(el) {
    bringElementToFrontArray(el);
  }

  /* ── Undo Stack Engine ── */
  function performUndo() {
    if (window.spPlayKeyClick) window.spPlayKeyClick(150);
    if (!state.undoStack.length) {
      if (window.showToast) window.showToast("Nothing to undo");
      return;
    }
    const action = state.undoStack.pop();

    if (action.type === "delete" && action.parent) {
      action.parent.insertBefore(action.node, action.next || null);
      if (window.showToast) window.showToast("Restored deleted element");
    } else if ((action.type === "html" || action.type === "transform") && action.parent) {
      if (action.nextSibling && action.nextSibling.parentElement === action.parent) {
        action.parent.insertBefore(action.oldEl, action.nextSibling);
        if (action.newEl && action.newEl.parentElement === action.parent) {
          action.newEl.remove();
        }
      } else {
        if (action.newEl && action.newEl.parentElement === action.parent) {
          action.parent.replaceChild(action.oldEl, action.newEl);
        } else {
          action.parent.appendChild(action.oldEl);
        }
      }
      state.selectedEl = action.oldEl;
      if (typeof window.selectElement === "function") window.selectElement(state.selectedEl);
      if (window.showToast) window.showToast("Restored previous code");
    } else if (action.type === "style" && action.node) {
      if (action.oldStyle) {
        action.node.setAttribute("style", action.oldStyle);
      } else {
        action.node.removeAttribute("style");
      }
      if (window.ensurePositioned) window.ensurePositioned(action.node);
      if (typeof window.selectElement === "function") window.selectElement(action.node);
      if (window.showToast) window.showToast("Restored previous CSS styles");
    } else if (action.type === "text" && action.node) {
      if (action.oldHtml !== undefined) {
        action.node.innerHTML = action.oldHtml;
      } else if (action.oldText !== undefined) {
        action.node.innerText = action.oldText;
      }
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(action.node);
      if (window.showToast) window.showToast("Restored original text");
    } else if (action.type === "move" && action.node) {
      const prev = action.oldTranslate || { x: 0, y: 0 };
      if (window.setElementTranslate) window.setElementTranslate(action.node, prev.x, prev.y);
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(action.node);
      if (window.showToast) window.showToast("Restored original position");
    } else if (action.type === "multi-move" && Array.isArray(action.items)) {
      for (const item of action.items) {
        if (item.el && window.setElementTranslate) {
          window.setElementTranslate(item.el, item.oldX, item.oldY);
        }
      }
      if (typeof window.updateMultiSelectUI === "function") window.updateMultiSelectUI();
      if (window.showToast) window.showToast(`Restored positions of ${action.items.length} elements`);
    } else if (action.type === "resize" && action.node) {
      action.node.style.width = action.oldW;
      action.node.style.height = action.oldH;
      if (action.oldTranslate && window.setElementTranslate) {
        window.setElementTranslate(action.node, action.oldTranslate.x, action.oldTranslate.y);
      }
      if (typeof window.updateSelectBox === "function") window.updateSelectBox(action.node);
      if (window.showToast) window.showToast("Restored original dimensions");
    } else if (action.type === "layer-reorder" && Array.isArray(action.items)) {
      for (const item of action.items) {
        if (item.node && item.parent) {
          item.parent.insertBefore(item.node, item.nextSibling || null);
          if (item.oldZ) item.node.style.zIndex = item.oldZ;
          else item.node.style.removeProperty("z-index");
        }
      }
      if (state.selectedEl && typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
      if (window.showToast) window.showToast("Restored layer order");
    }
  }

  function initTransformEvents() {
    ensureTransformAttached();

    codeModalImgApply?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(170);
      if (!state.selectedEl) return;
      const url = (codeModalImgUrl?.value || "").trim();
      if (!url) return;
      if (state.selectedEl.tagName === "IMG") {
        state.selectedEl.src = url;
        if (codeModalTextarea) codeModalTextarea.value = state.selectedEl.outerHTML;
        if (typeof window.updateSelectBox === "function") window.updateSelectBox(state.selectedEl);
        if (window.showToast) window.showToast("Image source updated live");
      }
    });

    codeModalImgUrl?.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        codeModalImgApply?.click();
      }
    });

    codeModalApply?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(180);
      applyCodeModalTransform();
    });

    codeModalCancel?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(150);
      closeCodeModal();
    });

    codeModalClose?.addEventListener("click", () => {
      if (window.spPlayKeyClick) window.spPlayKeyClick(150);
      closeCodeModal();
    });

    codeModal?.addEventListener("click", e => {
      if (e.target === codeModal) closeCodeModal();
    });

    codeModalTextarea?.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        applyCodeModalTransform();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeCodeModal();
      }
    });

    // Window drag-and-drop image drop
    window.addEventListener("dragover", e => {
      if (!state.isEnabled) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    }, true);

    window.addEventListener("drop", e => {
      if (!state.isEnabled || (window.isOwn && window.isOwn(e.target))) return;
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const imgFile = Array.from(files).find(f => f.type && f.type.startsWith("image/"));
        if (imgFile) {
          e.preventDefault(); e.stopPropagation();
          const reader = new FileReader();
          reader.onload = ev => insertDroppedImage(ev.target.result, e.clientX, e.clientY);
          reader.readAsDataURL(imgFile);
          return;
        }
      }
      const textData = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "";
      if (textData && (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(textData.trim()) || textData.startsWith("data:image/"))) {
        e.preventDefault(); e.stopPropagation();
        insertDroppedImage(textData.trim(), e.clientX, e.clientY);
      }
    }, true);
  }

  function initTransform() {
    ensureTransformAttached();
    initTransformEvents();
  }

  /* ── Export ── */
  SP.transform = {
    initTransform,
    insertNewTextAt,
    insertDroppedImage,
    insertElementIntoLiveSite,
    openCodeModal,
    closeCodeModal,
    applyCodeModalTransform,
    parseTransformedHtml,
    executeElementTransform,
    applyElementTransform,
    deleteElementNode,
    copySelectedElement,
    pasteClipboardElement,
    moveElementToBackArray,
    bringElementToFrontArray,
    sendElementToBack,
    bringElementToFront,
    performUndo
  };

  window.insertNewTextAt = insertNewTextAt;
  window.insertDroppedImage = insertDroppedImage;
  window.insertElementIntoLiveSite = insertElementIntoLiveSite;
  window.openCodeModal = openCodeModal;
  window.closeCodeModal = closeCodeModal;
  window.applyCodeModalTransform = applyCodeModalTransform;
  window.executeElementTransform = executeElementTransform;
  window.applyElementTransform = applyElementTransform;
  window.deleteElementNode = deleteElementNode;
  window.copySelectedElement = copySelectedElement;
  window.pasteClipboardElement = pasteClipboardElement;
  window.moveElementToBackArray = moveElementToBackArray;
  window.bringElementToFrontArray = bringElementToFrontArray;
  window.sendElementToBack = sendElementToBack;
  window.bringElementToFront = bringElementToFront;
  window.performUndo = performUndo;
  window.initTransform = initTransform;
})();
