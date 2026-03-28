import os
from flask import Flask, request, jsonify
import pickle

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

from preprocess import clean_text

app = Flask(__name__)

# -------------------------------
# LOAD MODELS
# -------------------------------
# 🔥 FIX 1: compile=False saves memory and fixes version mismatch errors
lstm_model = load_model("models/lstm_model.h5", compile=False)
tokenizer = pickle.load(open("models/tokenizer.pkl", "rb"))

tfidf_model = pickle.load(open("models/tfidf_model.pkl", "rb"))
vectorizer = pickle.load(open("models/tfidf_vectorizer.pkl", "rb"))

max_len = 100

# -------------------------------
# ML ONLY ENDPOINT
# -------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        text = request.json.get("text", "")
        if not text:
            return jsonify({"lstm": 0, "tfidf": 0})

        cleaned = clean_text(text)

        # LSTM
        seq = tokenizer.texts_to_sequences([cleaned])
        padded = pad_sequences(seq, maxlen=max_len)
        lstm_score = float(lstm_model.predict(padded, verbose=0)[0][0]) # verbose=0 keeps logs clean

        # TF-IDF
        tfidf_vec = vectorizer.transform([cleaned])
        tfidf_score = float(tfidf_model.predict_proba(tfidf_vec)[0][1])

        return jsonify({
            "lstm": round(lstm_score, 3),
            "tfidf": round(tfidf_score, 3)
        })
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({"lstm": 0, "tfidf": 0}), 500

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    # 🔥 FIX 2: Render dynamic port binding and 0.0.0.0 host
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)