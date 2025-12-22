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

// Configure Multer (Disk Storage)
const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fsSync.existsSync(uploadDir)) {
            fsSync.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using gemini-2.0-flash-exp for consistent access
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ],
    generationConfig: {
        // responseModalities: ["AUDIO"], // Disabled for stability. Using Frontend TTS.
        temperature: 0.7,
    }
});

// Diagnostic Start
(async () => {
    try {
        console.log("Attempting to connect to Gemini API with model: gemini-2.0-flash-exp");
        const result = await model.countTokens("Diagnostic test");
        console.log("Diagnostic Connection SUCCESS. Tokens counted:", result.totalTokens);
    } catch (error) {
        console.error("Diagnostic Connection FAILED.");
        console.error("Error Message:", error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
})();
// Diagnostic End

app.use(cors());
app.use(express.json());

// Paths
const KNOWLEDGE_DIR = path.join(__dirname, '../../knowledge');

// Helper: Read the main plan file
async function getProjectPlan() {
    try {
        const files = await fs.readdir(KNOWLEDGE_DIR);
        const planFile = files.find(f => f.includes('Empire_AI') || f.endsWith('.md'));
        if (!planFile) return null;

        const content = await fs.readFile(path.join(KNOWLEDGE_DIR, planFile), 'utf-8');
        return content;
    } catch (error) {
        console.error("Error reading updated plan:", error);
        return null;
    }
}

// Helper: Extract Issues using Gemini
async function extractIssuesFromText(text) {
    try {
        console.log("Starting Auto-Issue Extraction...");
        const result = await model.generateContent(`
            Analyze the following document text and extract specific actionable items.
            Focus on:
            1. Deadlines (e.g., "Final payment due by Jan 15")
            2. Risks (e.g., "Non-refundable after Dec 20")
            3. Tasks (e.g., "Check-in online 48 hours prior")

            Return ONLY a valid JSON array of objects with these fields:
            - title (string, summary of the item)
            - description (string, detailed context from text)
            - severity (string, one of: "High", "Medium", "Low")
            - status (string, always "Open")

            Do not wrap key names in quotes if not standard JSON. Return standard JSON.
            Text to analyze:
            ${text.substring(0, 15000)}
        `);

        const response = await result.response;
        let textResponse = response.text();

        // Clean markdown code blocks if present
        textResponse = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        const issues = JSON.parse(textResponse);

        if (Array.isArray(issues)) {
            console.log(`Extracted ${issues.length} issues. Saving to database...`);
            for (const issue of issues) {
                await Issue.create({
                    description: issue.title, // Map title to description (main field)
                    // We might need to store the detailed description somewhere, or append it?
                    // For now, let's append detail to description or just use title.
                    // Let's use title + " - " + description if description is short.
                    // Actually, the Issue model has 'description', 'priority', 'status', 'department', 'assignee'.
                    // We will map 'severity' to 'priority'.
                    priority: issue.severity === 'High' ? 'Critical' : (issue.severity === 'Medium' ? 'Normal' : 'Low'),
                    status: 'Open',
                    department: 'Auto-Extracted',
                    assignee: 'Unassigned'
                });
            }
        }

    } catch (error) {
        console.error("Auto-Issue Extraction Failed:", error);
    }
}

// Helper: Get AI Context
async function getContext() {
    try {
        const docs = await DataSource.findAll();
        console.log("Context Loaded: ", docs.length, "documents found.");
        let context = "LOGGED DATA SOURCES:\n";
        docs.forEach(doc => {
            if (doc.content) {
                console.log(`Loading doc: ${doc.name} (Length: ${doc.content.length}) snippet: ${doc.content.substring(0, 100)}...`);
                context += `\n--- SOURCE: ${doc.name} ---\n${doc.content.substring(0, 5000)}\n--- END SOURCE ---\n`;
            }
        });
        return context;
    } catch (err) {
        console.error("Error fetching context:", err);
        return "No documents available yet. Answer based on general knowledge.";
    }
}

// --- Socket.io for Real-time Voice ---
const audioBuffers = new Map();

io.on('connection', (socket) => {
    console.log('Voice Orb Client Connected:', socket.id);
    audioBuffers.set(socket.id, []);

    socket.on('voice-audio', (audioData) => {
        const buffer = audioBuffers.get(socket.id);
        if (buffer) {
            buffer.push(Buffer.from(audioData));
            // Simulate processing feedback
            socket.emit('voice-volume', { volume: Math.random() * 0.5 });
        }
    });

    socket.on('start-voice-session', () => {
        console.log("Starting new voice session for:", socket.id);
        audioBuffers.set(socket.id, []);
    });

    socket.on('voice-end', async () => {
        console.log("Processing audio for socket:", socket.id);
        const chunks = audioBuffers.get(socket.id) || [];
        if (chunks.length === 0) return;

        try {
            const audioBuffer = Buffer.concat(chunks);
            const audioBase64 = audioBuffer.toString('base64');
            const dbContext = await getContext();
            const systemInstruction = dbContext || "No documents uploaded yet. Tell the user you are ready for them to upload files.";

            console.log("Requesting TEXT response from Gemini 2.0 Flash Exp (Audio Input -> Text Output)");

            // Simple Generate Content call (Audio In -> Text Out)
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                inlineData: {
                                    mimeType: "audio/webm", // Assuming WebM from browser MediaRecorder
                                    data: audioBase64
                                }
                            },
                            {
                                text: `You are Puck, the Empire AI. Answer the user's audio question using only this context: 
                                ${systemInstruction}
                                
                                If the answer isn't in the documents, say you don't know.`
                            }
                        ]
                    }
                ]
            });

            const response = await result.response;
            const textResponse = response.text();

            console.log("Gemini Response Generated:", textResponse.substring(0, 100) + "...");

            socket.emit('voice-response', {
                text: textResponse,
                isAudio: false
            });

        } catch (error) {
            console.error("Gemini Processing Error:", error);

            // Helpful logging for debugging
            if (error.message.includes('400')) {
                console.error("Hint: 400 Error often means Audio Input format is not supported (try audio/mp3 vs audio/webm) OR Output Modality rejection.");
            }

            socket.emit('voice-response', {
                text: "I encountered an error analyzing your request. " + error.message,
                isAudio: false
            });
        } finally {
            audioBuffers.set(socket.id, []);
        }
    });

    socket.on('disconnect', () => {
        console.log('Voice Orb Client Disconnected:', socket.id);
        audioBuffers.delete(socket.id);
    });
});

