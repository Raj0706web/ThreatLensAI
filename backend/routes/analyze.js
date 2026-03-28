/* ──────────────────────────────────────────────
   ThreatLens AI — /analyze route
   Fuses ML scores (LSTM + TF-IDF) with Rule Engine
   and URL Checker into a single weighted verdict.
   Weights: 0.3 LSTM | 0.2 TF-IDF | 0.3 Rule | 0.2 URL
────────────────────────────────────────────── */

const express = require("express");
const router = express.Router();

const { getMLScores } = require("../services/mlService");
const { ruleScore } = require("../services/ruleEngine");
const { urlScore } = require("../services/urlChecker");
const { analyzeWithAI } = require("../services/aiService");
const config = require("../config/config");

router.post("/", async (req, res) => {
  const { text, sender, url: explicitUrl } = req.body;

  try {
    // -------------------------------
    // ML SCORES
    // -------------------------------
    const ml = await getMLScores(text);

    let lstm = 0;
    let tfidf = 0;

    if (ml) {
      lstm = ml.lstm || 0;
      tfidf = ml.tfidf || 0;
    } else {
      console.warn("⚠️ ML unavailable — relying on rules");
    }

    // -------------------------------
    // RULE + URL
    // -------------------------------
    const ruleResult = ruleScore(text, sender);
    const rule = ruleResult.score;
    const urlResult = urlScore(text, explicitUrl);

    const url = urlResult.score;

    const trustedDomains = config.trustedDomains;

    const isTrustedSender =
      sender &&
      trustedDomains.some((domain) => sender.toLowerCase().endsWith(domain));

    // -------------------------------
    // LSTM CALIBRATION (IMPORTANT 🔥)
    // -------------------------------
    if (isTrustedSender && rule < 0.3 && url === 0) {
      lstm = Math.min(lstm, 0.6); // cap LSTM confidence
    }

    // -------------------------------
    // FINAL SCORE (0.3 LSTM | 0.2 TF-IDF | 0.3 Rule | 0.2 URL)
    // -------------------------------
    let finalScore = 0.3 * lstm + 0.2 * tfidf + 0.3 * rule + 0.2 * url;

    // 🚨 HARD SAFETY CHECK: If components are high, don't let a missing AI score hide the threat
    if (rule >= 0.8 || url >= 0.7) {
      finalScore = Math.max(finalScore, 0.82); // Force "Phishing" verdict
    }

    // -------------------------------
    // REASONS (EXPLAINABLE AI 🔥)
    // -------------------------------
    let reasons = [...ruleResult.reasons, ...urlResult.reasons];

    if (lstm > 0.7) reasons.push("Suspicious language detected");
    if (tfidf > 0.7) reasons.push("Matches phishing patterns");

    if (rule >= 0.7) {
      reasons.push("High-risk phishing behavior detected");
    } else if (rule >= 0.3) {
      reasons.push("Suspicious behavioral patterns detected");
    }

    if (url >= 0.3) {
      reasons.push("Suspicious or external link detected");
    }

    if (sender && !isTrustedSender) {
      reasons.push("Untrusted sender domain");
    }

    // -------------------------------
    // AI OVERRIDE (HIGHEST PRIORITY 🔥)
    // -------------------------------
    let aiResult = null;

    // ⚠️ Gray zone detection
    if (finalScore >= 0.4 && finalScore <= 0.75) {
      try {
        aiResult = await analyzeWithAI(text, sender);

        if (aiResult) {
          // 🔼 adjust score based on AI
          if (aiResult.risk === "High") finalScore += 0.2;
          else if (aiResult.risk === "Medium") finalScore += 0.1;
          else finalScore -= 0.1;
          // 🔥 merge AI reasons
          if (Array.isArray(aiResult.reasons)) {
            reasons.push(...aiResult.reasons);
          }
        }
      } catch (err) {
        console.error("AI fallback failed:", err.message);
      }
    }

    finalScore = Math.max(0, Math.min(finalScore, 1));
    // Additional safety reduction
    if (isTrustedSender && rule < 0.3 && url === 0) {
      finalScore *= 0.7;
    }

    // -------------------------------
    // VERDICT
    // -------------------------------
    let verdict = "Safe";
    if (finalScore >= 0.8) verdict = "Phishing";
    else if (finalScore >= 0.6) verdict = "Suspicious";

    // -------------------------------
    // SAFE CONTEXT EXPLANATION
    // -------------------------------
    if (verdict === "Safe") {
      if (isTrustedSender) {
        reasons.push("Trusted internal sender");
      }

      if (rule < 0.3 && url === 0) {
        reasons.push("No strong phishing indicators");
      }

      // Remove misleading ML-only warning
      if (reasons.includes("Suspicious language detected")) {
        reasons = reasons.filter((r) => r !== "Suspicious language detected");
      }
    }

    // -------------------------------
    // HUMAN-FRIENDLY EXPLANATION
    // -------------------------------
    let explanation = "";

    if (verdict === "Safe") {
      explanation =
        "This email appears safe based on trusted sender and low-risk behavior.";
    } else if (verdict === "Suspicious") {
      explanation =
        "This email shows some suspicious patterns. Please verify before taking action.";
    } else {
      explanation =
        "High probability of phishing detected. Avoid clicking links or sharing sensitive information.";
    }

    // -------------------------------
    // RESPONSE
    // -------------------------------
    res.json({
      verdict,
      confidence: Number(finalScore.toFixed(3)),
      explanation,
      ai_used: !!aiResult,
      details: {
        lstm: Number(lstm.toFixed(3)),
        tfidf: Number(tfidf.toFixed(3)),
        rule: Number(rule.toFixed(3)),
        url: Number(url.toFixed(3)),
      },
      reasons,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
