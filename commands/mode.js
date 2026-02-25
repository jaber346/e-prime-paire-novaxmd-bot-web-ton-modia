module.exports = {
    name: "mode",
    category: "Owner",
    description: "Changer le mode du bot (public / private)",

    async execute(sock, m, args, { prefix, isOwner, setMode }) {

        const from = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(from, {
                text: "🚫 Commande réservée au propriétaire."
            }, { quoted: m });
        }

        const mode = args[0]?.toLowerCase();

        if (mode === "public") {

            setMode("public");

            return sock.sendMessage(from, {
                text: "🔓 *Mode PUBLIC activé*\n\nTout le monde peut utiliser le bot."
            }, { quoted: m });

        } else if (mode === "private" || mode === "prive") {

            setMode("private");

            return sock.sendMessage(from, {
                text: "🔒 *Mode PRIVATE activé*\n\nSeul le propriétaire peut utiliser le bot."
            }, { quoted: m });

        } else {

            return sock.sendMessage(from, {
                text: `Utilisation :\n${prefix}mode public\n${prefix}mode private`
            }, { quoted: m });
        }
    }
};