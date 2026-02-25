const fs = require("fs");
const path = require("path");

/**
 * AntiLink handler (Baileys)
 * - Active seulement si le groupe est dans data/antilink.json
 * - Ignore admins + owner
 * - Supprime message contenant lien
 */
module.exports = async (sock, m, from, body, ownerNumber = "") => {
  try {
    if (!from || !from.endsWith("@g.us")) return;

    const dbPath = path.join(__dirname, "antilink.json");
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "[]");

    let db = [];
    try { db = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch { db = []; }
    if (!Array.isArray(db) || !db.includes(from)) return;

    const text = String(body || "");
    if (!text) return;

    const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
    const httpRegex = /https?:\/\/\S+/i;

    if (!linkRegex.test(text) && !httpRegex.test(text)) return;
    if (m.key?.fromMe) return;

    const senderId = m.key?.participant || m.key?.remoteJid;
    if (!senderId) return;

    // Owner bypass (si fourni)
    const senderNum = String(senderId).split("@")[0];
    if (ownerNumber && senderNum === String(ownerNumber)) return;

    const botId = sock.user?.id?.includes(":")
      ? sock.user.id.split(":")[0] + "@s.whatsapp.net"
      : sock.user?.id;

    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata?.participants || [];
    const groupAdmins = participants.filter(v => v.admin).map(v => v.id);

    const isBotAdmin = botId && groupAdmins.includes(botId);
    const isSenderAdmin = groupAdmins.includes(senderId);

    if (!isBotAdmin) return; // ne peut pas supprimer
    if (isSenderAdmin) return;

    // Delete message
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: m.key.id,
        participant: senderId
      }
    });

    // Warn
    await sock.sendMessage(from, {
      text:
`🚫 *ALERTE ANTI-LIEN*

👤 @${senderNum}

Les liens ne sont pas autorisés ici.
Tout envoi de lien est automatiquement supprimé.`,
      mentions: [senderId]
    });

  } catch (e) {
    console.error("Erreur Antilink:", e?.message || e);
  }
};
