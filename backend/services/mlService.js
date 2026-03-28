const axios = require("axios");

async function getMLScores(text) {
  try {
    const res = await axios.post("http://127.0.0.1:8000/predict", { text });

    return res.data; // lstm + tfidf
  } catch (err) {
    console.error("ML Service Error:", err.message);
    return { lstm: 0, tfidf: 0 };
  }
}

module.exports = { getMLScores };
