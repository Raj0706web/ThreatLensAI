import pandas as pd
import pickle

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, Bidirectional, SpatialDropout1D
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks import EarlyStopping

from preprocess import clean_text

# -------------------------------
# LOAD DATA
# -------------------------------
print("📂 Loading dataset...")

df = pd.read_csv("data/final_dataset.csv")
print("Shape:", df.shape)

# -------------------------------
# CLEAN TEXT
# -------------------------------
print("🧹 Cleaning text...")

df["text"] = df["text"].astype(str).apply(clean_text)

# -------------------------------
# SPLIT DATA
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["label"], test_size=0.2, random_state=42
)

# -------------------------------
# TOKENIZATION
# -------------------------------
print("🔤 Tokenizing...")

max_words = 15000
max_len = 100

tokenizer = Tokenizer(num_words=max_words)
tokenizer.fit_on_texts(X_train)

X_train_seq = tokenizer.texts_to_sequences(X_train)
X_test_seq = tokenizer.texts_to_sequences(X_test)

X_train_pad = pad_sequences(X_train_seq, maxlen=max_len)
X_test_pad = pad_sequences(X_test_seq, maxlen=max_len)

# -------------------------------
# BUILD MODEL
# -------------------------------
print("🤖 Building model...")

model = Sequential([
    Embedding(max_words, 128),

    SpatialDropout1D(0.3),

    Bidirectional(LSTM(128, return_sequences=False)),

    Dropout(0.5),

    Dense(64, activation='relu'),
    Dropout(0.3),

    Dense(1, activation='sigmoid')
])

model.compile(
    loss='binary_crossentropy',
    optimizer='adam',
    metrics=['accuracy']
)

model.summary()

# -------------------------------
# TRAIN MODEL
# -------------------------------
print("🚀 Training model...")

early_stop = EarlyStopping(
    monitor='val_loss',
    patience=2,
    restore_best_weights=True
)

history = model.fit(
    X_train_pad,
    y_train,
    epochs=10,
    batch_size=64,
    validation_data=(X_test_pad, y_test),
    callbacks=[early_stop]
)

# -------------------------------
# EVALUATION
# -------------------------------
print("📊 Evaluating...")

loss, accuracy = model.evaluate(X_test_pad, y_test)
print("Test Accuracy:", accuracy)

y_probs = model.predict(X_test_pad)

y_pred = (y_probs > 0.6).astype("int32")

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("Classification Report:")
print(classification_report(y_test, y_pred))
print("ROC-AUC:", roc_auc_score(y_test, y_probs))

# -------------------------------
# SAVE MODEL
# -------------------------------
print("💾 Saving model...")

model.save("models/lstm_model.h5")
pickle.dump(tokenizer, open("models/tokenizer.pkl", "wb"))

print("✅ Model saved successfully!")