const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // We will use this later for the friend system
  friends: [{ type: String }] 
});

module.exports = mongoose.model("User", UserSchema);