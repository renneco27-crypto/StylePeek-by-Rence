/* ══════════════════════════════════════════════════════════════════════════
   Hybrid Background Service Worker:
   1. Website Code Extractor & Downloader (foppgeakfpkdghmmmflmblcidoofpohm + StylePeek)
   2. H2D Element & Code Capture Engine (fkmaohpngenfoccdgceedjkfhkdcohmg)
   3. VisBug Live Dragging & Design Tools (kdmdoinnkaeognnpegpkepdnggeaodkn)
   ══════════════════════════════════════════════════════════════════════════ */

const TOOLBAR_CAPTURES_STORAGE_KEY_PREFIX = "figma_h2d_toolbar_captures_";
const TOOLBAR_OPEN_STORAGE_KEY_PREFIX = "figma_h2d_toolbar_open_";

class ToolbarTabStorage {
  constructor(tabId) {
    this.tabId = tabId;
    this.capturesKey = `${TOOLBAR_CAPTURES_STORAGE_KEY_PREFIX}${this.tabId}`;
    this.openKey = `${TOOLBAR_OPEN_STORAGE_KEY_PREFIX}${this.tabId}`;
  }
  static forTab(tabId) {
    return new ToolbarTabStorage(tabId);
  }
  async isOpen() {
    return (await chrome.storage.local.get(this.openKey))[this.openKey] ?? false;
  }
  async open() {
    await chrome.storage.local.set({ [this.openKey]: true });
  }
  async close() {
    await chrome.storage.local.remove(this.openKey);
  }
  async clear() {
    await chrome.storage.local.remove([this.capturesKey, this.openKey]);
  }
}

/* ──────────────────────────────────────────────────────────
   MHTML Reader & Code Capture (from fkmaohpngenfoccdgceedjkfhkdcohmg)
   ────────────────────────────────────────────────────────── */
const HEADER_CONTINUATION_REGEX = /\r?\n[ \t]+/g;
const LINE_SPLIT_REGEX = /\r?\n/;
const CONTENT_TYPE_BOUNDARY_REGEX = /boundary=(?:"([^"]+)"|([^;\s]+))/i;
const CONTENT_TYPE_CHARSET_REGEX = /charset=(?:"([^"]+)"|([^;\s]+))/i;
const SOFT_LINE_BREAK_REGEX = /=\r?\n/g;
const QUOTED_PRINTABLE_HEX_REGEX = /=([0-9A-Fa-f]{2})/g;
const TEXT_MIME_TYPES = new Set([
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "image/svg+xml",
  "application/xml",
  "text/xml",
  "application/json",
  "text/plain"
]);

function isTextMimeType(mimeType) {
  return TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith("text/");
}

function parseHeaders(rawHeaders) {
  const unfolded = rawHeaders.replace(HEADER_CONTINUATION_REGEX, " ");
  const headers = new Map();
  for (const line of unfolded.split(LINE_SPLIT_REGEX)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    headers.set(key, value);
  }
  return headers;
}

function splitHeaderAndBody(rawPart) {
  const crlfIndex = rawPart.indexOf("\r\n\r\n");
  if (crlfIndex !== -1) {
    return [rawPart.slice(0, crlfIndex), rawPart.slice(crlfIndex + 4)];
  }
  const lfIndex = rawPart.indexOf("\n\n");
  if (lfIndex !== -1) {
    return [rawPart.slice(0, lfIndex), rawPart.slice(lfIndex + 2)];
  }
  return null;
}

function decodeQuotedPrintableBytes(input) {
  const withoutSoftBreaks = input.replace(SOFT_LINE_BREAK_REGEX, "");
  const bytes = [];
  let index = 0;
  while (index < withoutSoftBreaks.length) {
    if (withoutSoftBreaks[index] === "=") {
      const hex = withoutSoftBreaks.slice(index + 1, index + 3);
      if (QUOTED_PRINTABLE_HEX_REGEX.test(`=${hex}`)) {
        bytes.push(parseInt(hex, 16));
        index += 3;
        QUOTED_PRINTABLE_HEX_REGEX.lastIndex = 0;
        continue;
      }
      QUOTED_PRINTABLE_HEX_REGEX.lastIndex = 0;
    }
    bytes.push(withoutSoftBreaks.charCodeAt(index));
    index += 1;
  }
  return new Uint8Array(bytes);
}

