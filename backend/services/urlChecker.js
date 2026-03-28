function urlScore(text) {
  let score = 0;

  const regex = /(https?:\/\/\S+|\b\S+\.\S+\b)/g;
  const urls = text.match(regex) || [];

  urls.forEach((url) => {
    if (url.includes("bit.ly") || url.includes("tinyurl")) score += 0.4;
    if (url.includes("@")) score += 0.5;
    if (url.includes("-")) score += 0.2;
    if (!url.startsWith("https")) score += 0.2;

    if (url.includes("sharepoint") && url.includes("auth")) score += 0.4;
  });

  return Math.min(score, 1);
}

module.exports = { urlScore };
