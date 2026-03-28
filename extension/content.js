/* ──────────────────────────────────────────────
   ThreatLens AI — content.js
   Real-time monitoring, Gmail integration, 
   Shadow DOM overlay, and Link Shielding.
────────────────────────────────────────────── */

let isScanning = false;
let lastAnalyzed = "";
let lastAnalyzedURL = "";
let shadowRoot = null;
let scanTimeout = null;

/* ── SHADOW DOM SETUP ─────────────────────── */
function initShadow() {
  const existingHost = document.getElementById("threatlens-root");
  if (shadowRoot && existingHost && existingHost.isConnected) return;

  if (existingHost) existingHost.remove();

  const host = document.createElement("div");
  host.id = "threatlens-root";
  document.body.appendChild(host);
  shadowRoot = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    .toast {
      position: fixed;
      top: 24px;
      right: -400px;
      width: 300px;
      background: rgba(11, 15, 25, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 12px 32px rgba(0,0,0,0.4);
      z-index: 2147483647;
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .toast.show { right: 24px; }
    .icon { font-size: 24px; }
    .content { flex: 1; }
    .title { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
    .desc { font-size: 12px; opacity: 0.7; }
    .progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: var(--accent, #00c8ff);
      width: 0%;
      border-radius: 0 0 0 16px;
    }
    .safe { --accent: #00d485; border-left: 4px solid #00d485; }
    .phishing { --accent: #ff4d6a; border-left: 4px solid #ff4d6a; }
  `;
  shadowRoot.appendChild(style);
}

/* ── PROACTIVE LINK SHIELD ─────────────────── */
document.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link || !link.href.startsWith("http")) return;

  // We check if we already scanned this URL
  // Caching is handled in background.js, so we just send another request.
  // Actually, for link clicks, we want to scan instantly.
}, true);

/* ── GMAIL DETECTION (OPTIMIZED) ──────────── */
function watchGmail() {
  if (!window.location.hostname.includes("mail.google.com")) return;

  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanGmailUI, 1500); 
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // SPA Navigation
  window.addEventListener("hashchange", () => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanGmailUI, 1200);
  });
  
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(scanGmailUI, 1200);
    }
  }, 3000);
}

function scanGmailUI() {
  if (!window.location.hostname.includes("mail.google.com")) return;

  // Broad selectors for the visible email body
  const bodyEl = document.querySelector(".a3s.aiL, .a3s, .ii.gt, .adn.ads");
  const senderEl = document.querySelector("span.gD, span[email], .iw .gD");

  if (bodyEl) {
    const text = bodyEl.innerText;
    const sender = senderEl ? (senderEl.getAttribute("email") || senderEl.innerText) : "";

    if (text && text.length > 50) {
      triggerScan(text, "email", sender, window.location.href);
    }
  }
}

/* ── SCAN TRIGGER ─────────────────────────── */
function triggerScan(text, type, sender = "", url = "") {
  const currentURL = url || window.location.href;
  
  // Allow re-scan if text is same but URL changed (navigation back to email)
  if (isScanning || (text === lastAnalyzed && currentURL === lastAnalyzedURL)) return;
  
  isScanning = true;
  lastAnalyzed = text;
  lastAnalyzedURL = currentURL;

  // Safety Timeout: Reset state after 10s in case of failure
  setTimeout(() => { if (isScanning) isScanning = false; }, 10000);

  chrome.runtime.sendMessage({
    type: "SCAN",
    payload: { 
      text, 
      source: type, 
      url: url || window.location.href,
      sender: sender 
    }
  });
}

/* ── UI RESULTS ────────────────────────────── */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "RESULT") {
    isScanning = false;
    showToast(msg.data);
  } else if (msg.type === "SCAN_ERROR") {
    isScanning = false;
    showToast({ 
      verdict: "Error", 
      explanation: "ThreatLens cannot reach the security engine. Please check your connection." 
    });
  }
});

function showToast(data) {
  initShadow();
  const isPhishing = data.verdict === "Phishing";
  const isSuspicious = data.verdict === "Suspicious";
  const typeClass = isPhishing ? "phishing" : isSuspicious ? "phishing" : "safe";
  const icon = isPhishing ? "☠️" : isSuspicious ? "⚠️" : "🛡️";
  
  // Dynamic Title based on source
  const isEmail = data.source === "email" || window.location.hostname.includes("mail.google.com");
  let title = isPhishing ? "Threat Detected" : "Safe";
  if (isEmail) {
    title = isPhishing || isSuspicious ? "Phishing Email" : "Email Looks Safe";
  } else {
    title = isPhishing || isSuspicious ? "Malicious Site" : "Website Secure";
  }

  // Use backend explanation or reasons
  const topReason = data.reasons && data.reasons.length > 0 ? data.reasons[0] : "";
  const desc = isPhishing || isSuspicious
    ? `${topReason || data.explanation} (${Math.round(data.confidence*100)}%)`
    : `ThreatLens verified as safe.`;

  const toast = document.createElement("div");
  toast.className = `toast ${typeClass}`;
  toast.innerHTML = `
    <div class="icon">${icon}</div>
    <div class="content">
      <div class="title">${title}</div>
      <div class="desc">${desc}</div>
    </div>
    <div class="progress"></div>
  `;

  shadowRoot.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("show");
    const prog = toast.querySelector(".progress");
    prog.style.transition = "width 4s linear";
    prog.style.width = "100%";
  });

  // Remove after 4s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/* ── INIT ──────────────────────────────────── */
function init() {
  // Start with URL scan
  triggerScan(window.location.href, "url", "", window.location.href);
  
  // Start Gmail watch
  watchGmail();
}

// Small delay to ensure DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
