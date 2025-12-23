import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { sequelize, ChatMessage, Issue, DataSource } from './models/index.js';

// Modern path handling for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, 'dist');
app.use(express.static(frontendPath));

app.get('/api/pulse', (req, res) => res.json({ status: "Online" }));

app.post('/api/chat', async (req, res) => {
    try {
        const result = await model.generateContent(req.body.message);
        res.json({ role: 'ai', text: result.response.text() });
    } catch (e) { res.json({ text: "AI Error: " + e.message }); }
});

app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Empire AI: Build files not found yet. Please wait for Heroku build to finish.");
    }
});

sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => console.log(`Empire AI Engine Running on ${PORT}`));
});
