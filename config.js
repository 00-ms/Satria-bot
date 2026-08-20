require('dotenv').config();

module.exports = {
  ownerNumber: (process.env.OWNER_NUMBER || '').replace(/[^0-9]/g, ''),
  prefix: process.env.PREFIX || '.',
  botName: process.env.BOT_NAME || 'Satria Bot',
  useQR: (process.env.USE_QR || 'false').toLowerCase() === 'true',
};
