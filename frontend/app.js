/* ──────────────────────────────────────────────
   ThreatLens AI — app.js
   Connects to Express backend at localhost:5000
   Falls back to client-side simulation if offline
   ML Service (Flask) runs on localhost:8000
────────────────────────────────────────────── */

const BACKEND_URL = "http://localhost:5000/analyze";
const HEALTH_URL = "http://localhost:5000/health";

const PRESETS = {
  phish: {
    sender: "hr-admin@secure-verify-corp.net",
    body: `URGENT: Your account access will be suspended immediately.

Dear valued employee,

We have detected unusual activity on your account. To prevent suspension, you must verify your credentials immediately by clicking the link below.

Please provide your login and password within 2 hours to avoid losing access:
http://bit.ly/secure-verify-update

This is a time-sensitive security request from the HR Admin team. Failure to comply will result in immediate account termination.

— HR Admin Department`,
  },
  suspicious: {
    sender: "payments@company-invoices-secure.com",
    body: `Hi team member,

Please review the attached invoice and confirm payment transfer of $12,400 to the new vendor account by end of day.

Our Finance Department requires immediate approval. Please access the payment portal and submit your digital signature to proceed:
www.payment-confirm-portal.link/approve

This is urgent. Reply ASAP to confirm.

— Finance Department`,
  },
  safe: {
    sender: "hr@yourcompany.com",
    body: `Hi all,

As part of our annual review cycle, please take a few minutes to update your personal details in the internal portal before Friday.

This is for our employee handbook records and benefits guide. You can access the internal portal through your normal company login — no new credentials required.

If you have any questions, reach out to the HR team directly.

Thanks,
Human Resources`,
  },
  url: {
    sender: "noreply@docusign-notifications-secure.xyz",
    body: `Dear user,

Your digital signature is required on an important legal document.

Please sign the document at this link to proceed:
http://bit.ly/docusign-urgent-sign
OR: tinyurl.com/sign-now-secure

Note: This link will expire in 24 hours. Please click here to access your portal and provide your credentials to complete the signing process.

— DocuSign Notification Service`,
  },
};

/* ── State ─────────────────────────────────── */
let isAnalyzing = false;
let isBackendOnline = false;

/* ── DOM refs ──────────────────────────────── */
const emailBodyEl = document.getElementById("emailBody");
const senderInputEl = document.getElementById("senderInput");
const charCountEl = document.getElementById("charCount");
const analyzeBtnEl = document.getElementById("analyzeBtn");
const btnContentEl = document.getElementById("btnContent");
const btnLoadingEl = document.getElementById("btnLoading");
const statusDotEl = document.getElementById("statusDot");
const statusTextEl = document.getElementById("statusText");
const offlineNoteEl = document.getElementById("offlineNote");
const emptyStateEl = document.getElementById("emptyState");
const resultContentEl = document.getElementById("resultContent");
const bgGlowEl = document.getElementById("bgGlow");
const inputBadgeEl = document.getElementById("inputBadge");
const sourceBadgeEl = document.getElementById("sourceBadge");

/* ── Boot ──────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  emailBodyEl.addEventListener("input", onBodyInput);
  checkBackendStatus();
  // Re-check every 30 seconds
  setInterval(checkBackendStatus, 30000);
});

function onBodyInput() {
  const len = emailBodyEl.value.length;
  charCountEl.textContent = len.toLocaleString() + " chars";
}

/* ── Backend health check ──────────────────── */
async function checkBackendStatus() {
  try {
    const res = await fetch(HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      setStatus("online", "Backend online");
      isBackendOnline = true;
      return;
    }
    throw new Error("Not OK");
  } catch {
    // Health route unavailable — try a lightweight POST to /analyze
    try {
      await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "ping", sender: "" }),
        signal: AbortSignal.timeout(2500),
      });
      setStatus("online", "Backend online");
      isBackendOnline = true;
    } catch {
      setStatus("offline", "Offline mode");
      isBackendOnline = false;
    }
  }
}

function setStatus(state, text) {
  statusDotEl.className = "status-dot " + state;
  statusTextEl.textContent = text;
}

