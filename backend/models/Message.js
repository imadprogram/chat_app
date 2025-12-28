const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  room: String,
  author: String,
  message: String,
  type: { type: String, default: "text" }, // "text" or "emoji"
  time: String,
  read: { type: Boolean, default: false }, // For read receipts
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);