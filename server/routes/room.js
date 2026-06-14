const express = require('express');
const router = express.Router();
const { generateRoomCode, isValidRoomCode } = require('../utils/roomCode');

let Room;
try {
  Room = require('../models/Room');
} catch (e) {
  Room = null;
}

// POST /api/room/create
router.post('/create', async (req, res) => {
  try {
    const code = generateRoomCode();
    if (Room) {
      const room = new Room({ roomCode: code, userCount: 1 });
      await room.save();
    }
    res.json({ success: true, roomCode: code });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/room/:code/exists
router.get('/:code/exists', async (req, res) => {
  const { code } = req.params;
  if (!isValidRoomCode(code)) {
    return res.json({ exists: false, full: false, error: 'Invalid room code format' });
  }
  try {
    if (!Room) {
      return res.json({ exists: true, full: false });
    }
    const room = await Room.findOne({ roomCode: code.toUpperCase() });
    if (!room) {
      return res.json({ exists: false, full: false });
    }
    res.json({
      exists: true,
      full: room.userCount >= 2,
      userCount: room.userCount,
    });
  } catch (error) {
    console.error('Room exists error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
