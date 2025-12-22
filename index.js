require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fsSync = require('fs');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { sequelize, ChatMessage, Issue, DataSource } = require('./models');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Setup Socket.io
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

app.use(cors());
app.use(express.json());

// --- FRONTEND SERVING LOGIC ---
// We check for 'dist' first (standard Vite), then 'public' as a backup
const frontendPath = fsSync.existsSync(path.join(__dirname, 'dist')) 
    ? path.join(__dirname, 'dist') 
    : __dirname;

app.use(express.static(frontendPath));

// --- API ROUTES ---
app.get('/api/pulse', (req, res) => res.json({ status: "Online" }));

app.post('/api/chat', async (req, res) => {
    try {
        const result = await model.generateContent(req.body.message);
        res.json({ role: 'ai', text: result.response.text() });
    } catch (e) { res.json({ text: "AI Error: " + e.message }); }
});

// --- THE "CATCH-ALL" ---
// This ensures that hitting the URL always serves your index.html
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Empire AI: index.html not found. Check your build scripts.");
    }
});

sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => console.log(`Empire AI Live on ${PORT}`));
});
