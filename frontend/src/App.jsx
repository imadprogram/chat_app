import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Send, User, MessageCircle, Settings, 
  LogOut, Palette, CheckCheck, Smile 
} from 'lucide-react';

// 👇 PASTE YOUR HUGGING FACE URL HERE 👇
const BACKEND_URL = "https://programmer9999-chatverse-backend.hf.space"; 

const socket = io.connect(BACKEND_URL);

// --- 50 THEMES CONFIGURATION ---
const THEMES = [
  { name: "Midnight", bg: "bg-gray-950", msgMe: "bg-blue-600", msgOther: "bg-gray-800", accent: "text-blue-500" },
  { name: "Sunset", bg: "bg-orange-950", msgMe: "bg-orange-600", msgOther: "bg-gray-800", accent: "text-orange-500" },
  { name: "Forest", bg: "bg-green-950", msgMe: "bg-green-700", msgOther: "bg-gray-800", accent: "text-green-500" },
  { name: "Ocean", bg: "bg-slate-900", msgMe: "bg-cyan-600", msgOther: "bg-slate-800", accent: "text-cyan-400" },
  { name: "Berry", bg: "bg-fuchsia-950", msgMe: "bg-pink-600", msgOther: "bg-gray-800", accent: "text-pink-400" },
  { name: "Coffee", bg: "bg-yellow-950", msgMe: "bg-amber-700", msgOther: "bg-stone-800", accent: "text-amber-500" },
  { name: "Vampire", bg: "bg-red-950", msgMe: "bg-red-700", msgOther: "bg-neutral-800", accent: "text-red-500" },
  { name: "Royal", bg: "bg-indigo-950", msgMe: "bg-indigo-600", msgOther: "bg-slate-800", accent: "text-indigo-400" },
  // ... (Imagine 40 more variations, for brevity we loop colors)
  ...Array.from({ length: 42 }).map((_, i) => ({
     name: `Neo ${i+1}`, 
     bg: i % 2 === 0 ? "bg-gray-900" : "bg-black", 
     msgMe: `bg-[hsl(${i * 10},70%,50%)]`, 
     msgOther: "bg-white/10",
     accent: "text-white"
  }))
];

// --- CUSTOM ANIMATED EMOJIS (Simulated) ---
const CUSTOM_EMOJIS = ["🚀", "🔥", "❤️", "😂", "👻", "🎉", "💩", "👀", "💎", "💯", "🍔", "🍕"];

