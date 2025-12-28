import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Send, User, MessageCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// 👇 PASTE YOUR HUGGING FACE DIRECT URL INSIDE THESE QUOTES 👇
const BACKEND_URL = "https://programmer9999-chatverse-backend.hf.space"; 
// (Make sure there is NO slash / at the very end)
// ---------------------------------------------------------------------------

const socket = io.connect(BACKEND_URL);

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [friends, setFriends] = useState([]);
  const [currentChat, setCurrentChat] = useState(null); 
  const [showAddFriend, setShowAddFriend] = useState(false); 
  const [newFriendName, setNewFriendName] = useState("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  
  const [mobileView, setMobileView] = useState("list"); 

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [chatHistory]);

  const handleAuth = async (endpoint) => {
    try {
      await axios.post(`${BACKEND_URL}/${endpoint}`, { username, password });
      if (endpoint === "login") {
        setIsLoggedIn(true);
        socket.emit("join_room", username);
        loadFriends();
      } else {
        alert("Account created! Log in now.");
        setIsRegistering(false);
      }
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  const loadFriends = async () => {
    const res = await axios.get(`${BACKEND_URL}/my-friends/${username}`);
    setFriends(res.data);
  };

  const addFriend = async () => {
    try {
      await axios.post(`${BACKEND_URL}/add-friend`, { myUsername: username, friendUsername: newFriendName });
      setNewFriendName("");
      setShowAddFriend(false);
      loadFriends();
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  const sendMessage = async () => {
    if (message === "" || !currentChat) return;
    const msgData = {
      room: currentChat,
      author: username,
      message: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: Date.now() 
    };
    await socket.emit("send_message", msgData);
    setMessage("");
  };

  useEffect(() => {
    socket.off("receive_message").on("receive_message", (data) => {
      if (data.author === currentChat || data.author === username) {
        setChatHistory((list) => [...list, data]);
      }
    });
  }, [currentChat, username]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-4 rounded-2xl shadow-lg shadow-cyan-500/20">
              <MessageCircle size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 text-center">{isRegistering ? "Join ChatVerse" : "Welcome Back"}</h1>
          <p className="text-gray-400 text-center mb-8">Connect with friends instantly.</p>
          
          <div className="space-y-4">
            <input className="w-full bg-black/40 text-white p-4 rounded-xl border border-white/10 focus:border-cyan-500 transition-colors outline-none" placeholder="Username" onChange={(e)=>setUsername(e.target.value)} />
            <input className="w-full bg-black/40 text-white p-4 rounded-xl border border-white/10 focus:border-cyan-500 transition-colors outline-none" type="password" placeholder="Password" onChange={(e)=>setPassword(e.target.value)} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAuth(isRegistering ? "register" : "login")} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold p-4 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow">
              {isRegistering ? "Create Account" : "Log In"}
            </motion.button>
            <p onClick={() => setIsRegistering(!isRegistering)} className="text-gray-400 text-center cursor-pointer hover:text-white transition-colors text-sm">
              {isRegistering ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-950 flex text-white overflow-hidden relative">
      <div className={`w-full md:w-1/3 md:max-w-sm bg-gray-900 border-r border-white/5 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">{username[0].toUpperCase()}</div>
             ChatVerse
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {friends.length === 0 && (
            <div className="text-center text-gray-500 mt-10"><p>No friends yet.</p><p className="text-sm">Tap + to add someone!</p></div>
          )}
          {friends.map((friend) => (
            <motion.div whileTap={{ scale: 0.98 }} key={friend} onClick={() => { setCurrentChat(friend); setChatHistory([]); setMobileView("chat"); }} className={`p-4 rounded-2xl cursor-pointer flex items-center gap-4 transition-all ${currentChat === friend ? "bg-white/10" : "hover:bg-white/5"}`}>
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><User size={20}/></div>
              <div className="flex-1"><div className="font-bold text-lg">{friend}</div><div className="text-sm text-gray-500">Tap to chat</div></div>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-6 right-6 md:hidden">
            <button onClick={() => setShowAddFriend(true)} className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center text-black shadow-lg shadow-cyan-500/40"><Plus size={28} strokeWidth={3} /></button>
        </div>
        <div className="p-4 hidden md:block">
           <button onClick={() => setShowAddFriend(true)} className="w-full bg-white/5 hover:bg-white/10 p-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"><Plus size={20} /> Add New Friend</button>
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-black/40 relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {currentChat ? (
          <>
            <div className="p-4 bg-gray-900/50 backdrop-blur-md border-b border-white/5 flex items-center gap-4 sticky top-0 z-10">
              <button onClick={() => setMobileView("list")} className="md:hidden p-2 rounded-full hover:bg-white/10"><ArrowLeft size={24} /></button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm">{currentChat[0].toUpperCase()}</div>
              <div><h3 className="font-bold text-lg leading-tight">{currentChat}</h3><p className="text-xs text-green-400">Online</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
              <AnimatePresence initial={false}>
                {chatHistory.map((msg, idx) => {
                  const isMe = msg.author === username;
                  return (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] md:max-w-[60%] px-5 py-3 rounded-2xl text-white shadow-sm ${isMe ? "bg-blue-600 rounded-br-none" : "bg-gray-800 rounded-bl-none"}`}>
                        <p className="text-[15px] leading-relaxed">{msg.message}</p>
                        <p className="text-[10px] opacity-60 text-right mt-1">{msg.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-gray-900 border-t border-white/5 flex gap-2 items-end">
              <div className="flex-1 bg-gray-800 rounded-2xl flex items-center px-4 py-2 border border-transparent focus-within:border-cyan-500/50 transition-colors">
                <input className="bg-transparent w-full text-white outline-none py-2 resize-none h-10" placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === "Enter" && sendMessage()}/>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} className="bg-cyan-500 p-3 rounded-full text-black shadow-lg shadow-cyan-500/20"><Send size={20} fill="black" /></motion.button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col text-gray-500 opacity-60">
             <MessageCircle size={80} strokeWidth={1} className="mb-4"/><p className="text-xl font-medium">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {showAddFriend && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Add Friend</h3>
            <input autoFocus className="w-full bg-black/50 text-white p-3 rounded-xl border border-white/10 mb-4 outline-none focus:border-cyan-500" placeholder="Enter username..." value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setShowAddFriend(false)} className="flex-1 py-3 rounded-xl hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={addFriend} className="flex-1 bg-cyan-500 text-black font-bold py-3 rounded-xl">Add</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;