import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

// Simple in-memory store for verification codes
const codes = new Map();

// === ROUTES ===

// default route (for testing)
app.get("/", (req, res) => {
  res.send("✅ Roblox Verifier API is online!");
});

// route your Discord bot calls
app.post("/discord/generate", (req, res) => {
  const { discordId } = req.body;

  if (!discordId) {
    return res.status(400).json({ error: "Missing discordId" });
  }

  // Generate a random 6-character code
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // store the code temporarily
  codes.set(code, { discordId, expiresAt });

  console.log(`Generated code ${code} for Discord ID ${discordId}`);
  res.json({ code, expiresAt });
});

// route Roblox game will call later
app.post("/verify-code", (req, res) => {
  const { code, robloxId } = req.body;
  const entry = codes.get(code);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(404).json({ error: "invalid or expired code" });
  }

  // remove the code after it’s used
  codes.delete(code);

  // respond with Discord ID (to link to player)
  res.json({ ok: true, discordId: entry.discordId });
});

// route Roblox game can call to check link status
app.get("/status/:robloxId", (req, res) => {
  res.json({ verified: false, booster: false });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
