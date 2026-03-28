import re

# ✅ Built-in stopwords (no internet needed)
stop_words = {
    "a","an","the","and","or","but","if","while","is","am","are","was","were",
    "be","been","being","have","has","had","do","does","did","of","to","in",
    "for","on","with","as","by","at","from","this","that","these","those",
    "it","its","he","she","they","them","his","her","their","you","your",
    "i","me","my","we","our","us"
}

def clean_text(text):
    text = text.lower()

    # remove URLs
    text = re.sub(r"http\S+", "", text)

    # remove emails
    text = re.sub(r"\S+@\S+", "", text)

    # remove numbers
    text = re.sub(r"\d+", "", text)

    # remove special characters
    text = re.sub(r"[^a-z\s]", "", text)

    # remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    # remove stopwords
    words = text.split()
    words = [w for w in words if w not in stop_words]

    return " ".join(words)