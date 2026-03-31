const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: null },
  scheduledAt: { type: Date, required: true },
  durationMin: { type: Number, default: 30 },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  meetingLink: { type: String, default: null },
  notes: { type: String, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

appointmentSchema.index({ studentId: 1 });
appointmentSchema.index({ mentorId: 1 });
appointmentSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
