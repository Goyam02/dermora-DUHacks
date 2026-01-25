import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useUser, useAuth } from '@clerk/clerk-react';
import { FileText, Calendar, TrendingUp, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import SkinLayersVisual from './SkinLayersVisual';
import FeatureCard from './FeatureCard';
import { FaceScanIcon, ActivityIcon, SparklesIcon, BookOpenIcon } from './icons/AppIcons';
import BottomNav from './BottomNav';
import { getWeeklyReportsList, getWeeklyReportHtml } from '../services/api';

interface Report {
    report_id: string;
    week_start: string;
    week_end: string;
    summary: string;
    trend: string;
    generated_at: string;
    has_html: boolean;
    metrics: {
        days_tracked: number;
        consistent_tracking: boolean;
    };
}

const Home: React.FC = () => {
    const { user } = useUser();
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 50], [0, 1]);
    const { getToken, isSignedIn } = useAuth();
    const syncedRef = useRef(false);
    
    // Store backend UUID separately
    const [backendUserId, setBackendUserId] = useState<string | null>(null);

    // Reports state
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportsError, setReportsError] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [reportHtml, setReportHtml] = useState<string | null>(null);

    // User sync effect - MODIFIED to capture backend UUID
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
                
                // Store the backend UUID for API calls
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

    // Fetch reports on mount - WAIT for backendUserId
    useEffect(() => {
        const fetchReports = async () => {
            if (!isSignedIn || !backendUserId) {
                console.log("⏳ Waiting for backend user ID...");
                return;
            }

            try {
                setLoadingReports(true);
                setReportsError(null);
                const token = await getToken();
                
                console.log("🔍 Fetching reports with UUID:", backendUserId);
                const data = await getWeeklyReportsList(5, token, backendUserId);
                
                console.log("📊 Reports fetched:", data);
                setReports(data.reports || []);
            } catch (err: any) {
                console.error("Failed to fetch reports:", err);
                setReportsError(err.response?.data?.detail || "Failed to load reports");
            } finally {
                setLoadingReports(false);
            }
        };

        fetchReports();
    }, [isSignedIn, backendUserId, getToken]);

    // View report HTML
    const handleViewReport = async (weekStart: string) => {
        if (!backendUserId) {
            console.error("No backend user ID available");
            return;
        }
        
        try {
            const token = await getToken();
            const html = await getWeeklyReportHtml(token, backendUserId);
            setReportHtml(html);
            setSelectedReport(weekStart);
        } catch (err: any) {
            console.error("Failed to fetch report HTML:", err);
            alert("Failed to load report. Please try again.");
        }
    };

    const closeReportViewer = () => {
        setReportHtml(null);
        setSelectedReport(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTrendIcon = (trend: string) => {
        if (trend.toLowerCase().includes('improv')) return '📈';
        if (trend.toLowerCase().includes('declin')) return '📉';
        return '➡️';
    };

    // Visuals definitions
    const AnalyzeVisual = () => (
        <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-2 border-dashed border-pastel-pink rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-2 border border-pastel-orange rounded-full opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-16 border-2 border-skin-text/20 rounded-[2rem] bg-white/50" />
            </div>
        </div>
    );

    const MonitorVisual = () => (
        <div className="w-full h-full flex items-end justify-center gap-2 pb-4 px-8">
            {['#FFD1DC', '#FFE0B2', '#FFF9C4', '#C8E6C9', '#BBDEFB'].map((color, i) => (
                <motion.div
                    key={i}
                    className="w-full rounded-t-sm opacity-80"
                    style={{ height: `${[40, 65, 50, 80, 70][i]}%`, backgroundColor: color }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                />
            ))}
        </div>
    );

    const PersonalizeVisual = () => (
        <div className="flex items-center gap-3">
            <div className="w-10 h-20 rounded-t-full rounded-b-lg bg-pastel-lavender shadow-sm" />
            <div className="w-12 h-14 rounded-full bg-pastel-pink shadow-sm" />
            <div className="w-8 h-16 rounded-sm bg-pastel-blue border border-white/50 shadow-sm" />
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text overflow-x-hidden selection:bg-pastel-pink/30 pb-32">

            {/* Header */}
            <motion.nav
                className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#FFF5F5]/90 backdrop-blur-md"
                style={{ borderBottom: `1px solid rgba(0,0,0, 0.05)` }}
            >
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-skin-muted uppercase tracking-wider">Welcome Back</span>
                    <span className="font-display font-bold text-lg text-[#1A1A1A]">
                        {user?.firstName || user?.fullName || "User"}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                    {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-skin-nude/50" />
                    )}
                </div>
            </motion.nav>

            {/* Hero Section */}
            <motion.section className="relative pt-24 pb-6 px-6 flex flex-col items-center">
                <div className="mb-2 text-center">
                    <h1 className="font-display text-4xl font-normal text-[#1A1A1A] mb-2">
                        Your Skin<br />
                        <span className="font-bold">Dashboard</span>
                    </h1>
                </div>

                <div className="transform scale-90">
                    <SkinLayersVisual size="sm" />
                </div>
            </motion.section>

            {/* Weekly Reports Section */}
            <section className="relative px-5 z-10 mb-6">
                <div className="max-w-[500px] mx-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-display text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                            <FileText size={20} className="text-pastel-pink" />
                            Weekly Reports
                        </h2>
                    </div>

                    {!backendUserId ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                            <RefreshCw className="animate-spin mx-auto mb-3 text-pastel-pink" size={32} />
                            <p className="text-sm text-gray-500">Initializing your account...</p>
                        </div>
                    ) : loadingReports ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                            <RefreshCw className="animate-spin mx-auto mb-3 text-pastel-pink" size={32} />
                            <p className="text-sm text-gray-500">Loading your reports...</p>
                        </div>
                    ) : reportsError ? (
                        <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100">
                            <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
                            <p className="text-sm text-red-600">{reportsError}</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                            <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
                            <p className="text-sm text-gray-500 mb-1">No reports yet</p>
                            <p className="text-xs text-gray-400">Start tracking to generate your first weekly report!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report, idx) => (
                                <motion.div
                                    key={report.report_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleViewReport(report.week_start)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-500">
                                                    {formatDate(report.week_start)} - {formatDate(report.week_end)}
                                                </span>
                                                <span className="text-lg">{getTrendIcon(report.trend)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                                                {report.summary}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp size={12} />
                                                    {report.trend}
                                                </span>
                                                <span>•</span>
                                                <span>{report.metrics.days_tracked} days tracked</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Feature List */}
            <section className="relative px-5 z-10">
                <div className="max-w-[500px] mx-auto space-y-4">
                    <FeatureCard
                        index={0}
                        title="Analyze"
                        subtitle="AI-powered skin type & concern detection"
                        icon={<FaceScanIcon />}
                        visual={<AnalyzeVisual />}
                    />

                    <FeatureCard
                        index={1}
                        title="Monitor"
                        subtitle="Track changes across time and routines"
                        icon={<ActivityIcon />}
                        visual={<MonitorVisual />}
                    />

                    <FeatureCard
                        index={2}
                        title="Personalize"
                        subtitle="Skincare routines made for your skin"
                        icon={<SparklesIcon />}
                        visual={<PersonalizeVisual />}
                    />

                    <FeatureCard
                        index={3}
                        title="Understand"
                        subtitle="Learn what your skin actually needs"
                        icon={<BookOpenIcon />}
                        visual={
                            <div className="grid grid-cols-2 gap-2 p-4 w-full h-full">
                                <div className="bg-white rounded-lg shadow-sm border border-gray-50" />
                                <div className="bg-pastel-pink/20 rounded-lg shadow-sm" />
                                <div className="bg-skin-cocoa/20 rounded-lg shadow-sm col-span-2" />
                            </div>
                        }
                    />
                </div>
            </section>

            <BottomNav />

            {/* Report Viewer Modal */}
            {reportHtml && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                    onClick={closeReportViewer}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="font-display font-bold text-lg text-[#1A1A1A]">
                                Weekly Report
                            </h3>
                            <button
                                onClick={closeReportViewer}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div 
                            className="overflow-y-auto p-6"
                            style={{ maxHeight: 'calc(85vh - 80px)' }}
                            dangerouslySetInnerHTML={{ __html: reportHtml }}
                        />
                    </motion.div>
                </motion.div>
            )}

            {/* Fade at bottom */}
            <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFF5F5] to-transparent pointer-events-none z-30" />
        </div>
    );
};

export default Home;