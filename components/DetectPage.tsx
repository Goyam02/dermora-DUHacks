// DetectPage.tsx (Updated to connect all backend routes with separate buttons and input fields for each action. Replaced Gemini with backend upload. Added sections for each route with results display in cards/JSON format. User ID fixed. Image type set to 'progress' for uploads. Display history and comparison results.)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, RefreshCw, AlertCircle, CheckCircle, FileText, X, History, ArrowLeftRight, Trash, RotateCcw, Search } from 'lucide-react';
import BottomNav from './BottomNav';
import { uploadSkinImage, getImprovementTracker, getSkinHistory, analyzeExisting, compareImages, deleteImage, refreshImprovement } from '../services/api'; // Import all API functions

const USER_ID = "00000000-0000-0000-0000-000000000000";

const DetectPage: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any>(null);
    const [comparison, setComparison] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // States for other actions
    const [analyzeImageId, setAnalyzeImageId] = useState<string>('');
    const [analyzeResult, setAnalyzeResult] = useState<any>(null);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    const [beforeId, setBeforeId] = useState<string>('');
    const [afterId, setAfterId] = useState<string>('');
    const [compareResult, setCompareResult] = useState<any>(null);
    const [compareError, setCompareError] = useState<string | null>(null);

    const [deleteImageId, setDeleteImageId] = useState<string>('');
    const [deleteResult, setDeleteResult] = useState<any>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const [refreshResult, setRefreshResult] = useState<any>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    const [weeks, setWeeks] = useState<number>(4);
    const [comparisonError, setComparisonError] = useState<string | null>(null);

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
            // Use backend upload and analyze
            const backendResult = await uploadSkinImage(file, USER_ID, 'progress');
            setResult(backendResult);

        } catch (err) {
            console.error(err);
            setError("Failed to analyze image. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReAnalyze = async () => {
        setAnalyzeError(null);
        setAnalyzeResult(null);
        try {
            const res = await analyzeExisting(analyzeImageId);
            setAnalyzeResult(res);
        } catch (err) {
            console.error(err);
            setAnalyzeError("Failed to re-analyze image.");
        }
    };

    const handleCompare = async () => {
        setCompareError(null);
        setCompareResult(null);
        try {
            const res = await compareImages(beforeId, afterId);
            setCompareResult(res);
        } catch (err) {
            console.error(err);
            setCompareError("Failed to compare images.");
        }
    };

    const handleDelete = async () => {
        setDeleteError(null);
        setDeleteResult(null);
        try {
            const res = await deleteImage(deleteImageId);
            setDeleteResult(res);
        } catch (err) {
            console.error(err);
            setDeleteError("Failed to delete image.");
        }
    };

    const handleRefresh = async () => {
        setRefreshError(null);
        setRefreshResult(null);
        try {
            const res = await refreshImprovement(USER_ID);
            setRefreshResult(res);
        } catch (err) {
            console.error(err);
            setRefreshError("Failed to refresh improvement data.");
        }
    };

    const handleGetComparison = async () => {
        setComparisonError(null);
        setComparison(null);
        try {
            // Assuming getSkinHistory accepts weeks, but if not, remove weeks param
            const res = await getSkinHistory(USER_ID); // Add weeks if supported: api.get(..., {params: {weeks}})
            setComparison(res);
        } catch (err) {
            console.error(err);
            setComparisonError("Failed to get comparison.");
        }
    };

    const reset = () => {
        setImageSrc(null);
        setResult(null);
        setError(null);
    };

    const renderResultCard = (title: string, data: any, err: string | null, icon: React.ReactNode) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mt-4"
        >
            <div className="flex items-center gap-3 mb-4">
                {icon}
                <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            </div>
            {err && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">{err}</span>
                </div>
            )}
            {data && (
                <pre className="text-sm text-gray-600 leading-relaxed mb-4 overflow-auto">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </motion.div>
    );

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text pb-24 relative overflow-x-hidden">
            {/* Decorative Background */}
            <div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] bg-pastel-pink/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[10%] left-[-10%] w-[300px] h-[300px] bg-pastel-blue/20 rounded-full blur-3xl pointer-events-none" />

            <div className="pt-8 px-6 pb-4">
                <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Skin Analysis</h1>
                <p className="text-skin-muted">Powered by Azure Vision via Backend</p>
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
                                        <p className="font-medium animate-pulse">Uploading and Analyzing...</p>
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
                                <h2 className="text-xl font-bold text-gray-800">Upload & Analysis Complete</h2>
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

                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
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

                {/* Improvement Tracker History */}
                {history && renderResultCard("Improvement Tracker", history, null, <History className="text-blue-500" size={24} />)}

                {/* Other Actions Section */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Other Actions</h2>

                    {/* Re-Analyze Existing Image */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Search size={24} className="text-purple-500" />
                            <h3 className="text-lg font-bold">Re-Analyze Image</h3>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Image ID"
                            value={analyzeImageId}
                            onChange={(e) => setAnalyzeImageId(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                        />
                        <button
                            onClick={handleReAnalyze}
                            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                        >
                            Re-Analyze
                        </button>
                        {analyzeResult && renderResultCard("Re-Analyze Result", analyzeResult, analyzeError, <CheckCircle className="text-green-500" size={24} />)}
                    </div>

                    {/* Compare Two Images */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ArrowLeftRight size={24} className="text-orange-500" />
                            <h3 className="text-lg font-bold">Compare Images</h3>
                        </div>
                        <input
                            type="text"
                            placeholder="Before Image ID"
                            value={beforeId}
                            onChange={(e) => setBeforeId(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                        />
                        <input
                            type="text"
                            placeholder="After Image ID"
                            value={afterId}
                            onChange={(e) => setAfterId(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                        />
                        <button
                            onClick={handleCompare}
                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                        >
                            Compare
                        </button>
                        {compareResult && renderResultCard("Compare Result", compareResult, compareError, <CheckCircle className="text-green-500" size={24} />)}
                    </div>

                    {/* Get Weekly Comparison */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <History size={24} className="text-indigo-500" />
                            <h3 className="text-lg font-bold">Get Weekly Comparison</h3>
                        </div>
                        <input
                            type="number"
                            placeholder="Weeks (default 4)"
                            value={weeks}
                            onChange={(e) => setWeeks(parseInt(e.target.value) || 4)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                        />
                        <button
                            onClick={handleGetComparison}
                            className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                        >
                            Get Comparison
                        </button>
                        {comparison && renderResultCard("Weekly Comparison", comparison, comparisonError, <CheckCircle className="text-green-500" size={24} />)}
                    </div>

                    {/* Delete Image */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Trash size={24} className="text-red-500" />
                            <h3 className="text-lg font-bold">Delete Image</h3>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Image ID"
                            value={deleteImageId}
                            onChange={(e) => setDeleteImageId(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                        />
                        <button
                            onClick={handleDelete}
                            className="w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                        >
                            Delete
                        </button>
                        {deleteResult && renderResultCard("Delete Result", deleteResult, deleteError, <CheckCircle className="text-green-500" size={24} />)}
                    </div>

                    {/* Refresh Improvement Data */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <RotateCcw size={24} className="text-green-500" />
                            <h3 className="text-lg font-bold">Refresh Improvement Data</h3>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                        >
                            Refresh
                        </button>
                        {refreshResult && renderResultCard("Refresh Result", refreshResult, refreshError, <CheckCircle className="text-green-500" size={24} />)}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default DetectPage;
