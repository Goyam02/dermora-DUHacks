import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, FileText, X } from 'lucide-react';
import BottomNav from './BottomNav';
import { getImprovementTracker } from '../services/api'; // Still fetch history from backend
import { analyzeSkinWithGemini } from '../services/gemini'; // New Gemini Vision service

const DetectPage: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getImprovementTracker("b6c7b2b1-87e2-4e0d-9c63-3b8a47a0c7fa");
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        };
        fetchHistory();
    }, []);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImageSrc(imageSrc);
            // Convert base64 to File immediately for consistency
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                    handleAnalysis(file);
                });
        }
    }, [webcamRef]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result as string);
                handleAnalysis(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalysis = async (file: File) => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            // Use Gemini Vision
            const geminiResult = await analyzeSkinWithGemini(file);
            setResult(geminiResult);

        } catch (err) {
            console.error(err);
            setError("Failed to analyze image. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const reset = () => {
        setImageSrc(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text pb-24 relative overflow-x-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] bg-pastel-pink/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-pastel-blue/20 rounded-full blur-3xl pointer-events-none" />

            <div className="pt-8 px-6 pb-4">
                <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Skin Analysis</h1>
                <p className="text-skin-muted">Powered by Gemini Vision</p>
            </div>

            <div className="px-6 space-y-6">

                {/* Camera/Image Section */}
                <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                    <AnimatePresence>
                        {!imageSrc ? (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="w-full h-full relative"
                            >
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-6 w-full flex justify-center gap-6 z-10">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
                                    >
                                        <Upload size={24} />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                    </button>
                                    <button
                                        onClick={capture}
                                        className="w-16 h-16 bg-white rounded-full border-4 border-gray-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <div className="w-14 h-14 bg-red-500 rounded-full border-2 border-white" />
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="w-full h-full relative"
                            >
                                <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                        <RefreshCw className="animate-spin mb-2" size={40} />
                                        <p className="font-medium animate-pulse">Consulting Gemini...</p>
                                    </div>
                                )}

                                {!isAnalyzing && (
                                    <button
                                        onClick={reset}
                                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Local Error */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Results Card */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="text-green-500" size={24} />
                                <h2 className="text-xl font-bold text-gray-800">Analysis Complete</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Prediction</p>
                                    <p className="font-bold text-lg text-gray-900 capitalize">{result.prediction}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Confidence</p>
                                    <p className="font-bold text-lg text-gray-900">{(result.confidence * 100).toFixed(1)}%</p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                {result.message}
                            </p>

                            <button className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                <FileText size={18} />
                                View Full Report
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BottomNav />
        </div>
    );
};

export default DetectPage;
