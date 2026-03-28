const API_URL = "https://threatlensai.onrender.com/analyze";
const HEALTH_URL = "https://threatlensai.onrender.com/health";

/* ── DOM REFS ──────────────────────────────── */
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const siteUrlEl = document.getElementById("siteUrl");
const scanStatusEl = document.getElementById("scanStatus");
const verdictBadge = document.getElementById("verdictBadge");
const btnText = document.getElementById("btnText");
const btnLoader = document.getElementById("btnLoader");
const checkBtn = document.getElementById("check");
const detailsSection = document.getElementById("details");
const confValue = document.getElementById("confValue");
const confFill = document.getElementById("confFill");

/* ── BOOT ──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    const url = new URL(tab.url);
    siteUrlEl.textContent = url.hostname || url.href;

    // Check Cache immediately
    const cacheKey = `url_${tab.url}`;
    const cached = await chrome.storage.local.get(cacheKey);
    if (cached[cacheKey]) {
      renderResult(cached[cacheKey].data, "Background Scan");
    }
  }

  checkBackend();
  setInterval(checkBackend, 5000);
});

async function checkBackend() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      statusDot.className = "dot online";
      statusText.textContent = "Online";
    } else {
      throw new Error();
    }
  } catch (err) {
    statusDot.className = "dot offline";
    statusText.textContent = "Offline";
  }
}

/* ── ANALYZE ───────────────────────────────── */
checkBtn.onclick = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  setLoading(true);

  try {
    // 1. Try to extract page text for better ML (Smart Analyze)
    let analysisText = tab.url;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.slice(0, 1000), // Get first 1000 chars
      });
      if (results && results[0].result) {
        analysisText = results[0].result;
      }
    } catch (e) {
      console.warn("Could not extract text, using URL only");
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: analysisText,
        sender: "extension_popup_smart",
        url: tab.url,
      }),
    });

    if (!res.ok) throw new Error("Backend Error");

    const data = await res.json();
    renderResult(data, "Manual Scan");

    // 2. Update background cache
    const cacheKey = `url_${tab.url}`;
    await chrome.storage.local.set({
      [cacheKey]: { timestamp: Date.now(), data },
    });
  } catch (err) {
    console.error("Popup Error:", err);
    verdictBadge.textContent = "Error";
    verdictBadge.className = "badge phishing";
  } finally {
    setLoading(false);
  }
};

function setLoading(on) {
  checkBtn.disabled = on;
  btnText.style.display = on ? "none" : "block";
  btnLoader.classList.toggle("hidden", !on);
}

function renderResult(data, source = "") {
  const { verdict, confidence, source: dataSrc } = data;
  const v = verdict.toLowerCase();
  const finalSource =
    source || (dataSrc === "email" ? "Email Scan" : "Website Scan");

  if (finalSource) scanStatusEl.textContent = finalSource;
  verdictBadge.textContent = verdict.toUpperCase();
  verdictBadge.className = `badge ${v}`;

  detailsSection.classList.remove("hidden");
  confValue.textContent = Math.round(confidence * 100) + "%";

  // Match fill color to verdict
  const colors = {
    safe: "#00d485",
    suspicious: "#ffb800",
    phishing: "#ff4d6a",
  };
  confFill.style.background = colors[v] || "var(--accent)";
  confFill.style.width = Math.round(confidence * 100) + "%";
}
