import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Send, Settings, LogOut, Palette, 
  Smile, Image as ImageIcon, Phone, Video
} from 'lucide-react';

// 👇 KEEP YOUR BACKEND URL HERE 👇
const BACKEND_URL = "https://programmer9999-chatverse-backend.hf.space"; 

const socket = io.connect(BACKEND_URL);

// --- 🌟 MODERN THEMES (Wallpapers + Colors) ---
const THEMES = [
  { 
    id: 0, 
    name: "Starry Night (Insta)", 
    bgImage: "url('https://i.pinimg.com/736x/8e/6b/6b/8e6b6b3e6b3e6b3e6b3e6b3e6b3e6b3e.jpg')", // Brown Stars
    bgColor: "bg-[#2c1e1a]",
    msgMe: "bg-[#9fd4b6] text-black", // Sage Green
    msgOther: "bg-[#3d3431] text-white", // Dark Brown
    accent: "text-[#9fd4b6]" 
  },
  { 
    id: 1, 
    name: "Cyberpunk", 
    bgImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop')",
    bgColor: "bg-gray-900",
    msgMe: "bg-fuchsia-600 text-white", 
    msgOther: "bg-slate-800 text-white",
    accent: "text-fuchsia-500" 
  },
  { 
    id: 2, 
    name: "Clouds", 
    bgImage: "url('https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2574&auto=format&fit=crop')",
    bgColor: "bg-blue-200",
    msgMe: "bg-white text-blue-900", 
    msgOther: "bg-white/40 backdrop-blur-md text-blue-900",
    accent: "text-blue-500" 
  },
  { 
    id: 3, 
    name: "Midnight Gradient", 
    bgImage: "linear-gradient(to top, #0f2027, #203a43, #2c5364)",
    bgColor: "bg-gray-900",
    msgMe: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white", 
    msgOther: "bg-white/10 text-white",
    accent: "text-cyan-400" 
  }
];

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [friends, setFriends] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  
  const [mobileView, setMobileView] = useState("list");
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(0);

  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  
  const messagesEndRef = useRef(null);

  // --- 🔄 PERSISTENT LOGIN ---
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

  // --- 📜 SCROLL TO BOTTOM ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // --- 📡 REAL-TIME LISTENER FIX ---
  useEffect(() => {
    // We attach the listener ONCE. We use 'prev' to update state correctly.
    socket.off("receive_message").on("receive_message", (data) => {
      // Logic: Only add if it belongs to the current open chat OR if it's from me
      setChatHistory((prev) => {
          // Prevent duplicates
          const exists = prev.find(m => m.id === data.id || (m.message === data.message && m.time === data.time));
          if (exists) return prev;
          return [...prev, data];
      });
    });

    return () => socket.off("receive_message");
  }, []); // Empty dependency array = Runs once on mount

  const loadFriends = async (user) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/my-friends/${user}`);
      setFriends(res.data);
    } catch(e) { console.error(e); }
  };

  const loadMessages = async (friend) => {
    const room = [username, friend].sort().join("_");
    try {
        // Clear history first to avoid flashing old chat
        setChatHistory([]);
        const res = await axios.get(`${BACKEND_URL}/messages/${room}`);
        setChatHistory(res.data);
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
        alert("Account created! Login now.");
      }
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  const sendMessage = async () => {
    if (!message || !currentChat) return;
    
    const room = [username, currentChat].sort().join("_");
    const msgData = {
      room,
      author: username,
      message: message,
      type: "text",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: Date.now() // Unique ID
    };

    // 1. Optimistic UI: Show it immediately
    setChatHistory((prev) => [...prev, msgData]);
    setMessage("");

    // 2. Send to Server
    await socket.emit("send_message", msgData);
  };

  const theme = THEMES[currentTheme];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
         <div className="w-full max-w-sm text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">ChatVerse</h1>
            <input className="w-full bg-gray-900 text-white p-4 rounded-xl mb-4 border border-white/10 outline-none focus:border-pink-500 transition-all" placeholder="Username" onChange={(e)=>setUsername(e.target.value)} />
            <input className="w-full bg-gray-900 text-white p-4 rounded-xl mb-6 border border-white/10 outline-none focus:border-pink-500 transition-all" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
            <button onClick={() => handleAuth("login")} className="w-full bg-white text-black font-bold py-4 rounded-xl mb-4">Log In</button>
            <button onClick={() => handleAuth("register")} className="text-gray-400 text-sm">Create Account</button>
         </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex text-white overflow-hidden font-sans bg-black`}>
      
      {/* 📱 SIDEBAR / LIST */}
      <div className={`w-full md:w-[350px] border-r border-white/10 flex flex-col bg-black z-20 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex justify-between items-center">
           <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">ChatVerse</h1>
           <div className="flex gap-2">
             <button onClick={() => setShowAddFriend(true)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><Plus size={20}/></button>
             <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><Settings size={20}/></button>
           </div>
        </div>

        {/* Settings Dropdown */}
        <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-gray-900 overflow-hidden border-y border-white/10">
             <div className="p-4 space-y-4">
                <div>
                   <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Chat Theme</p>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                      {THEMES.map((t, i) => (
                         <button key={i} onClick={() => { setCurrentTheme(i); localStorage.setItem("chatverse_theme", i); }} className={`w-10 h-10 rounded-full border-2 ${currentTheme === i ? "border-white" : "border-transparent"} flex-shrink-0 bg-cover`} style={{ backgroundImage: t.bgImage.includes('url') ? t.bgImage : 'none', background: !t.bgImage.includes('url') ? t.bgImage : 'none' }}></button>
                      ))}
                   </div>
                </div>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-2 text-red-400 text-sm font-bold"><LogOut size={16}/> Log Out</button>
             </div>
          </motion.div>
        )}
        </AnimatePresence>
        
        <div className="flex-1 overflow-y-auto p-2">
          {friends.map((friend) => (
            <div key={friend} onClick={() => { setCurrentChat(friend); loadMessages(friend); setMobileView("chat"); }} className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all ${currentChat === friend ? "bg-white/10" : "hover:bg-white/5"}`}>
               <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-lg">{friend[0].toUpperCase()}</div>
               </div>
               <div>
                  <h3 className="font-bold">{friend}</h3>
                  <p className="text-sm text-gray-400">Tap to chat</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 💬 CHAT AREA */}
      <div className={`flex-1 flex flex-col relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* DYNAMIC BACKGROUND */}
        <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: theme.bgImage.includes('url') ? theme.bgImage : 'none', background: !theme.bgImage.includes('url') ? theme.bgImage : 'none' }}>
           <div className={`absolute inset-0 ${theme.bgColor} opacity-40 mix-blend-multiply`}></div>
           <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
        </div>

        {currentChat ? (
          <>
            {/* Header */}
            <div className="p-4 flex items-center justify-between z-10 bg-black/20 backdrop-blur-md border-b border-white/5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                 <button onClick={() => setMobileView("list")} className="md:hidden"><ArrowLeft/></button>
                 <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-lg font-bold">{currentChat[0].toUpperCase()}</div>
                 <div>
                    <h3 className="font-bold leading-tight">{currentChat}</h3>
                    <p className="text-xs opacity-70">Active now</p>
                 </div>
              </div>
              <div className="flex gap-4 opacity-80">
                 <Phone size={24} />
                 <Video size={24} />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-[2px] z-10">
              {chatHistory.map((msg, idx) => {
                 const isMe = msg.author === username;
                 const prevMsg = chatHistory[idx - 1];
                 const nextMsg = chatHistory[idx + 1];
                 
                 // Smart Grouping Logic for Corners
                 const isFirst = !prevMsg || prevMsg.author !== msg.author;
                 const isLast = !nextMsg || nextMsg.author !== msg.author;
                 
                 const roundedClass = isMe 
                    ? `${isFirst ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${isLast ? 'rounded-br-2xl' : 'rounded-br-md'} rounded-l-2xl`
                    : `${isFirst ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${isLast ? 'rounded-bl-2xl' : 'rounded-bl-md'} rounded-r-2xl`;

                 return (
                   <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      className={`flex ${isMe ? "justify-end" : "justify-start"} ${isFirst ? "mt-4" : "mt-0"}`}
                   >
                     <div className={`max-w-[70%] px-4 py-2 text-[15px] shadow-sm ${roundedClass} ${isMe ? theme.msgMe : theme.msgOther}`}>
                       {msg.message}
                     </div>
                   </motion.div>
                 );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 z-10">
               <div className="bg-black/40 backdrop-blur-xl p-1 rounded-[2rem] flex items-center border border-white/10 gap-2 pl-4">
                  <div className="p-2 bg-blue-600 rounded-full cursor-pointer"><ImageIcon size={18} className="text-white"/></div>
                  <input 
                    className="bg-transparent flex-1 text-white outline-none h-10 placeholder-gray-400" 
                    placeholder="Message..." 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  {message.length > 0 ? (
                     <motion.button initial={{scale:0}} animate={{scale:1}} onClick={sendMessage} className="p-3 font-bold text-blue-500 hover:text-blue-400">Send</motion.button>
                  ) : (
                     <div className="flex gap-3 pr-4 text-gray-400">
                        <Smile size={24}/>
                     </div>
                  )}
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center z-10 text-white/50">
             <p className="text-xl font-medium">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showAddFriend && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-xs border border-white/10">
               <h3 className="font-bold text-white mb-4">Add Friend</h3>
               <input id="fname" className="w-full bg-black text-white p-3 rounded-xl mb-4 outline-none border border-white/20" placeholder="Username" />
               <div className="flex gap-2">
                  <button onClick={()=>setShowAddFriend(false)} className="flex-1 p-3 text-gray-400">Cancel</button>
                  <button onClick={async ()=>{
                     try {
                        const name = document.getElementById("fname").value;
                        await axios.post(`${BACKEND_URL}/add-friend`, { myUsername: username, friendUsername: name });
                        setShowAddFriend(false);
                        loadFriends(username);
                     } catch(e) { alert("Error adding friend"); }
                  }} className="flex-1 bg-white text-black font-bold rounded-xl">Add</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default App;