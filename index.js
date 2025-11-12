import express from "express";
import crypto from "crypto";
import fetch from "node-fetch"; // 🔥 for Discord API calls

const app = express();
app.use(express.json());

// === CONFIG ===
const GUILD_ID = process.env.GUILD_ID || "YOUR_GUILD_ID";
const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN";

// === Temporary memory stores ===
const codes = new Map(); // code -> { discordId, expiresAt }
const verifiedPlayers = new Map(); // robloxId -> { discordId, booster, verifiedAt }

// === Default route ===
app.get("/", (req, res) => {
  res.send("✅ Roblox Verifier API is online and linked!");
});

// === Discord bot: generates code ===
app.post("/discord/generate", (req, res) => {
  const { discordId } = req.body;
  if (!discordId) return res.status(400).json({ error: "Missing discordId" });

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  codes.set(code, { discordId, expiresAt });
  console.log(`🔐 Generated code ${code} for Discord ID ${discordId}`);

  res.json({ code, expiresAt });
});

// === Roblox verification place: verify code ===
app.post("/verify-code", async (req, res) => {
  const { code, robloxId } = req.body;
  const entry = codes.get(code);

  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(404).json({ error: "Invalid or expired code" });
  }

  codes.delete(code); // one-time use

  let isBoosting = false;

  try {
    // 🟣 Check if the Discord user is a member of your server
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${entry.discordId}`,
      {
        headers: {
          "Authorization": `Bot ${BOT_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const member = await response.json();

      // ✅ Check if user is boosting
      isBoosting = !!member.premium_since;

      console.log(
        `🔎 Discord user ${entry.discordId} in guild ${GUILD_ID} | Boosting: ${isBoosting}`
      );
    } else if (response.status === 404) {
      console.warn(`⚠️ Discord user ${entry.discordId} not found in the guild.`);
    } else {
      console.warn(
        `⚠️ Failed to fetch member ${entry.discordId}: ${response.status}`
      );
    }
  } catch (err) {
    console.error("❌ Discord API error:", err);
  }

  // ✅ Save verified record
  verifiedPlayers.set(String(robloxId), {
    discordId: entry.discordId,
    booster: isBoosting,
    verifiedAt: Date.now(),
  });

  console.log(
    `✅ Verified Roblox user ${robloxId} linked to Discord ${entry.discordId} | Booster: ${isBoosting}`
  );

  res.json({
    ok: true,
    discordId: entry.discordId,
    booster: isBoosting,
  });
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
