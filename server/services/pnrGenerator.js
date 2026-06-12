const Booking = require('../models/Booking');

/**
 * Generates a unique 6-digit alphanumeric PNR code
 * @returns {String} - 6-char PNR
 */
const generatePNR = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  let isUnique = false;

  while (!isUnique) {
    pnr = '';
    for (let i = 0; i < 6; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness in DB
    const existing = await Booking.findOne({ pnr });
    if (!existing) {
      isUnique = true;
    }
  }

  return pnr;
};

module.exports = { generatePNR };
