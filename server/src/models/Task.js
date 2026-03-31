const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String, default: null },
  dueDate: { type: Date, default: null },
  maxScore: { type: Number, default: 100 },
  attachmentUrl: { type: String, default: null },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
