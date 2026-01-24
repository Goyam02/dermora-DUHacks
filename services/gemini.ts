import { GoogleGenerativeAI } from "@google/generative-ai";
import { LiveServerMessage, Modality } from "@google/genai";

// Initialize Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Optional: Add fallback / warning in development
if (!API_KEY) {
  console.warn(
    '%c[WARNING] Gemini API key is missing!\n' +
    'Please add VITE_GEMINI_API_KEY=your-key-here to your .env file',
    'color: #ff4444; font-weight: bold; font-size: 14px;'
  );
  // You can throw an error in production builds if you want:
  // if (import.meta.env.PROD) throw new Error("Missing Gemini API key");
}
const genAI = new GoogleGenerativeAI(API_KEY);

// Existing text streaming function
export const getGeminiStream = async function* (userText: string, systemPrompt: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-native-audio-preview-09-2025" });

        const result = await model.generateContentStream({
            contents: [
                { role: "model", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.7,
            }
        });

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) yield chunkText;
        }

    } catch (error) {
        console.error("Gemini Stream Error:", error);
        throw error;
    }
};

export const getGeminiResponse = async (userText: string, systemPrompt: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent({
            contents: [
                { role: "model", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: userText }] }
            ],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7,
            }
        });

        return result.response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "I'm having trouble connecting.";
    }
};

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result as string;
            const base64Content = base64Data.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Content,
                    mimeType: file.type
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const analyzeSkinWithGemini = async (file: File) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = await fileToGenerativePart(file);

        const prompt = `
        Analyze this image of a skin condition. 
        Provide a JSON response with the following fields: 
        1. prediction (name of the potential condition or 'Normal')
        2. confidence (a number between 0 and 1)
        3. severity_score (0-100)
        4. message (a brief, empathetic explanation and advice)
        
        Strictly return ONLY the JSON string. Do not include markdown formatting like \`\`\`json.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw new Error("Analysis unavailable.");
    }
}
function encode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    channels: number
): Promise<AudioBuffer> {
    const pcm = new Int16Array(data.buffer);
    const frameCount = pcm.length / channels;
    const buffer = ctx.createBuffer(channels, frameCount, sampleRate);

    for (let c = 0; c < channels; c++) {
        const channelData = buffer.getChannelData(c);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = pcm[i * channels + c] / 32768;
        }
    }
    return buffer;
}

// ────────────────────────────────────────────────
// Main Solace Live connection (IMPROVED)
// ────────────────────────────────────────────────

export const connectToSolaceLive = async (
    systemPrompt: string,
    onAudio: (buffer: AudioBuffer) => void,
    onTranscript: (text: string, role: 'user' | 'model', isTurnComplete: boolean) => void,
    onClose: () => void,
    onError: (error: string) => void
) => {
    try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        if (outputCtx.state === 'suspended') {
            await outputCtx.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = inputCtx.createMediaStreamSource(stream);

        const analyser = inputCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const processor = inputCtx.createScriptProcessor(4096, 1, 1);

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start(1000);

        let session: any = null;
        let isConnected = false;
        let setupComplete = false;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',  // ← Recommended stable model (Jan 2026)

            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: systemPrompt ? {
                    parts: [{ text: systemPrompt }]
                } : undefined,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Aoede' }  // calm, neutral voice
                    },
                    languageCode: 'en-US',   // change to 'hi-IN' / 'pa-IN' if targeting Punjabi users
                }
            },

            callbacks: {
                onopen: () => {
                    console.log('✅ Solace Live WebSocket opened');
                    isConnected = true;
                },

                onmessage: async (msg: LiveServerMessage) => {
                    // Helpful for debugging — log message type
                    console.log('📩 Live message received:', Object.keys(msg)[0] || 'unknown', msg);

                    if (msg.setupComplete) {
                        console.log('✅ Setup complete — starting audio input');
                        setupComplete = true;

                        processor.onaudioprocess = (e) => {
                            if (!isConnected || !session || !setupComplete) return;

                            const input = e.inputBuffer.getChannelData(0);
                            const pcm16 = new Int16Array(input.length);
                            const gain = 0.92; // prevent clipping

                            for (let i = 0; i < input.length; i++) {
                                const scaled = input[i] * 32768 * gain;
                                pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(scaled)));
                            }

                            try {
                                session.sendRealtimeInput({
                                    media: {
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: encode(new Uint8Array(pcm16.buffer))
                                    }
                                });
                            } catch (err) {
                                console.error('Error sending realtime audio:', err);
                            }
                        };

                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        console.log('🎤 Audio input processor activated');
                    }

                    // ─── Audio output ───
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                        console.log('🔊 Received AI audio chunk');
                        const buffer = await decodeAudioData(
                            decode(audioData),
                            outputCtx,
                            24000,
                            1
                        );
                        onAudio(buffer);
                    }

                    // ─── Transcripts ───
                    if (msg.serverContent?.inputTranscription?.text) {
                        onTranscript(msg.serverContent.inputTranscription.text, 'user', false);
                    }

                    if (msg.serverContent?.outputTranscription?.text) {
                        onTranscript(msg.serverContent.outputTranscription.text, 'model', false);
                    }

                    if (msg.serverContent?.turnComplete) {
                        onTranscript('', 'model', true);
                    }
                },

                onclose: (event?: any) => {
                    console.log('❌ Live connection closed', event);
                    isConnected = false;
                    setupComplete = false;
                    onClose();
                },

                onerror: (e) => {
                    console.error("🔴 Live connection error:", e);
                    isConnected = false;
                    onError(e.message || "Connection error");
                }
            }
        });

        session = await sessionPromise;
        console.log('📡 Live session established');

        return {
            disconnect: async () => {
                console.log('🛑 Disconnecting Solace Live session...');
                isConnected = false;
                setupComplete = false;

                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }

                if (session) {
                    try {
                        session.close();
                    } catch (err) {
                        console.warn('Session already closed or close failed', err);
                    }
                    session = null;
                }

                stream?.getTracks().forEach(t => t.stop());
                processor?.disconnect();
                source?.disconnect();

                try { await inputCtx.close(); } catch {}
                try { await outputCtx.close(); } catch {}
            },

            getAnalyser: () => analyser,
            getOutputContext: () => outputCtx,

            getRecordedAudio: (): Promise<Blob> => {
                return new Promise((resolve) => {
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        resolve(audioBlob);
                    };
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                });
            }
        };
    } catch (error: any) {
        console.error("Failed to initialize Solace Live:", error);
        onError(error.message || "Failed to initialize voice session");
        throw error;
    }
};