/* ── Load preset ───────────────────────────── */
function loadPreset(key, btn) {
  document
    .querySelectorAll(".preset-card")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const p = PRESETS[key];
  senderInputEl.value = p.sender;
  emailBodyEl.value = p.body;
  charCountEl.textContent = p.body.length.toLocaleString() + " chars";

  // Reset result
  emptyStateEl.style.display = "flex";
  resultContentEl.style.display = "none";
  bgGlowEl.className = "bg-glow";
}

/* ── Run analysis ──────────────────────────── */
async function runAnalysis() {
  if (isAnalyzing) return;

  const text = emailBodyEl.value.trim();
  const sender = senderInputEl.value.trim();

  if (!text) {
    emailBodyEl.focus();
    emailBodyEl.style.borderColor = "var(--danger)";
    emailBodyEl.style.boxShadow = "0 0 0 3px rgba(255,76,106,0.15)";
    setTimeout(() => {
      emailBodyEl.style.borderColor = "";
      emailBodyEl.style.boxShadow = "";
    }, 1000);
    return;
  }

  isAnalyzing = true;
  setLoading(true);

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sender }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (data.verdict === "Phishing") {
      new Audio(
        "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
      ).play();
    }
    offlineNoteEl.style.display = "none";
    setStatus("online", "Backend online");
    isBackendOnline = true;
    renderResult(data, "live");
  } catch (err) {
    // Fallback to client-side simulation
    const data = simulateAnalysis(text, sender);
    offlineNoteEl.style.display = "block";
    setStatus("offline", "Offline mode");
    isBackendOnline = false;
    renderResult(data, "offline");
  }

  isAnalyzing = false;
  setLoading(false);
}

function setLoading(on) {
  analyzeBtnEl.disabled = on;
  btnContentEl.style.display = on ? "none" : "flex";
  btnLoadingEl.style.display = on ? "flex" : "none";
  if (inputBadgeEl) inputBadgeEl.textContent = on ? "Scanning…" : "Ready";
}

