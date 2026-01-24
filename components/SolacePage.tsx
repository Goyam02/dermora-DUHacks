import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import BottomNav from './BottomNav';
import { getVoicePrompt, VoicePromptData } from '../services/api';
import { getGeminiStream } from '../services/gemini';

const SolacePage: React.FC = () => {
    const [promptData, setPromptData] = useState<VoicePromptData | null>(null);
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [visualTranscript, setVisualTranscript] = useState('');
    const [debugMsg, setDebugMsg] = useState('Init...');

    // Refs
    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const utteranceQueueRef = useRef<string[]>([]);
    const isSpeakingRef = useRef(false);

    // Initial Setup
    useEffect(() => {
        const fetchPrompt = async () => {
            setDebugMsg('Fetching Prompt...');
            try {
                const data = await getVoicePrompt("b6c7b2b1-87e2-4e0d-9c63-3b8a47a0c7fa");
                setPromptData(data);
                setDebugMsg('Ready. Tap to start.');
            } catch (e) {
                console.error(e);
                setDebugMsg('Prompt Fetch Error');
            }
        };
        fetchPrompt();

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setStatus('listening');
                setVisualTranscript('');
                setDebugMsg('Mic Active');
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (interimTranscript) setVisualTranscript(interimTranscript);
                if (finalTranscript) {
                    setVisualTranscript(finalTranscript);
                    setDebugMsg(`Heard: ${finalTranscript}`);
                    handleUserInput(finalTranscript);
                }
            };

            recognition.onerror = (e: any) => {
                setStatus('idle');
                setDebugMsg(`Mic Error: ${e.error}`);
            };
            recognitionRef.current = recognition;
        } else {
            setDebugMsg("Browser Speech NOT supported");
        }

        return () => {
            recognitionRef.current?.abort();
            synthesisRef.current.cancel();
        };
    }, []);

    // Canvas Visualizer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let phase = 0;

        const render = () => {
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerY = canvas.height / 2;
            let amplitude = 10;
            let speed = 0.05;
            let color = 'rgba(142, 167, 233, 0.5)';

            if (status === 'listening') {
                amplitude = 20;
                speed = 0.1;
                color = 'rgba(255, 182, 193, 0.6)';
            } else if (status === 'speaking') {
                amplitude = 40;
                speed = 0.15;
                color = 'rgba(142, 167, 233, 0.7)';
            } else if (status === 'processing') {
                amplitude = 15;
                speed = 0.25;
                color = 'rgba(255, 255, 255, 0.6)';
            }

            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                for (let x = 0; x < canvas.width; x++) {
                    const effectivePhase = phase + (i * 1.5);
                    const y = centerY + Math.sin(x * 0.02 + effectivePhase) * amplitude * Math.sin(phase * 0.5 + x * 0.005);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            phase += speed;
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [status]);


    // MAIN LOGIC
    const handleUserInput = async (text: string) => {
        setStatus('processing');
        recognitionRef.current?.stop();

        utteranceQueueRef.current = [];
        synthesisRef.current.cancel();
        isSpeakingRef.current = false;

        setDebugMsg('Gemini Streaming...');

        const systemPrompt = promptData
            ? `You are Solace. Context: ${promptData.system_prompt}. Reply briefly under 2 sentences.`
            : "You are Solace. Be kind, calm, and conversational.";

        try {
            const stream = getGeminiStream(text, systemPrompt);
            let buffer = "";
            let chunkCount = 0;

            for await (const chunk of stream) {
                buffer += chunk;
                chunkCount++;
                const sentences = buffer.match(/[^.!?]+[.!?]+/g);
                if (sentences) {
                    for (const sentence of sentences) {
                        queueSentence(sentence);
                        buffer = buffer.substring(sentence.length);
                    }
                }
            }
            if (buffer.trim()) queueSentence(buffer);

            if (chunkCount === 0) setDebugMsg('Gemini returned NO data');

        } catch (e: any) {
            console.error(e);
            setDebugMsg(`Gemini Error: ${e.message}`);
            setStatus('idle');
        }
    };

    const queueSentence = (text: string) => {
        setDebugMsg(`Queuing: ${text.substring(0, 20)}...`);
        utteranceQueueRef.current.push(text);
        processQueue();
    };

    const processQueue = () => {
        if (synthesisRef.current.speaking || isSpeakingRef.current) return;

        const nextText = utteranceQueueRef.current.shift();
        if (!nextText) {
            setStatus('idle');
            setDebugMsg('Done speaking.');
            return;
        }

        isSpeakingRef.current = true;
        setStatus('speaking');
        setDebugMsg(`Speaking: ${nextText.substring(0, 15)}...`);

        const utterance = new SpeechSynthesisUtterance(nextText);
        utterance.rate = 1.0;

        // Force voice selection
        const voices = synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            isSpeakingRef.current = false;
            processQueue();
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setDebugMsg("TTS Error");
            isSpeakingRef.current = false;
            processQueue();
        };

        synthesisRef.current.speak(utterance);
    };

    const toggleSession = () => {
        if (status === 'listening') {
            recognitionRef.current?.stop();
            setStatus('idle');
        } else if (status === 'speaking' || status === 'processing') {
            synthesisRef.current.cancel();
            utteranceQueueRef.current = [];
            isSpeakingRef.current = false;
            setStatus('idle');
        } else {
            // Check voices
            if (synthesisRef.current.getVoices().length === 0) {
                window.speechSynthesis.getVoices();
                setDebugMsg('Loading Voices...');
            }
            recognitionRef.current?.start();
        }
    };

    // MANUAL TEST BUTTON
    const manualTest = () => {
        queueSentence("Hello. This is a test of the voice system.");
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#FFF0F0] via-[#FDF5E6] to-[#F8F9FF] font-sans pb-24 relative overflow-hidden flex flex-col items-center justify-center">

            {/* DEBUG OVERLAY - REMOVE LATER */}
            <div className="absolute top-4 left-4 bg-black/80 text-green-400 p-2 text-xs rounded z-50 font-mono max-w-[200px]">
                <p>Status: {status}</p>
                <p>Debug: {debugMsg}</p>
                <button onClick={manualTest} className="mt-2 bg-gray-700 px-2 py-1 rounded text-white">Test Voice Output</button>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center h-full space-y-8 cursor-pointer" onClick={toggleSession}>
                <div className="w-full h-64 flex items-center justify-center pointer-events-none">
                    <canvas ref={canvasRef} width={400} height={256} className="w-full max-w-md h-full object-contain" />
                </div>

                <div className="h-12 flex items-center justify-center px-8 text-center">
                    <motion.p
                        className="text-gray-500 font-medium text-lg leading-relaxed font-display"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }} // Always visible for debugging now
                    >
                        {status === 'listening' ? (visualTranscript || "Listening...") : status === 'processing' ? "Thinking..." : status === 'speaking' ? "Speaking..." : "Tap to Speak"}
                    </motion.p>
                </div>

                <motion.h1
                    className="font-display text-sm font-medium text-gray-400 tracking-[0.3em] uppercase opacity-60 absolute bottom-32"
                >
                    Solace
                </motion.h1>
            </div>

            <BottomNav />
        </div>
    );
};

export default SolacePage;
