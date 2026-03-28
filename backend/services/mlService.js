const axios = require("axios");

async function getMLScores(text) {
  try {
    return await callML(text);
  } catch (err) {
    console.warn("⚠️ First ML attempt failed, retrying...");

    try {
      return await callML(text);
    } catch (err2) {
      console.error("❌ ML completely failed");
      return null; // IMPORTANT
    }
  }
}

async function callML(text) {
  const res = await axios.post(
    "https://threatlensai-1.onrender.com/predict",
    { text },
    { timeout: 20000 },
  );
  return res.data;
}
module.exports = { getMLScores };
