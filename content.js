(function () {
  if (window.__stylePeekInjected) return;
  window.__stylePeekInjected = true;

  let inspecting = false, selectedEl = null, hoveredEl = null;
  let panes = {}, activeTab = "html", animatedAncestor = null;
  let panelPos = { top: "20px", right: "20px", left: null };
  let siblingsMode = false;

  /* ── scaffold ── */
  const root = document.createElement("div");
  root.id = "sp-root";
  root.innerHTML = `
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
          <span id="sp-copy-label"></span>
          <button id="sp-copy-btn">Copy</button>
        </div>
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
  const copyBtn     = root.querySelector("#sp-copy-btn");
  const copyLabel   = root.querySelector("#sp-copy-label");
  const ancestorBar = root.querySelector("#sp-ancestor-bar");
  const ancestorMsg = root.querySelector("#sp-ancestor-msg");
  const ancestorBtn = root.querySelector("#sp-ancestor-btn");

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
    codeEl.textContent = panes[tab] || "";
    copyLabel.textContent = tab.toUpperCase();
    copyBtn.textContent = "Copy";
    copyBtn.classList.remove("sp-copied");
  }

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
    if (msg.action === "toggleInspect") { inspecting ? stopInspecting() : startInspecting(); res({ inspecting }); }
    else if (msg.action === "getStatus") { res({ inspecting, hasSelection: !!selectedEl }); }
    return true;
  });

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

    return [...needed].join("\n\n") + (Object.keys(keyframes).length ? "\n\n" + Object.values(keyframes).join("\n\n") : "");
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

  /* ── CodePen export — THE KEY FIX ──
     HTML  → just the element's outerHTML
     CSS   → ALL rules that match the element OR any of its children
             so the component renders correctly with all its styling
     JS    → only JS, never mixed with CSS
  ── */
  function openCodePen() {
    if (!selectedEl) return;

    // ── Determine export root: siblings mode uses the parent container ──
    const exportRoot = (siblingsMode && selectedEl.parentElement && !root.contains(selectedEl.parentElement))
      ? selectedEl.parentElement
      : selectedEl;

    // ── HTML ──
    const htmlOut = exportRoot.outerHTML;

    // ── CSS: all rules for element + descendants + ancestor hover rules ──
    let cssOut = mineAllNeededRules(exportRoot);

    // Inject a body background that matches the page so dark components aren't invisible.
    // We snapshot the actual computed background of <body> and <html>.
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
    cssOut = bodyCSS + "\n\n" + cssOut;

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
    document.body.removeChild(form);
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
