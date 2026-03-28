/* ──────────────────────────────────────────────
   ThreatLens AI — Express Backend
   Port: 5000  |  ML Service: localhost:8000
────────────────────────────────────────────── */

const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");

/* ── CORS ─────────────────────────────────── */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

/* ── Middleware ───────────────────────────── */
app.use(express.json());

/* ── Serve frontend static files ──────────── */
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

/* ── Health route (used by frontend status check) ── */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ThreatLens AI", version: "1.0.0" });
});

/* ── Analysis route ───────────────────────── */
const analyzeRoute = require("./routes/analyze");
app.use("/analyze", analyzeRoute);

/* ── Fallback: serve frontend for any unmatched GET ── */
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* ── Start ────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🔍 ThreatLens AI — Server running on http://127.0.0.1:" + PORT);
  console.log("   Frontend UI:       http://127.0.0.1:" + PORT);
  console.log("   Health check:      http://127.0.0.1:" + PORT + "/health");
  console.log("   ML Service needed: http://127.0.0.1:8000/predict");
});
