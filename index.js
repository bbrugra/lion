const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const fs = require("fs");
const config = require("./config.json");

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
});

const prefix = config.prefix;
const statuses = config.statuses;
const timers = config.timers;
const owners = config.owners;

let logData = {};
if (fs.existsSync("./log.json")) logData = require("./log.json");

// ======================== READY ========================
client.on("ready", () => {
    console.log(`✅ Giriş Yapıldı: ${client.user.tag}`);
    const timeing = Math.floor(timers * 1000);
    setInterval(() => {
        const amounter = Math.floor(Math.random() * statuses.length);
        client.user.setActivity(statuses[amounter], { type: "PLAYING" });
    }, timeing);
});

// ======================== AYARLAR ========================
let kufurEngel = true;
let reklamEngel = true;
const forbiddenWords = ["ak", "aq", "amk","sik","oç","oruspu","ananı","sikim","oruspu çocu"];
const adWords = ["discord.gg", ".com", ".net","https"];

// ======================== FONKSİYONLAR ========================
function sendLog(guild, embed) {
    const logChannelId = logData[guild.id];
    if (!logChannelId) return;
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    logChannel.send({ embeds: [embed] });
}

function terminalLog(message, cmd, args) {
    console.log(`[${new Date().toLocaleString()}] ${message.author.tag} (${message.author.id}) ${message.guild.name} #${message.channel.name} kanalında '${prefix}${cmd} ${args.join(" ")}' komutunu kullandı.`);
}

// ======================== MESSAGE DELETE ========================
client.on("messageDelete", message => {
    if (message.author.bot || !message.guild) return;
    const logChannelId = logData[message.guild.id];
    if (!logChannelId) return;
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new MessageEmbed()
        .setTitle("🗑️ Mesaj Silindi")
        .setColor("ORANGE")
        .addField("Kullanıcı", `${message.author} (${message.author.tag})`, true)
        .addField("Kanal", `${message.channel}`, true)
        .addField("Mesaj", message.content || "Mesaj boş", false)
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
});

