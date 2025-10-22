const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  action: { type: String, required: true }, // "created task", "edited task", etc.
  taskId: String,
  taskName: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Activity', activitySchema);
