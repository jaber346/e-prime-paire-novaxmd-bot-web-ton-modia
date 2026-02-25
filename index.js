const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const express = require("express");
const fs = require("fs");
const path = require("path");

const config = require("./config");

// handlers (safe)
let newsletterHandler = async () => {};
let antideleteHandler = async () => {};
try { newsletterHandler = require("./data/newsletter.js"); } catch {}
try { antideleteHandler = require("./data/antidelete.js"); } catch {}

const app = express();
const port = process.env.PORT || 3000;

const sessionsDir = path.join(__dirname, "accounts");
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

let tempSocks = {};
global.msgStore = global.msgStore || {};
global.owner = String(config.OWNER_NUMBER || "").replace(/[^0-9]/g, "");

// static
app.use(express.static(__dirname));

// ===============================
// START BOT
// ===============================
async function startUserBot(phoneNumber, isPairing = false) {
  const cleanNumber = String(phoneNumber || "").replace(/[^0-9]/g, "");
  const sessionName = `session_${cleanNumber}`;
  const sessionPath = path.join(sessionsDir, sessionName);

  // reset session si pairing
  if (isPairing) {
    if (tempSocks[sessionName]) {
      try { tempSocks[sessionName].end(); } catch {}
      delete tempSocks[sessionName];
    }
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  let currentMode = config.MODE || "public";

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    }
  });

  tempSocks[sessionName] = sock;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log(`[${cleanNumber}] Reconnexion...`);
        startUserBot(cleanNumber);
      }
    }

    if (connection === "open") {
      console.log(`✅ [${cleanNumber}] Session connectée`);
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        await sock.sendMessage(userJid, { text: `✅ *${config.BOT_NAME || "NOVA XMD V1"} CONNECTÉ*` });
      } catch {}
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // messages
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const m = chatUpdate.messages?.[0];
      if (!m || !m.message) return;

      const jid = m.key.remoteJid;

      if (jid === "status@broadcast") {
        await sock.readMessages([m.key]);
        return;
      }

      // store for antidelete
      global.msgStore[m.key.id] = m;
      setTimeout(() => { delete global.msgStore[m.key.id]; }, 7200000);

      await newsletterHandler(sock, m);

      const cmdHandler = require("./case.js");
      await cmdHandler(sock, m, config.PREFIX, (newMode) => { currentMode = newMode; }, currentMode);
    } catch (err) {
      console.log("Message error:", err?.message || err);
    }
  });

  // antidelete
  sock.ev.on("messages.update", async (updates) => {
    try {
      for (const upd of updates) {
        await antideleteHandler(sock, upd, global.owner);
      }
    } catch {}
  });

  return sock;
}

// ===============================
// RESTORE SESSIONS
// ===============================
async function restoreSessions() {
  if (!fs.existsSync(sessionsDir)) return;
  const folders = fs.readdirSync(sessionsDir);
  for (const folder of folders) {
    if (folder.startsWith("session_")) {
      const phoneNumber = folder.replace("session_", "");
      console.log(`🔄 Restore: ${phoneNumber}`);
      await startUserBot(phoneNumber);
      await delay(4000);
    }
  }
}

// ===============================
// ROUTES
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Pair route expected by index.html
app.get("/pair", async (req, res) => {
  try {
    const num = String(req.query.number || "").replace(/[^0-9]/g, "");
    if (!num || num.length < 8) return res.status(400).json({ error: "Numéro invalide" });

    const sock = await startUserBot(num, true);
    await delay(2500);

    const code = await sock.requestPairingCode(num);
    return res.json({ code });
  } catch (e) {
    console.log("PAIR ERROR:", e?.message || e);
    return res.status(500).json({ error: "Impossible de générer le code" });
  }
});

// ===============================
// SERVER
// ===============================
app.listen(port, async () => {
  console.log(`🌐 ${config.BOT_NAME || "NOVA XMD V1"} prêt : http://localhost:${port}`);
  global.botStartTime = Date.now();
  await restoreSessions();
});