// ======================== MESSAGE CREATE ========================
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const msg = message.content.toLowerCase();

    // SA-AS
    if (msg === "sa") return message.reply("Aleyküm Selam Kral 🌹");

    // Küfür engel
    if (kufurEngel) {
        forbiddenWords.forEach(word => {
            if (msg.includes(word)) {
                message.delete().catch(() => {});
                return message.channel.send(`${message.author}, küfür kullanamazsın!`).then(msg => setTimeout(() => msg.delete(), 5000));
            }
        });
    }

    // Reklam engel
    if (reklamEngel) {
        adWords.forEach(word => {
            if (msg.includes(word)) {
                message.delete().catch(() => {});
                return message.channel.send(`${message.author}, reklam yapamazsın!`).then(msg => setTimeout(() => msg.delete(), 5000));
            }
        });
    }

    if (!msg.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Terminal logu
    terminalLog(message, cmd, args);

    // ======================== LOG KOMUTU ========================
    if (cmd === "log") {
        if (!message.member.permissions.has("MANAGE_GUILD")) return message.channel.send("❌ Yetkin yok!");
        if (args[0] === "kapat") {
            logData[message.guild.id] = null;
            fs.writeFileSync("./log.json", JSON.stringify(logData, null, 4));
            return message.channel.send("✅ Log kapatıldı.");
        } else {
            const logChannel = message.mentions.channels.first();
            if (!logChannel) return message.channel.send("❌ Bir kanal etiketle!");
            logData[message.guild.id] = logChannel.id;
            fs.writeFileSync("./log.json", JSON.stringify(logData, null, 4));
            return message.channel.send(`✅ Log kanalı olarak ${logChannel} ayarlandı.`);
        }
    }

    // ======================== MODERASYON ========================
    const member = message.mentions.members.first();

    if (cmd === "ban") {
        if (!message.member.permissions.has("BAN_MEMBERS")) return message.reply("❌ Yetkin yok!");
        if (!member) return message.reply("❌ Kullanıcı etiketle!");
        await member.ban().catch(() => {});
        message.channel.send(`✅ ${member.user.tag} yasaklandı.`);
    }

    if (cmd === "kick") {
        if (!message.member.permissions.has("KICK_MEMBERS")) return message.reply("❌ Yetkin yok!");
        if (!member) return message.reply("❌ Kullanıcı etiketle!");
        await member.kick().catch(() => {});
        message.channel.send(`✅ ${member.user.tag} atıldı.`);
    }

    if (cmd === "mute") {
        if (!message.member.permissions.has("MODERATE_MEMBERS")) return message.reply("❌ Yetkin yok!");
        if (!member) return message.reply("❌ Kullanıcı etiketle!");
        await member.timeout(10*60*1000).catch(() => {});
        message.channel.send(`🔇 ${member.user.tag} susturuldu (10dk).`);
    }

    if (cmd === "unmute") {
        if (!message.member.permissions.has("MODERATE_MEMBERS")) return message.reply("❌ Yetkin yok!");
        if (!member) return message.reply("❌ Kullanıcı etiketle!");
        await member.timeout(null).catch(() => {});
        message.channel.send(`🔊 ${member.user.tag} susturması kaldırıldı.`);
    }

    // ======================== ÇEKİLİŞ ========================
    if (cmd === "çekiliş") {
        if (!args[0] || !args[1]) return message.reply("❌ Kullanım: +çekiliş <süre> <ödül>\nÖrn: +çekiliş 1m Nitro");
        const süre = args[0];
        const ödül = args.slice(1).join(" ");
        let zaman;
        if (süre.endsWith("s")) zaman = parseInt(süre) * 1000;
        else if (süre.endsWith("m")) zaman = parseInt(süre) * 60000;
        else if (süre.endsWith("h")) zaman = parseInt(süre) * 3600000;
        else return message.reply("❌ Geçerli süre gir (s, m, h)!");

        const embed = new MessageEmbed()
            .setTitle("🎉 Çekiliş Başladı!")
            .setDescription(`Ödül: **${ödül}**\nSüre: **${süre}**\nKatılmak için 🎉 tepkisine bas!`)
            .setColor("GREEN")
            .setFooter({ text: `Başlatan: ${message.author.tag}` });
        const msgEmbed = await message.channel.send({ embeds: [embed] });
        await msgEmbed.react("🎉");

        setTimeout(async () => {
            const cachedMsg = await message.channel.messages.fetch(msgEmbed.id);
            const users = (await cachedMsg.reactions.cache.get("🎉").users.fetch()).filter(u => !u.bot).map(u => u);
            if (users.length === 0) return message.channel.send("❌ Katılım olmadı, çekiliş iptal.");
            const winner = users[Math.floor(Math.random() * users.length)];
            message.channel.send(`🎉 Tebrikler ${winner}! **${ödül}** kazandın!`);
        }, zaman);
    }

    // ======================== ADAM ASMACA ========================
    if (cmd === "adam-asmaca") {
        const kelimeler = ["elma", "armut", "istanbul", "ankara", "bilgisayar", "yazılım", "kod"];
        const kelime = kelimeler[Math.floor(Math.random() * kelimeler.length)];
        let gizli = kelime.split("").map(() => "_");
        let hak = 6;

        const oyunMsg = await message.channel.send(`🎮 Adam Asmaca başladı!\nKelime: ${gizli.join(" ")}\nKalan Hak: ${hak}`);

        const filter = m => m.author.id === message.author.id && /^[a-zA-Zçğıöşü]$/.test(m.content);
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on("collect", m => {
            const harf = m.content.toLowerCase();
            if (kelime.includes(harf)) {
                kelime.split("").forEach((c, i) => { if (c === harf) gizli[i] = harf; });
            } else hak--;

            oyunMsg.edit(`Kelime: ${gizli.join(" ")}\nKalan Hak: ${hak}`);

            if (!gizli.includes("_")) {
                oyunMsg.edit(`✅ Tebrikler! Kelimeyi bildin: **${kelime}**`);
                collector.stop("kazandı");
            }
            if (hak <= 0) {
                oyunMsg.edit(`❌ Kaybettin! Kelime: **${kelime}**`);
                collector.stop("kaybetti");
            }
        });
    }

    // ======================== SES KOMUTLARI ========================
    if (cmd === "sese-gir") {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply("❌ Bir ses kanalına gir!");
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        });
        message.channel.send("✅ Sese bağlandım!");
    }

    if (cmd === "sese-çık") {
        const connection = getVoiceConnection(message.guild.id);
        if (!connection) return message.reply("❌ Ses kanalında değilim!");
        connection.destroy();
        message.channel.send("✅ Sesten çıktım!");
    }

    // ======================== HELP ========================
    if (cmd === "help") {
        const help = new MessageEmbed()
            .setColor("#FF0000")
            .setAuthor({ name: "Lion Reward Bot | Komutlar", iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(`> Prefix: \`${prefix}\``)
            .addFields(
                { name: "🛠 Genel Komutlar", value: "`help`, `ping`, `sa`, `çekiliş`, `adam-asmaca`" },
                { name: "🔊 Ses Komutları", value: "`sese-gir`, `sese-çık`" },
                { name: "📊 Sunucu Bilgileri", value: "`sunucu`" },
                { name: "✉️ DM / ODM", value: "`dm`, `odm`" },
                { name: "🔨 Moderasyon", value: "`ban`, `kick`, `mute`, `unmute`, `lock`, `unlock`" },
                { name: "🎫 Ticket", value: "`ticket`" },
                { name: "🚫 Engeller", value: "`küfürengel aç/kapat`, `reklamengel aç/kapat`" }
            )
            .setFooter({ text: `Komutu kullanan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        return message.channel.send({ embeds: [help] });
    }
});

// ======================== TICKET BUTTON ========================
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "ticket_create") {
        const guild = interaction.guild;
        const channel = await guild.channels.create(`ticket-${interaction.user.username}`, {
            type: "GUILD_TEXT",
            permissionOverwrites: [
                { id: guild.id, deny: ["VIEW_CHANNEL"] },
                { id: interaction.user.id, allow: ["VIEW_CHANNEL","SEND_MESSAGES"] }
            ]
        });
        await channel.send(`${interaction.user} Hoşgeldin! Ticket burada.`);
        interaction.reply({ content: `Ticket oluşturuldu: ${channel}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);"MTQxMzYwNjQ5NTg0MDYzNzA0OQ.GBGHUv.fVn7j7x1Ob7QeDy0rBEuLz5TgiDl3xrbZGPHPs"
