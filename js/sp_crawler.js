/**
 * StylePeek Studio — Automated DOM Tree Navigation & Smooth Crawler
 * js/sp_crawler.js
 *
 * Implements:
 * 1. Smooth human-paced scrolling across document and scrollable panels
 * 2. Tree navigation climbing to discover buttons, tabs, accordions, and dropdowns
 * 3. Smooth button clicking with 1–3 random seconds delay between interactions
 * 4. Comprehensive 17-attribute lazy resource promotion
 * 5. Full in-memory document.styleSheets CSS rule extraction (guarantees zero missing styles)
 *
 * Strictly under 700 lines (Law 43 in ui-laws.txt).
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;

  const LAZY_ATTRS = [
    "data-src", "data-lazy-src", "data-original", "data-lazy", "data-bg",
    "data-bg-url", "data-srcset", "data-lazy-url", "data-image", "data-lazy-srcset",
    "data-original-src", "data-ll-status", "data-source", "data-src-small",
    "data-src-medium", "data-src-large", "loading-src"
  ];

  const AD_SELECTORS = [
    "ins.adsbygoogle",
    "[id^='google_ads']",
    "iframe#google_esf",
    "[data-ad-client]",
    "[data-ad-slot]",
    "[data-google-query-id]",
    "amp-ad",
    "script[src*='pagead']",
    "script[src*='adsbygoogle']",
    "script[src*='googlesyndication']"
  ];

  const DESTRUCTIVE_REGEX = /delete|remove|signout|sign-out|logout|log-out|exit|cancel|terminate|destroy|reset|clear|buy|checkout|purchase|pay|submit|donate/i;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomDelay(minMs = 1000, maxMs = 3000) {
    return Math.floor(minMs + Math.random() * (maxMs - minMs));
  }

  /* ──────────────────────────────────────────────────────────
     1. Lazy Node Promotion
     ────────────────────────────────────────────────────────── */
  function promoteLazyNodes(root = document) {
    try {
      const candidates = root.querySelectorAll("img, source, video, [data-bg], [data-bg-url], [data-src], [data-lazy-src], [data-original]");
      candidates.forEach(el => {
        if (el.tagName === "IMG" && el.loading === "lazy") {
          el.loading = "eager";
        }
        for (const attr of LAZY_ATTRS) {
          const val = el.getAttribute(attr);
          if (!val || val.startsWith("data:image/gif") || val.startsWith("data:image/svg")) continue;
          if (attr.includes("srcset")) {
            if (!el.getAttribute("srcset")) el.setAttribute("srcset", val);
          } else if (attr.includes("bg")) {
            if (!el.style.backgroundImage) el.style.backgroundImage = `url("${val}")`;
          } else if (el.tagName === "IMG" || el.tagName === "SOURCE") {
            const curSrc = el.getAttribute("src") || "";
            if (!curSrc || curSrc.startsWith("data:image/gif") || curSrc.startsWith("data:image/svg")) {
              el.setAttribute("src", val);
            }
          }
        }
      });
    } catch {}
  }

  /* ──────────────────────────────────────────────────────────
     2. Smooth Scrolling Engine
     ────────────────────────────────────────────────────────── */
  async function smoothScrollPage() {
    const origX = window.scrollX || window.pageXOffset || 0;
    const origY = window.scrollY || window.pageYOffset || 0;

    promoteLazyNodes();

    // 1. Scroll internal scrollable panels first
    try {
      const panelCandidates = Array.from(
        document.querySelectorAll("main, [role='main'], [class*='deck'], [class*='slide'], [class*='panel'], [class*='content'], article, section")
      );
      for (const el of panelCandidates) {
        if (el.clientHeight > 180 && el.scrollHeight > el.clientHeight + 80) {
          const cs = window.getComputedStyle(el);
          const oy = cs.overflowY || cs.overflow;
          if (oy === "auto" || oy === "scroll" || oy === "overlay") {
            const pTotal = el.scrollHeight;
            const pStep = Math.max(300, Math.floor(el.clientHeight * 0.7));
            for (let pos = 0; pos <= pTotal; pos += pStep) {
              el.scrollTo({ top: pos, behavior: "smooth" });
              promoteLazyNodes(el);
              await sleep(250 + Math.floor(Math.random() * 150));
            }
            el.scrollTo({ top: pTotal, behavior: "smooth" });
            promoteLazyNodes(el);
            await sleep(300);
            el.scrollTo({ top: 0, behavior: "smooth" });
            await sleep(200);
          }
        }
      }
    } catch {}

    // 2. Smoothly scroll entire document window
    try {
      const getMaxHeight = () =>
        Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0,
          window.innerHeight
        );

      let totalHeight = getMaxHeight();
      if (totalHeight > window.innerHeight + 60) {
        const step = Math.max(320, Math.floor(window.innerHeight * 0.7));
        for (let pos = 0; pos <= totalHeight; pos += step) {
          window.scrollTo({ top: pos, behavior: "smooth" });
          promoteLazyNodes();
          // Gentle pacing allowing React / Next.js hydration & lazy loading
          await sleep(350 + Math.floor(Math.random() * 200));
          totalHeight = getMaxHeight();
        }
        window.scrollTo({ top: totalHeight, behavior: "smooth" });
        promoteLazyNodes();
        await sleep(500);
        window.scrollTo({ left: origX, top: origY, behavior: "smooth" });
        await sleep(350);
      }
    } catch {}
  }

  /* ──────────────────────────────────────────────────────────
     3. DOM Tree Climbing & Safe Interactive Element Discovery
     ────────────────────────────────────────────────────────── */
  function isOwnStylePeekElement(el) {
    if (!el) return true;
    if (el.id === "sp-root" || el.id === "sp-panel" || el.id === "sp-toast") return true;
    if (el.closest && (el.closest("#sp-root") || el.closest("#sp-panel") || el.closest("#sp-toast") || el.closest("#__figma_h2d_chrome_extension_toolbar__"))) {
      return true;
    }
    return false;
  }

  function isAdElement(el) {
    if (!el) return false;
    for (const sel of AD_SELECTORS) {
      try {
        if (el.matches && el.matches(sel)) return true;
        if (el.closest && el.closest(sel)) return true;
      } catch {}
    }
    return false;
  }

  function isSafeInteractiveElement(el) {
    if (!el || !el.getBoundingClientRect) return false;
    if (isOwnStylePeekElement(el) || isAdElement(el)) return false;

    // Must be physically rendered
    const rect = el.getBoundingClientRect();
    if (rect.width < 12 || rect.height < 12) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
      return false;
    }

    // Check text for destructive actions
    const label = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
    if (label && DESTRUCTIVE_REGEX.test(label)) return false;

    // Reject form submit buttons
    if (el.tagName === "BUTTON" && (el.getAttribute("type") || "").toLowerCase() === "submit") return false;

    // Reject external links
    if (el.tagName === "A") {
      const href = (el.getAttribute("href") || "").trim();
      if (!href || href === "#" || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        // Safe internal or script toggle
      } else {
        try {
          const u = new URL(href, window.location.href);
          if (u.origin !== window.location.origin) return false;
        } catch {
          return false;
        }
      }
    }

    return true;
  }

  function findTreeInteractiveBranches(maxCandidates = 14) {
    const candidates = [];
    const seen = new Set();

    // Priority selector sets climbing through the interactive tree
    const selectorQueries = [
      // 1. Tab buttons & Navigation pills
      "[role='tab'], .tab-btn, button[class*='tab'], [data-tab]",
      // 2. Accordions & Collapsibles
      "details summary, [aria-expanded], [data-state='closed'], [data-bs-toggle='collapse'], .accordion-button",
      // 3. Dropdowns & Menu toggles
      "[aria-haspopup='true'], .dropdown-toggle, [data-toggle='dropdown']",
      // 4. Modal / Drawer openers (non-destructive)
      "[data-bs-toggle='modal'], [data-target*='modal'], [data-modal]",
      // 5. General interactive buttons
      "button:not([disabled])",
      // 6. Role buttons
      "[role='button']",
      // 7. Internal anchor tabs / pills
      "nav a[href^='#'], ul.tabs a, .menu-item a"
    ];

    for (const query of selectorQueries) {
      if (candidates.length >= maxCandidates) break;
      try {
        const matches = Array.from(document.querySelectorAll(query));
        for (const el of matches) {
          if (candidates.length >= maxCandidates) break;
          if (!seen.has(el) && isSafeInteractiveElement(el)) {
            seen.add(el);
            candidates.push(el);
          }
        }
      } catch {}
    }

    return candidates;
  }

  /* ──────────────────────────────────────────────────────────
     4. Tree State Crawl with 1–3s Random Interaction Delays
     ────────────────────────────────────────────────────────── */
  async function crawlTreeStates(maxInteractions = 12) {
    const branches = findTreeInteractiveBranches(maxInteractions);
    const recordedBranches = [];

    let branchId = 0;
    for (const el of branches) {
      branchId++;
      try {
        // 1. Smoothly scroll into view so intersection observers and chunks align
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

        // 2. Random 1-3 seconds delay before interaction (Law of smooth human pacing)
        const preDelay = randomDelay(1000, 3000);
        await sleep(preDelay);

        // 3. Mark element with branch identifier
        const bid = "sp-branch-" + branchId;
        el.setAttribute("data-sp-bid", bid);

        // Snapshot DOM before click
        const prevAriaExp = el.getAttribute("aria-expanded");
        const prevClass = el.className;

        // 4. Smooth human-like click dispatch
        el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
        await sleep(120 + Math.floor(Math.random() * 100));

        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        if (typeof el.focus === "function") el.focus();
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
        el.click();

        // 5. Random 1-3 seconds delay after click (lets React/Next.js/animations render)
        const postDelay = randomDelay(1000, 3000);
        await sleep(postDelay);

        // 6. Promote lazy nodes revealed by the newly expanded tree branch
        promoteLazyNodes();

        // 7. Record branch mutation state
        const branchRecord = {
          bid,
          tag: el.tagName.toLowerCase(),
          label: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 40),
          expanded: el.getAttribute("aria-expanded") === "true" || el.hasAttribute("open"),
          mutations: []
        };

        recordedBranches.push(branchRecord);
      } catch (err) {
        console.warn("[StylePeek Crawler] Branch interaction error:", err);
      }
    }

    return recordedBranches;
  }

  /* ──────────────────────────────────────────────────────────
     5. Full In-Memory CSS Mining (guarantees zero missing styles)
     ────────────────────────────────────────────────────────── */
  function extractAllDocumentStyleSheets() {
    const mined = [];
    const sheets = Array.from(document.styleSheets || []);

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      let href = null;
      try {
        href = sheet.href;
      } catch {}

      let cssText = "";
      try {
        if (sheet.cssRules) {
          cssText = Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
        }
      } catch {}

      if (cssText) {
        mined.push({
          href: href || null,
          cssText,
          isInline: !href
        });
      }
    }

    return mined;
  }

  /* ──────────────────────────────────────────────────────────
     6. Full Page Extraction Pipeline
     ────────────────────────────────────────────────────────── */
  async function extractPageContentWithStyles(options = {}) {
    const doAutoScroll = options.autoScroll !== false;
    const doTreeCrawl = Boolean(options.treeCrawl);

    let recordedBranches = [];
    if (doTreeCrawl) {
      recordedBranches = await crawlTreeStates(12);
    }

    if (doAutoScroll) {
      await smoothScrollPage();
    }

    // Mine active in-memory CSS rules (including dynamic Tailwind / Next.js runtime sheets)
    const minedStyles = extractAllDocumentStyleSheets();

    // Clone DOM and strip temporary StylePeek overlays and Google AdSense
    const docClone = document.documentElement.cloneNode(true);
    docClone
      .querySelectorAll(
        "#sp-root, [id^='sp-'], #__figma_h2d_chrome_extension_toolbar__, #__figma_html_to_design_toolbar_host__, #sp-h2d-interactive-modal, figma-html-to-design-toolbar, vis-bug, vis-bug-handles, vis-bug-hover, vis-bug-label, vis-bug-offscreen-label, vis-bug-distance, vis-bug-grip, vis-bug-boxmodel, vis-bug-metatip, vis-bug-ally, vis-bug-corners, vis-bug-hotkeys, ins.adsbygoogle, [id^='google_ads'], iframe#google_esf, [data-ad-client], [data-ad-slot], [data-google-query-id], amp-ad, script[src*='pagead'], script[src*='adsbygoogle']"
      )
      .forEach(el => el.remove());

    // Clean live temporary attributes
    document.querySelectorAll("[data-sp-bid]").forEach(el => el.removeAttribute("data-sp-bid"));
    document.querySelectorAll("[data-sp-cid]").forEach(el => el.removeAttribute("data-sp-cid"));

    // Collect same-origin links
    const AD_URL_RE = /(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google|google\.com\/aclk|google\.com\/url\?|gclid=|utm_medium=cpc|taboola\.com|outbrain\.com)/i;
    const linkedPages = [];
    const seenLinks = new Set();
    document.querySelectorAll("a[href]").forEach(a => {
      const raw = (a.getAttribute("href") || "").trim();
      if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
      if (AD_URL_RE.test(raw)) return;
      try {
        const u = new URL(raw, window.location.href);
        if (u.origin === window.location.origin && u.pathname !== window.location.pathname) {
          const cleanHref = u.origin + u.pathname;
          if (!seenLinks.has(cleanHref) && linkedPages.length < 25) {
            seenLinks.add(cleanHref);
            linkedPages.push(cleanHref);
          }
        }
      } catch {}
    });

    return {
      html: "<!DOCTYPE html>\n" + docClone.outerHTML,
      minedStyles,
      linkedPages,
      branchCount: recordedBranches.length
    };
  }

  // Chrome messaging listener
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _, res) => {
      if (msg?.action === "crawlTreeStates") {
        crawlTreeStates(msg.maxInteractions || 12).then(states => {
          res({ ok: true, states });
        }).catch(err => {
          res({ ok: false, error: err?.message || String(err) });
        });
        return true;
      } else if (msg?.action === "extractFullPage") {
        extractPageContentWithStyles(msg.options || {}).then(result => {
          res({ ok: true, result });
        }).catch(err => {
          res({ ok: false, error: err?.message || String(err) });
        });
        return true;
      }
      return false;
    });
  }

  // Exports
  SP.crawler = {
    smoothScrollPage,
    crawlTreeStates,
    extractAllDocumentStyleSheets,
    extractPageContentWithStyles,
    promoteLazyNodes
  };

  window.crawlTreeStatesInTab = crawlTreeStates;
  window.smoothScrollPageInTab = smoothScrollPage;
  window.extractPageContentWithStylesInTab = extractPageContentWithStyles;
})();