/* ── Client-side simulation ─────────────────── */
function simulateAnalysis(text, sender) {
  const t = text.toLowerCase();
  const s = (sender || "").toLowerCase();

  // Rule engine replica
  let rule = 0;
  const keywords = [
    "urgent",
    "immediately",
    "asap",
    "verify",
    "password",
    "login",
    "bank",
    "invoice",
    "click",
    "confirm",
    "transfer",
    "account",
    "update",
  ];
  const keyHits = keywords.filter((k) => t.includes(k)).length;
  if (keyHits >= 3) rule += 0.35;
  else if (keyHits > 0) rule += 0.15;

  const sensitive = [
    "send money",
    "wire transfer",
    "verify account",
    "click the link",
    "sign the document",
    "share credentials",
    "digital signature",
    "provide password",
    "access your portal",
  ];
  if (sensitive.some((p) => t.includes(p))) rule += 0.25;

  const impersonation = [
    "ceo",
    "manager",
    "hr",
    "admin",
    "finance department",
    "human resources",
    "support team",
  ];
  const impersonHits = impersonation.filter((p) => t.includes(p)).length;
  if (impersonHits > 0) rule += 0.2;

  if (
    /urgent|immediately|asap|within \d+ hours|by end of day|deadline|by friday/i.test(
      t,
    )
  )
    rule += 0.25;
  if (/dear user|valued employee|team member|hi all/.test(t)) rule += 0.15;
  if (/bit\.ly|tinyurl|shorturl/.test(t)) rule += 0.25;
  if (/http|www|\[link|\]/.test(t)) rule += 0.15;

  const actions = ["click", "verify", "sign", "access", "submit"];
  for (const w of actions) {
    const idx = t.indexOf(w);
    if (idx !== -1 && /http|www|\[link|\]/.test(t.substring(idx, idx + 80))) {
      rule += 0.3;
      break;
    }
  }
  if (impersonHits > 0 && (keyHits > 0 || sensitive.some((p) => t.includes(p))))
    rule += 0.3;

  // Sender scoring
  const trusted =
    s.endsWith("@yourcompany.com") || s.endsWith("@microsoft.com");
  let senderScore = 0;
  if (!trusted) senderScore += 0.2;
  if (/support|security|admin/.test(s)) senderScore += 0.2;
  if (/secure|verify|update/.test(s)) senderScore += 0.2;
  if (/hr|ceo|admin|finance/.test(s)) senderScore += 0.3;
  if (trusted) senderScore *= 0.5;
  rule += senderScore;

  const legitHits = [
    "open enrollment",
    "benefits guide",
    "company policy",
    "internal portal",
    "employee handbook",
    "annual review",
  ].filter((k) => t.includes(k)).length;
  if (trusted && rule < 0.5) rule *= 0.7;
  if (trusted && rule < 0.75) rule *= 0.85;
  if (legitHits > 0 && trusted) rule *= 0.75;
  rule = Math.min(rule, 1);

  // URL scoring
  let url = 0;
  const urls = t.match(/(https?:\/\/\S+|\b\S+\.\S+\b)/g) || [];
  urls.forEach((u) => {
    if (u.includes("bit.ly") || u.includes("tinyurl")) url += 0.4;
    if (u.includes("@")) url += 0.5;
    if (u.includes("-")) url += 0.2;
    if (!u.startsWith("https")) url += 0.2;
    if (u.includes("sharepoint") && u.includes("auth")) url += 0.4;
  });
  url = Math.min(url, 1);

  // ML proxies
  let lstm = Math.min(rule * 1.1 + (Math.random() * 0.08 - 0.04), 1);
  let tfidf = Math.min(rule * 0.95 + (Math.random() * 0.06 - 0.03), 1);

  if (trusted && rule < 0.3 && url === 0) lstm = Math.min(lstm, 0.6);

  let final = 0.3 * lstm + 0.2 * tfidf + 0.3 * rule + 0.2 * url;
  if (trusted && rule < 0.3 && url === 0) final *= 0.7;
  final = Math.max(0, Math.min(final, 1));

  let verdict = "Safe";
  if (final >= 0.75) verdict = "Phishing";
  else if (final >= 0.5) verdict = "Suspicious";

  const reasons = [];
  if (lstm > 0.7)
    reasons.push({ text: "Suspicious language detected", type: "neg" });
  if (tfidf > 0.7)
    reasons.push({ text: "Matches phishing patterns", type: "neg" });
  if (rule >= 0.7)
    reasons.push({ text: "High-risk phishing behavior detected", type: "neg" });
  else if (rule >= 0.3)
    reasons.push({
      text: "Suspicious behavioral patterns detected",
      type: "warn",
    });
  if (url >= 0.3)
    reasons.push({
      text: "Suspicious or external link detected",
      type: "warn",
    });
  if (sender && !trusted)
    reasons.push({ text: "Untrusted sender domain", type: "warn" });
  if (verdict === "Safe") {
    if (trusted) reasons.push({ text: "Trusted internal sender", type: "pos" });
    if (rule < 0.3 && url === 0)
      reasons.push({
        text: "No strong phishing indicators found",
        type: "pos",
      });
  }

  const explanation =
    verdict === "Safe"
      ? "This email appears safe based on trusted sender and low-risk content patterns."
      : verdict === "Suspicious"
        ? "This email shows suspicious patterns. Verify the sender and avoid clicking links until confirmed."
        : "High probability phishing detected. Do not click links or share sensitive information.";

  return {
    verdict,
    confidence: +final.toFixed(3),
    explanation,
    details: {
      lstm: +lstm.toFixed(3),
      tfidf: +tfidf.toFixed(3),
      rule: +rule.toFixed(3),
      url: +url.toFixed(3),
    },
    reasons,
  };
}

