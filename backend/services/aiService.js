const OpenAI = require("openai");

// Initialize client only if key exists to prevent startup crash
const apiKey = process.env.OPENAI_API_KEY;
let client = null;

if (apiKey) {
  client = new OpenAI({ apiKey });
} else {
  console.warn("⚠️ OPENAI_API_KEY is missing. AI analysis will be skipped.");
}

async function analyzeWithAI(text, sender) {
  // If no client (missing key), exit early without crashing
  if (!client) return null;

  try {
    const prompt = `
You are a cybersecurity expert.

Analyze the following email for phishing risk.

Email Content:
"${text}"

Sender:
"${sender}"

Tasks:
1. Is this phishing? (Yes/No)
2. Risk level (Low, Medium, High)
3. Explain why (short bullet points)

Respond in JSON format:
{
  "phishing": true/false,
  "risk": "Low/Medium/High",
  "reasons": ["...", "..."]
}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }, // 🔥 ADD THIS LINE
    });

    const output = response.choices[0].message.content;

    try {
      const parsed = JSON.parse(output);

      // Validate structure
      if (
        typeof parsed.phishing !== "boolean" ||
        !["Low", "Medium", "High"].includes(parsed.risk) ||
        !Array.isArray(parsed.reasons)
      ) {
        throw new Error("Invalid AI response format");
      }

      return parsed;
    } catch (err) {
      console.error("AI parse error:", err.message);
      return null;
    }
  } catch (err) {
    console.error("AI Error:", err.message);
    return null;
  }
}

module.exports = { analyzeWithAI };
