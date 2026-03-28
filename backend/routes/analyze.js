/* ──────────────────────────────────────────────
   ThreatLens AI — /analyze route
   Fuses ML scores (LSTM + TF-IDF) with Rule Engine
   and URL Checker into a single weighted verdict.
   Weights: 0.35 LSTM | 0.30 TF-IDF | 0.15 Rule | 0.15 URL
────────────────────────────────────────────── */

const express = require("express");
const router = express.Router();

const { getMLScores } = require("../services/mlService");
const { ruleScore } = require("../services/ruleEngine");
const { urlScore } = require("../services/urlChecker");

router.post("/", async (req, res) => {
  const { text, sender, url: explicitUrl } = req.body;

  try {
    // -------------------------------
    // ML SCORES
    // -------------------------------
    const ml = await getMLScores(text);

    let lstm = ml.lstm || 0;
    const tfidf = ml.tfidf || 0;

    // -------------------------------
    // RULE + URL
    // -------------------------------
    const rule = ruleScore(text, sender);
    const url = urlScore(explicitUrl || text);

    const isTrustedSender =
      sender && sender.toLowerCase().endsWith("@yourcompany.com");

    // -------------------------------
    // LSTM CALIBRATION (IMPORTANT 🔥)
    // -------------------------------
    if (isTrustedSender && rule < 0.3 && url === 0) {
      lstm = Math.min(lstm, 0.6); // cap LSTM confidence
    }

    // -------------------------------
    // FINAL SCORE
    // -------------------------------
    let finalScore = 0.35 * lstm + 0.3 * tfidf + 0.15 * rule + 0.15 * url;

    finalScore = Math.min(finalScore, 1);

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
    // REASONS (EXPLAINABLE AI 🔥)
    // -------------------------------
    let reasons = [];

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
