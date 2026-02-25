const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../data/antilink.json");

// Création fichier si inexistant
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([]));
}

module.exports = {
  name: "antilink",
  category: "Security",
  description: "Activer ou désactiver l'antilink",

  async execute(sock, m, args, { prefix, isGroup }) {
    const from = m.key.remoteJid;

    if (!isGroup) {
      return sock.sendMessage(
        from,
        { text: "❌ Cette commande fonctionne uniquement en groupe." },
        { quoted: m }
      );
    }

    const groupMetadata = await sock.groupMetadata(from);

    // ✅ sender correct en groupe
    const senderId = m.key.participant || m.key.remoteJid;

    const isAdmin = !!groupMetadata.participants.find((u) => u.id === senderId)?.admin;

    if (!isAdmin) {
      return sock.sendMessage(
        from,
        { text: "🚫 Seuls les admins peuvent utiliser cette commande." },
        { quoted: m }
      );
    }

    let db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      if (db.includes(from)) {
        return sock.sendMessage(
          from,
          { text: "✅ L'antilink est déjà activé dans ce groupe." },
          { quoted: m }
        );
      }

      db.push(from);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      return sock.sendMessage(
        from,
        { text: "🛡️ Antilink activé pour ce groupe." },
        { quoted: m }
      );
    }

    if (sub === "off") {
      db = db.filter((g) => g !== from);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      return sock.sendMessage(
        from,
        { text: "❌ Antilink désactivé." },
        { quoted: m }
      );
    }

    return sock.sendMessage(
      from,
      { text: `Utilisation : ${prefix}antilink on/off` },
      { quoted: m }
    );
  },
};