function decodeQuotedPrintableText(input, charset) {
  const bytes = decodeQuotedPrintableBytes(input);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function encodeBytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function decodeBase64ToText(input, charset) {
  const cleaned = input.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function extractCharset(contentTypeHeader) {
  if (!contentTypeHeader) return "utf-8";
  const match = CONTENT_TYPE_CHARSET_REGEX.exec(contentTypeHeader);
  return (match?.[1] ?? match?.[2] ?? "utf-8").trim().toLowerCase();
}

function extractMimeType(contentTypeHeader) {
  if (!contentTypeHeader) return "application/octet-stream";
  const semi = contentTypeHeader.indexOf(";");
  const raw = semi === -1 ? contentTypeHeader : contentTypeHeader.slice(0, semi);
  return raw.trim().toLowerCase() || "application/octet-stream";
}

function parsePart(rawPart) {
  const split = splitHeaderAndBody(rawPart);
  if (!split) return null;
  const [rawHeaders, rawBody] = split;
  const headers = parseHeaders(rawHeaders);
  const contentType = headers.get("content-type");
  const mimeType = extractMimeType(contentType);
  const charset = extractCharset(contentType);
  const encoding = (headers.get("content-transfer-encoding") ?? "").toLowerCase();
  const url = (headers.get("content-location") ?? "").trim();
  const rawContentId = headers.get("content-id")?.trim();
  const contentId = rawContentId && rawContentId.length > 0 ? rawContentId : undefined;
  const trimmedBody = rawBody.replace(/\r?\n$/, "");

  if (encoding === "base64") {
    if (isTextMimeType(mimeType)) {
      return {
        url,
        contentId,
        mimeType,
        transferEncoding: "utf8",
        body: decodeBase64ToText(trimmedBody, charset)
      };
    }
    return {
      url,
      contentId,
      mimeType,
      transferEncoding: "base64",
      body: trimmedBody.replace(/\s+/g, "")
    };
  }

  if (encoding === "quoted-printable") {
    if (isTextMimeType(mimeType)) {
      return {
        url,
        contentId,
        mimeType,
        transferEncoding: "utf8",
        body: decodeQuotedPrintableText(trimmedBody, charset)
      };
    }
    return {
      url,
      contentId,
      mimeType,
      transferEncoding: "base64",
      body: encodeBytesToBase64(decodeQuotedPrintableBytes(trimmedBody))
    };
  }

  return {
    url,
    contentId,
    mimeType,
    transferEncoding: "utf8",
    body: trimmedBody
  };
}

function readMhtmlArchive(rawMhtml) {
  const topSplit = splitHeaderAndBody(rawMhtml);
  if (!topSplit) return null;
  const [topHeadersRaw, multipartBody] = topSplit;
  const topHeaders = parseHeaders(topHeadersRaw);
  const contentType = topHeaders.get("content-type") ?? "";
  const boundaryMatch = CONTENT_TYPE_BOUNDARY_REGEX.exec(contentType);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) return null;

  const delimiter = `--${boundary}`;
  const rawSegments = multipartBody.split(delimiter);
  const parts = [];
  for (let i = 1; i < rawSegments.length; i += 1) {
    const segment = rawSegments[i];
    if (segment.startsWith("--")) break;
    const stripped = segment.replace(/^\r?\n/, "");
    const parsed = parsePart(stripped);
    if (parsed) parts.push(parsed);
  }
  const rootIndex = parts.findIndex(part => part.mimeType === "text/html");
  if (rootIndex === -1) return null;
  const rootResource = parts[rootIndex];
  const resources = parts.filter((_, index) => index !== rootIndex);
  return { rootResource, resources };
}

const MAX_MHTML_ARCHIVE_BYTES = 45 * 1024 * 1024;
const inFlightByTab = new Set();
const pageGenerationByTab = new Map();

function getPageGeneration(tabId) {
  return pageGenerationByTab.get(tabId) ?? 0;
}

function isCapturablePageUrl(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
}

function saveTabAsMhtml(tabId) {
  return new Promise((resolve, reject) => {
    if (!chrome.pageCapture?.saveAsMHTML) {
      reject(new Error("pageCapture API unavailable"));
      return;
    }
    chrome.pageCapture.saveAsMHTML({ tabId }, mhtmlData => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(mhtmlData ?? null);
    });
  });
}