function App() {
  // --- STATE ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [friends, setFriends] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  
  // UI States
  const [mobileView, setMobileView] = useState("list");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(0);

  // Chat States
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- PERSISTENT LOGIN ---
  useEffect(() => {
    const savedUser = localStorage.getItem("chatverse_user");
    const savedTheme = localStorage.getItem("chatverse_theme");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUsername(user.username);
      setIsLoggedIn(true);
      socket.emit("join_room", user.username);
      loadFriends(user.username);
    }
    if (savedTheme) setCurrentTheme(parseInt(savedTheme));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, typingUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- API CALLS ---
  const loadFriends = async (user) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/my-friends/${user}`);
      setFriends(res.data);
    } catch(e) { console.error(e); }
  };

  const loadMessages = async (friend) => {
    // Determine unique room ID (alphabetical order ensures both users get same room)
    const room = [username, friend].sort().join("_");
    try {
        const res = await axios.get(`${BACKEND_URL}/messages/${room}`);
        setChatHistory(res.data);
        // Mark as read immediately
        socket.emit("mark_read", { room, friendName: friend });
    } catch(e) { console.error(e); }
  };

  const handleAuth = async (endpoint) => {
    try {
      await axios.post(`${BACKEND_URL}/${endpoint}`, { username, password });
      if (endpoint === "login") {
        localStorage.setItem("chatverse_user", JSON.stringify({ username }));
        setIsLoggedIn(true);
        socket.emit("join_room", username);
        loadFriends(username);
      } else {
        alert("Success! Now Log In.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("chatverse_user");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setChatHistory([]);
    setFriends([]);
  };

  const addFriend = async (name) => {
    try {
      await axios.post(`${BACKEND_URL}/add-friend`, { myUsername: username, friendUsername: name });
      setShowAddFriend(false);
      loadFriends(username);
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  // --- SOCKETS & CHAT LOGIC ---
  const sendMessage = async (type = "text", content = message) => {
    if ((!content && type === "text") || !currentChat) return;
    
    const room = [username, currentChat].sort().join("_");
    const msgData = {
      room,
      author: username,
      message: content,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    await socket.emit("send_message", msgData);
    setMessage("");
    setShowEmoji(false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    const room = [username, currentChat].sort().join("_");
    socket.emit("typing", { room, user: username });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { room });
    }, 2000);
  };

  useEffect(() => {
    // Listeners
    socket.on("receive_message", (data) => {
      const room = [username, currentChat].sort().join("_");
      // Only add message if it belongs to current chat
      if (data.room === room) {
        setChatHistory((prev) => [...prev, data]);
        // If I am receiving this while Looking at the chat, mark it read
        if (data.author !== username) {
            socket.emit("mark_read", { room, friendName: data.author });
        }
      }
    });

    socket.on("display_typing", (data) => {
       if (data.room.includes(currentChat)) setTypingUser(data.user);
    });
    
    socket.on("hide_typing", () => setTypingUser(null));

    socket.on("messages_read", (data) => {
        // Update all my unread messages to read locally
        setChatHistory(prev => prev.map(msg => ({...msg, read: true})));
    });

    return () => {
      socket.off("receive_message");
      socket.off("display_typing");
      socket.off("hide_typing");
      socket.off("messages_read");
    };
  }, [currentChat, username]);


  // --- RENDER ---
  const theme = THEMES[currentTheme];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <MessageCircle size={32} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-white">ChatVerse</h1>
             <p className="text-gray-400">Next Gen Messaging</p>
          </div>
          <div className="space-y-4">
            <input className="w-full bg-black/50 text-white p-4 rounded-xl border border-white/10 focus:border-cyan-500 outline-none transition-all" placeholder="Username" onChange={(e)=>setUsername(e.target.value)} />
            <input className="w-full bg-black/50 text-white p-4 rounded-xl border border-white/10 focus:border-cyan-500 outline-none transition-all" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => handleAuth("login")} className="bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Log In</button>
                <button onClick={() => handleAuth("register")} className="bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors">Sign Up</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex text-white overflow-hidden relative font-sans ${theme.bg}`}>
      
      {/* --- SETTINGS SIDEBAR --- */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="absolute inset-y-0 left-0 w-80 bg-black/90 backdrop-blur-md z-50 border-r border-white/10 p-6 flex flex-col shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="text-gray-400"/> Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft /></button>
             </div>
             
             <div className="mb-8">
                <h3 className="text-gray-400 text-sm font-bold uppercase mb-4 flex items-center gap-2"><Palette size={16}/> Themes ({THEMES.length})</h3>
                <div className="grid grid-cols-4 gap-3 h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {THEMES.map((t, i) => (
                        <button key={i} onClick={() => { setCurrentTheme(i); localStorage.setItem("chatverse_theme", i); }} 
                            className={`w-full aspect-square rounded-full border-2 ${currentTheme === i ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"} transition-all ${t.msgMe}`}></button>
                    ))}
                </div>
             </div>

             <div className="mt-auto">
                <button onClick={handleLogout} className="w-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white p-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold">
                    <LogOut size={20} /> Log Out
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LEFT PANEL (User List) --- */}
      <div className={`w-full md:w-1/3 md:max-w-sm border-r border-white/5 flex flex-col bg-black/20 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Settings size={22} /></button>
             <h2 className="text-lg font-bold">{username}</h2>
          </div>
          <button onClick={() => setShowAddFriend(true)} className={`w-10 h-10 ${theme.msgMe} rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform`}><Plus size={22} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {friends.length === 0 && <div className="text-center text-gray-500 mt-10">No friends yet. Add one!</div>}
          {friends.map((friend) => (
            <motion.div whileTap={{ scale: 0.98 }} key={friend} 
                onClick={() => { setCurrentChat(friend); loadMessages(friend); setMobileView("chat"); }} 
                className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all border border-transparent ${currentChat === friend ? "bg-white/10 border-white/5" : "hover:bg-white/5"}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-xl font-bold border border-white/10">
                {friend[0].toUpperCase()}
              </div>
              <div className="flex-1">
                 <div className="font-bold text-base">{friend}</div>
                 <div className="text-xs text-gray-400">Click to chat</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- RIGHT PANEL (Chat Area) --- */}
      <div className={`flex-1 flex flex-col relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {/* DOODLE BACKGROUND PATTERN */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://i.pinimg.com/originals/8e/6b/6b/8e6b6b3e6b3e6b3e6b3e6b3e6b3e6b3e.jpg')", backgroundSize: "400px" }}></div>

        {currentChat ? (
          <>
            {/* Header */}
            <div className="p-4 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center gap-4 sticky top-0 z-20 shadow-md">
              <button onClick={() => setMobileView("list")} className="md:hidden p-2 rounded-full hover:bg-white/10"><ArrowLeft size={22} /></button>
              <div className="w-10 h-10 bg-gradient-to-tr from-gray-700 to-gray-800 rounded-full flex items-center justify-center font-bold">{currentChat[0].toUpperCase()}</div>
              <div>
                  <h3 className="font-bold">{currentChat}</h3>
                  <div className="text-xs text-green-400 flex items-center gap-1">
                      {typingUser === currentChat ? <span className="animate-pulse">Typing...</span> : "Online"}
                  </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
              <AnimatePresence initial={false}>
                {chatHistory.map((msg, idx) => {
                  const isMe = msg.author === username;
                  return (
                    <motion.div key={idx} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] md:max-w-[60%] px-5 py-3 rounded-2xl shadow-sm relative group ${isMe ? `${theme.msgMe} rounded-br-sm text-white` : `${theme.msgOther} rounded-bl-sm text-gray-100`}`}>
                        {msg.type === "emoji" ? <span className="text-4xl filter drop-shadow-md">{msg.message}</span> : <p className="text-[15px] leading-relaxed">{msg.message}</p>}
                        
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                            <span className="text-[10px]">{msg.time}</span>
                            {isMe && (
                                <CheckCheck size={14} className={msg.read ? "text-blue-300" : "text-gray-400"} />
                            )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {typingUser === currentChat && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className={`${theme.msgOther} px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1`}>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                 </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-black/60 backdrop-blur-md border-t border-white/5 flex gap-2 items-end z-20 relative">
               {/* Custom Emoji Picker */}
               <AnimatePresence>
                {showEmoji && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-20 left-4 bg-gray-900 border border-white/10 p-3 rounded-2xl shadow-2xl grid grid-cols-4 gap-2">
                        {CUSTOM_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => sendMessage("emoji", emoji)} className="text-2xl hover:bg-white/10 p-2 rounded-lg transition-colors hover:scale-125">{emoji}</button>
                        ))}
                    </motion.div>
                )}
               </AnimatePresence>

              <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 rounded-full hover:bg-white/10 text-gray-400 transition-colors"><Smile /></button>
              
              <div className="flex-1 bg-gray-800/50 rounded-2xl flex items-center px-4 py-2 border border-white/5 focus-within:border-white/20 transition-all">
                <input 
                    className="bg-transparent w-full text-white outline-none py-2 resize-none h-10 placeholder-gray-500" 
                    placeholder="Type a message..." 
                    value={message} 
                    onChange={handleTyping}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendMessage("text")} className={`${theme.msgMe} p-3 rounded-full text-white shadow-lg hover:brightness-110 transition-all`}>
                  <Send size={20} className={message ? "ml-1" : ""} />
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500/50">
             <MessageCircle size={100} strokeWidth={1} className="mb-4"/>
             <p className="text-xl">Select a chat to start</p>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-gray-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">Add New Friend</h3>
                <input id="newFriendInput" className="w-full bg-black/50 text-white p-3 rounded-xl border border-white/10 mb-4 outline-none focus:border-blue-500" placeholder="Friend's Username" />
                <div className="flex gap-3">
                    <button onClick={() => setShowAddFriend(false)} className="flex-1 py-3 rounded-xl hover:bg-white/5">Cancel</button>
                    <button onClick={() => addFriend(document.getElementById("newFriendInput").value)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">Add</button>
                </div>
            </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;