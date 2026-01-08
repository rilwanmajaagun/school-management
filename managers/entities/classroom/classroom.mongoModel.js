const mongoose = require('mongoose');


const resourceSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
});


const classroomSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true },
  resources: [resourceSchema],
  deletedAt: { type: Date, default: null },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);