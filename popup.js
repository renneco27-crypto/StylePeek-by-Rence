const btn = document.getElementById("toggleBtn");
const captureBtn = document.getElementById("captureBtn");
const label = document.getElementById("toggleLabel");
const statusMsg = document.getElementById("statusMsg");

function setActiveUI(isActive) {
  btn.classList.toggle("active", isActive);
  label.textContent = isActive ? "Stop inspecting" : "Start inspecting";
  statusMsg.textContent = isActive ? "Hover the page, then click an element." : "";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isRestrictedUrl(url) {
  return !url || /^(chrome|edge|about|chrome-extension|edge-extension|https:\/\/chrome\.google\.com\/webstore|https:\/\/microsoftedge\.microsoft\.com\/addons)/.test(url);
}

async function ensureContentScript(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}

async function sendMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // content script probably isn't injected yet (e.g. page loaded before install)
    await ensureContentScript(tabId);
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

const toolButtons = {
  move: document.getElementById("toolMove"),
  palette: document.getElementById("toolColor"),
  typo: document.getElementById("toolFont"),
  delete: document.getElementById("toolDelete"),
};

function setToolUI(activeMode) {
  Object.entries(toolButtons).forEach(([mode, el]) => {
    if (!el) return;
    el.classList.toggle("active", activeMode === mode);
  });
}

async function init() {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) {
    statusMsg.textContent = "This page can't be inspected (browser/system pages aren't supported).";
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });
    const isInspecting = !!(res && res.inspecting);
    setActiveUI(isInspecting);
    if (res && res.mode && res.mode !== "none") {
      setToolUI(res.mode);
      statusMsg.textContent = `${res.mode.toUpperCase()} mode active • Press Esc to exit`;
    } else {
      setToolUI(null);
    }
  } catch (err) {
    setActiveUI(false);
    setToolUI(null);
  }
}

Object.entries(toolButtons).forEach(([mode, btnEl]) => {
  if (!btnEl) return;
  btnEl.addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab || isRestrictedUrl(tab.url)) return;
    try {
      await sendMessage(tab.id, { action: "startTool", mode });
      window.close(); // Close popup immediately so user can work on the page
    } catch (err) {
      statusMsg.textContent = "Could not activate tool. Reload page and try again.";
    }
  });
});

captureBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) return;
  try {
    statusMsg.textContent = "Capturing rendered viewport...";
    await sendMessage(tab.id, { action: "captureViewport" });
    statusMsg.textContent = "Viewport downloaded!";
    setTimeout(() => window.close(), 1000);
  } catch (err) {
    statusMsg.textContent = "Capture failed. Try reloading the page first.";
  }
});

btn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) return;
  try {
    const res = await sendMessage(tab.id, { action: "toggleInspect" });
    setActiveUI(!!(res && res.inspecting));
    if (res && res.inspecting) window.close(); // let the person see the page immediately
  } catch (err) {
    statusMsg.textContent = "Couldn't start on this page. Try reloading it once, then try again.";
  }
});

init();
