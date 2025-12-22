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

// Configure Paths (Cloud-Friendly)
const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge'); // Adjusted for Heroku structure
const uploadDir = path.join(__dirname, 'uploads');

// Ensure directories exist immediately on startup
[KNOWLEDGE_DIR, uploadDir].forEach(dir => {
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const app = express();
const server = http.createServer(app);

// Allow any origin in production to prevent Socket.io disconnects
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Use Heroku's dynamic port, or 3001 for local testing
const PORT = process.env.PORT || 3001;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
        temperature: 0.7,
    }
});

// Diagnostic Start
(async () => {
    try {
        console.log("Checking Gemini API connection...");
        const result = await model.countTokens("Diagnostic test");
        console.log("Gemini status: ACTIVE. Tokens counted:", result.totalTokens);
    } catch (error) {
        console.error("Gemini status: FAILED. Check your API Key in Heroku Config Vars.");
    }
})();

app.use(cors());
app.use(express.json());

// --- Helper Functions ---

async function getProjectPlan() {
    try {
        const files = await fs.readdir(KNOWLEDGE_DIR);
        const planFile = files.find(f => f.includes('Empire_AI') || f.endsWith('.md'));
        if (!planFile) return null;
        return await fs.readFile(path.join(KNOWLEDGE_DIR, planFile), 'utf-8');
    } catch (error) {
        return null;
    }
}

async function extractIssuesFromText(text) {
    try {
        const result = await model.generateContent(`
            Analyze this text and extract actionable items (Deadlines, Risks, Tasks).
            Return ONLY a valid JSON array of objects with: title, description, severity, status.
            Text: ${text.substring(0, 15000)}
        `);

        const response = await result.response;
        let textResponse = response.text().replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const issues = JSON.parse(textResponse);

        if (Array.isArray(issues)) {
            for (const issue of issues) {
                await Issue.create({
                    description: issue.title,
                    priority: issue.severity === 'High' ? 'Critical' : (issue.severity === 'Medium' ? 'Normal' : 'Low'),
                    status: 'Open',
                    department: 'Auto-Extracted',
                    assignee: 'Unassigned'
                });
            }
        }
    } catch (error) {
        console.error("Auto-Issue Extraction Failed:", error.message);
    }
}

async function getContext() {
    try {
        const docs = await DataSource.findAll();
        let context = "LOGGED DATA SOURCES:\n";
        docs.forEach(doc => {
            if (doc.content) {
                context += `\n--- SOURCE: ${doc.name} ---\n${doc.content.substring(0, 5000)}\n--- END SOURCE ---\n`;
            }
        });
        return context;
    } catch (err) {
        return "No documents available.";
    }
}

// --- Socket.io ---
const audioBuffers = new Map();

io.on('connection', (socket) => {
    console.log('Orb Active:', socket.id);
    audioBuffers.set(socket.id, []);

    socket.on('voice-audio', (audioData) => {
        const buffer = audioBuffers.get(socket.id);
        if (buffer) buffer.push(Buffer.from(audioData));
    });

    socket.on('voice-end', async () => {
        const chunks = audioBuffers.get(socket.id) || [];
        if (chunks.length === 0) return;

        try {
            const audioBuffer = Buffer.concat(chunks);
            const audioBase64 = audioBuffer.toString('base64');
            const dbContext = await getContext();

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
                        { text: `You are Puck. Answer using this context: ${dbContext}` }
                    ]
                }]
            });

            const textResponse = (await result.response).text();
            socket.emit('voice-response', { text: textResponse, isAudio: false });

        } catch (error) {
            socket.emit('voice-response', { text: "Voice error: " + error.message });
        } finally {
            audioBuffers.set(socket.id, []);
        }
    });

    socket.on('disconnect', () => audioBuffers.delete(socket.id));
});

// --- API Routes ---

app.get('/api/pulse', async (req, res) => {
    const content = await getProjectPlan();
    res.json({
        version: "3.0-Production",
        status: "Online",
        details: content ? "Plan Loaded" : "System Ready, Plan Missing"
    });
});

app.get('/api/documents', async (req, res) => {
    const docs = await DataSource.findAll({ order: [['createdAt', 'DESC']] });
    res.json(docs.map(d => ({ id: d.id, filename: d.name, type: d.type, added_date: d.createdAt })));
});

app.post('/api/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        
        let extractedText = "";
        const dataBuffer = await fs.readFile(req.file.path);

        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(dataBuffer);
            extractedText = data.text;
        } else {
            extractedText = dataBuffer.toString('utf-8');
        }

        const newDoc = await DataSource.create({
            name: req.file.originalname,
            type: req.file.mimetype.includes('pdf') ? 'PDF' : 'Document',
            url: req.file.path,
            content: extractedText
        });

        extractIssuesFromText(extractedText);
        res.json(newDoc);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/issues', async (req, res) => {
    const issues = await Issue.findAll({ order: [['createdAt', 'DESC']] });
    res.json(issues);
});

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        await ChatMessage.create({ role: 'user', content: message });
        const dbContext = await getContext();
        const result = await model.generateContent(`Context: ${dbContext}\nUser: ${message}`);
        const responseText = (await result.response).text();
        const aiMsg = await ChatMessage.create({ role: 'ai', content: responseText });
        res.json({ role: 'ai', text: responseText });
    } catch (error) {
        res.json({ role: 'ai', text: "Gemini error: " + error.message });
    }
});

// Database Sync & Server Start
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => {
        console.log(`Empire Engine listening on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database sync failed. Check your DATABASE_URL in Heroku.', err);
});
