import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sequelize, ChatMessage, Issue, DataSource } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io for Voice/Real-time
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// AI Setup with "Empire Identity"
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: "You are the Empire AI Dashboard, the operational intelligence core for Empire Remodeling. You are a Senior Full-Stack AI Thought Partner. Your role is to assist the Project Owner with business data, project management, and strategic insights. Be professional, direct, and helpful. You have a persistent memory via a connected database."
});

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));

// --- API ROUTES ---

// The Pulse
app.get('/api/pulse', (req, res) => res.json({ 
    status: "Online", 
    version: "1.2.0-Live", 
    philosophy: "Intelligence through persistence.",
    details: "Neural engine connected and database sync active."
}));

// Fetch Chat History (Fixes "Invalid Date")
app.get('/api/chat', async (req, res) => {
    try {
        const history = await ChatMessage.findAll({ limit: 50, order: [['createdAt', 'ASC']] });
        res.json(history.map(h => ({
            id: h.id || Date.now(),
            role: h.role,
            text: h.content,
            date: h.createdAt // Passing the actual timestamp
        })));
    } catch (e) { res.json([]); }
});

// Chat Posting & Storage
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // 1. Save User Message to Database
        await ChatMessage.create({ role: 'user', content: message });

        // 2. Get AI Response from Gemini
        const result = await model.generateContent(message);
        const aiResponse = result.response.text();

        // 3. Save AI Response to Database
        const savedAI = await ChatMessage.create({ role: 'ai', content: aiResponse });

        res.json({ 
            id: savedAI.id, 
            role: 'ai', 
            text: aiResponse,
            date: savedAI.createdAt 
        });
    } catch (e) {
        res.status(500).json({ text: "AI Error: " + e.message });
    }
});

// Issues & Data Source Placeholders
app.get('/api/issues', async (req, res) => res.json(await Issue.findAll()));
app.post('/api/issues', async (req, res) => res.json(await Issue.create(req.body)));
app.get('/api/documents', async (req, res) => res.json(await DataSource.findAll()));

// The Express 5 "Splat" Route (Crucial for Heroku)
app.get('/{*splat}', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Empire AI: Build files not found.");
    }
});

// Database Handshake & Server Start
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => console.log(`Empire AI Engine Running on ${PORT}`));
});
