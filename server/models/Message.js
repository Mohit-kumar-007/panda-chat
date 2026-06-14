const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  originalText: {
    type: String,
    required: true,
    // AES-256 encrypted
  },
  koreanText: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  reactions: {
    type: [String],
    default: [],
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

// TTL index: messages auto-delete at expiresAt
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
