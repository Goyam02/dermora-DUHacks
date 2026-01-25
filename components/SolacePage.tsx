import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth, useUser } from '@clerk/clerk-react';
import BottomNav from './BottomNav';
import { getVoicePrompt, uploadVoiceForMoodAnalysis, VoicePromptData } from '../services/api';
import { connectToSolaceLive } from '../services/gemini';
import { RefreshCw } from 'lucide-react';

type SessionStatus = 'idle' | 'loading' | 'connected' | 'speaking' | 'processing';

const SolacePage: React.FC = () => {
    // Clerk auth hooks
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();
    const [backendUserId, setBackendUserId] = useState<string | null>(null);
    const syncedRef = useRef(false);

    // State
    const [promptData, setPromptData] = useState<VoicePromptData | null>(null);
    const [status, setStatus] = useState<SessionStatus>('idle');
    const [transcript, setTranscript] = useState('');
    const [debugMsg, setDebugMsg] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);

    // Refs
    const sessionRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);

    // Sync user and get backend UUID
    useEffect(() => {
        if (!isSignedIn || !user || syncedRef.current) return;

        const syncUser = async () => {
            try {
                const token = await getToken();
                const response = await fetch("http://localhost:8000/auth/sync-user", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                const data = await response.json();
                console.log("✅ Backend sync success:", data);
                
                if (data.uuid) {
                    setBackendUserId(data.uuid);
                    console.log("📝 Stored backend UUID:", data.uuid);
                }
                
                syncedRef.current = true;
            } catch (err) {
                console.error("User sync failed:", err);
            }
        };

        syncUser();
    }, [isSignedIn, user, getToken]);

    // Fetch mood-aware prompt when backendUserId is available
    useEffect(() => {
        if (!backendUserId) return;

        const fetchPrompt = async () => {
            setDebugMsg('Fetching mood-aware prompt...');
            try {
                const token = await getToken();
                const data = await getVoicePrompt(token, backendUserId);
                setPromptData(data);
                setDebugMsg(`Ready. Mood: ${data.mood_category} (${data.mood_score.toFixed(0)}/100)`);
            } catch (e: any) {
                console.error('Prompt fetch error:', e);
                setError('Failed to load voice agent');
                setDebugMsg('Prompt fetch failed');
            }
        };
        fetchPrompt();
    }, [backendUserId, getToken]);

    // Audio playback queue
    const playAudio = async (ctx: AudioContext, buffer: AudioBuffer) => {
        audioQueueRef.current.push(buffer);
        if (!isPlayingRef.current) {
            processAudioQueue(ctx);
        }
    };

    const processAudioQueue = async (ctx: AudioContext) => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setStatus('connected');
            return;
        }

        isPlayingRef.current = true;
        setStatus('speaking');

        const buffer = audioQueueRef.current.shift()!;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        source.onended = () => {
            processAudioQueue(ctx);
        };

        source.start();
    };

    // Canvas visualizer
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
            let color = 'rgba(142, 167, 233, 0.4)';

            if (status === 'connected') {
                amplitude = 15;
                speed = 0.08;
                color = 'rgba(142, 167, 233, 0.6)';
            } else if (status === 'speaking') {
                amplitude = 35;
                speed = 0.15;
                color = 'rgba(255, 182, 193, 0.7)';
            } else if (status === 'processing') {
                amplitude = 20;
                speed = 0.2;
                color = 'rgba(255, 255, 255, 0.5)';
            }

            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                for (let x = 0; x < canvas.width; x++) {
                    const effectivePhase = phase + (i * 1.5);
                    const y = centerY + Math.sin(x * 0.02 + effectivePhase) * amplitude * Math.sin(phase * 0.5 + x * 0.005);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            phase += speed;
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [status]);

    // Start voice session
    const startSession = async () => {
        if (!promptData) {
            setError('Prompt not loaded yet');
            return;
        }

        setStatus('loading');
        setDebugMsg('Connecting to Solace...');
        setError(null);

        try {
            const session = await connectToSolaceLive(
                promptData.system_prompt,

                // On audio received
                (buffer: AudioBuffer) => {
                    const ctx = session.getOutputContext();
                    playAudio(ctx, buffer);
                },

                // On transcript
                (text: string, role: 'user' | 'model', isTurnComplete: boolean) => {
                    if (text) {
                        setTranscript(text);
                        if (role === 'user') {
                            setStatus('processing');
                        }
                    }
                    if (isTurnComplete) {
                        setTranscript('');
                    }
                },

                // On close
                () => {
                    setStatus('idle');
                    setDebugMsg('Session ended');
                },

                // On error
                (errorMsg: string) => {
                    setError(errorMsg);
                    setStatus('idle');
                    setDebugMsg(`Error: ${errorMsg}`);
                }
            );

            sessionRef.current = session;
            setStatus('connected');
            setDebugMsg('Connected! Speak freely...');

        } catch (e: any) {
            console.error('Session start error:', e);
            setError('Failed to start session');
            setStatus('idle');
            setDebugMsg('Connection failed');
        }
    };

    // End voice session and analyze mood
    const endSession = async () => {
        if (!sessionRef.current || !backendUserId) return;

        setStatus('loading');
        setDebugMsg('Ending session and analyzing mood...');

        try {
            // Get recorded audio
            const audioBlob = await sessionRef.current.getRecordedAudio();

            // Disconnect session
            await sessionRef.current.disconnect();
            sessionRef.current = null;

            // Upload for mood analysis
            setDebugMsg('Uploading conversation for mood analysis...');
            const token = await getToken();
            const moodResult = await uploadVoiceForMoodAnalysis(audioBlob, token, backendUserId);

            setDebugMsg(`Session complete! Mood: ${moodResult.mood_score.toFixed(0)}/100`);
            setStatus('idle');

            console.log('✅ Mood Analysis Result:', moodResult);

        } catch (e: any) {
            console.error('End session error:', e);
            setError('Failed to analyze mood');
            setDebugMsg('Mood analysis failed');
            setStatus('idle');
        }
    };

    // Toggle session
    const toggleSession = () => {
        if (status === 'idle') {
            startSession();
        } else if (status === 'connected' || status === 'speaking' || status === 'processing') {
            endSession();
        }
    };

    // Status text
    const getStatusText = () => {
        if (status === 'idle') return promptData ? 'Tap to Start' : 'Loading...';
        if (status === 'loading') return 'Connecting...';
        if (status === 'connected') return transcript || 'Listening...';
        if (status === 'speaking') return transcript || 'Speaking...';
        if (status === 'processing') return 'Thinking...';
        return 'Tap to Start';
    };

    const getButtonText = () => {
        if (status === 'idle') return 'Start Session';
        if (status === 'loading') return 'Connecting...';
        return 'End Session';
    };

    // Show loading while syncing
    if (!backendUserId) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-[#FFF0F0] via-[#FDF5E6] to-[#F8F9FF] flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-purple-500" size={48} />
                    <p className="text-lg font-medium text-gray-700">Initializing your session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#FFF0F0] via-[#FDF5E6] to-[#F8F9FF] font-sans pb-24 relative overflow-hidden flex flex-col items-center justify-center">

            {/* Debug Panel */}
            <div className="absolute top-4 left-4 bg-black/80 text-green-400 p-3 text-xs rounded z-50 font-mono max-w-[280px]">
                <p className="font-bold mb-1">Solace Debug</p>
                <p>Status: {status}</p>
                <p>User: {user?.firstName || 'Loading...'}</p>
                <p>Mood: {promptData?.mood_category || 'loading...'}</p>
                <p>Score: {promptData?.mood_score.toFixed(0) || '...'}/100</p>
                <p className="mt-2 text-yellow-300">{debugMsg}</p>
                {error && <p className="text-red-400 mt-2">⚠️ {error}</p>}
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center h-full space-y-8">

                {/* Waveform Visualizer */}
                <div className="w-full h-64 flex items-center justify-center pointer-events-none">
                    <canvas
                        ref={canvasRef}
                        width={400}
                        height={256}
                        className="w-full max-w-md h-full object-contain"
                    />
                </div>

                {/* Status Text */}
                <div className="h-16 flex items-center justify-center px-8 text-center">
                    <motion.p
                        className="text-gray-600 font-medium text-lg leading-relaxed font-display"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {getStatusText()}
                    </motion.p>
                </div>

                {/* Action Button */}
                <motion.button
                    onClick={toggleSession}
                    disabled={status === 'loading' || !promptData}
                    className={`
                        px-8 py-3 rounded-full font-medium text-white transition-all
                        ${status === 'idle'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                            : 'bg-red-500 hover:bg-red-600'
                        }
                        ${(status === 'loading' || !promptData) && 'opacity-50 cursor-not-allowed'}
                    `}
                    whileTap={{ scale: 0.95 }}
                >
                    {getButtonText()}
                </motion.button>

                {/* Mood Info */}
                {promptData && status === 'idle' && (
                    <motion.div
                        className="text-center space-y-1 opacity-60"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 0.6, y: 0 }}
                    >
                        <p className="text-sm text-gray-500">
                            {promptData.prompt_name}
                        </p>
                        <p className="text-xs text-gray-400">
                            Suggested: {promptData.suggested_duration}
                        </p>
                    </motion.div>
                )}

                {/* Branding */}
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