require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message"); // Import the new model

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ CONNECTED TO MONGODB"))
  .catch((err) => console.log("❌ DB CONNECTION ERROR:", err));

// --- ROUTES ---

app.get("/", (req, res) => res.send("ChatVerse Server Running!"));

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Username taken" });
    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: "User created" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(400).json({ message: "Invalid credentials" });
    res.status(200).json({ message: "Login successful", username: user.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/add-friend", async (req, res) => {
  try {
    const { myUsername, friendUsername } = req.body;
    const me = await User.findOne({ username: myUsername });
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ message: "User not found!" });
    if (me.username === friend.username) return res.status(400).json({ message: "Can't add yourself!" });
    if (me.friends.includes(friend.username)) return res.status(400).json({ message: "Already friends!" });
    
    me.friends.push(friend.username);
    friend.friends.push(me.username);
    await me.save();
    await friend.save();
    res.status(200).json({ message: "Friend added!", friend: friend.username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/my-friends/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.status(200).json(user ? user.friends : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FETCH OLD MESSAGES ---
app.get("/messages/:room", async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SOCKETS ---
io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  socket.on("join_room", (username) => {
    socket.join(username); 
  });

  socket.on("send_message", async (data) => {
    // Save to Database
    const newMessage = new Message(data);
    await newMessage.save();

    // Send to Receiver
    io.to(data.room).emit("receive_message", data);
    // Send back to Sender (so it updates on their other devices too)
    socket.emit("receive_message", data); 
  });

  // Typing Indicators
  socket.on("typing", (data) => {
    socket.to(data.room).emit("display_typing", data);
  });
  
  socket.on("stop_typing", (data) => {
    socket.to(data.room).emit("hide_typing", data);
  });

  // Read Receipts
  socket.on("mark_read", async (data) => {
      // Update in DB
      await Message.updateMany({ room: data.room, author: data.friendName, read: false }, { $set: { read: true } });
      // Tell the sender "Your messages were read"
      socket.to(data.room).emit("messages_read", { room: data.room });
  });

});

const PORT = process.env.PORT || 7860;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING on port ${PORT}`);
});