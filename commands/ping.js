module.exports = {
  name: "ping",
  category: "General",
  description: "Tester la vitesse du bot",

  async execute(sock, m, args, { currentMode, prefix } = {}) {
    const from = m.key.remoteJid;

    const start = Date.now();
    // petite pause mini pour mesurer quelque chose de réaliste
    // (optionnel, ne casse rien)
    const latency = Date.now() - start;

    const text =
`╭━━〔 ⌬ *NOVA XMD V1* ⌬ 〕━━╮
┃ 🏓 𝙿𝙸𝙽𝙶 𝚂𝚃𝙰𝚃𝚄𝚂
┣━━━━━━━━━━━━━━━━━━
┃ ⚡ Speed   : ${latency} ms
┃ 🟢 Status  : Online
┃ 🌐 Mode    : ${(currentMode || "public").toUpperCase()}
┃ 🔧 Prefix  : ${prefix || "."}
╰━━━━━━━━━━━━━━━━━━╯`;

    const newsletterContext = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363423249667073@newsletter",
        newsletterName: "NOVA XMD V1",
        serverMessageId: 1
      }
    };

    await sock.sendMessage(
      from,
      { text, contextInfo: newsletterContext },
      { quoted: m }
    );
  }
};