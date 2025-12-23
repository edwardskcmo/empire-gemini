import React from 'react';
import { LayoutDashboard, Zap, Mic, Square, AlertCircle, MessageSquare, Send, Link as LinkIcon, FileText, FileSpreadsheet, Search, Plus, Archive, Trash2, Pencil, ChevronDown, Filter, ClipboardList } from 'lucide-react';
import { io } from 'socket.io-client';
import VoiceOrb from './components/VoiceOrb';
import FileUpload from './components/FileUpload';

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
      <NavItem
        icon={<MessageSquare />}
        label="Dashboard"
        active={activeTab === 'chat'}
        onClick={() => setActiveTab('chat')}
      />
      <NavItem
        icon={<AlertCircle />}
        label="Issues"
        active={activeTab === 'issues'}
        onClick={() => setActiveTab('issues')}
      />
      <NavItem
        icon={<LinkIcon />}
        label="Connect Data"
        active={activeTab === 'connect'}
        onClick={() => setActiveTab('connect')}
      />
      <NavItem
        icon={<Mic />}
        label="Voice Command"
        active={activeTab === 'voice'}
        onClick={() => setActiveTab('voice')}
      />
    </nav>

    <div className="mt-auto space-y-4">
      <NavItem
        icon={<LayoutDashboard />}
        label="Systems"
        active={activeTab === 'dashboard'}
        onClick={() => setActiveTab('dashboard')}
      />
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
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
                  {new Date(msg.id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Issue Board Component
const IssueBoard = ({ issues, addIssue }) => {
  const handleAddIssue = () => {
    const title = prompt("Enter issue title:");
    if (title) addIssue(title);
  };

  const allIssues = [
    {
      id: 'demo-1',
      title: 'New Drywall Crew',
      description: 'Need to research and find a new drywall crew as a back up.',
      department: 'Production & Project Management',
      priority: 'Medium',
      status: 'Open',
      assignee: 'Bob Perry, Alex Duey',
      date: '12/20/2025'
    },
    ...issues.map(i => ({
      id: i.id,
      title: i.title,
      description: 'Pending details...',
      department: 'Engineering',
      priority: i.status === 'High Priority' ? 'High' : 'Low',
      status: 'Open',
      assignee: 'Unassigned',
      date: i.date || new Date().toLocaleDateString()
    }))
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-500" />
            Issues Board
          </h3>
          <p className="text-sm text-gray-400 mt-1 ml-11">{allIssues.length} active issues</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAddIssue} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            New Issue
          </button>
        </div>
      </div>
      <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-0 relative">
        <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-black/20">
          <div className="col-span-4">Issue</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Created</div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {allIssues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-12 gap-4 p-4 rounded-lg bg-black/20 hover:bg-white/5 transition-colors items-center border border-transparent hover:border-white/5">
              <div className="col-span-4"><h4 className="font-semibold text-gray-200 text-sm">{issue.title}</h4></div>
              <div className="col-span-2 text-xs text-gray-400">{issue.department}</div>
              <div className="col-span-2 text-xs text-gray-400">{issue.priority}</div>
              <div className="col-span-2 text-xs text-gray-400">{issue.status}</div>
              <div className="col-span-2 text-right text-xs text-gray-400">{issue.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [issues, setIssues] = React.useState([]);
  const [documents, setDocuments] = React.useState([]);
  const [chatMessages, setChatMessages] = React.useState([]);
  const [voiceStatus, setVoiceStatus] = React.useState('idle');
  const [socket, setSocket] = React.useState(null);
  const [orbVolume, setOrbVolume] = React.useState(0);
  const [mediaRecorder, setMediaRecorder] = React.useState(null);
  const [pulseData, setPulseData] = React.useState({ status: "Offline", version: "1.0.0" });

  // SMART PATH LOGIC: Automatically detects if on Heroku or Local
  const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

  // Initialize Socket (Voice Connection)
  React.useEffect(() => {
    const newSocket = io(API_BASE);
    setSocket(newSocket);

    newSocket.on('voice-volume', (data) => setOrbVolume(data.volume));
    newSocket.on('voice-response', (data) => {
      setVoiceStatus('idle');
      setOrbVolume(0);
      setChatMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: data.text || "Audio Response" }]);
    });

    return () => newSocket.close();
  }, []);

  // Fetch Initial Data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const pulseRes = await fetch(`${API_BASE}/api/pulse`);
        setPulseData(await pulseRes.json());

        const issuesRes = await fetch(`${API_BASE}/api/issues`);
        setIssues(await issuesRes.json());

        const docsRes = await fetch(`${API_BASE}/api/documents`);
        setDocuments(await docsRes.json());

        const chatRes = await fetch(`${API_BASE}/api/chat`);
        const chatJson = await chatRes.json();
        if (chatJson.length > 0) setChatMessages(chatJson);
        else setChatMessages([{ id: Date.now(), role: 'ai', text: 'Hello, Architect. Connection to Central Intelligence established.' }]);
      } catch (err) {
        console.error("Link to Central Intelligence failed:", err);
      }
    };
    fetchData();
  }, []);

  const handleSendMessage = async (text) => {
    const userMsg = { id: Date.now(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, data]);
    } catch (err) {
      setChatMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: "Error: Connection to Central Intelligence lost." }]);
    }
  };

  const addIssue = async (title) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const newIssue = await res.json();
      setIssues([...issues, newIssue]);
    } catch (err) { console.error(err); }
  };

  const toggleVoice = async () => {
    if (voiceStatus === 'listening') {
      if (mediaRecorder) {
        mediaRecorder.onstop = () => { if (socket) socket.emit('voice-end'); };
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0 && socket) socket.emit('voice-audio', e.data); };
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

        {activeTab === 'dashboard' && (
          <section className="glass-panel p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Zap className="text-yellow-400" /> System Pulse</h3>
            <div className={`p-4 rounded-lg border ${pulseData.status === 'Online' ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
              System is {pulseData.status}. Link is {pulseData.status === 'Online' ? 'Solid' : 'Broken'}.
            </div>
          </section>
        )}

        {activeTab === 'chat' && <ChatInterface messages={chatMessages} onSendMessage={handleSendMessage} />}
        {activeTab === 'issues' && <IssueBoard issues={issues} addIssue={addIssue} />}
        
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
