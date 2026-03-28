const { URL } = require("url");
const config = require("../config/config");

function urlScore(text, explicitUrl = "") {
  let score = 0;
  let reasons = [];

  const regex = /(https?:\/\/[^\s]+|\b[a-zA-Z0-9.-]+\.[a-z]{2,}\S*)/g;
  const extractedUrls = text.match(regex) || [];

  // Merge explicit URL if provided
  const urls = [...extractedUrls];
  if (explicitUrl) urls.push(explicitUrl);

  const shorteners = config.shorteners;
  const suspiciousTLDs = config.suspiciousTLDs;

  urls.forEach((rawUrl) => {
    try {
      // Ensure proper format
      let urlObj;
      if (!rawUrl.startsWith("http")) {
        urlObj = new URL("http://" + rawUrl);
      } else {
        urlObj = new URL(rawUrl);
      }

      const hostname = urlObj.hostname.toLowerCase();
      const protocol = urlObj.protocol;

      // 🔴 Shortened URL
      if (shorteners.some((s) => hostname.includes(s))) {
        score += 0.4;
        reasons.push("Shortened URL detected");
      }

      // 🔴 Insecure protocol
      if (protocol === "http:") {
        score += 0.2;
        reasons.push("Insecure HTTP protocol");
      }

      // 🔴 Suspicious TLD
      const tld = hostname.split(".").pop();
      if (suspiciousTLDs.includes(tld)) {
        score += 0.3;
        reasons.push(`Suspicious domain extension (.${tld})`);
      }

      // 🔴 Too many subdomains (phishing trick)
      const parts = hostname.split(".");
      if (parts.length > 3) {
        score += 0.2;
        reasons.push("Too many subdomains (possible spoofing)");
      }

      // 🔴 Hyphen abuse
      if ((hostname.match(/-/g) || []).length >= 2) {
        score += 0.2;
        reasons.push("Suspicious domain structure with hyphens");
      }

      // 🔴 Brand impersonation
      if (/amaz0n|paypa1|g00gle/.test(hostname)) {
        score += 0.4;
        reasons.push("Brand impersonation detected in domain");
      }
    } catch (err) {
      // Invalid URL → suspicious
      score += 0.2;
      reasons.push("Malformed or invalid URL");
    }
  });

  return {
    score: Math.min(score, 1),
    reasons,
  };
}

module.exports = { urlScore };
