from flask import Flask, request, jsonify
import pickle

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

from preprocess import clean_text

app = Flask(__name__)

# -------------------------------
# LOAD MODELS
# -------------------------------
lstm_model = load_model("models/lstm_model.h5")
tokenizer = pickle.load(open("models/tokenizer.pkl", "rb"))

tfidf_model = pickle.load(open("models/tfidf_model.pkl", "rb"))
vectorizer = pickle.load(open("models/tfidf_vectorizer.pkl", "rb"))

max_len = 100

# -------------------------------
# ML ONLY ENDPOINT
# -------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    text = request.json.get("text", "")

    cleaned = clean_text(text)

    # LSTM
    seq = tokenizer.texts_to_sequences([cleaned])
    padded = pad_sequences(seq, maxlen=max_len)
    lstm_score = float(lstm_model.predict(padded)[0][0])

    # TF-IDF
    tfidf_vec = vectorizer.transform([cleaned])
    tfidf_score = float(tfidf_model.predict_proba(tfidf_vec)[0][1])

    return jsonify({
        "lstm": round(lstm_score, 3),
        "tfidf": round(tfidf_score, 3)
    })

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    app.run(port=8000)