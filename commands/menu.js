const fs = require("fs");
const path = require("path");
const config = require("../config");

// ================= IMAGES RANDOM =================
const MENU_IMAGES = [
  "https://files.catbox.moe/iqejld.jpg",
  "https://files.catbox.moe/0p867k.jpg",
  "https://files.catbox.moe/k35kko.jpg",
  "https://files.catbox.moe/zxyyrr.jpg",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${d}d ${h}h ${m}m ${s}s`;
}

function loadCommands() {
  const commandsDir = __dirname; // ✅ dossier /commands
  const categories = {};
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    try {
      // optionnel: ignorer menu si tu veux pas qu'il apparaisse dans General
      // if (file.toLowerCase() === "menu.js") continue;

      const cmd = require(path.join(commandsDir, file));
      if (!cmd?.name) continue;

      const cat = String(cmd.category || "General").toUpperCase();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(String(cmd.name));
    } catch (e) {}
  }

  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => a.localeCompare(b));
  }

  return categories;
}

module.exports = {
  name: "menu",
  category: "General",
  description: "Afficher le menu",

  async execute(sock, m, args, extra = {}) {
    const from = m.key.remoteJid;

    const prefix = extra.prefix || config.PREFIX || ".";
    const currentMode = extra.currentMode || config.MODE || "public";

    const senderId = m.key.participant || m.key.remoteJid; // groupe -> participant, privé -> remoteJid
    const userNumber = String(senderId).split("@")[0];

    const mode = String(currentMode).toUpperCase();
    const uptime = global.botStartTime
      ? formatUptime(Date.now() - global.botStartTime)
      : "N/A";

    const categories = loadCommands();
    const totalCmds = Object.values(categories).reduce((a, b) => a + b.length, 0);

    const header = `
╭━━〔 ⌬ *${config.BOT_NAME || "NOVA XMD V1"}* ⌬ 〕━━╮
┃ ⚛️ 𝙴𝙽𝙶𝙸𝙽𝙴 : ɴᴏᴠᴀ xᴍᴅ ᴠ𝟣
┃ 👤 𝙳𝙴𝚅 : ${config.OWNER_NAME || "DEV NOVA"}
╰━━━━━━━━━━━━━━━━━━╯

╭─────────────────╮
│ 👤 User     : ${userNumber}
│ ⚡ Uptime   : ${uptime}
│ 🧩 Commands : ${totalCmds}
│ 🌐 Mode     : ${mode}
│ 🔧 Prefix   : ${prefix}
╰─────────────────╯
`.trim();

    let menuText = header + "\n";
    const symbol = "┃ ⬡";

    for (const cat of Object.keys(categories)) {
      const cmds = categories[cat].map((c) => `${prefix}${String(c).toUpperCase()}`);

      menuText += `\n╭─❲ ☢️ ${cat} 𝚂𝙴𝙲𝚃𝙾𝚁 ❳──┈\n`;
      for (const c of cmds) menuText += `${symbol} ${c}\n`;
      menuText += "╰───────────────┈\n";
    }

    const newsletterContext = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363423249667073@newsletter",
        newsletterName: config.BOT_NAME || "NOVA XMD V1",
        serverMessageId: 1,
      },
    };

    const randomImage = pickRandom(MENU_IMAGES);

    await sock.sendMessage(
      from,
      {
        image: { url: randomImage },
        caption: menuText.trim(),
        contextInfo: newsletterContext,
      },
      { quoted: m }
    );
  },
};