/* ── Render result ──────────────────────────── */
function renderResult(data, source) {
  const { verdict, confidence, explanation, details, reasons, ai_used } = data;
  const v = verdict.toLowerCase(); // 'phishing', 'suspicious', 'safe'

  // Glow — use verdict name directly (CSS now matches: .bg-glow.phishing etc.)
  bgGlowEl.className = "bg-glow " + v;

  // Source badge
  if (sourceBadgeEl) {
    sourceBadgeEl.className =
      "source-badge " + (source === "live" ? "live" : "offline");
    sourceBadgeEl.textContent =
      source === "live" ? "✦ Live ML Score" : "⚡ Simulated Score";
    sourceBadgeEl.style.display = source ? "inline-flex" : "none";
  }

  // Banner
  const banner = document.getElementById("verdictBanner");
  banner.className = "verdict-banner " + v;

  // Icon
  const iconWrap = document.getElementById("verdictIconWrap");
  const icons = { safe: "✓", suspicious: "⚠", phishing: "✕" };
  iconWrap.textContent = icons[v] || "?";

  document.getElementById("verdictLabel").textContent = verdict.toUpperCase();

  const subs = {
    safe: "No threat signals detected",
    suspicious: "Verify before taking action",
    phishing: "High confidence threat detected",
  };
  document.getElementById("verdictSub").textContent = subs[v];

  // Confidence ring
  const pct = Math.round(confidence * 100);
  let riskText = "";
  let riskColor = "";

  if (confidence >= 0.75) {
    riskText = "HIGH RISK";
    riskColor = "var(--danger)";
  } else if (confidence >= 0.5) {
    riskText = "MEDIUM RISK";
    riskColor = "var(--warn)";
  } else {
    riskText = "LOW RISK";
    riskColor = "var(--safe)";
  }

  const riskEl = document.getElementById("riskLevel");
  riskEl.textContent = riskText;
  riskEl.style.color = riskColor;
  riskEl.style.fontFamily = "var(--mono)";
  riskEl.style.fontSize = "10px";
  riskEl.style.fontWeight = "700";
  riskEl.style.letterSpacing = "0.06em";
  riskEl.style.marginBottom = "4px";

  document.getElementById("confNum").textContent = pct + "%";
  const circumference = 150.8;
  const offset = circumference - circumference * confidence;
  setTimeout(() => {
    document.getElementById("ringFill").style.strokeDashoffset = offset;
  }, 50);

  // Explanation
  document.getElementById("explanationText").textContent = explanation;
  const aiBadge = document.getElementById("aiBadge");

  if (ai_used) {
    aiBadge.style.display = "inline-flex";
    aiBadge.textContent = "🤖 AI Verified";
  } else {
    aiBadge.style.display = "none";
  }

  // Scores
  const scoreMap = { lstm: "LSTM", tfidf: "TFIDF", rule: "Rule", url: "URL" };
  Object.entries(details).forEach(([key, val]) => {
    const pctVal = Math.round(val * 100);
    document.getElementById("score" + scoreMap[key]).textContent = pctVal + "%";
    setTimeout(() => {
      document.getElementById("bar" + scoreMap[key]).style.width = pctVal + "%";
    }, 100);
  });

  // Flags
  const flagsList = document.getElementById("flagsList");
  flagsList.innerHTML = "";

  // Normalise reasons — backend returns strings, simulation returns objects
  const normReasons = (reasons || []).map((r) => {
    if (typeof r === "string") {
      const neg = [
        "Suspicious",
        "phishing",
        "High-risk",
        "urgent",
        "manipulation",
      ];
      const pos = ["Trusted", "No strong", "safe", "legitimate"];
      const type = pos.some((p) => r.includes(p))
        ? "pos"
        : neg.some((n) => r.includes(n))
          ? "neg"
          : "warn";
      return { text: r, type };
    }
    return r;
  });

  normReasons.forEach((r, i) => {
    const item = document.createElement("div");
    item.className = "flag-item " + r.type;
    item.style.animationDelay = i * 0.06 + "s";
    item.innerHTML = `
  <div class="flag-dot"></div>
  <span>
    ${r.text}
    ${r.type === "neg" ? " 🚨" : r.type === "warn" ? " ⚠" : " ✅"}
  </span>
`;
    flagsList.appendChild(item);
  });

  if (normReasons.length === 0) {
    const item = document.createElement("div");
    item.className = "flag-item pos";
    item.innerHTML = `
      <div class="flag-dot"></div>
      <span>No specific threat indicators found ✅</span>
    `;
    flagsList.appendChild(item);
  }

  // Show result
  emptyStateEl.style.display = "none";
  resultContentEl.style.display = "flex";
}