// --- Endpoints ---

// GET /api/pulse
app.get('/api/pulse', async (req, res) => {
    try {
        const content = await getProjectPlan();
        if (!content) {
            return res.json({
                version: "Unknown",
                philosophy: "System Initialize...",
                status: "Offline"
            });
        }

        const versionMatch = content.match(/\*\*Version:\*\* (.*)/);
        const philosophyMatch = content.match(/Core Philosophy: (.*)/);

        res.json({
            version: versionMatch ? versionMatch[1].trim() : "v3.0",
            philosophy: philosophyMatch ? philosophyMatch[1].trim() : "Absorb Everything.",
            status: "Online",
            details: "Fully operational. Database connected."
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/knowledge
app.get('/api/knowledge', async (req, res) => {
    try {
        const files = await fs.readdir(KNOWLEDGE_DIR);
        const dbCount = await DataSource.count();
        res.json({
            count: files.length + dbCount,
            files: files,
            lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
    } catch (error) {
        res.json({ count: 0, files: [], error: "Knowledge base not found" });
    }
});

// GET /api/documents
app.get('/api/documents', async (req, res) => {
    try {
        const docs = await DataSource.findAll({ order: [['createdAt', 'DESC']] });
        const mappedDocs = docs.map(d => ({
            id: d.id,
            filename: d.name,
            type: d.type,
            content: d.url,
            url: d.url,
            added_date: d.createdAt ? d.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        res.json(mappedDocs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/documents
app.post('/api/documents', async (req, res) => {
    try {
        const { filename, type, url } = req.body;
        const newDoc = await DataSource.create({
            name: filename,
            type: type || 'Document',
            url: url
        });

        res.json({
            id: newDoc.id,
            filename: newDoc.name,
            type: newDoc.type,
            content: newDoc.url,
            added_date: newDoc.createdAt.toISOString().split('T')[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/issues
app.get('/api/issues', async (req, res) => {
    try {
        const issues = await Issue.findAll({ order: [['createdAt', 'DESC']] });
        const mappedIssues = issues.map(i => ({
            id: i.id,
            title: i.description,
            description: "No details",
            department: i.department,
            priority: i.priority,
            status: i.status,
            assignee: i.assignee,
            date: i.createdAt ? i.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        res.json(mappedIssues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/issues
app.post('/api/issues', async (req, res) => {
    try {
        const { title, priority = 'Normal', status = 'New', department = 'General' } = req.body;
        // Fix: Use 'description' as the 'title' equivalent to match the Model
        const newIssue = await Issue.create({
            description: title || req.body.description,
            priority,
            status,
            department: department,
            assignee: 'Unassigned'
        });

        res.json({
            id: newIssue.id,
            title: newIssue.description,
            status: newIssue.status,
            priority: newIssue.priority,
            date: newIssue.createdAt.toISOString().split('T')[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/upload
app.post('/api/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        let extractedText = "";

        const fsPromises = require('fs').promises;

        // Read file from disk
        const filePath = req.file.path;
        console.log("Processing upload:", filePath, "Type:", req.file.mimetype);

        if (req.file.mimetype === 'application/pdf') {
            try {
                const dataBuffer = await fsPromises.readFile(filePath);
                const data = await pdf(dataBuffer);
                extractedText = data.text;

                // Content Validation for scanned PDFs
                if (!extractedText || extractedText.trim().length < 50) {
                    console.warn(`[WARNING] PDF ${req.file.originalname} has very little text (${extractedText ? extractedText.length : 0} chars). It might be an image/scanned PDF.`);
                    if (!extractedText) extractedText = "[Error: No text extracted. File implies scanned image.]";
                } else {
                    console.log(`[SUCCESS] PDF Extracted ${extractedText.length} characters.`);
                }
            } catch (pdfError) {
                console.error("PDF Parsing failed:", pdfError);
                extractedText = `[Error: Parsing Failed - ${pdfError.message}]`;
            }
        } else {
            // Assume text/md/json
            try {
                extractedText = await fsPromises.readFile(filePath, 'utf-8');
            } catch (readError) {
                console.error("Text file read failed:", readError);
                extractedText = "";
            }
        }

        console.log("Extracted text length:", extractedText ? extractedText.length : 0);

        if (!extractedText || extractedText.trim().length === 0) {
            extractedText = "[Error: No readable text found or empty document]";
        }

        const newDoc = await DataSource.create({
            name: req.file.originalname,
            type: req.file.mimetype === 'application/pdf' ? 'PDF' : 'Document',
            url: filePath,
            content: extractedText
        });

        // Auto-Issue Extraction
        if (extractedText && extractedText.length > 50) {
            extractIssuesFromText(extractedText); // Async - don't await to keep response fast
        }

        res.json({
            id: newDoc.id,
            filename: newDoc.name,
            type: newDoc.type,
            content: newDoc.content ? "Extracted" : "Empty",
            added_date: newDoc.createdAt.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/datasources/:id
app.delete('/api/datasources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await DataSource.findByPk(id);

        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Delete physical file if it exists
        // doc.url contains the absolute path from the upload logic
        if (doc.url && fsSync.existsSync(doc.url)) {
            try {
                fsSync.unlinkSync(doc.url);
                console.log(`Deleted file: ${doc.url}`);
            } catch (err) {
                console.error(`Failed to delete file at ${doc.url}:`, err);
                // Continue to delete from DB even if file delete fails (orphaned file is better than phantom DB record)
            }
        }

        await doc.destroy();
        console.log(`Deleted DataSource ID: ${id}`);

        res.sendStatus(200);
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Re-ingest existing documents (Retroactive Fix)
app.post('/api/admin/reingest', async (req, res) => {
    try {
        const docs = await DataSource.findAll({ where: { type: 'PDF' } });
        let updatedCount = 0;
        let logs = [];

        console.log(`Starting Re-ingestion for ${docs.length} PDFs...`);

        const fsPromises = require('fs').promises;

        for (const doc of docs) {
            const filePath = doc.url;
            try {
                if (!fsSync.existsSync(filePath)) {
                    logs.push(`Skipped ${doc.name}: File not found at ${filePath}`);
                    continue;
                }

                const dataBuffer = await fsPromises.readFile(filePath);


                // Robust PDF Call - Reverting to standard call, handled by package downgrade if needed.
                let data;
                // Force require to ensure we have the fresh module
                const pdfLib = require('pdf-parse');

                if (typeof pdfLib === 'function') {
                    data = await pdfLib(dataBuffer);
                } else {
                    // Debugger for the weird version
                    console.log("PDF LIB TYPE:", typeof pdfLib);
                    console.log("PDF LIB KEYS:", Object.keys(pdfLib));
                    if (pdfLib.default) data = await pdfLib.default(dataBuffer);
                    else throw new Error("pdf-parse is not a function and has no default export.");
                }

                const extractedText = data.text;

                if (extractedText && extractedText.trim().length > 50) {
                    doc.content = extractedText;
                    await doc.save();
                    updatedCount++;
                    logs.push(`Fixed ${doc.name}: ${extractedText.length} chars.`);
                    console.log(`RE-INGEST SUCCESS: ${doc.name} - ${extractedText.substring(0, 100)}...`);
                } else {
                    logs.push(`Warning ${doc.name}: Extracted text empty or too short.`);
                }

            } catch (err) {
                logs.push(`Error ${doc.name}: ${err.message}`);
            }
        }

        res.json({
            message: `Re-ingestion complete. Updated ${updatedCount} documents.`,
            details: logs
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/voice/speech - ElevenLabs TTS
app.post('/api/voice/speech', async (req, res) => {
    const { text } = req.body;

    // console.log("TTS Request Received. Text length:", text ? text.length : 0);
    const apiKey = process.env.ELEVEN_LABS_API_KEY;

    if (!apiKey) {
        console.error("Missing ELEVEN_LABS_API_KEY");
        return res.status(500).json({ error: "Server missing Voice API Key" });
    }

    if (!text) {
        return res.status(400).json({ error: "No text provided" });
    }

    const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam (Professional Male)
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    try {
        const response = await axios({
            method: 'post',
            url: url,
            data: {
                text: text,
                model_id: "eleven_monolingual_v1", // Low latency
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            },
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        res.set('Content-Type', 'audio/mpeg');
        response.data.pipe(res);

    } catch (error) {
        let errorMsg = error.message;

        if (error.response) {
            console.error("ElevenLabs API Error Status:", error.response.status);
            console.error("ElevenLabs API Error Headers:", error.response.headers);

            // If data is a stream (which it is due to check), read it to see the error message
            if (error.response.data && typeof error.response.data.on === 'function') {
                error.response.data.on('data', chunk => {
                    console.error("ElevenLabs API Error Body Chunk:", chunk.toString());
                });
            } else {
                console.error("ElevenLabs API Error Body:", error.response.data);
            }
        } else {
            console.error("ElevenLabs API Error:", errorMsg);
        }

        res.status(500).json({ error: "Voice synthesis failed" });
    }
});

// GET /api/chat
app.get('/api/chat', async (req, res) => {
    try {
        const messages = await ChatMessage.findAll({ order: [['timestamp', 'ASC']] });
        const mappedMessages = messages.map(m => ({
            id: m.id,
            role: m.role,
            text: m.content,
            timestamp: m.timestamp
        }));
        res.json(mappedMessages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    try {
        await ChatMessage.create({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        const dbContext = await getContext();

        const result = await model.generateContent(`
            You are Puck, the Empire AI. You have access to the following project documents:
            ${dbContext}
            
            Answer the user's question using only this data. If the answer isn't in the documents, say you don't know.
            
            User: ${message}
        `);
        const response = await result.response;
        const responseText = response.text();

        const aiMsg = await ChatMessage.create({
            role: 'ai',
            content: responseText,
            timestamp: new Date()
        });

        res.json({
            id: aiMsg.id,
            role: 'ai',
            text: responseText
        });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.json({
            id: Date.now(),
            role: 'ai',
            text: "Connection to Central Intelligence failed. " + (error.message.includes('404') ? "Model not found." : error.message)
        });
    }
});

// Start Server
sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, async () => {
        console.log("Backend Brain active on http://localhost:3001");
        console.log(`Monitoring Knowledge Dir: ${KNOWLEDGE_DIR}`);
        console.log('Database synced successfully.');

        // Database Verification
        try {
            const emptyDocs = await DataSource.findAll({ where: { content: "" } });
            if (emptyDocs.length > 0) {
                console.warn(`WARNING: ${emptyDocs.length} documents have empty content. Please re-upload them.`);
                emptyDocs.forEach(d => console.warn(` - ${d.name}`));
            }
        } catch (dbErr) {
            console.error("Startup DB Check failed:", dbErr);
        }
    });
}).catch(err => {
    console.error('Checking database connection failed:', err);
});
