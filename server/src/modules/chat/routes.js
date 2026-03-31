const express = require('express');
const { z } = require('zod');
const ChatRoom = require('../../models/ChatRoom');
const ChatRoomMember = require('../../models/ChatRoomMember');
const ChatMessage = require('../../models/ChatMessage');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/chat/rooms
router.get('/rooms', async (req, res, next) => {
  try {
    // Find rooms where user is a member
    const memberships = await ChatRoomMember.find({ userId: req.user.id }).select('roomId');
    const roomIds = memberships.map(m => m.roomId);

    const rooms = await ChatRoom.find({ _id: { $in: roomIds } })
      .sort({ createdAt: -1 })
      .lean();

    // Get members and last message for each room
    const formatted = await Promise.all(rooms.map(async (room) => {
      const members = await ChatRoomMember.find({ roomId: room._id })
        .populate('userId', 'fullName avatarUrl role')
        .lean();

      const lastMsg = await ChatMessage.findOne({ roomId: room._id })
        .sort({ createdAt: -1 })
        .populate('senderId', 'fullName')
        .lean();

      return {
        ...room,
        id: room._id,
        _id: undefined,
        __v: undefined,
        members: members.map(m => ({
          id: m._id,
          roomId: m.roomId,
          userId: m.userId?._id,
          joinedAt: m.joinedAt,
          user: m.userId ? { id: m.userId._id, fullName: m.userId.fullName, avatarUrl: m.userId.avatarUrl, role: m.userId.role } : null,
        })),
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          createdAt: lastMsg.createdAt,
          sender: lastMsg.senderId ? { fullName: lastMsg.senderId.fullName } : null,
        } : null,
      };
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/rooms
router.post('/rooms', async (req, res, next) => {
  try {
    const createSchema = z.object({
      type: z.enum(['direct', 'group']).optional(),
      name: z.string().optional(),
      memberIds: z.array(z.string()).min(1),
    });
    const data = createSchema.parse(req.body);

    // For direct chat, check if room already exists
    if ((!data.type || data.type === 'direct') && data.memberIds.length === 1) {
      // Find rooms where both users are members
      const userMemberships = await ChatRoomMember.find({ userId: req.user.id }).select('roomId');
      const userRoomIds = userMemberships.map(m => m.roomId);

      const otherMemberships = await ChatRoomMember.find({ userId: data.memberIds[0], roomId: { $in: userRoomIds } }).select('roomId');

      for (const membership of otherMemberships) {
        const room = await ChatRoom.findOne({ _id: membership.roomId, type: 'direct' });
        if (room) {
          const members = await ChatRoomMember.find({ roomId: room._id })
            .populate('userId', 'fullName avatarUrl role')
            .lean();

          const result = {
            ...room.toObject(),
            id: room._id,
            _id: undefined,
            __v: undefined,
            members: members.map(m => ({
              id: m._id,
              roomId: m.roomId,
              userId: m.userId?._id,
              joinedAt: m.joinedAt,
              user: m.userId ? { id: m.userId._id, fullName: m.userId.fullName, avatarUrl: m.userId.avatarUrl, role: m.userId.role } : null,
            })),
          };
          return res.json(result);
        }
      }
    }

    const allMemberIds = [...new Set([req.user.id, ...data.memberIds])];
    const room = await ChatRoom.create({
      type: data.type || 'direct',
      name: data.name,
    });

    // Create memberships
    await ChatRoomMember.insertMany(allMemberIds.map(userId => ({ roomId: room._id, userId })));

    const members = await ChatRoomMember.find({ roomId: room._id })
      .populate('userId', 'fullName avatarUrl role')
      .lean();

    const result = {
      ...room.toObject(),
      id: room._id,
      _id: undefined,
      __v: undefined,
      members: members.map(m => ({
        id: m._id,
        roomId: m.roomId,
        userId: m.userId?._id,
        joinedAt: m.joinedAt,
        user: m.userId ? { id: m.userId._id, fullName: m.userId.fullName, avatarUrl: m.userId.avatarUrl, role: m.userId.role } : null,
      })),
    };

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Verify membership
    const member = await ChatRoomMember.findOne({ roomId: req.params.id, userId: req.user.id });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ChatMessage.find({ roomId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderId', 'fullName avatarUrl role')
      .lean();

    const data = messages.reverse().map(m => ({
      ...m,
      id: m._id,
      sender: m.senderId ? { id: m.senderId._id, fullName: m.senderId.fullName, avatarUrl: m.senderId.avatarUrl, role: m.senderId.role } : null,
      senderId: undefined, _id: undefined, __v: undefined,
    }));

    res.json({
      data,
      nextCursor: messages.length === parseInt(limit) ? data[0]?.id : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
