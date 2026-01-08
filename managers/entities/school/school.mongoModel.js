const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true, trim: true },
  address: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  website: { type: String, trim: true },
  logo: { type: String, trim: true },
  deletedAt: { type: Date, default: null },
}, { versionKey: false, timestamps: true });


module.exports = mongoose.model('School', schoolSchema);