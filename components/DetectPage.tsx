import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, FileText, X, ArrowRight, MessageCircle } from 'lucide-react';
import BottomNav from './BottomNav';
import { generateFollowUpQuestions, generateFinalSkinReport } from '../services/gemini';
import axios from 'axios';

const DetectPage: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);

    // Workflow States
    const [step, setStep] = useState<'capture' | 'inferring' | 'review' | 'analyzing' | 'questions' | 'final'>('capture');

    // Data
    const [initialPrediction, setInitialPrediction] = useState<any>(null);
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ question: string, answer: string }[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [finalReport, setFinalReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImageSrc(imageSrc);
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                    setCapturedFile(file);
                    handleInitialInference(file);
                });
        }
    }, [webcamRef]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageSrc(reader.result as string);
                setCapturedFile(file);
                handleInitialInference(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInitialInference = async (file: File) => {
        setStep('inferring');
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Step 1: Legacy Inference
            const response = await axios.post('http://localhost:8000/skin/infer', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setInitialPrediction(response.data);
            setStep('review');
        } catch (err) {
            console.error(err);
            setError("Failed to connect to detection server.");
            setStep('capture');
        }
    };

    const startDeepAnalysis = async () => {
        if (!initialPrediction || !imageSrc) return;
        setStep('analyzing');

        try {
            // Step 2: Generate Questions
            const qs = await generateFollowUpQuestions(
                initialPrediction.prediction,
                initialPrediction.confidence,
                imageSrc.split(',')[1] // send base64 if needed, mostly logic uses text
            );
            setQuestions(qs);
            setStep('questions');
        } catch (err) {
            setError("Failed to generate analysis questions.");
            setStep('review');
        }
    };

    const handleAnswerSubmit = () => {
        if (!currentAnswer.trim()) return;

        const newAnswers = [...answers, {
            question: questions[currentQuestionIndex],
            answer: currentAnswer
        }];
        setAnswers(newAnswers);
        setCurrentAnswer('');

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finalizeReport(newAnswers);
        }
    };

    const finalizeReport = async (completedAnswers: any[]) => {
        setStep('analyzing');
        try {
            const report = await generateFinalSkinReport(
                initialPrediction.prediction,
                initialPrediction.confidence,
                completedAnswers
            );
            setFinalReport(report);
            setStep('final');
        } catch (err) {
            setError("Failed to generate final report.");
            setStep('questions');
        }
    };

    const reset = () => {
        setImageSrc(null);
        setCapturedFile(null);
        setStep('capture');
        setInitialPrediction(null);
        setQuestions([]);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setFinalReport(null);
    };

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text pb-24 relative overflow-x-hidden">
            <div className="pt-8 px-6 pb-4">
                <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Skin Analysis</h1>
                <p className="text-skin-muted">Powered by Advanced AI</p>
            </div>

            <div className="px-6 space-y-6">

                {/* Visual Content Area */}
                <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                    <AnimatePresence mode="wait">

                        {/* STATE: CAPTURE */}
                        {step === 'capture' && (
                            <motion.div key="cam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full h-full object-cover" />
                                <div className="absolute bottom-6 w-full flex justify-center gap-6 z-10">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
                                        <Upload size={24} />
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </button>
                                    <button onClick={capture} className="w-16 h-16 bg-white rounded-full border-4 border-gray-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                                        <div className="w-14 h-14 bg-red-500 rounded-full border-2 border-white" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STATE: IMAGE PREVIEW / PROCESSING */}
                        {imageSrc && step !== 'capture' && (
                            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative">
                                <img src={imageSrc} alt="Captured" className="w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">

                                    {/* LOADING STATES */}
                                    {(step === 'inferring' || step === 'analyzing') && (
                                        <div className="text-white flex flex-col items-center">
                                            <RefreshCw className="animate-spin mb-4" size={48} />
                                            <p className="font-medium text-lg animate-pulse">
                                                {step === 'inferring' ? "Running Initial Diagnostic..." : "Consulting Advanced AI..."}
                                            </p>
                                        </div>
                                    )}

                                    {/* REVIEW INITIAL RESULT */}
                                    {step === 'review' && initialPrediction && (
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full max-w-sm">
                                            <p className="text-gray-300 text-sm uppercase tracking-wider mb-1">Detected</p>
                                            <h2 className="text-3xl font-bold text-white mb-2 capitalize">{initialPrediction.prediction}</h2>
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="h-2 flex-1 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-500" style={{ width: `${initialPrediction.confidence * 100}%` }} />
                                                </div>
                                                <span className="text-green-400 font-mono text-sm">{(initialPrediction.confidence * 100).toFixed(0)}%</span>
                                            </div>

                                            <div className="space-y-3">
                                                <button onClick={startDeepAnalysis} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                                    <MessageCircle size={20} />
                                                    Run Deep Analysis
                                                </button>
                                                <button onClick={reset} className="w-full py-3 bg-transparent text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors">
                                                    Retake
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* QUESTIONS INTERFACE */}
                                    {step === 'questions' && questions.length > 0 && (
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-left">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-md">
                                                    Question {currentQuestionIndex + 1}/{questions.length}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-6 leading-tight">
                                                {questions[currentQuestionIndex]}
                                            </h3>

                                            <input
                                                autoFocus
                                                value={currentAnswer}
                                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                                                placeholder="Type your answer..."
                                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black mb-4 text-gray-800"
                                            />

                                            <button onClick={handleAnswerSubmit} disabled={!currentAnswer.trim()} className="w-full py-4 bg-black text-white rounded-xl font-medium disabled:opacity-50 hover:bg-gray-800 flex items-center justify-center gap-2">
                                                Next <ArrowRight size={18} />
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* FINAL REPORT */}
                                    {step === 'final' && finalReport && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-left h-[90%] overflow-y-auto">
                                            <div className="flex items-center gap-2 mb-6 text-green-600">
                                                <CheckCircle size={24} />
                                                <span className="font-bold">Analysis Complete</span>
                                            </div>

                                            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2 capitalize">
                                                {finalReport.final_diagnosis}
                                            </h2>
                                            <p className="text-xl text-gray-500 mb-6 font-medium">
                                                Confidence: {finalReport.confidence_score}%
                                            </p>

                                            <div className="space-y-6">
                                                <div className="bg-blue-50 p-5 rounded-2xl">
                                                    <h4 className="font-bold text-blue-900 mb-2 text-sm uppercase tracking-wide">Analysis</h4>
                                                    <p className="text-blue-800 leading-relaxed text-sm">
                                                        {finalReport.explanation}
                                                    </p>
                                                </div>

                                                <div className="bg-green-50 p-5 rounded-2xl">
                                                    <h4 className="font-bold text-green-900 mb-2 text-sm uppercase tracking-wide">Action Plan</h4>
                                                    <p className="text-green-800 leading-relaxed text-sm">
                                                        {finalReport.recommendation}
                                                    </p>
                                                </div>
                                            </div>

                                            <button onClick={reset} className="w-full mt-8 py-4 bg-black text-white rounded-xl font-medium hover:bg-gray-900">
                                                Close & Save
                                            </button>
                                        </motion.div>
                                    )}

                                </div>

                                {/* Close Button (only when not analyzing/dialog) */}
                                {step === 'review' && (
                                    <button onClick={reset} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-50">
                                        <X size={20} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default DetectPage;
