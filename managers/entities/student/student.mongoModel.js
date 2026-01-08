const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true,
  },
  classRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },
}, { versionKey: false, timestamps: true });

// Compound unique index for email per school
studentSchema.index({ email: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);