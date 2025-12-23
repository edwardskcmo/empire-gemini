import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// --- BRAIN: GEMINI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- VOICE: ELEVENLABS ENDPOINT ---
app.post('/api/voice/speech', async (req, res) => {
    try {
        const { text } = req.body;
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) throw new Error('ElevenLabs Error');
        const audioBuffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));
    } catch (error) {
        console.error("Voice Error:", error);
        res.status(500).send("Voice Failed");
    }
});

// --- INTERACTION: SOCKET LOGIC ---
io.on('connection', (socket) => {
    socket.on('chat-message', async (message) => {
        try {
            const chat = model.startChat({ history: [] });
            const result = await chat.sendMessage(message);
            const responseText = result.response.text();
            socket.emit('chat-response', { text: responseText });
            socket.emit('voice-response', { text: responseText });
        } catch (err) {
            socket.emit('chat-response', { text: "Brain Error." });
        }
    });
});

// --- DEPLOYMENT: PATH FIX ---
// This looks for the 'dist' folder created by Vite
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Empire AI active on port ${PORT}`);
});
