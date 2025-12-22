import React from 'react';
import { LayoutDashboard, Zap, Mic, Square, AlertCircle, MessageSquare, Send, Link as LinkIcon, FileText, FileSpreadsheet, Search, Plus, Archive, Trash2, Pencil, ChevronDown, Filter, ClipboardList } from 'lucide-react';
import { io } from 'socket.io-client';
import VoiceOrb from './components/VoiceOrb';
import FileUpload from './components/FileUpload';

// Placeholder components
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
      {/* Active Chat Window */}
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

      {/* Previous Conversations Logs */}
      <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            Previous Session Logs
          </h3>
          <button className="text-xs text-blue-400 hover:text-blue-300">View All</button>
        </div>
        <div className="overflow-y-auto p-2 space-y-1">
          {[
            { id: 1, date: '2025-12-19', summary: 'System architecture review and optimization plan', time: '14:20' },
            { id: 2, date: '2025-12-18', summary: 'Database latency analysis report', time: '09:45' },
            { id: 3, date: '2025-12-18', summary: 'Security protocol updates for module X', time: '16:30' },
            { id: 4, date: '2025-12-17', summary: 'New feature brainstorming: Swarm Logic', time: '11:15' },
            { id: 5, date: '2025-12-16', summary: 'Incident report: Node failure in region us-east', time: '08:00' },
          ].map((log) => (
            <div key={log.id} className="p-3 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-gray-200 font-medium line-clamp-1">{log.summary}</p>
                  <p className="text-xs text-gray-500">{log.date} • {log.time}</p>
                </div>
              </div>
              <span className="text-xs text-gray-600 group-hover:text-blue-400">View</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const IssueBoard = ({ issues, addIssue }) => {
  const handleAddIssue = () => {
    const title = prompt("Enter issue title:");
    if (title) addIssue(title);
  };

  // Mock data to match the screenshot "look and feel", combining with real props if desired
  // For this demo, we'll map the real issues to this structure and add the specific screenshot example.
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-500" />
            Issues Board
          </h3>
          <p className="text-sm text-gray-400 mt-1 ml-11">{allIssues.length} active issues</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 text-sm font-medium transition-colors">
            <Archive className="w-4 h-4" />
            Archive (0)
          </button>
          <button
            onClick={handleAddIssue}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New Issue
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-2 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search issues..."
            className="bg-transparent text-sm w-full pl-10 pr-4 py-2 outline-none text-gray-200 placeholder-gray-500 focus:bg-white/5 rounded-md transition-all"
          />
        </div>
        <div className="h-6 w-px bg-white/10 mx-2" />
        <button className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1 rounded-md hover:bg-white/5 transition-colors">
          All Status <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1 rounded-md hover:bg-white/5 transition-colors">
          All Priority <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-300 hover:text-white px-3 py-1 rounded-md hover:bg-white/5 transition-colors">
          All Departments <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </div>

      {/* Issues Table */}
      <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-0 relative">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-black/20">
          <div className="col-span-4">Issue</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Assignee</div>
          <div className="col-span-1">Created</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Rows */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {allIssues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-12 gap-4 p-4 rounded-lg bg-black/20 hover:bg-white/5 transition-colors group items-center border border-transparent hover:border-white/5">
              {/* Issue */}
              <div className="col-span-4 pr-4">
                <h4 className="font-semibold text-gray-200 text-sm mb-1 group-hover:text-blue-400 transition-colors">{issue.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-1">{issue.description}</p>
              </div>

              {/* Department */}
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-700/50 flex items-center justify-center text-[10px] text-gray-400 font-bold">
                  {issue.department.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-gray-400 truncate">{issue.department}</span>
              </div>

              {/* Priority */}
              <div className="col-span-1">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${issue.priority === 'Medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                  issue.priority === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-green-500/10 border-green-500/20 text-green-400'
                  }`}>
                  {issue.priority}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-1">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${issue.status === 'Open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  issue.status === 'Done' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                    'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}>
                  {issue.status}
                </span>
              </div>

              {/* Assignee */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-900 border border-black flex items-center justify-center text-[10px] text-white">BP</div>
                    <div className="w-6 h-6 rounded-full bg-purple-900 border border-black flex items-center justify-center text-[10px] text-white">AD</div>
                  </div>
                  <span className="text-xs text-gray-400 truncate">{issue.assignee}</span>
                </div>
              </div>

              {/* Created */}
              <div className="col-span-1">
                <span className="text-xs text-gray-400">{issue.date}</span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-md hover:bg-blue-500/20 text-gray-500 hover:text-blue-400 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConnectInterface = ({ documents, addDocument, onUploadSuccess, onDelete }) => {
  const [url, setUrl] = React.useState('');
  const [type, setType] = React.useState('Google Doc');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return;
    // Simple mock name extraction or prompt
    const filename = prompt("Enter a name for this document:") || "Untitled Document";
    addDocument({ filename, type, url });
    setUrl('');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Connect Data Source</h3>

      {/* File Upload Section */}
      <div className="glass-panel p-6">
        <h4 className="text-lg font-semibold mb-4">Upload Documents</h4>
        <FileUpload onUploadComplete={onUploadSuccess} />
      </div>

      {/* URL Connection Section */}
      <div className="glass-panel p-6">
        <h4 className="text-lg font-semibold mb-4">Add URL Connection</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass-input p-3"
            >
              <option value="Google Doc">Google Doc</option>
              <option value="Google Sheet">Google Sheet</option>
              <option value="Notion Page">Notion Page</option>
              <option value="PDF URL">PDF URL</option>
            </select>
            <input
              type="text"
              placeholder="Paste URL here..."
              className="glass-input col-span-2"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20">
              Connect Source
            </button>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            AI will automatically index content every 5 minutes.
          </p>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className="glass-card p-4 flex flex-col gap-3 group relative overflow-hidden">
            <div className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={() => onDelete(doc.id)}
                className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.type.includes('Sheet') ? 'bg-green-500/20 text-green-400' :
                doc.type.includes('Doc') ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                {doc.type.includes('Sheet') ? <FileSpreadsheet size={20} /> : <FileText size={20} />}
              </div>
              <div>
                <h5 className="font-semibold truncate pr-4">{doc.filename}</h5>
                <p className="text-xs text-gray-400">{doc.type}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
              <span>Added: {doc.added_date || 'Just now'}</span>
              <span className="text-blue-400 cursor-pointer hover:underline">Sync Now</span>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border border-white/5 rounded-xl border-dashed">
            <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No documents connected. Upload a PDF to start.</p>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [issues, setIssues] = React.useState([]);
  const [documents, setDocuments] = React.useState([]);
  const [chatMessages, setChatMessages] = React.useState([]);

  // Voice State
  const [voiceStatus, setVoiceStatus] = React.useState('idle'); // idle, listening, processing
  const [socket, setSocket] = React.useState(null);
  const [orbVolume, setOrbVolume] = React.useState(0);
  const [mediaRecorder, setMediaRecorder] = React.useState(null);
  // Audio removed from here, moving to VoiceOrb
  // const audioContextRef = React.useRef(null);
  // const audioQueueRef = React.useRef([]);
  // const isPlayingRef = React.useRef(false);
  // const nextStartTimeRef = React.useRef(0);

  // Real Data State
  const [pulseData, setPulseData] = React.useState(null);
  const [knowledgeStats, setKnowledgeStats] = React.useState({ count: 0, lastUpdated: 'Syncing...' });

  // Initialize Socket
  React.useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Audio Streaming Logic REMOVED from App.jsx - Moving to VoiceOrb.jsx as requested
    // Socket kept for Chat Text Updates

    newSocket.on('voice-volume', (data) => {
      setOrbVolume(data.volume);
    });

    newSocket.on('voice-response', (data) => {
      setVoiceStatus('idle');
      setOrbVolume(0);

      // Text fallback only handled if desired, but VoiceOrb handles stream audio.
      // Text fallback handled by VoiceOrb.jsx now.
      // if (!data.isAudio && data.text) {
      //   const speech = new SpeechSynthesisUtterance(data.text);
      //   window.speechSynthesis.speak(speech);
      // }

      // Add to chat
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        text: data.text || "Audio Response"
      }]);
    });

    return () => newSocket.close();
  }, []);

  // Fetch Data on Load
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Pulse
        const pulseRes = await fetch('http://localhost:3001/api/pulse');
        const pulseJson = await pulseRes.json();
        setPulseData(pulseJson);

        // Fetch Knowledge Stats
        const knowRes = await fetch('http://localhost:3001/api/knowledge');
        const knowJson = await knowRes.json();
        setKnowledgeStats(knowJson);

        // Fetch Issues
        const issuesRes = await fetch('http://localhost:3001/api/issues');
        const issuesJson = await issuesRes.json();
        setIssues(issuesJson);

        // Fetch Documents
        const docsRes = await fetch('http://localhost:3001/api/documents');
        const docsJson = await docsRes.json();
        setDocuments(docsJson);

        // Fetch Chat History
        const chatRes = await fetch('http://localhost:3001/api/chat');
        const chatJson = await chatRes.json();
        if (chatJson.length > 0) {
          setChatMessages(chatJson);
        } else {
          setChatMessages([{ id: Date.now(), role: 'ai', text: 'Hello, Architect. Connection to Central Intelligence established. How can I assist you?' }]);
        }

      } catch (err) {
        console.error("Failed to connect to Brain:", err);
      }
    };
    fetchData();
  }, []);

  const addIssue = async (title) => {
    try {
      const res = await fetch('http://localhost:3001/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const newIssue = await res.json();
      setIssues([...issues, newIssue]);
    } catch (err) {
      console.error("Error creating issue:", err);
    }
  };

  const addDocument = async (doc) => {
    try {
      const res = await fetch('http://localhost:3001/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      const newDoc = await res.json();
      setDocuments([...documents, newDoc]);
    } catch (err) {
      console.error("Error creating document:", err);
    }
  };

  const deleteDocument = async (id) => {
    try {
      await fetch(`http://localhost:3001/api/datasources/${id}`, {
        method: 'DELETE',
      });
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  const handleSendMessage = async (text) => {
    // 1. Add User Message
    const userMsg = { id: Date.now(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      // 2. Call Backend API
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      // 3. Add AI Response
      setChatMessages(prev => [...prev, data]);
    } catch (err) {
      console.error("Chat Error:", err);
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: "Error: Connection to Central Intelligence lost. Please check the server."
      }]);
    }
  };

  const toggleVoice = async () => {
    if (voiceStatus === 'listening') {
      // Stop Listings
      if (mediaRecorder) {
        mediaRecorder.onstop = () => {
          if (socket) socket.emit('voice-end');
        };
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
      setVoiceStatus('processing');
      return;
    }

    // Start Listening
    try {
      if (socket) socket.emit('start-voice-session'); // HANDSHAKE FIX
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          socket.emit('voice-audio', event.data);
        }
      };

      recorder.start(100); // 100ms chunks
      setVoiceStatus('listening');

      // Analyze volume locally for immediate feedback (simplified)
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      source.connect(analyzer);
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const updateVolume = () => {
        if (recorder.state === 'inactive') {
          audioContext.close();
          return;
        }
        analyzer.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((subject, a) => subject + a, 0) / dataArray.length;
        setOrbVolume(avg / 128); // Normalize somewhat
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

    } catch (err) {
      console.error("Microphone Error:", err);
      alert("Could not access microphone.");
    }
  };

  return (
    <div className="min-h-screen text-white pl-64">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Operational Intelligence</h2>
            <p className="text-gray-400 mt-1">Welcome back, Architect.</p>
          </div>
          <div className="flex gap-4">
            <button className="glass-card px-4 py-2 text-sm font-medium">
              Sync Data
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 col-span-2">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                The Pulse
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium text-green-300 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${pulseData?.status === 'Online' ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                    System Active: {pulseData?.version || 'Connecting...'}
                  </h4>
                  <p className="text-sm text-gray-300 mt-1">{pulseData?.details || 'Establishing link to local neural net...'}</p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-medium text-blue-300">Core Philosophy</h4>
                  <p className="text-sm text-gray-300 mt-1">"{pulseData?.philosophy || 'Loading knowledge architecture...'}"</p>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h4 className="font-medium text-purple-300">Immediate Priorities</h4>
                  <ul className="text-sm text-gray-300 mt-1 list-disc list-inside">
                    <li>Dashboard Quick Chat fix (Complete)</li>
                    <li>Stats card accuracy (Complete)</li>
                    <li>Backend Integration (Active)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-xl font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Issues</span>
                  <span className="text-2xl font-bold">{issues.length}</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min((issues.length / 10) * 100, 100)}%` }}
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-gray-400 text-sm">Knowledge Base</span>
                  <div className="mt-2 flex items-center gap-2 text-sm justify-between">
                    <div className="px-2 py-1 rounded bg-white/10">{knowledgeStats.count} Active Files</div>
                    <span className="text-xs text-gray-500">Updated: {knowledgeStats.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'chat' && <ChatInterface messages={chatMessages} onSendMessage={handleSendMessage} />}

        {activeTab === 'issues' && <IssueBoard issues={issues} addIssue={addIssue} />}

        {activeTab === 'connect' && <ConnectInterface documents={documents} addDocument={addDocument} onUploadSuccess={(doc) => setDocuments(prev => [doc, ...prev])} onDelete={deleteDocument} />}

        {activeTab === 'voice' && (
          <section className="glass-panel p-12 flex flex-col items-center justify-center text-center mt-6 transition-all duration-500 h-[600px]">

            <div className="mb-12 relative">
              <VoiceOrb socket={socket} isActive={voiceStatus === 'listening'} volume={orbVolume} />
            </div>

            <h3 className="text-4xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {voiceStatus === 'idle' && "Empire Voice"}
              {voiceStatus === 'listening' && "Listening..."}
              {voiceStatus === 'processing' && "Analyzing..."}
            </h3>

            <p className="text-gray-400 max-w-md mb-12 text-lg">
              {voiceStatus === 'idle' && "Tap the microphone to stream audio directly to the Gemini 3 Live API."}
              {voiceStatus === 'listening' && "Streaming audio packets..."}
              {voiceStatus === 'processing' && "Generating neural response..."}
            </p>

            <button
              onClick={toggleVoice}
              className={`rounded-full p-8 transition-all duration-300 shadow-xl ${voiceStatus === 'listening'
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
            >
              {voiceStatus === 'listening' ? <Square className="w-8 h-8" fill="currentColor" /> : <Mic className="w-8 h-8" />}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
