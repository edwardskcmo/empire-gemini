import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // Required for ElevenLabs calls

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.io Setup with CORS for Local & Production
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// --- GEMINI AI SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- ELEVENLABS VOICE ENDPOINT ---
app.post('/api/voice/speech', async (req, res) => {
    const { text } = req.body;
    const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
    const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVEN_LABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) {
            throw new Error('ElevenLabs API returned an error');
        }

        const audioBuffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("Voice Error:", error);
        res.status(500).json({ error: "Failed to generate speech" });
    }
});

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
    console.log('Client connected to Empire AI');

    socket.on('start-voice-session', () => {
        console.log('Voice session requested');
    });

    // Handle incoming chat/voice text
    socket.on('chat-message', async (message) => {
        try {
            const chat = model.startChat({ history: [] });
            const result = await chat.sendMessage(message);
            const responseText = result.response.text();

            // Send back the text for the chat window
            socket.emit('chat-response', { text: responseText });

            // Trigger the VoiceOrb to speak
            socket.emit('voice-response', { text: responseText });

        } catch (error) {
            console.error("AI Error:", error);
            socket.emit('chat-response', { error: "Brain connection lost." });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// --- DEPLOYMENT ROUTING ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Empire AI Server running on port ${PORT}`);
});
