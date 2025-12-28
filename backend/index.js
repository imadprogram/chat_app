require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // We allow all origins because your frontend URL might change
    origin: "*",
    methods: ["GET", "POST"],
  },
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ CONNECTED TO MONGODB"))
  .catch((err) => console.log("❌ DB CONNECTION ERROR:", err));

// --- ROUTES ---

app.get("/", (req, res) => {
  res.send("ChatVerse Server is Running!");
});

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
    if (me.username === friend.username) return res.status(400).json({ message: "You can't add yourself!" });
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
    res.status(200).json(user.friends);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SOCKETS ---
io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  socket.on("join_room", (username) => {
    socket.join(username);
  });
  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
    socket.emit("receive_message", data);
  });
});

// LISTEN (Updated for Hugging Face)
const PORT = process.env.PORT || 7860;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING on port ${PORT}`);
});