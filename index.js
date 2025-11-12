import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

// === Temporary memory stores ===
// Codes waiting for Roblox input
const codes = new Map(); // code -> { discordId, expiresAt }
// Successfully verified users
const verifiedPlayers = new Map(); // robloxId -> { discordId, booster, verifiedAt }

// === Default route ===
app.get("/", (req, res) => {
  res.send("✅ Roblox Verifier API is online and linked!");
});

// === Discord bot: generates code ===
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

// === Roblox verification place: verify code ===
app.post("/verify-code", (req, res) => {
  const { code, robloxId } = req.body;
  const entry = codes.get(code);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(404).json({ error: "Invalid or expired code" });
  }

  // Remove used code
  codes.delete(code);

  // ✅ Save verified link
  verifiedPlayers.set(String(robloxId), {
    discordId: entry.discordId,
    booster: true, // Your bot already checks they’re boosting before code generation
    verifiedAt: Date.now(),
  });

  console.log(`✅ Verified Roblox user ${robloxId} linked to Discord ${entry.discordId}`);
  res.json({ ok: true, discordId: entry.discordId });
});

// === Roblox main game: check verification status ===
app.get("/status/:robloxId", (req, res) => {
  const robloxId = String(req.params.robloxId);
  const record = verifiedPlayers.get(robloxId);

  if (record) {
    res.json({
      verified: true,
      booster: record.booster,
      discordId: record.discordId,
      verifiedAt: record.verifiedAt,
    });
  } else {
    res.json({ verified: false, booster: false });
  }
});

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
