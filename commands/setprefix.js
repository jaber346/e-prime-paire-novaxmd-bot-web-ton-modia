const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../config.js");

module.exports = {
    name: "setprefix",
    category: "Owner",
    description: "Changer le prefix du bot",

    async execute(sock, m, args, { isOwner }) {

        const from = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(from, {
                text: "🚫 Commande réservée au propriétaire."
            }, { quoted: m });
        }

        const newPrefix = args[0];

        if (!newPrefix) {
            return sock.sendMessage(from, {
                text: "Exemple :\n.setprefix !"
            }, { quoted: m });
        }

        try {
            let configContent = fs.readFileSync(configPath, "utf8");

            // Remplacer la ligne PREFIX
            configContent = configContent.replace(
                /PREFIX:\s*["'`](.*?)["'`]/,
                `PREFIX: "${newPrefix}"`
            );

            fs.writeFileSync(configPath, configContent);

            global.prefix = newPrefix;

            await sock.sendMessage(from, {
                text: `✅ Prefix changé en : *${newPrefix}*\n\n🔁 Redémarre le bot pour appliquer définitivement.`
            }, { quoted: m });

        } catch (err) {
            console.error(err);
            sock.sendMessage(from, {
                text: "❌ Erreur lors du changement de prefix."
            }, { quoted: m });
        }
    }
};