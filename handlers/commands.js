const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { bufferToSticker, webpToVideo } = require('../lib/media');
const roblox = require('../lib/roblox');
const config = require('../config');

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx || !ctx.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctx.stanzaId,
      participant: ctx.participant,
    },
  };
}

function getMediaType(message) {
  if (!message) return null;
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.stickerMessage) return 'sticker';
  if (message.viewOnceMessage) return 'viewOnce';
  if (message.viewOnceMessageV2) return 'viewOnce';
  return null;
}

async function handleCommand(sock, msg, text) {
  const from = msg.key.remoteJid;
  const [cmdRaw, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  try {
    if (cmd === 's' || cmd === 'sticker') {
      return await cmdSticker(sock, msg, from);
    }
    if (cmd === 'tovid') {
      return await cmdToVid(sock, msg, from);
    }
    if (cmd === 'vv') {
      return await cmdViewOnce(sock, msg, from);
    }
    if (cmd === 'roblox') {
      return await cmdRoblox(sock, msg, from, args.join(' '));
    }
  } catch (err) {
    console.error(`[${cmd}] error:`, err);
    await sock.sendMessage(from, { text: `Command failed: ${err.message || err}` }, { quoted: msg });
  }
}

async function cmdSticker(sock, msg, from) {
  const quoted = getQuoted(msg);
  const target = quoted || msg;
  const type = getMediaType(quoted ? quoted.message : msg.message);

  if (type !== 'image' && type !== 'video') {
    await sock.sendMessage(from, { text: `Reply to an image or short video with ${config.prefix}s to make a sticker.` }, { quoted: msg });
    return;
  }

  const buffer = await downloadMediaMessage(target, 'buffer', {});
  const sticker = await bufferToSticker(buffer, type === 'video');
  await sock.sendMessage(from, { sticker }, { quoted: msg });
}

async function cmdToVid(sock, msg, from) {
  const quoted = getQuoted(msg);
  const target = quoted || msg;
  const type = getMediaType(quoted ? quoted.message : msg.message);

  if (type !== 'sticker') {
    await sock.sendMessage(from, { text: `Reply to an animated sticker with ${config.prefix}tovid to convert it to a video.` }, { quoted: msg });
    return;
  }

  const buffer = await downloadMediaMessage(target, 'buffer', {});
  const video = await webpToVideo(buffer);
  await sock.sendMessage(from, { video, mimetype: 'video/mp4' }, { quoted: msg });
}

async function cmdViewOnce(sock, msg, from) {
  const quoted = getQuoted(msg);
  if (!quoted) {
    await sock.sendMessage(from, { text: `Reply to a view-once photo/video with ${config.prefix}vv to reveal it.` }, { quoted: msg });
    return;
  }

  const inner = quoted.message.viewOnceMessage?.message || quoted.message.viewOnceMessageV2?.message;
  if (!inner) {
    await sock.sendMessage(from, { text: 'That message is not a view-once message.' }, { quoted: msg });
    return;
  }

  const mediaType = inner.imageMessage ? 'image' : inner.videoMessage ? 'video' : null;
  if (!mediaType) {
    await sock.sendMessage(from, { text: 'Unsupported view-once media type.' }, { quoted: msg });
    return;
  }

  const buffer = await downloadMediaMessage({ message: inner, key: quoted.key }, 'buffer', {});
  const caption = inner[`${mediaType}Message`].caption || '';

  if (mediaType === 'image') {
    await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg });
  } else {
    await sock.sendMessage(from, { video: buffer, caption, mimetype: 'video/mp4' }, { quoted: msg });
  }
}

async function cmdRoblox(sock, msg, from, query) {
  if (!query) {
    await sock.sendMessage(from, { text: `Usage: ${config.prefix}roblox <username or userId>` }, { quoted: msg });
    return;
  }

  await sock.sendMessage(from, { text: `Looking up Roblox user "${query}"...` }, { quoted: msg });

  const cookie = process.env.ROBLOSECURITY || null;
  const user = await roblox.lookupUser(query, cookie);

  if (!user) {
    await sock.sendMessage(from, { text: `No Roblox user found for "${query}".` }, { quoted: msg });
    return;
  }

  const created = user.created ? new Date(user.created).toLocaleDateString() : 'Unknown';
  const banStatus = user.terminated ? 'Yes (terminated account)' : user.isBanned ? 'Yes' : 'No';
  const caption =
    `*${user.displayName}* (@${user.username})\n` +
    `ID: ${user.id}\n` +
    `Bio: ${user.bio}\n` +
    `Account created: ${created}\n` +
    `Banned: ${banStatus}\n` +
    `Friends: ${user.friends ?? 'N/A'} | Followers: ${user.followers ?? 'N/A'} | Following: ${user.following ?? 'N/A'}\n` +
    `Presence: ${user.presence}\n` +
    `Profile: ${user.profileUrl}`;

  if (user.avatarUrl) {
    await sock.sendMessage(from, { image: { url: user.avatarUrl }, caption }, { quoted: msg });
  } else {
    await sock.sendMessage(from, { text: caption }, { quoted: msg });
  }
}

module.exports = { handleCommand };
  