async function captureCodeForTab(tabId) {
  if (inFlightByTab.has(tabId)) {
    return { status: "error", reason: "busy" };
  }
  const startGeneration = getPageGeneration(tabId);
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const tabUrl = tab?.url;
  if (!tab || !isCapturablePageUrl(tabUrl)) {
    return { status: "error", reason: "unavailable" };
  }
  inFlightByTab.add(tabId);
  try {
    let mhtmlBlob;
    try {
      mhtmlBlob = await saveTabAsMhtml(tabId);
    } catch {
      return { status: "error", reason: "unavailable" };
    }
    if (getPageGeneration(tabId) !== startGeneration) {
      return { status: "error", reason: "page-changed" };
    }
    if (!mhtmlBlob || mhtmlBlob.size === 0) {
      return { status: "error", reason: "unavailable" };
    }
    if (mhtmlBlob.size > MAX_MHTML_ARCHIVE_BYTES) {
      return { status: "error", reason: "too-large" };
    }
    const rawMhtml = await mhtmlBlob.text();
    if (getPageGeneration(tabId) !== startGeneration) {
      return { status: "error", reason: "page-changed" };
    }
    const archive = readMhtmlArchive(rawMhtml);
    if (!archive) {
      return { status: "error", reason: "unavailable" };
    }
    const latestTab = await chrome.tabs.get(tabId).catch(() => null);
    if (!latestTab || getPageGeneration(tabId) !== startGeneration) {
      return { status: "error", reason: "page-changed" };
    }
    const viewport =
      typeof latestTab.width === "number" &&
      latestTab.width > 0 &&
      typeof latestTab.height === "number" &&
      latestTab.height > 0
        ? { width: latestTab.width, height: latestTab.height }
        : undefined;
    const capture = {
      type: "mhtml",
      html: archive.rootResource.body,
      resources: archive.resources,
      capturedUrl: archive.rootResource.url || tabUrl,
      title: latestTab.title || undefined,
      viewport
    };
    if (new Blob([JSON.stringify(capture)]).size > MAX_MHTML_ARCHIVE_BYTES) {
      return { status: "error", reason: "too-large" };
    }
    return { status: "captured", capture };
  } finally {
    inFlightByTab.delete(tabId);
  }
}

/* ──────────────────────────────────────────────────────────
   H2D Preview & Asset Recovery (from fkmaohpngenfoccdgceedjkfhkdcohmg)
   ────────────────────────────────────────────────────────── */
const PREVIEW_MAX_WIDTH = 320;
const PREVIEW_MAX_HEIGHT = 180;
const PREVIEW_QUALITY = 0.7;

async function arrayBufferToDataUrl(buffer, mimeType = "application/octet-stream") {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return `data:${mimeType};base64,${btoa(chunks.join(""))}`;
}

async function captureVisibleTabDataUrl(windowId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, PREVIEW_MAX_WIDTH / bitmap.width, PREVIEW_MAX_HEIGHT / bitmap.height);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(bitmap, 0, 0, width, height);
      const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: PREVIEW_QUALITY });
      return await arrayBufferToDataUrl(await outBlob.arrayBuffer(), "image/jpeg");
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
}

