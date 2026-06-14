const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

const getKey = () => {
  const secret = process.env.ENCRYPTION_SECRET || 'pandachat-default-secret-key-32ch';
  // Pad or truncate to exactly 32 bytes
  return Buffer.from(secret.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
};

/**
 * Encrypts plaintext using AES-256-CBC
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - "iv:encryptedData" hex string
 */
const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return text;
  }
};

/**
 * Decrypts AES-256-CBC encrypted text
 * @param {string} encryptedText - "iv:encryptedData" hex string
 * @returns {string} - Decrypted plaintext
 */
const decrypt = (encryptedText) => {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) return encryptedText;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return encryptedText;
  }
};

module.exports = { encrypt, decrypt };
