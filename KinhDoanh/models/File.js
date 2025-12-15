const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  path: String,
  resource_type: String,
  resource_id: Number,
  category_id: Number,
  description: String,
  uploaded_by: Number,
  uploaded_at: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true }
});

const FileModel = mongoose.model('File', FileSchema);

module.exports = FileModel;
