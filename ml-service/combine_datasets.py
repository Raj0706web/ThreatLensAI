import pandas as pd
import os

print("🚀 Script started...")

# ✅ Correct folder names (you said you fixed them)
ENRON_PATH = "./enron_span_d/enron_spam_data.csv"
PHISHING_FOLDER = "./phishing_d/"

# -------------------------------
# LOAD ENRON DATASET
# -------------------------------
print("📂 Loading Enron dataset...")

enron = pd.read_csv(ENRON_PATH)
print("✅ Enron loaded:", enron.shape)
print("Columns:", enron.columns)

# Normalize column names
enron.columns = enron.columns.str.lower()

# Combine subject + message
enron["text"] = enron["subject"].fillna("") + " " + enron["message"].fillna("")

# Normalize label
enron["spam/ham"] = enron["spam/ham"].astype(str).str.lower()

enron["label"] = enron["spam/ham"].map({
    "spam": 1,
    "ham": 0
})

enron = enron[["text", "label"]]

# -------------------------------
# LOAD PHISHING DATASETS
# -------------------------------
print("📂 Loading phishing datasets...")

phishing_dfs = []

files = os.listdir(PHISHING_FOLDER)
print("Files found:", files)

for file in files:
    if file.endswith(".csv"):
        path = os.path.join(PHISHING_FOLDER, file)
        print(f"➡️ Reading {file}")

        try:
            df = pd.read_csv(path)
            print(f"Loaded {file}:", df.shape)

            df.columns = df.columns.str.lower()

            # -------------------------------
            # TEXT COLUMN HANDLING
            # -------------------------------
            possible_text_cols = ["text", "email", "message", "body", "content"]

            text_col = None
            for col in possible_text_cols:
                if col in df.columns:
                    text_col = col
                    break

            if text_col:
                df = df.rename(columns={text_col: "text"})
            else:
                if "subject" in df.columns and "body" in df.columns:
                    df["text"] = df["subject"].fillna("") + " " + df["body"].fillna("")
                elif "subject" in df.columns and "content" in df.columns:
                    df["text"] = df["subject"].fillna("") + " " + df["content"].fillna("")
                else:
                    print(f"⚠️ Skipping {file} (no usable text column)")
                    continue

            # -------------------------------
            # LABEL HANDLING
            # -------------------------------
            if "label" in df.columns:
                pass
            elif "spam" in df.columns:
                df = df.rename(columns={"spam": "label"})
            elif "type" in df.columns:
                df = df.rename(columns={"type": "label"})
            elif "class" in df.columns:
                df = df.rename(columns={"class": "label"})
            else:
                print(f"⚠️ Skipping {file} (no label column)")
                continue

            # Normalize labels
            df["label"] = df["label"].astype(str).str.lower()

            df["label"] = df["label"].map({
                "phishing": 1,
                "spam": 1,
                "fraud": 1,
                "1": 1,
                "legit": 0,
                "ham": 0,
                "0": 0,
                0: 0
            })

            df = df[["text", "label"]]

            # Remove null labels
            df = df.dropna(subset=["label"])

            phishing_dfs.append(df)

        except Exception as e:
            print(f"❌ Error reading {file}:", e)

# -------------------------------
# LOAD BEC DATASET
# -------------------------------
print("📂 Loading BEC dataset...")

bec_path = "./bec_dataset/synthetic_emails.csv"

bec = pd.read_csv(bec_path)

print("BEC loaded:", bec.shape)
print("Columns:", bec.columns)

# normalize column names
bec.columns = bec.columns.str.lower()

# ✅ FIX: combine subject + body
bec["text"] = bec["subject"].fillna("") + " " + bec["body"].fillna("")


# label as phishing
bec["label"] = 1

bec = bec[["text", "label"]]
# -------------------------------
# MERGE DATASETS
# -------------------------------
if len(phishing_dfs) == 0:
    print("❌ No phishing data loaded!")
    exit()

phishing = pd.concat(phishing_dfs, ignore_index=True)
print("✅ Phishing combined:", phishing.shape)

combined = pd.concat([enron, phishing, bec], ignore_index=True)
print("✅ Total combined:", combined.shape)

# -------------------------------
# CLEAN DATA
# -------------------------------
combined = combined.dropna()
combined = combined.drop_duplicates()

print("After cleaning:", combined.shape)

# Remove very short emails
combined = combined[combined["text"].str.len() > 20]

# Shuffle
combined = combined.sample(frac=1).reset_index(drop=True)

# -------------------------------
# BALANCE DATASET
# -------------------------------
print("⚖️ Balancing dataset...")

phish = combined[combined.label == 1]
safe = combined[combined.label == 0]

min_size = min(len(phish), len(safe))

phish = phish.sample(n=min_size, random_state=42)
safe = safe.sample(n=min_size, random_state=42)

balanced = pd.concat([phish, safe])
balanced = balanced.sample(frac=1).reset_index(drop=True)

# -------------------------------
# SAVE FINAL DATASET
# -------------------------------
os.makedirs("data", exist_ok=True)

balanced.to_csv("data/final_dataset.csv", index=False)

print("🎉 DONE! Dataset saved at data/final_dataset.csv")
print("Final shape:", balanced.shape)
print(balanced["label"].value_counts())