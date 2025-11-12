import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

// Temporary in-memory stores
const codes = new Map();     // code → { discordId, expiresAt }
const verified = new Map();  // robloxId → discordId

// === Default route (testing) ===
app.get("/", (req, res) => {
  res.send("✅ Roblox Verifier API is online and linked!");
});

// === Called by Discord bot (/verify) ===
app.post("/discord/generate", (req, res) => {
  const { discordId } = req.body;

  if (!discordId) return res.status(400).json({ error: "Missing discordId" });

  // Generate a random 6-character code
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  codes.set(code, { discordId, expiresAt });

  console.log(`🔐 Generated code ${code} for Discord ID ${discordId}`);
  res.json({ code, expiresAt });
});

// === Called by your Roblox verification game ===
app.post("/verify-code", (req, res) => {
  const { code, robloxId } = req.body;
  const entry = codes.get(code);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(404).json({ error: "invalid or expired code" });
  }

  // Mark user as verified
  codes.delete(code);
  verified.set(robloxId, entry.discordId);

  console.log(`✅ Verified Roblox user ${robloxId} linked to Discord ${entry.discordId}`);
  res.json({ ok: true, discordId: entry.discordId });
});

// === Called by your main game to check status ===
app.get("/status/:robloxId", (req, res) => {
  const { robloxId } = req.params;
  const discordId = verified.get(robloxId);
  res.json({ verified: !!discordId, discordId: discordId || null });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
