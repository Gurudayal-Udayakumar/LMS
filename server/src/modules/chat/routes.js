const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/database');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/chat/rooms
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, sender: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = rooms.map(room => ({
      ...room,
      lastMessage: room.messages[0] || null,
      messages: undefined,
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
      memberIds: z.array(z.string().uuid()).min(1),
    });
    const data = createSchema.parse(req.body);

    // For direct chat, check if room already exists
    if ((!data.type || data.type === 'direct') && data.memberIds.length === 1) {
      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          type: 'direct',
          AND: [
            { members: { some: { userId: req.user.id } } },
            { members: { some: { userId: data.memberIds[0] } } },
          ],
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
            },
          },
        },
      });
      if (existingRoom) return res.json(existingRoom);
    }

    const allMemberIds = [...new Set([req.user.id, ...data.memberIds])];
    const room = await prisma.chatRoom.create({
      data: {
        type: data.type || 'direct',
        name: data.name,
        members: {
          create: allMemberIds.map(userId => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', async (req, res, next) => {
  try {
    const { cursor, limit = 50 } = req.query;

    // Verify membership
    const member = await prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId: req.params.id, userId: req.user.id } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: req.params.id },
      take: parseInt(limit),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    res.json({
      data: messages.reverse(),
      nextCursor: messages.length === parseInt(limit) ? messages[0].id : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
