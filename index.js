require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { sequelize, ChatMessage, Issue, DataSource } = require('./models');
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');

// --- Configuration ---
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Paths for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}

// Socket.io Setup
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- SERVE FRONTEND FILES (The Fix for "Cannot GET /") ---
// This tells the server to look in the 'dist' folder for the Dashboard files
app.use(express.static(path.join(__dirname, 'dist')));

// --- API Routes ---
app.get('/api/pulse', (req, res) => res.json({ status: "Online", detail: "Empire Engine Active" }));

app.get('/api/issues', async (req, res) => {
    try {
        const issues = await Issue.findAll({ order: [['createdAt', 'DESC']] });
        res.json(issues);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        const result = await model.generateContent(message);
        const responseText = result.response.text();
        res.json({ role: 'ai', text: responseText });
    } catch (error) { res.json({ text: "AI Error: " + error.message }); }
});

// --- CATCH-ALL ROUTE ---
// If the user isn't hitting an API route, show them the React Dashboard
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Database & Server Start ---
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => {
        console.log(`Empire AI Dashboard live on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database Sync Failed:', err);
});
