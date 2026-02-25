const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../data/antidelete.json");

// Assure que le fichier existe
function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ enabled: false, mode: "chat" }, null, 2)
    );
  }
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    // si le json est cassé
    return { enabled: false, mode: "chat" };
  }
}

module.exports = async (sock, chatUpdate) => {
  try {
    const db = readDb();
    if (!db.enabled) return;

    // chatUpdate vient de sock.ev.on("messages.update", ...)
    const key = chatUpdate?.key;
    const update = chatUpdate?.update;

    if (!key || !update) return;

    // suppression (protocolMessage type 0)
    const pm = update.protocolMessage;
    if (!pm || pm.type !== 0) return;

    const deletedId = pm.key?.id;
    if (!deletedId) return;

    const originMsg = global.msgStore?.[deletedId];
    if (!originMsg) return;

    const from = key.remoteJid;

    // sender original
    const sender =
      originMsg.key?.participant ||
      originMsg.participant ||
      originMsg.key?.remoteJid;

    // destination
    const ownerNumber = require("../config").OWNER_NUMBER || "";
    const ownerJid = String(ownerNumber).replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const destination = db.mode === "inbox" ? ownerJid : from;

    // petit texte d’alerte
    await sock.sendMessage(destination, {
      text:
`🚫 *ANTIDELETE DÉTECTÉ* 🚫

👤 De : @${String(sender).split("@")[0]}
📍 Lieu : ${from.endsWith("@g.us") ? "Groupe" : "Privé"}`,
      mentions: [sender]
    });

    // renvoyer le message supprimé
    await sock.copyNForward(destination, originMsg, true);

    // nettoyage
    delete global.msgStore[deletedId];
  } catch (e) {
    console.log("ANTIDELETE HANDLER ERROR:", e?.message || e);
  }
};