const mongoose = require('mongoose');

const chatRoomMemberSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

chatRoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoomMember', chatRoomMemberSchema);
