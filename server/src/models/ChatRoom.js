const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, default: null },
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