async function captureElementPreview(windowId, payload) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const { rect, devicePixelRatio } = payload;
      const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
      const sx = Math.max(0, Math.round(rect.x * dpr));
      const sy = Math.max(0, Math.round(rect.y * dpr));
      const sw = Math.min(bitmap.width - sx, Math.round(rect.width * dpr));
      const sh = Math.min(bitmap.height - sy, Math.round(rect.height * dpr));
      if (sw <= 0 || sh <= 0) return undefined;
      const scale = Math.min(1, PREVIEW_MAX_WIDTH / sw, PREVIEW_MAX_HEIGHT / sh);
      const outWidth = Math.max(1, Math.round(sw * scale));
      const outHeight = Math.max(1, Math.round(sh * scale));
      const canvas = new OffscreenCanvas(outWidth, outHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
      const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: PREVIEW_QUALITY });
      return await arrayBufferToDataUrl(await outBlob.arrayBuffer(), "image/jpeg");
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
}

async function captureElementPng(windowId, payload) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const { rect, devicePixelRatio } = payload || {};
      if (!rect) return dataUrl;
      const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
      const sx = Math.max(0, Math.round(rect.x * dpr));
      const sy = Math.max(0, Math.round(rect.y * dpr));
      const sw = Math.min(bitmap.width - sx, Math.max(1, Math.round(rect.width * dpr)));
      const sh = Math.min(bitmap.height - sy, Math.max(1, Math.round(rect.height * dpr)));
      if (sw <= 0 || sh <= 0) return dataUrl;
      const canvas = new OffscreenCanvas(sw, sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      const outBlob = await canvas.convertToBlob({ type: "image/png" });
      return await arrayBufferToDataUrl(await outBlob.arrayBuffer(), "image/png");
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
}

const IMAGE_TRANSCODE_FORMATS = new Set(["image/avif", "image/heif", "image/heic"]);

async function transcodeImageBlobToWebp(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get OffscreenCanvas 2d context");
    ctx.drawImage(bitmap, 0, 0);
    return await canvas.convertToBlob({ type: "image/webp", quality: 1 });
  } finally {
    bitmap.close();
  }
}

async function fetchOneAssetAsBase64(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { url, blob: null };
  }
  try {
    const response = await fetch(url, { credentials: "omit", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { url, blob: null };
    let blob = await response.blob();
    if (IMAGE_TRANSCODE_FORMATS.has(blob.type)) {
      blob = await transcodeImageBlobToWebp(blob);
    }
    const buffer = await blob.arrayBuffer();
    const base64Blob = await arrayBufferToDataUrl(buffer, "application/octet-stream");
    return { url, blob: { type: blob.type, base64Blob } };
  } catch {
    return { url, blob: null };
  }
}

async function fetchAssetsAsBase64(urls) {
  return Promise.all((urls || []).map(fetchOneAssetAsBase64));
}

/* ──────────────────────────────────────────────────────────
   VisBug Live Dragging & Design State (from kdmdoinnkaeognnpegpkepdnggeaodkn)
   & Strict Mutual Exclusion (VisBug <-> Figma H2D Toolbar)
   ────────────────────────────────────────────────────────── */
const visbugState = {
  loaded: {},
  injected: {}
};

async function disableH2DToolbar(tabId) {
  if (!tabId) return;
  try {
    await ToolbarTabStorage.forTab(tabId).close();
  } catch {}
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "FIGMA_H2D_TOOLBAR_COMMAND",
      command: "close"
    });
  } catch {}
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const host = document.getElementById("__figma_h2d_chrome_extension_toolbar__");
        if (host) host.remove();
        const altHost = document.getElementById("__figma_html_to_design_toolbar_host__");
        if (altHost) altHost.remove();
        const modal = document.getElementById("sp-h2d-interactive-modal");
        if (modal) modal.remove();
      }
    });
  } catch {}
}

