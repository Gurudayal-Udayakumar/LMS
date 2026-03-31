const mongoose = require('mongoose');

const taskSubmissionSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  notes: { type: String, default: null },
  score: { type: Number, default: null },
  feedback: { type: String, default: null },
  evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['submitted', 'under_review', 'evaluated', 'returned'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  evaluatedAt: { type: Date, default: null },
}, {
  timestamps: false,
  toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true, versionKey: false, transform: (_, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } },
});

taskSubmissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
taskSubmissionSchema.index({ taskId: 1 });
taskSubmissionSchema.index({ studentId: 1 });

module.exports = mongoose.model('TaskSubmission', taskSubmissionSchema);
