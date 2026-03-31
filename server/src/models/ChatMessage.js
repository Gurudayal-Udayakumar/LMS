const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  fileUrl: { type: String, default: null },
  isRead: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

chatMessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
