const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: null },
  type: { type: String, enum: ['full_time', 'part_time', 'internship', 'contract'], default: 'full_time' },
  description: { type: String, required: true },
  requirements: { type: String, default: null },
  salaryRange: { type: String, default: null },
  applyUrl: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  deadline: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

jobPostSchema.index({ isActive: 1, createdAt: 1 });

module.exports = mongoose.model('JobPost', jobPostSchema);
