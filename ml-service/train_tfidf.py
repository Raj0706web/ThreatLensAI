import pandas as pd
import pickle

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import classification_report, roc_auc_score

from preprocess import clean_text

print("📂 Loading dataset...")

df = pd.read_csv("data/final_dataset.csv")

print("🧹 Cleaning text...")
df["text"] = df["text"].astype(str).apply(clean_text)

# Split
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["label"], test_size=0.2, random_state=42
)

# TF-IDF
print("🔤 Vectorizing...")
vectorizer = TfidfVectorizer(
    max_features=30000,
    ngram_range=(1,2),   # unigram + bigram
    min_df=2,
    max_df=0.9,
    sublinear_tf=True
)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Model
print("🤖 Training SGD Classifier...")
model = SGDClassifier(
    loss="log_loss",
    penalty="l2",
    alpha=1e-4,
    max_iter=1000,
    random_state=42
)

model.fit(X_train_vec, y_train)

# Evaluate
y_pred = model.predict(X_test_vec)
y_probs = model.predict_proba(X_test_vec)[:, 1]


print("📊 Report:")
print(classification_report(y_test, y_pred))
print("ROC-AUC:", roc_auc_score(y_test, y_probs))

# Save
print("💾 Saving TF-IDF model...")
pickle.dump(model, open("models/tfidf_model.pkl", "wb"))
pickle.dump(vectorizer, open("models/tfidf_vectorizer.pkl", "wb"))

print("✅ TF-IDF model saved!")