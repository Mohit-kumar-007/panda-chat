const { translateToKorean } = require('../services/translateService');
const { encrypt, decrypt } = require('../utils/encryption');

let Room, Message;
try {
  Room = require('../models/Room');
  Message = require('../models/Message');
} catch (e) {
  Room = null;
  Message = null;
}

// In-memory room store (fallback when DB is unavailable)
const inMemoryRooms = new Map(); // roomCode -> { users: Set<socketId>, messages: [] }

const getOrCreateMemRoom = (roomCode) => {
  if (!inMemoryRooms.has(roomCode)) {
    inMemoryRooms.set(roomCode, { users: new Set(), messages: [] });
  }
  return inMemoryRooms.get(roomCode);
};

/**
 * Main Socket.io chat handler
 * @param {import('socket.io').Server} io
 */
const chatHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomCode }) => {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();

      // If DB is available, verify room exists (for join flow)
      if (Room) {
        try {
          const existing = await Room.findOne({ roomCode: code });
          // Only reject if room truly doesn't exist AND it's not being created here
          // (For create flow, room is pre-created via REST API)
          if (!existing && inMemoryRooms.has(code) === false) {
            // Allow anyway — room will be created in memory
          }
        } catch (err) {
          // DB error — allow connection anyway
        }
      }

      // Get or create in-memory room
      const memRoom = getOrCreateMemRoom(code);

      // Check capacity
      if (memRoom.users.size >= 2 && !memRoom.users.has(socket.id)) {
        return socket.emit('room_full', { error: 'Room is occupied. Only 2 users allowed per room.' });
      }

      const isNewJoiner = !memRoom.users.has(socket.id);
      memRoom.users.add(socket.id);
      socket.join(code);
      socket.roomCode = code;

      // Fetch last 20 messages from DB or memory
      let history = [];
      if (Message) {
        try {
          const dbMessages = await Message.find({ roomCode: code })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();
          history = dbMessages.reverse().map((m) => ({
            id: m._id.toString(),
            original: decrypt(m.originalText),
            korean: m.koreanText,
            timestamp: m.timestamp,
            senderId: m.senderId,
            reactions: m.reactions || [],
          }));
        } catch (err) {
          console.error('History fetch error:', err.message);
          history = memRoom.messages.slice(-20);
        }
      } else {
        history = memRoom.messages.slice(-20);
      }

      // Update DB room userCount
      if (Room) {
        try {
          await Room.findOneAndUpdate(
            { roomCode: code },
            { $inc: { userCount: 1 }, lastActivity: new Date() },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error('Room update error:', err.message);
        }
      }

      socket.emit('room_joined', { success: true, history });
      console.log(`✅ Socket ${socket.id} joined room ${code} (users: ${memRoom.users.size})`);

      // Notify other users in the room that someone joined
      if (isNewJoiner && memRoom.users.size > 1) {
        socket.to(code).emit('user_reconnected', {});
      }
    });

    // ─── SEND MESSAGE ─────────────────────────────────────────────────────────
    socket.on('send_message', async ({ roomCode, text }) => {
      if (!roomCode || !text) return;
      const code = roomCode.toUpperCase();

      // Translate to Korean
      let koreanText = '';
      try {
        koreanText = await translateToKorean(text);
      } catch (err) {
        koreanText = text;
      }

      const timestamp = new Date();
      let messageId = `msg_${Date.now()}_${socket.id.slice(0, 4)}`;

      // Save to DB
      if (Message) {
        try {
          const encryptedOriginal = encrypt(text);
          const msg = new Message({
            roomCode: code,
            senderId: socket.id,
            originalText: encryptedOriginal,
            koreanText,
            timestamp,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
          await msg.save();
          messageId = msg._id.toString();
        } catch (err) {
          console.error('Message save error:', err.message);
        }
      }

      // Store in memory
      const memRoom = getOrCreateMemRoom(code);
      const messagePayload = {
        id: messageId,
        original: text,
        korean: koreanText,
        timestamp,
        senderId: socket.id,
        reactions: [],
      };
      memRoom.messages.push(messagePayload);
      if (memRoom.messages.length > 100) {
        memRoom.messages.shift(); // Keep only last 100
      }

      // Update room lastActivity
      if (Room) {
        try {
          await Room.findOneAndUpdate({ roomCode: code }, { lastActivity: new Date() });
        } catch (err) {}
      }

      // Broadcast to room
      io.to(code).emit('receive_message', messagePayload);
    });

    // ─── TYPING INDICATORS ────────────────────────────────────────────────────
    socket.on('typing_start', ({ roomCode }) => {
      if (!roomCode) return;
      socket.to(roomCode.toUpperCase()).emit('user_typing', { isTyping: true });
    });

    socket.on('typing_stop', ({ roomCode }) => {
      if (!roomCode) return;
      socket.to(roomCode.toUpperCase()).emit('user_typing', { isTyping: false });
    });

    // ─── STICKER REACTIONS ────────────────────────────────────────────────────
    socket.on('send_reaction', async ({ messageId, sticker, roomCode }) => {
      if (!messageId || !sticker || !roomCode) return;
      const code = roomCode.toUpperCase();

      // Update DB
      if (Message) {
        try {
          await Message.findByIdAndUpdate(messageId, {
            $push: { reactions: sticker },
          });
        } catch (err) {}
      }

      // Broadcast reaction
      io.to(code).emit('receive_reaction', { messageId, sticker });
    });

    // ─── LEAVE ROOM ───────────────────────────────────────────────────────────
    socket.on('leave_room', async ({ roomCode }) => {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      await handleDisconnect(socket, io, code);
    });

    // ─── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      if (socket.roomCode) {
        await handleDisconnect(socket, io, socket.roomCode);
      }
    });
  });
};

const handleDisconnect = async (socket, io, roomCode) => {
  socket.leave(roomCode);

  const memRoom = inMemoryRooms.get(roomCode);
  if (memRoom) {
    memRoom.users.delete(socket.id);
    if (memRoom.users.size === 0) {
      inMemoryRooms.delete(roomCode);
    }
  }

  if (Room) {
    try {
      await Room.findOneAndUpdate(
        { roomCode },
        { $inc: { userCount: -1 }, lastActivity: new Date() }
      );
    } catch (err) {}
  }

  socket.to(roomCode).emit('user_disconnected', {});
};

module.exports = chatHandler;
