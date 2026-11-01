const masterToggle     = document.getElementById("masterToggle");
const masterSwitchCard = document.querySelector(".master-switch-card");
const statusDot        = document.getElementById("statusDot");
const switchTitle      = document.getElementById("switchTitle");
const switchDesc       = document.getElementById("switchDesc");
const captureBtn       = document.getElementById("captureBtn");
const statusMsg        = document.getElementById("statusMsg");

const tools = {
  inspect: document.getElementById("toolInspect"),
  move:    document.getElementById("toolMove"),
  resize:  document.getElementById("toolResize"),
  color:   document.getElementById("toolColor"),
  layers:  document.getElementById("toolLayers"),
  code:    document.getElementById("toolCode"),
  delete:  document.getElementById("toolDelete"),
};

function updateSwitchUI(isOn, activeMode = "inspect") {
  masterToggle.checked = isOn;
  masterSwitchCard.classList.toggle("active", isOn);
  statusDot.classList.toggle("active", isOn);
  if (isOn) {
    switchTitle.textContent = "StylePeek: ON";
    switchDesc.textContent = `Active (${activeMode.toUpperCase()}) • Hover & click elements`;
  } else {
    switchTitle.textContent = "StylePeek: OFF";
    switchDesc.textContent = "Normal browsing • Canvas untouched";
  }

  Object.entries(tools).forEach(([mode, btn]) => {
    if (!btn) return;
    btn.classList.toggle("active", isOn && activeMode === mode);
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isRestrictedUrl(url) {
  return !url || /^(chrome|edge|about|chrome-extension|edge-extension|https:\/\/chrome\.google\.com\/webstore|https:\/\/microsoftedge\.microsoft\.com\/addons)/.test(url);
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  } catch (e) {}
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (e) {}
}

async function sendTabMessage(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // If not injected, inject and retry
    await ensureContentScript(tabId);
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

async function init() {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) {
    switchTitle.textContent = "Unavailable";
    switchDesc.textContent = "Browser system pages cannot be inspected";
    masterToggle.disabled = true;
    captureBtn.disabled = true;
    captureBtn.style.opacity = "0.5";
    return;
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action: "getStatus" });
    if (res && res.active) {
      updateSwitchUI(true, res.mode || "inspect");
      statusMsg.textContent = `StylePeek is running (${res.mode || "inspect"})`;
    } else {
      updateSwitchUI(false);
    }
  } catch (err) {
    updateSwitchUI(false);
  }
}

masterToggle.addEventListener("change", async () => {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) return;

  const wantOn = masterToggle.checked;
  if (wantOn) {
    updateSwitchUI(true, "inspect");
    statusMsg.textContent = "Activating StylePeek...";
    try {
      await sendTabMessage(tab.id, { action: "turnOn", mode: "inspect" });
      statusMsg.textContent = "StylePeek ON • Click an element on page";
      setTimeout(() => window.close(), 600);
    } catch (e) {
      statusMsg.textContent = "Failed to activate. Reload the page.";
    }
  } else {
    updateSwitchUI(false);
    try {
      await sendTabMessage(tab.id, { action: "turnOff" });
      statusMsg.textContent = "StylePeek OFF • Page restored";
      setTimeout(() => window.close(), 400);
    } catch (e) {}
  }
});

Object.entries(tools).forEach(([mode, btn]) => {
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab || isRestrictedUrl(tab.url)) return;

    updateSwitchUI(true, mode);
    statusMsg.textContent = `Activating ${mode.toUpperCase()} mode...`;
    try {
      await sendTabMessage(tab.id, { action: "startTool", mode });
      window.close(); // Immediate focus on the page
    } catch (err) {
      statusMsg.textContent = "Could not activate tool. Reload page.";
    }
  });
});

captureBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab || isRestrictedUrl(tab.url)) return;
  try {
    statusMsg.textContent = "Exploring branches & capturing full site...";
    await sendTabMessage(tab.id, { action: "captureViewport" });
    setTimeout(() => window.close(), 400);
  } catch (err) {
    statusMsg.textContent = "Capture failed. Try reloading the page first.";
  }
});

init();