async function disableVisBug(tabId) {
  if (!tabId) return;
  if (visbugState.loaded[tabId] && visbugState.injected[tabId]) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["toolbar/eject.js"]
      });
    } catch {}
    visbugState.injected[tabId] = false;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.querySelectorAll("vis-bug, vis-bug-handles, vis-bug-hover, vis-bug-label, vis-bug-offscreen-label, vis-bug-distance, vis-bug-grip, vis-bug-boxmodel, vis-bug-metatip, vis-bug-ally, vis-bug-corners, vis-bug-hotkeys").forEach(el => el.remove());
      }
    });
  } catch {}
}

async function injectH2DToolbar(tabId, command) {
  // Mutual Exclusion: Turning ON Figma Toolbar automatically turns OFF VisBug
  await disableVisBug(tabId);
  try {
    await chrome.tabs.sendMessage(tabId, { action: "disableAllModes" });
  } catch {}

  if (command === "toggle") {
    const alreadyOpen = await ToolbarTabStorage.forTab(tabId).isOpen();
    if (alreadyOpen) {
      await disableH2DToolbar(tabId);
      return false;
    }
  }

  await ToolbarTabStorage.forTab(tabId).open();
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["js/h2d_toolbar.js"]
  });
  if (command && command !== "toggle") {
    await chrome.tabs.sendMessage(tabId, {
      type: "FIGMA_H2D_TOOLBAR_COMMAND",
      command
    }).catch(() => {});
  }
  return true;
}

async function toggleVisBug(tabId) {
  if (!tabId) return false;

  // Ensure any legacy <vis-bug> UI elements are removed so only our StylePeek Studio frontend opens
  await disableVisBug(tabId);

  // Check if our StylePeek Studio is currently active in the tab
  let status = null;
  try {
    status = await chrome.tabs.sendMessage(tabId, { action: "getStatus" });
  } catch {
    status = null;
  }

  if (status && status.active) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "turnOff" });
    } catch {}
    visbugState.injected[tabId] = false;
    return false;
  }

  // Mutual Exclusion: Turning ON StylePeek Studio automatically turns OFF Figma H2D Toolbar
  await disableH2DToolbar(tabId);

  // If content.js wasn't injected yet (e.g. tab was opened before extension reload), inject our Studio CSS + JS
  if (!status) {
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["tokens.css", "content.css"]
      });
    } catch {}
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    } catch {}
  }

  try {
    await chrome.tabs.sendMessage(tabId, { action: "turnOn", mode: "inspect" });
    visbugState.loaded[tabId] = true;
    visbugState.injected[tabId] = true;
    return true;
  } catch {
    return false;
  }
}

/* ──────────────────────────────────────────────────────────
   Website TechStack Detector HTTP Header Capture
   (from ngpdngfmjfnkdjlgdallobombenfdckg)
   ────────────────────────────────────────────────────────── */
const tabResponseHeaders = new Map();

if (chrome.webRequest && chrome.webRequest.onHeadersReceived) {
  try {
    chrome.webRequest.onHeadersReceived.addListener(
      details => {
        if (details.type !== "main_frame" || details.tabId < 0) return;
        const headersObj = {};
        for (const h of details.responseHeaders || []) {
          if (h.name) {
            headersObj[h.name.toLowerCase()] = h.value || "";
          }
        }
        tabResponseHeaders.set(details.tabId, headersObj);
      },
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );
  } catch {}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    pageGenerationByTab.set(tabId, getPageGeneration(tabId) + 1);
    visbugState.loaded[tabId] = false;
    visbugState.injected[tabId] = false;
  } else if (changeInfo.status === "complete") {
    ToolbarTabStorage.forTab(tabId).isOpen().then(open => {
      if (open) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["js/h2d_toolbar.js"]
        }).catch(() => {});
      }
    }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  inFlightByTab.delete(tabId);
  pageGenerationByTab.delete(tabId);
  delete visbugState.loaded[tabId];
  delete visbugState.injected[tabId];
  tabResponseHeaders.delete(tabId);
  ToolbarTabStorage.forTab(tabId).clear().catch(() => {});
});

