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

// Configure Paths (Flattened for your GitHub structure)
const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// CRITICAL FIX: Heroku Port
const PORT = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

app.use(cors());
app.use(express.json());

// --- Simple API Routes ---
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

// Database Sync & Start
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
}).catch(err => console.error('DB Sync Fail:', err));
