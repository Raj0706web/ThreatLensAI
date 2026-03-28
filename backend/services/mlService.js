const axios = require("axios");

async function getMLScores(text) {
  try {
    const res = await axios.post(
      "https://threatlensai-1.onrender.com/predict",
      { text },
    );

    return res.data; // lstm + tfidf
  } catch (err) {
    console.error("ML Service Error:", err.message);
    throw new Error("ML_SERVICE_DOWN");
  }
}

module.exports = { getMLScores };