/* ──────────────────────────────────────────────────────────
   Unified Runtime Message Listener
   ────────────────────────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1. StylePeek & Hybrid file downloader (supports https:// and local file:///)
  if (msg && msg.action === "downloadFile") {
    chrome.downloads.download(
      {
        url: msg.url,
        filename: msg.filename || "captured-page.html",
        saveAs: false
      },
      downloadId => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, downloadId });
        }
      }
    );
    return true;
  }

  // 2. Get active tool states & HTTP headers for popup
  if (msg && msg.action === "getToolStates") {
    const tabId = msg.tabId || sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: true, h2dOpen: false, visbugActive: false, headers: {} });
      return false;
    }
    ToolbarTabStorage.forTab(tabId).isOpen().then(h2dOpen => {
      sendResponse({
        ok: true,
        h2dOpen: Boolean(h2dOpen),
        visbugActive: Boolean(visbugState.injected[tabId]),
        headers: tabResponseHeaders.get(tabId) || {}
      });
    }).catch(() => {
      sendResponse({
        ok: true,
        h2dOpen: false,
        visbugActive: Boolean(visbugState.injected[tabId]),
        headers: tabResponseHeaders.get(tabId) || {}
      });
    });
    return true;
  }

  if (msg && msg.action === "getTabHeaders") {
    const tabId = msg.tabId || sender?.tab?.id;
    sendResponse({ ok: true, headers: (tabId && tabResponseHeaders.get(tabId)) || {} });
    return false;
  }

  // 3. Popup triggers for H2D Toolbar & VisBug (Strictly Mutually Exclusive)
  if (msg && msg.action === "launchH2DToolbar") {
    const tabId = msg.tabId || sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "No active tab" });
      return false;
    }
    injectH2DToolbar(tabId, msg.command)
      .then(active => sendResponse({ ok: true, active, visbugActive: false }))
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  if (msg && msg.action === "closeH2DToolbar") {
    const tabId = msg.tabId || sender?.tab?.id;
    disableH2DToolbar(tabId)
      .then(() => sendResponse({ ok: true, active: false }))
      .catch(() => sendResponse({ ok: true, active: false }));
    return true;
  }

  if (msg && msg.action === "toggleVisBug") {
    const tabId = msg.tabId || sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "No active tab" });
      return false;
    }
    toggleVisBug(tabId)
      .then(active => sendResponse({ ok: true, active, h2dOpen: false }))
      .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  }

  // 4. H2D Toolbar background commands (H2D_*)
  if (msg && typeof msg.cmd === "string") {
    const handleCmd = async () => {
      switch (msg.cmd) {
        case "H2D_GET_TAB_ID":
          return sender?.tab?.id ?? null;
        case "H2D_CAPTURE_VISIBLE_TAB":
          if (sender?.tab?.windowId == null) return undefined;
          return await captureVisibleTabDataUrl(sender.tab.windowId);
        case "H2D_CAPTURE_CODE":
          if (sender?.tab?.id == null) return { status: "error", reason: "unavailable" };
          return await captureCodeForTab(sender.tab.id);
        case "H2D_CAPTURE_ELEMENT_PREVIEW":
          if (sender?.tab?.windowId == null) return undefined;
          return await captureElementPreview(sender.tab.windowId, msg.payload);
        case "H2D_CAPTURE_ELEMENT_PNG":
          if (sender?.tab?.windowId == null) return undefined;
          return await captureElementPng(sender.tab.windowId, msg.payload);
        case "H2D_FETCH_ASSETS":
          return await fetchAssetsAsBase64(msg.payload?.urls || []);
        case "H2D_TOOLBAR_CLOSED":
          if (sender?.tab?.id != null) {
            await ToolbarTabStorage.forTab(sender.tab.id).clear();
          }
          return undefined;
        case "TRACK":
        case "SENTRY_EXCEPTION":
          return undefined;
        default:
          return undefined;
      }
    };
    handleCmd()
      .then(value => sendResponse({ success: true, value }))
      .catch(err => sendResponse({ success: false, error: { message: err?.message || String(err) } }));
    return true;
  }

  return false;
});
