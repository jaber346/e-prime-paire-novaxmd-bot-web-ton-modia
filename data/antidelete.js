const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "antidelete.json");

// assure fichier settings
function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ enabled: false, mode: "chat" }, null, 2));
  }
}
ensureDb();

global.msgStore = global.msgStore || {};

/**
 * AntiDelete handler (Baileys)
 * À brancher sur sock.ev.on("messages.update", ...)
 */
module.exports = async (sock, chatUpdate, ownerNumber = "") => {
  try {
    ensureDb();
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    if (!db.enabled) return;

    const { key, update } = chatUpdate || {};
    const protocol = update?.protocolMessage;
    if (!protocol || protocol.type !== 0) return;

    const deletedId = protocol.key?.id;
    if (!deletedId) return;

    const originMsg = global.msgStore[deletedId];
    if (!originMsg) return;

    const from = key?.remoteJid || originMsg.key?.remoteJid;
    const sender = originMsg.key?.participant || originMsg.key?.remoteJid;
    if (!from || !sender) return;

    const ownerJid = (String(ownerNumber).replace(/[^0-9]/g, "") || "").length
      ? String(ownerNumber).replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      : null;

    const destination = (db.mode === "inbox" && ownerJid) ? ownerJid : from;

    const senderNum = String(sender).split("@")[0];
    const where = from.endsWith("@g.us") ? "Groupe" : "Privé";

    await sock.sendMessage(destination, {
      text:
`🚫 *ANTIDELETE DÉTECTÉ*

👤 De : @${senderNum}
📍 Lieu : ${where}

📝 Message restauré ci-dessous :`,
      mentions: [sender]
    });

    await sock.copyNForward(destination, originMsg, true);

    delete global.msgStore[deletedId];
  } catch (e) {
    console.error("Erreur Antidelete:", e?.message || e);
  }
};
