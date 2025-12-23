import React, { useEffect, useState, useRef } from 'react';

// Smart Path Logic: Determines if we are on Heroku or Localhost
const getApiBaseUrl = () => {
    return window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : window.location.origin;
};

const VoiceOrb = ({ socket, isActive, volume = 0 }) => {
    const [phase, setPhase] = useState(0);
    const [localProcessing, setLocalProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Socket Event Listeners for Status & Speech
    useEffect(() => {
        if (!socket) return;

        const handleVoiceResponse = (data) => {
            setLocalProcessing(false);
            if (data.text) {
                speakText(data.text);
            }
            if (data.error) {
                setHasError(true);
            }
        };

        const handleAudioChunk = (data) => {
            setLocalProcessing(false);
        };

        socket.on('voice-response', handleVoiceResponse);
        socket.on('audio-chunk', handleAudioChunk);

        return () => {
            socket.off('voice-response', handleVoiceResponse);
            socket.off('audio-chunk', handleAudioChunk);
        };
    }, [socket]);

    const prevActiveRef = useRef(isActive);
    useEffect(() => {
        if (prevActiveRef.current && !isActive) {
            setLocalProcessing(true);
            setHasError(false);
        }
        prevActiveRef.current = isActive;
    }, [isActive]);

    const currentAudioRef = useRef(null);

    // Updated Speak function using the Smart Path
    const speakText = async (text) => {
        if (!text) return;

        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        try {
            setLocalProcessing(true); 

            // SMART PATH APPLIED HERE
            const baseUrl = getApiBaseUrl();
            const response = await fetch(`${baseUrl}/api/voice/speech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("TTS Error:", err);
                throw new Error(err.error || "TTS Failed");
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            currentAudioRef.current = audio;

            audio.onplay = () => {
                setLocalProcessing(false);
                setIsSpeaking(true);
            };

            audio.onended = () => {
                setIsSpeaking(false);
                currentAudioRef.current = null;
            };

            audio.onerror = (e) => {
                console.error("Audio Playback Error", e);
                setHasError(true);
                setIsSpeaking(false);
                setLocalProcessing(false);
            };

            await audio.play();

        } catch (error) {
            console.error("Speech Generation failed:", error);
            setHasError(true);
            setLocalProcessing(false);
        }
    };

    // Animation Loop
    useEffect(() => {
        const fast = isActive || isSpeaking || localProcessing;
        const interval = setInterval(() => {
            setPhase(p => (p + (fast ? 0.2 : 0.05)) % (2 * Math.PI));
        }, 16);
        return () => clearInterval(interval);
    }, [isActive, isSpeaking, localProcessing]);

    const currentScale = (isActive || isSpeaking)
        ? 1 + Math.min(volume + 0.2, 1) * 0.5
        : (localProcessing ? 1.2 : 1 + Math.sin(phase) * 0.05);

    let baseColor = '#4169E1'; 
    let glowColor = 'rgba(100, 149, 237, 0.4)';

    if (hasError) {
        baseColor = '#FF0000';
        glowColor = 'rgba(255, 0, 0, 0.8)';
    } else if (isActive) {
        baseColor = '#00FFFF'; 
        glowColor = 'rgba(64, 224, 208, 0.8)';
    } else if (localProcessing) {
        baseColor = '#FFD700'; 
        glowColor = 'rgba(255, 215, 0, 0.6)';
    } else if (isSpeaking) {
        baseColor = '#00FF7F'; 
        glowColor = 'rgba(0, 255, 127, 0.6)';
    }

    return (
        <div
            onClick={() => {
                if (socket) {
                    socket.emit('start-voice-session');
                    if (currentAudioRef.current) {
                        currentAudioRef.current.pause();
                        currentAudioRef.current = null;
                        setIsSpeaking(false);
                    }
                }
            }}
            style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
            }}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                transform: `scale(${currentScale * 1.5})`,
                transition: 'transform 0.1s ease-out, background 0.3s ease',
                filter: 'blur(15px)',
                opacity: 0.6
            }} />

            <div style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `conic-gradient(from 0deg, ${baseColor}, white, ${baseColor})`,
                transform: `scale(${currentScale}) rotate(${phase * 50}deg)`,
                boxShadow: `0 0 30px ${glowColor}, inset 0 0 10px white`,
                transition: 'transform 0.1s ease-out, background 0.3s ease, box-shadow 0.3s ease',
                zIndex: 2
            }} />

            {(isActive || isSpeaking || localProcessing) && !hasError && (
                <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `2px solid ${baseColor}`,
                    animation: 'orb-ripple 1.5s infinite ease-out',
                    opacity: 0
                }} />
            )}

            <div style={{
                position: 'absolute',
                bottom: '-40px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                {isActive ? "Listening" :
                    localProcessing ? "Processing" :
                        isSpeaking ? "Speaking" :
                            hasError ? "Error" : "Ready"}
            </div>

            <style>{`
                @keyframes orb-ripple {
                  0% { transform: scale(0.5); opacity: 0.8; }
                  100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default VoiceOrb;
