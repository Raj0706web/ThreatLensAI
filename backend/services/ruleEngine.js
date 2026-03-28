function ruleScore(text, sender = "") {
  text = text.toLowerCase();

  let score = 0;
  let senderScore = 0;
  const config = require("../config/config");
  const suspiciousKeywords = config.suspiciousKeywords;
  const sensitiveRequests = config.sensitiveRequests;
  const impersonationPatterns = config.impersonationPatterns;
  const genericGreetings = config.genericGreetings;
  const trustedDomains = config.trustedDomains;
  const legitIndicators = config.legitIndicators;

  // -------------------------------
  // COUNTS
  // -------------------------------
  const keywordHits = suspiciousKeywords.filter((k) => text.includes(k)).length;
  const sensitiveHits = sensitiveRequests.filter((p) =>
    text.includes(p),
  ).length;
  const impersonationHits = impersonationPatterns.filter((p) =>
    text.includes(p),
  ).length;
  const isTrusted =
    sender && typeof sender === "string"
      ? trustedDomains.some((domain) => sender.toLowerCase().endsWith(domain))
      : false;
  const legitHits = legitIndicators.filter((k) => text.includes(k)).length;
  let reasons = [];
  const companyKeywords = ["amazon", "paypal", "apple", "netflix", "microsoft"];

  for (let company of companyKeywords) {
    if (text.includes(company) && !sender.includes(company)) {
      score += 0.4;
      reasons.push(`Possible impersonation of ${company}`);
    }
  }
  // -------------------------------
  // BASE SIGNALS
  // -------------------------------
  if (keywordHits >= 3) {
    score += 0.25;
    reasons.push("Multiple suspicious keywords detected");
  } else if (keywordHits > 0) {
    score += 0.1;
    reasons.push("Suspicious keyword detected");
  }

  if (sensitiveHits > 0) {
    score += 0.25;
    reasons.push("Sensitive request detected");
  }

  if (impersonationHits > 0 && (keywordHits > 0 || sensitiveHits > 0)) {
    score += 0.3;
    reasons.push("Impersonation combined with action request");
  }

  if (/bit\.ly|tinyurl/.test(text)) {
    score += 0.25;
    reasons.push("Shortened URL detected");
  }

  // -------------------------------
  // SENDER ANALYSIS (VERY IMPORTANT 🔥)
  // -------------------------------

  if (sender && typeof sender === "string") {
    const lowerSender = sender.toLowerCase();

    const senderTrusted = trustedDomains.some((domain) =>
      lowerSender.endsWith(domain),
    );

    // suspicious domain patterns
    if (
      lowerSender.includes("support") ||
      lowerSender.includes("security") ||
      lowerSender.includes("admin")
    ) {
      senderScore += 0.2;
    }

    // fake domain tricks
    if (
      lowerSender.includes("secure") ||
      lowerSender.includes("verify") ||
      lowerSender.includes("update")
    ) {
      senderScore += 0.2;
    }

    // not trusted domain
    if (!senderTrusted) {
      senderScore += 0.2;
    }

    // strong impersonation (HR, CEO)
    if (/hr|ceo|admin|finance/.test(lowerSender)) {
      senderScore += 0.3;
    }

    // trusted domain reduces score
    if (senderTrusted) {
      senderScore *= 0.5;
    }

    score += senderScore;
  }

  // -------------------------------
  // LEGITIMACY BALANCE (NEW 🔥)
  // -------------------------------
  if (legitHits > 0) {
    score *= 0.5; // Strong reduction if "Internal Policy/Resources" mentioned
  }

  // -------------------------------
  // URGENCY (IMPROVED)
  // -------------------------------
  if (
    /urgent|immediately|asap|within \d+ hours|by end of day|deadline|by friday/i.test(
      text,
    )
  ) {
    score += 0.25;
  }

  // -------------------------------
  // GENERIC GREETING
  // -------------------------------
  if (genericGreetings.some((g) => text.includes(g))) {
    score += 0.15;
  }

  // -------------------------------
  // COMBO BONUS (CRITICAL 🔥)
  // -------------------------------
  if (impersonationHits > 0 && (keywordHits > 0 || sensitiveHits > 0)) {
    score += 0.3; // HR + action = strong phishing signal
  }

  // -------------------------------
  // LINK DETECTION
  // -------------------------------
  const hasLink = /http|www|\[link|\]/.test(text);
  if (hasLink) score += 0.15;

  // -------------------------------
  // ACTION + LINK PROXIMITY (VERY POWERFUL 🔥)
  // -------------------------------
  const actionWords = ["click", "verify", "sign", "access", "submit"];
  for (let word of actionWords) {
    const index = text.indexOf(word);
    if (index !== -1) {
      const nearby = text.substring(index, index + 80);
      if (/http|www/.test(nearby)) {
        score += 0.3;
        reasons.push("Action request followed by suspicious link");
      }
    }
  }

  // -------------------------------
  // SHORT URL DETECTION
  // -------------------------------
  if (/bit\.ly|tinyurl|shorturl/.test(text)) {
    score += 0.25;
  }
  // -------------------------------
  // TRUSTED DOMAIN ADJUSTMENT (IMPROVED)
  // -------------------------------
  if (isTrusted) {
    if (score < 0.5) {
      // likely safe internal mail
      score *= 0.7;
    } else if (score < 0.75) {
      // suspicious but not strong
      score *= 0.85;
    }
    // if score >= 0.75 → DO NOTHING
    // strong phishing signals override trust
  }

  if (legitHits > 0 && isTrusted) {
    score *= 0.75; // reduce score if legit indicators present
  }

  // -------------------------------
  // NORMALIZE
  // -------------------------------
  return {
    score: Math.min(score, 1),
    reasons,
  };
}

module.exports = { ruleScore };
