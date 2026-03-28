/* ──────────────────────────────────────────────
   ThreatLens AI — background.js
   Service worker with caching and badge updates.
────────────────────────────────────────────── */

const ANALYZE_URL = "http://127.0.0.1:5000/analyze";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN") {
    handleScan(message.payload, sender);
  }
});

async function handleScan(payload, msgSender) {
  const { text, source, url, sender } = payload;
  
  // 1. Generate Cache Key
  // Site scans use the URL as key, email scans use a text hash
  const isUrl = source === "url";
  const cacheKey = isUrl ? `url_${url}` : `email_${btoa(text.slice(0, 100))}`;
  
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey]) {
    const { timestamp, data } = cached[cacheKey];
    if (Date.now() - timestamp < CACHE_TTL) {
      console.log("⚡ Cache hit:", source);
      sendResult(data, msgSender, source);
      updateBadge(data.verdict);
      return;
    }
  }

  // 2. Fetch from backend
  try {
    console.log("🚀 Fetching analysis:", source);
    const res = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text, 
        sender: sender || `extension_${source}`,
        url: url 
      })
    });

    if (!res.ok) throw new Error("Backend offline");

    const data = await res.json();
    
    // 3. Store in cache
    await chrome.storage.local.set({
      [cacheKey]: { timestamp: Date.now(), data }
    });

    // 4. Update UI
    sendResult(data, sender, source);
    updateBadge(data.verdict);

  } catch (err) {
    console.error("ThreatLens BG Error:", err);
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: "SCAN_ERROR" });
    }
  }
}

function sendResult(data, sender, source) {
  if (sender.tab && sender.tab.id) {
    chrome.tabs.sendMessage(sender.tab.id, { 
      type: "RESULT", 
      data: { ...data, source } 
    });
  }
}

function updateBadge(verdict) {
  const isPhishing = verdict === "Phishing";
  const badge = isPhishing ? "⚠️" : "✓";
  const color = isPhishing ? "#ff4d6a" : "#00d485";

  chrome.action.setBadgeText({ text: badge });
  chrome.action.setBadgeBackgroundColor({ color });

  // Reset badge after 10s if safe
  if (!isPhishing) {
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 10000);
  }
}
