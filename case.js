const fs = require("fs");
const path = require("path");
const config = require("./config");

// ================= COMMAND LOADER =================
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");

function loadAllCommands() {
  commands.clear();
  if (!fs.existsSync(commandsDir)) return;

  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".js")) continue;

    try {
      delete require.cache[require.resolve(path.join(commandsDir, file))];
      const cmd = require(path.join(commandsDir, file));
      const name = (cmd?.name || "").toLowerCase();
      const exec = cmd?.execute || cmd?.run;

      if (name && typeof exec === "function") {
        commands.set(name, { ...cmd, _exec: exec });
      }
    } catch (err) {
      console.log("CMD LOAD ERROR:", file, err?.message || err);
    }
  }
}
loadAllCommands();

// ================= HELPERS =================
function getSender(m) {
  return m.key?.participant || m.key?.remoteJid; // groupe -> participant, privé -> remoteJid
}

function getBody(m) {
  const msg = m.message || {};
  const type = Object.keys(msg)[0];
  if (!type) return "";

  if (type === "conversation") return msg.conversation || "";
  if (type === "extendedTextMessage") return msg.extendedTextMessage?.text || "";
  if (type === "imageMessage") return msg.imageMessage?.caption || "";
  if (type === "videoMessage") return msg.videoMessage?.caption || "";
  if (type === "documentMessage") return msg.documentMessage?.caption || "";

  // ✅ Buttons / List / Template replies
  if (type === "buttonsResponseMessage") return msg.buttonsResponseMessage?.selectedButtonId || msg.buttonsResponseMessage?.selectedDisplayText || "";
  if (type === "listResponseMessage") return msg.listResponseMessage?.singleSelectReply?.selectedRowId || msg.listResponseMessage?.title || "";
  if (type === "templateButtonReplyMessage") return msg.templateButtonReplyMessage?.selectedId || msg.templateButtonReplyMessage?.selectedDisplayText || "";

  // ✅ ViewOnce wrapper
  if (type === "viewOnceMessageV2" || type === "viewOnceMessage") {
    const inner = msg[type]?.message || {};
    const innerType = Object.keys(inner)[0];
    if (!innerType) return "";
    if (innerType === "imageMessage") return inner.imageMessage?.caption || "";
    if (innerType === "videoMessage") return inner.videoMessage?.caption || "";
    return "";
  }

  return "";
}

function normJid(jid = "") {
  jid = String(jid || "");
  if (jid.includes(":") && jid.includes("@")) {
    const [l, r] = jid.split("@");
    return l.split(":")[0] + "@" + r;
  }
  return jid;
}

// ================= MAIN HANDLER =================
module.exports = async (sock, m, prefix, setMode, currentMode) => {
  try {
    if (!m || !m.message) return;

    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const sender = getSender(m);

    const botJid = normJid(sock.user?.id);
    const ownerJid = String(config.OWNER_NUMBER || "").replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const isOwner = m.key.fromMe || normJid(sender) === normJid(ownerJid) || normJid(sender) === normJid(botJid);

    const usedPrefix = prefix || config.PREFIX || ".";
    const body = (getBody(m) || "").trim();

    // Ignore si pas de texte
    if (!body) return;

    const reply = (text) => sock.sendMessage(from, { text }, { quoted: m });

    const isCmd = body.startsWith(usedPrefix);
    if (!isCmd) return;

    if (currentMode === "self" && !isOwner) return;

    const parts = body.slice(usedPrefix.length).trim().split(/\s+/);
    const command = (parts.shift() || "").toLowerCase();
    const args = parts;

    // ✅ reload si tu ajoutes une commande pendant que ça tourne (optionnel)
    if (command === "reload" && isOwner) {
      loadAllCommands();
      return reply("✅ Commands rechargées.");
    }

    // ================= BUILT-IN QUICK COMMANDS =================
    if (command === "ping") {
      const start = Date.now();
      return reply(
`╭───────────────⭓
│ 🏓 *PING*
│ ⚡ SPEED : ${Date.now() - start}ms
╰───────────────⭓`
      );
    }

    if (command === "mode") {
      if (!isOwner) return reply("🚫 Commande réservée au propriétaire.");
      const mode = (args[0] || "").toLowerCase();
      if (mode === "public") {
        setMode("public");
        return reply("🔓 Mode PUBLIC activé.");
      }
      if (mode === "private" || mode === "prive" || mode === "self") {
        setMode("self");
        return reply("🔒 Mode PRIVÉ (SELF) activé.");
      }
      return reply(`Utilisation :\n${usedPrefix}mode public\n${usedPrefix}mode private`);
    }

    if (command === "setprefix") {
      if (!isOwner) return reply("🚫 Commande réservée au propriétaire.");
      const newP = args[0];
      if (!newP) return reply(`Utilisation : ${usedPrefix}setprefix .`);
      config.PREFIX = newP;
      return reply(`✅ Prefix changé : *${newP}* (redémarre si besoin)`);
    }

    // ================= DYNAMIC COMMANDS =================
    const cmd = commands.get(command);
    if (cmd) {
      return await cmd._exec(sock, m, args, {
        prefix: usedPrefix,
        currentMode,
        setMode,
        isOwner,
        isGroup,
        sender,
        from,
        reply
      });
    }

    // Si inconnu
    // return reply("Commande inconnue. Tape .menu");
  } catch (err) {
    console.log("CASE ERROR:", err?.message || err);
  }
};