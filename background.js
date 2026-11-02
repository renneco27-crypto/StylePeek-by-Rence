// StylePeek Studio - Background Service Worker (Manifest V3)
// Handles native downloads across web pages and local file:/// HTML documents

chrome.runtime.onInstalled.addListener(() => {
  console.log("[StylePeek] Background Service Worker ready.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadFile") {
    const filename = request.filename || "slide-export.html";
    const url = request.url;

    if (!url) {
      sendResponse({ success: false, error: "No URL provided for download" });
      return false;
    }

    try {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false,
        conflictAction: "uniquify"
      }, downloadId => {
        if (chrome.runtime.lastError) {
          console.warn("[StylePeek] chrome.downloads error:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
      return true; // Keep channel open for async response
    } catch (err) {
      console.error("[StylePeek] chrome.downloads exception:", err);
      sendResponse({ success: false, error: err.message });
      return false;
    }
  }
});
