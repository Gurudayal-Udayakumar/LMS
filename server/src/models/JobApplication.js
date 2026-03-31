const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String, required: true },
  coverLetter: { type: String, default: null },
  status: { type: String, enum: ['applied', 'shortlisted', 'rejected', 'hired'], default: 'applied' },
  appliedAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

jobApplicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });
jobApplicationSchema.index({ jobId: 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
