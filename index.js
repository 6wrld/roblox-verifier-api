import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const codes = new Map();

app.post("/discord/generate", (req, res) => {
  const { discordId } = req.body;
  if (!discordId) return res.status(400).json({ error: "missing discordId" });

  const code = crypto.randomBytes(3).toString("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000;
  codes.set(code, { discordId, expiresAt });

  res.json({ code, expiresAt });
});

app.post("/verify-code", (req, res) => {
  const { code, robloxId } = req.body;
  const entry = codes.get(code);
  if (!entry || entry.expiresAt < Date.now())
    return res.status(404).json({ error: "invalid or expired code" });

  codes.delete(code);
  res.json({ ok: true, discordId: entry.discordId });
});

app.get("/status/:robloxId", (req, res) => {
  res.json({ verified: false, booster: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
