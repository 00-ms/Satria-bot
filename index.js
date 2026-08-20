const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const qrcodeTerminal = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const config = require('./config');
const { handleCommand } = require('./handlers/commands');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: config.useQR,
    browser: [config.botName, 'Chrome', '1.0.0'],
  });

  // Pairing code is the default login method. QR is only used if USE_QR=true.
  if (!config.useQR && !sock.authState.creds.registered) {
    let phoneNumber = config.ownerNumber;
    if (!phoneNumber) {
      phoneNumber = (await ask('Enter your WhatsApp number (with country code, no +): ')).trim();
    }
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nPairing code: ${code}\nOpen WhatsApp > Linked Devices > Link with phone number, then enter this code.\n`);
      } catch (err) {
        console.error('Failed to request pairing code:', err);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && config.useQR) {
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed.', statusCode, 'Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      } else {
        console.log('Logged out. Delete the session/ folder and restart to log in again.');
      }
    } else if (connection === 'open') {
      console.log(`${config.botName} connected successfully.`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    if (!body.startsWith(config.prefix)) return;

    await handleCommand(sock, msg, body);
  });

  return sock;
}

startBot().catch((err) => {
  console.error('Fatal error starting bot:', err);
  process.exit(1);
});
