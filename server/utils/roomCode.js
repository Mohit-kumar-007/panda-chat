const crypto = require('crypto');

/**
 * Generates a random 6-character alphanumeric room code (uppercase).
 * Uses crypto.randomBytes for security.
 * @returns {string} e.g. "AB12CD"
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
};

/**
 * Validates that a room code is exactly 6 alphanumeric characters.
 * @param {string} code
 * @returns {boolean}
 */
const isValidRoomCode = (code) => {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/i.test(code);
};

module.exports = { generateRoomCode, isValidRoomCode };
