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
    systemInstruction: "You are the Empire AI Dashboard, an operational intelligence tool for Empire Remodeling. You are a Senior Full-Stack AI Developer and Thought Partner. Your goal is to help the Project Owner manage documents, issues, and business intelligence. Be concise, professional, and insightful."
});

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));

// API Routes
app.get('/api/pulse', (req, res) => res.json({ status: "Online", version: "1.2.0-Live", philosophy: "Intelligence through persistence." }));

// Get Chat History from Database
app.get('/api/chat', async (req, res) => {
    try {
        const history = await ChatMessage.findAll({ limit: 50, order: [['createdAt', 'ASC']] });
        res.json(history.map(h => ({
            id: h.id,
            role: h.role,
            text: h.content,
            createdAt: h.createdAt 
        })));
    } catch (e) { res.json([]); }
});

// Send New Chat Message
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Save User Message to DB
        await ChatMessage.create({ role: 'user', content: message });

        // Get AI Response
        const result = await model.generateContent(message);
        const aiResponse = result.response.text();

        // Save AI Response to DB
        const savedAI = await ChatMessage.create({ role: 'ai', content: aiResponse });

        res.json({ 
            id: savedAI.id, 
            role: 'ai', 
            text: aiResponse,
            createdAt: savedAI.createdAt 
        });
    } catch (e) {
        res.status(500).json({ text: "AI Error: " + e.message });
    }
});

// Other API Placeholders
app.get('/api/issues', async (req, res) => res.json(await Issue.findAll()));
app.post('/api/issues', async (req, res) => res.json(await Issue.create(req.body)));
app.get('/api/documents', async (req, res) => res.json(await DataSource.findAll()));

// The Express 5 "Splat" Route
app.get('/{*splat}', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Empire AI: Build files not found.");
    }
});

// Database Sync & Start
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => console.log(`Empire AI Engine Running on ${PORT}`));
});
