const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String, required: true,
    //Create a unique index on the 'email' field to ensure no two users can register with the same email address.
    unique: true,
    index: true,
  },
  password: { type: String, required: true },
  isTemporaryPassword: { type: Boolean, default: false },
  role: {
    type: String,
    // admin also know as School Administrator: 
    enum: ['superadmin', 'admin'],
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, { versionKey: false, timestamps: true });


module.exports = mongoose.model('User', userSchema);  