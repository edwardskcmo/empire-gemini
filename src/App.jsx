import React from 'react';
import { LayoutDashboard, Zap, Mic, Square, AlertCircle, MessageSquare, Send, Link as LinkIcon, ClipboardList, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import VoiceOrb from './components/VoiceOrb';

// --- HELPER: TIME FORMATTER ---
// This fixes the "Frozen" or "Invalid Date" issue
const formatLocalTime = (msgId) => {
  try {
    // If msg.id is a timestamp (number), use it. Otherwise, use current time.
    const date = typeof msgId === 'number' ? new Date(msgId) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "--:--";
  }
};

// Navigation Item Component
const NavItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
  >
    {React.cloneElement(icon, { size: 20 })}
    <span className="font-medium">{label}</span>
  </button>
);

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => (
  <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/10 m-0 rounded-none flex flex-col p-6 z-10">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
        <Zap className="w-5 h-5 text-blue-400" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white">Empire AI</h1>
    </div>

    <nav className="space-y-2">
      <NavItem icon={<MessageSquare />} label="Dashboard" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
      <NavItem icon={<AlertCircle />} label="Issues" active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} />
      <NavItem icon={<LinkIcon />} label="Connect Data" active={activeTab === 'connect'} onClick={() => setActiveTab('connect')} />
      <NavItem icon={<Mic />} label="Voice Command" active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} />
    </nav>

    <div className="mt-auto space-y-4">
      <NavItem icon={<LayoutDashboard />} label="Systems" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
      <div className="glass-card p-4">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">System Status</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">Online</span>
        </div>
      </div>
    </div>
  </aside>
);

// Chat Component
const ChatInterface = ({ messages, onSendMessage }) => {
  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex-[2] flex flex-col glass-panel overflow-hidden relative min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20'
                : 'bg-white/10 text-gray-200 rounded-bl-none border border-white/5'
                }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span className="text-xs opacity-50 mt-2 block">
                  {formatLocalTime(msg.id)}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gray-900/60 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Empire AI..."
              className="glass-input flex-1"
            />
            <button type="submit" disabled={!input.trim()} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [issues, setIssues] = React.useState([]);
  const [chatMessages, setChatMessages] = React.useState([]);
  const [voiceStatus, setVoiceStatus] = React.useState('idle');
  const [socket, setSocket] = React.useState(null);
  const [orbVolume, setOrbVolume] = React.useState(0);
  const [mediaRecorder, setMediaRecorder] = React.useState(null);

  // SMART PATH LOGIC
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;

  // Initialize Socket (Unified for Chat & Voice)
  React.useEffect(() => {
    const newSocket = io(API_BASE);
    setSocket(newSocket);

    newSocket.on('voice-volume', (data) => setOrbVolume(data.volume));
    
    // Listen for AI Responses (Text & Trigger Voice)
    newSocket.on('voice-response', (data) => {
      setVoiceStatus('idle');
      if (data.text) {
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: data.text }]);
      }
    });

    // Listen for Chat-only Responses
    newSocket.on('chat-response', (data) => {
      if (data.text) {
        setChatMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: data.text }]);
      }
    });

    return () => newSocket.close();
  }, [API_BASE]);

  const handleSendMessage = (text) => {
    const userMsg = { id: Date.now(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    if (socket) {
      socket.emit('chat-message', text);
    }
  };

  const toggleVoice = async () => {
    if (voiceStatus === 'listening') {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      setVoiceStatus('processing');
      return;
    }
    try {
      if (socket) socket.emit('start-voice-session');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.ondataavailable = (e) => { 
        if (e.data.size > 0 && socket) socket.emit('voice-audio', e.data); 
      };
      recorder.start(100);
      setVoiceStatus('listening');
    } catch (err) { alert("Microphone Error"); }
  };

  return (
    <div className="min-h-screen text-white pl-64 bg-slate-950">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Operational Intelligence</h2>
            <p className="text-gray-400 mt-1">Welcome back, Architect.</p>
          </div>
        </header>

        {activeTab === 'chat' && <ChatInterface messages={chatMessages} onSendMessage={handleSendMessage} />}
        
        {activeTab === 'voice' && (
          <section className="glass-panel p-12 flex flex-col items-center justify-center text-center h-[600px]">
            <VoiceOrb socket={socket} isActive={voiceStatus === 'listening'} volume={orbVolume} />
            <h3 className="text-4xl font-bold mt-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {voiceStatus.toUpperCase()}
            </h3>
            <button onClick={toggleVoice} className={`mt-12 rounded-full p-8 transition-all ${voiceStatus === 'listening' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-blue-600 text-white'}`}>
              {voiceStatus === 'listening' ? <Square className="w-8 h-8" fill="currentColor" /> : <Mic className="w-8 h-8" />}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
