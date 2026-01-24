// DetectPage.tsx (Updated with pretty outputs and fixed action buttons)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, FileText, X, History, ArrowLeftRight, Trash, RotateCcw, Search, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import BottomNav from './BottomNav';
import { uploadSkinImage, getImprovementTracker, getSkinHistory, analyzeExisting, compareImages, deleteImage, refreshImprovement, getMySkinImages } from '../services/api';

const USER_ID = "00000000-0000-0000-0000-000000000000";
const BACKEND_URL = "http://localhost:8000";

interface SkinImage {
    image_id: string;
    image_url: string;
    captured_at: string;
    image_type: string;
}

type ActionMode = 'none' | 'reanalyze' | 'compare' | 'delete';

const DetectPage: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);

    // User images state
    const [userImages, setUserImages] = useState<SkinImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [imagesError, setImagesError] = useState<string | null>(null);

    // Selection state
    const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
    const [actionMode, setActionMode] = useState<ActionMode>('none');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Action results
    const [actionResult, setActionResult] = useState<any>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Other states
    const [comparison, setComparison] = useState<any>(null);
    const [comparisonError, setComparisonError] = useState<string | null>(null);
    const [refreshResult, setRefreshResult] = useState<any>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    // Fetch user images
    const fetchUserImages = useCallback(async () => {
        setLoadingImages(true);
        setImagesError(null);
        try {
            const images = await getMySkinImages();
            setUserImages(images);
        } catch (err) {
            console.error("Failed to fetch user images", err);
            setImagesError("Failed to load images");
        } finally {
            setLoadingImages(false);
        }
    }, []);

    // Fetch history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getImprovementTracker(USER_ID);
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        };
        fetchHistory();
        fetchUserImages();
    }, [fetchUserImages]);

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
            const backendResult = await uploadSkinImage(file, USER_ID, 'progress');
            setResult(backendResult);
            showToast("Image uploaded and analyzed successfully!", "success");
            fetchUserImages();
        } catch (err) {
            console.error(err);
            setError("Failed to analyze image. Please try again.");
            showToast("Failed to analyze image", "error");
        } finally {
            setIsAnalyzing(false);
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

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const openModal = (mode: ActionMode) => {
        setActionMode(mode);
        setSelectedImageIds([]);
        setActionResult(null);
        setActionError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActionMode('none');
        setSelectedImageIds([]);
        setIsProcessing(false);
    };

    const toggleImageSelection = (imageId: string) => {
        if (actionMode === 'compare') {
            if (selectedImageIds.includes(imageId)) {
                setSelectedImageIds(selectedImageIds.filter(id => id !== imageId));
            } else if (selectedImageIds.length < 2) {
                setSelectedImageIds([...selectedImageIds, imageId]);
            }
        } else {
            setSelectedImageIds([imageId]);
        }
    };

    const handleConfirmAction = async () => {
        setActionError(null);
        setActionResult(null);
        setIsProcessing(true);

        try {
            if (actionMode === 'reanalyze' && selectedImageIds.length === 1) {
                const res = await analyzeExisting(selectedImageIds[0]);
                setActionResult(res);
                showToast("Image re-analyzed successfully!", "success");
            } else if (actionMode === 'compare' && selectedImageIds.length === 2) {
                const sortedIds = [...selectedImageIds].sort((a, b) => {
                    const imgA = userImages.find(img => img.image_id === a);
                    const imgB = userImages.find(img => img.image_id === b);
                    if (!imgA || !imgB) return 0;
                    return new Date(imgA.captured_at).getTime() - new Date(imgB.captured_at).getTime();
                });
                const res = await compareImages(sortedIds[0], sortedIds[1]);
                setActionResult(res);
                showToast("Images compared successfully!", "success");
            } else if (actionMode === 'delete' && selectedImageIds.length === 1) {
                const res = await deleteImage(selectedImageIds[0]);
                setActionResult(res);
                showToast("Image deleted successfully!", "success");
                fetchUserImages();
            }
            closeModal();
        } catch (err) {
            console.error(err);
            setActionError(`Failed to ${actionMode} image(s).`);
            showToast(`Failed to ${actionMode} image(s)`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGetComparison = async () => {
        setComparisonError(null);
        setComparison(null);
        try {
            const res = await getSkinHistory(USER_ID);
            setComparison(res);
            showToast("Comparison retrieved successfully!", "success");
        } catch (err) {
            console.error(err);
            setComparisonError("Failed to get comparison.");
            showToast("Failed to get comparison", "error");
        }
    };

    const handleRefresh = async () => {
        setRefreshError(null);
        setRefreshResult(null);
        try {
            const res = await refreshImprovement(USER_ID);
            setRefreshResult(res);
            showToast("Improvement data refreshed!", "success");
            // Refresh history display
            const data = await getImprovementTracker(USER_ID);
            setHistory(data);
        } catch (err) {
            console.error(err);
            setRefreshError("Failed to refresh improvement data.");
            showToast("Failed to refresh", "error");
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isConfirmDisabled = () => {
        if (actionMode === 'reanalyze' || actionMode === 'delete') {
            return selectedImageIds.length !== 1;
        }
        if (actionMode === 'compare') {
            return selectedImageIds.length !== 2;
        }
        return true;
    };

    const renderImprovementTracker = (data: any) => {
        if (!data) return null;

        const getTrendIcon = (trend: string) => {
            if (trend === 'improving') return <TrendingUp className="text-green-500" size={20} />;
            if (trend === 'worsening') return <TrendingDown className="text-red-500" size={20} />;
            return <Minus className="text-gray-400" size={20} />;
        };

        const getTrendColor = (trend: string) => {
            if (trend === 'improving') return 'bg-green-50 border-green-200 text-green-700';
            if (trend === 'worsening') return 'bg-red-50 border-red-200 text-red-700';
            return 'bg-gray-50 border-gray-200 text-gray-700';
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
            >
                <div className="flex items-center gap-3 mb-6">
                    <History className="text-blue-500" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Improvement Tracker</h2>
                </div>

                {data.weekly_improvements && data.weekly_improvements.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Weekly Progress</h3>
                        <div className="space-y-3">
                            {data.weekly_improvements.map((week: any, index: number) => (
                                <div key={index} className={`p-4 rounded-xl border ${getTrendColor(week.trend)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold">Week {week.week_number}</span>
                                        <div className="flex items-center gap-2">
                                            {getTrendIcon(week.trend)}
                                            <span className="text-sm font-medium capitalize">{week.trend}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm">{week.summary}</p>
                                    {week.confidence_change && (
                                        <p className="text-xs mt-2">Confidence change: {(week.confidence_change * 100).toFixed(1)}%</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.overall_trend && (
                    <div className={`p-4 rounded-xl border ${getTrendColor(data.overall_trend)}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {getTrendIcon(data.overall_trend)}
                            <span className="font-semibold">Overall Trend: <span className="capitalize">{data.overall_trend}</span></span>
                        </div>
                        {data.summary && <p className="text-sm">{data.summary}</p>}
                    </div>
                )}

                {data.total_images && (
                    <div className="mt-4 text-sm text-gray-500">
                        Total images analyzed: {data.total_images}
                    </div>
                )}
            </motion.div>
        );
    };

    const renderComparisonResult = (data: any) => {
        if (!data) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
            >
                <div className="flex items-center gap-3 mb-6">
                    <ArrowLeftRight className="text-orange-500" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Comparison Result</h2>
                </div>

                {data.before_image && data.after_image && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Before</p>
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                                <img src={`${BACKEND_URL}${data.before_image.image_url}`} alt="Before" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-sm font-medium capitalize">{data.before_image.prediction}</p>
                                <p className="text-xs text-gray-500">{formatDate(data.before_image.captured_at)}</p>
                                <p className="text-xs text-gray-600 mt-1">Confidence: {(data.before_image.confidence * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase">After</p>
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                                <img src={`${BACKEND_URL}${data.after_image.image_url}`} alt="After" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-sm font-medium capitalize">{data.after_image.prediction}</p>
                                <p className="text-xs text-gray-500">{formatDate(data.after_image.captured_at)}</p>
                                <p className="text-xs text-gray-600 mt-1">Confidence: {(data.after_image.confidence * 100).toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                )}

                {data.improvement_detected !== undefined && (
                    <div className={`p-4 rounded-xl border ${data.improvement_detected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {data.improvement_detected ? <TrendingUp size={20} /> : <Minus size={20} />}
                            <span className="font-semibold">{data.improvement_detected ? 'Improvement Detected!' : 'No Significant Change'}</span>
                        </div>
                        {data.summary && <p className="text-sm">{data.summary}</p>}
                        {data.confidence_change && (
                            <p className="text-xs mt-2">Confidence change: {(data.confidence_change * 100).toFixed(1)}%</p>
                        )}
                    </div>
                )}

                {data.days_between && (
                    <div className="mt-4 text-sm text-gray-500">
                        Time between images: {data.days_between} days
                    </div>
                )}
            </motion.div>
        );
    };

    const renderWeeklyComparison = (data: any) => {
        if (!data) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
            >
                <div className="flex items-center gap-3 mb-6">
                    <History className="text-indigo-500" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Weekly Comparison</h2>
                </div>

                {data.comparison && (
                    <>
                        {data.comparison.before_image && data.comparison.after_image && (
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Before</p>
                                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                                        <img src={`${BACKEND_URL}${data.comparison.before_image.image_url}`} alt="Before" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-sm font-medium capitalize">{data.comparison.before_image.prediction}</p>
                                        <p className="text-xs text-gray-500">{formatDate(data.comparison.before_image.captured_at)}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">After</p>
                                    <div className="aspect-square rounded-xl overflow-hidden border-2 border-gray-200">
                                        <img src={`${BACKEND_URL}${data.comparison.after_image.image_url}`} alt="After" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-sm font-medium capitalize">{data.comparison.after_image.prediction}</p>
                                        <p className="text-xs text-gray-500">{formatDate(data.comparison.after_image.captured_at)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {data.comparison.summary && (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                                <p className="text-sm">{data.comparison.summary}</p>
                            </div>
                        )}
                    </>
                )}

                {data.message && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-700">
                        <p className="text-sm">{data.message}</p>
                    </div>
                )}
            </motion.div>
        );
    };

    const renderActionResult = (data: any) => {
        if (!data) return null;

        if (actionMode === 'reanalyze') {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="text-green-500" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Re-Analysis Complete</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Prediction</p>
                            <p className="font-bold text-lg text-gray-900 capitalize">{data.prediction}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Confidence</p>
                            <p className="font-bold text-lg text-gray-900">{(data.confidence * 100).toFixed(1)}%</p>
                        </div>
                    </div>

                    {data.message && (
                        <p className="text-sm text-gray-600 leading-relaxed">{data.message}</p>
                    )}
                </motion.div>
            );
        }

        if (actionMode === 'compare') {
            return renderComparisonResult(data);
        }

        if (actionMode === 'delete') {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="text-green-500" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Image Deleted</h2>
                    </div>
                    <p className="text-sm text-gray-600">{data.message || 'Image has been successfully deleted from your history.'}</p>
                </motion.div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text pb-24 relative overflow-x-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] bg-pastel-pink/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-pastel-blue/20 rounded-full blur-3xl pointer-events-none" />

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
                            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-8 px-6 pb-4">
                <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Skin Analysis</h1>
                <p className="text-skin-muted">Track your skin health journey</p>
            </div>

            <div className="px-6 space-y-6">
                {/* Camera/Image Section */}
                <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-xl border-4 border-white">
                    <AnimatePresence>
                        {!imageSrc ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
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
                                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40">
                                        <Upload size={24} />
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </button>
                                    <button onClick={capture} className="w-16 h-16 bg-white rounded-full border-4 border-gray-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                                        <div className="w-14 h-14 bg-red-500 rounded-full border-2 border-white" />
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full h-full relative"
                            >
                                <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                        <RefreshCw className="animate-spin mb-2" size={40} />
                                        <p className="font-medium animate-pulse">Uploading and Analyzing...</p>
                                    </div>
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

                {/* Upload Result */}
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

                            <p className="text-xs text-gray-400 mb-4">
                                Image ID: {result.image_id}
                            </p>

                            <button className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                <FileText size={18} />
                                View Full Report
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error for Upload */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Your Skin History */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Your Skin History</h2>

                    {loadingImages && (
                        <div className="flex justify-center items-center py-12">
                            <RefreshCw className="animate-spin text-gray-400" size={32} />
                        </div>
                    )}

                    {imagesError && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{imagesError}</span>
                        </div>
                    )}

                    {!loadingImages && !imagesError && userImages.length === 0 && ( <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100"> <Camera className="mx-auto mb-4 text-gray-300" size={48} /> <p className="text-gray-600 font-medium">No images yet—upload your first one!</p> </div> )}

                {!loadingImages && !imagesError && userImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userImages.map((img) => (
                            <motion.div
                                key={img.image_id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                            >
                                <div className="aspect-square relative">
                                    <img
                                        src={`${BACKEND_URL}${img.image_url}`}
                                        alt={`Skin ${img.image_type}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-gray-500 mb-1">{formatDate(img.captured_at)}</p>
                                    <p className="text-sm font-semibold text-gray-800 capitalize">{img.image_type}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => openModal('reanalyze')}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all flex flex-col items-center gap-2"
                    >
                        <Search className="text-purple-500" size={28} />
                        <span className="text-sm font-semibold text-gray-800">Re-Analyze</span>
                    </button>
                    <button
                        onClick={() => openModal('compare')}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all flex flex-col items-center gap-2"
                    >
                        <ArrowLeftRight className="text-orange-500" size={28} />
                        <span className="text-sm font-semibold text-gray-800">Compare</span>
                    </button>
                    <button
                        onClick={() => openModal('delete')}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all flex flex-col items-center gap-2"
                    >
                        <Trash className="text-red-500" size={28} />
                        <span className="text-sm font-semibold text-gray-800">Delete</span>
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all flex flex-col items-center gap-2"
                    >
                        <RotateCcw className="text-green-500" size={28} />
                        <span className="text-sm font-semibold text-gray-800">Refresh Data</span>
                    </button>
                </div>
            </div>

            {/* Action Results */}
            {actionResult && renderActionResult(actionResult)}

            {/* Improvement Tracker History */}
            {history && renderImprovementTracker(history)}

            {/* Weekly Comparison */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <History size={24} className="text-indigo-500" />
                    <h3 className="text-lg font-bold">Get Weekly Comparison</h3>
                </div>
                <button
                    onClick={handleGetComparison}
                    className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                >
                    Get Comparison
                </button>
            </div>
            {comparison && renderWeeklyComparison(comparison)}

            {/* Refresh Result */}
            {refreshResult && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="text-green-500" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Data Refreshed</h2>
                    </div>
                    <p className="text-sm text-gray-600">{refreshResult.message || 'Improvement tracker data has been successfully refreshed.'}</p>
                </motion.div>
            )}
        </div>

        {/* Selection Modal */}
        <AnimatePresence>
            {isModalOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
                    onClick={closeModal}
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white w-full md:w-[90%] md:max-w-4xl rounded-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {actionMode === 'reanalyze' && 'Select Image to Re-Analyze'}
                                    {actionMode === 'compare' && 'Select 2 Images to Compare'}
                                    {actionMode === 'delete' && 'Select Image to Delete'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {actionMode === 'compare' && selectedImageIds.length === 2 && 'Oldest will be "Before", newest will be "After"'}
                                    {actionMode === 'compare' && selectedImageIds.length < 2 && `${selectedImageIds.length}/2 selected`}
                                    {actionMode !== 'compare' && selectedImageIds.length > 0 && '1 selected'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={isProcessing}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {userImages.length === 0 ? (
                                <div className="text-center py-12">
                                    <Camera className="mx-auto mb-4 text-gray-300" size={48} />
                                    <p className="text-gray-600">No images available</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {userImages.map((img) => {
                                        const isSelected = selectedImageIds.includes(img.image_id);
                                        return (
                                            <motion.div
                                                key={img.image_id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => !isProcessing && toggleImageSelection(img.image_id)}
                                                className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'ring-4 ring-blue-500 shadow-xl'
                                                        : 'ring-2 ring-gray-200 hover:ring-gray-300'
                                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="aspect-square relative">
                                                    <img
                                                        src={`${BACKEND_URL}${img.image_url}`}
                                                        alt={`Skin ${img.image_type}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                                                <Check className="text-white" size={24} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-xs text-gray-500 mb-1">{formatDate(img.captured_at)}</p>
                                                    <p className="text-sm font-semibold text-gray-800 capitalize">{img.image_type}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={closeModal}
                                disabled={isProcessing}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                disabled={isConfirmDisabled() || isProcessing}
                                className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                                    isConfirmDisabled() || isProcessing
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                {isProcessing && <RefreshCw className="animate-spin" size={18} />}
                                <span>
                                    {isProcessing ? 'Processing...' : 
                                     actionMode === 'delete' ? 'Delete' :
                                     actionMode === 'compare' ? 'Compare' :
                                     'Re-Analyze'}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <BottomNav />
    </div>
);
};

export default DetectPage;

