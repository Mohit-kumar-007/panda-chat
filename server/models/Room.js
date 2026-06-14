const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  userCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 2,
  },
});

// TTL index: rooms expire 24 hours after lastActivity
roomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Room', roomSchema);
