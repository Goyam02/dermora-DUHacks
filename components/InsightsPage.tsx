import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
    TrendingUp,
    Calendar,
    RefreshCw,
    AlertCircle,
    ChevronRight,
    FileText,
    Camera,
    Activity,
    BarChart3,
    X,
    Trash2
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import BottomNav from './BottomNav';
import {
    getWeeklyReportsList,
    getWeeklyReportHtml,
    deleteWeeklyReport,
    getImprovementTracker,
    getMoodHistoryChart,
    getMoodSummary,
    getDashboard
} from '../services/api';

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

type TimeRange = '7' | '14' | '30';

const InsightsPage: React.FC = () => {
    const { user } = useUser();
    const { getToken, isSignedIn } = useAuth();
    const syncedRef = useRef(false);

    const [backendUserId, setBackendUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Reports state
    const [reports, setReports] = useState<Report[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [reportHtml, setReportHtml] = useState<string | null>(null);

    // Charts state
    const [timeRange, setTimeRange] = useState<TimeRange>('7');
    const [moodChartData, setMoodChartData] = useState<any[]>([]);
    const [improvementData, setImprovementData] = useState<any>(null);
    const [moodSummary, setMoodSummary] = useState<any>(null);
    const [dashboardStats, setDashboardStats] = useState<any>(null);

    // Sync user
    useEffect(() => {
        if (!isSignedIn || !user || syncedRef.current) return;

        const syncUser = async () => {
            try {
                const token = await getToken();
                const response = await fetch("http://localhost:8000/auth/sync-user", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await response.json();
                if (data.uuid) {
                    setBackendUserId(data.uuid);
                }
                syncedRef.current = true;
            } catch (err) {
                console.error("User sync failed:", err);
            }
        };

        syncUser();
    }, [isSignedIn, user, getToken]);

    // Fetch all data
    useEffect(() => {
        const fetchAllData = async () => {
            if (!backendUserId) return;

            try {
                setLoading(true);
                const token = await getToken();

                const [reportsData, moodChart, improvement, summary, dashboard] = await Promise.all([
                    getWeeklyReportsList(10, token, backendUserId).catch(() => ({ reports: [] })),
                    getMoodHistoryChart(parseInt(timeRange), token, backendUserId).catch(() => []),
                    getImprovementTracker(token, backendUserId).catch(() => null),
                    getMoodSummary(token, backendUserId).catch(() => null),
                    getDashboard(token, backendUserId).catch(() => null)
                ]);

                setReports(reportsData.reports || []);
                setMoodChartData(moodChart);
                setImprovementData(improvement);
                setMoodSummary(summary);
                setDashboardStats(dashboard);

            } catch (err) {
                console.error("Failed to fetch insights:", err);
            } finally {
                setLoading(false);
                setLoadingReports(false);
            }
        };

        if (backendUserId) {
            fetchAllData();
        }
    }, [backendUserId, getToken, timeRange]);

    // View report
    const handleViewReport = async (weekStart: string) => {
        if (!backendUserId) return;

        try {
            const token = await getToken();
            const html = await getWeeklyReportHtml(token, backendUserId);
            setReportHtml(html);
            setSelectedReport(weekStart);
        } catch (err) {
            console.error("Failed to fetch report:", err);
        }
    };

    // Delete report
    const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!backendUserId || !confirm('Delete this report?')) return;

        try {
            const token = await getToken();
            await deleteWeeklyReport(reportId, token, backendUserId);
            setReports(reports.filter(r => r.report_id !== reportId));
        } catch (err) {
            console.error("Failed to delete report:", err);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTrendIcon = (trend: string) => {
        if (trend.toLowerCase().includes('improv')) return '📈';
        if (trend.toLowerCase().includes('declin')) return '📉';
        return '➡️';
    };

    // Loading screen
    if (!backendUserId || loading) {
        return (
            <div className="min-h-screen w-full bg-[#FFF5F5] flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-pastel-pink" size={40} />
                    <p className="text-sm text-gray-500">Loading insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text overflow-x-hidden pb-24">

            {/* Header */}
            <motion.nav
                className="sticky top-0 z-40 px-5 py-4 bg-[#FFF5F5]/95 backdrop-blur-md border-b border-gray-100"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <div>
                        <h1 className="font-display font-bold text-2xl text-[#1A1A1A]">Insights</h1>
                        <p className="text-xs text-gray-400">Your progress & analytics</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pastel-orange to-pastel-pink flex items-center justify-center">
                        <BarChart3 size={24} className="text-white" />
                    </div>
                </div>
            </motion.nav>

            <div className="px-5 py-6 max-w-md mx-auto space-y-6">

                {/* Statistics Cards */}
                {dashboardStats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Quick Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4 border border-pink-200">
                                <Camera size={20} className="text-pink-600 mb-2" />
                                <div className="text-2xl font-bold text-[#1A1A1A]">
                                    {dashboardStats.quick_stats?.images_this_week || 0}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Images This Week</div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                                <Activity size={20} className="text-blue-600 mb-2" />
                                <div className="text-2xl font-bold text-[#1A1A1A]">
                                    {dashboardStats.quick_stats?.mood_avg_this_week?.toFixed(1) || '—'}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Avg Mood</div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                                <Calendar size={20} className="text-purple-600 mb-2" />
                                <div className="text-2xl font-bold text-[#1A1A1A]">
                                    {dashboardStats.quick_stats?.days_active_this_month || 0}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Active Days</div>
                            </div>

                            {improvementData && (
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                                    <TrendingUp size={20} className="text-green-600 mb-2" />
                                    <div className="text-2xl font-bold text-[#1A1A1A]">
                                        {improvementData.overall_improvement_percentage?.toFixed(0) || '0'}%
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">Improvement</div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Mood Trends Chart */}
                {moodChartData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-3xl p-5 shadow-md border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                                Mood Trends
                            </h2>
                            <div className="flex gap-2">
                                {(['7', '14', '30'] as TimeRange[]).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            timeRange === range
                                                ? 'bg-pastel-blue text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {range}D
                                    </button>
                                ))}
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={moodChartData}>
                                <defs>
                                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFB6C1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#FFB6C1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8EA7E9" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8EA7E9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#999"
                                    fontSize={11}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="#999" fontSize={11} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="mood_score"
                                    stroke="#FFB6C1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#moodGradient)"
                                    name="Mood"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="energy"
                                    stroke="#8EA7E9"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#energyGradient)"
                                    name="Energy"
                                />
                            </AreaChart>
                        </ResponsiveContainer>

                        {moodSummary && (
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <div className="text-xs text-gray-500">Avg Mood</div>
                                    <div className="text-lg font-bold text-pink-600">
                                        {moodSummary.avg_mood?.toFixed(1) || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Avg Energy</div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {moodSummary.avg_energy?.toFixed(1) || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Total Logs</div>
                                    <div className="text-lg font-bold text-purple-600">
                                        {moodSummary.total_logs || 0}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Skin Improvement Chart */}
                {improvementData && improvementData.weekly_data && improvementData.weekly_data.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-3xl p-5 shadow-md border border-gray-100"
                    >
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                            Skin Progress
                        </h2>

                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={improvementData.weekly_data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="week_start"
                                    stroke="#999"
                                    fontSize={11}
                                    tickFormatter={(value) => formatDate(value)}
                                />
                                <YAxis stroke="#999" fontSize={11} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '12px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="improvement_score"
                                    stroke="#66BB6A"
                                    strokeWidth={3}
                                    dot={{ fill: '#66BB6A', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Improvement %"
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <div className="text-xs text-gray-500">Overall Improvement</div>
                            <div className="text-2xl font-bold text-green-600">
                                {improvementData.overall_improvement_percentage?.toFixed(1) || 0}%
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Based on {improvementData.weekly_data.length} weeks of tracking
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Weekly Reports Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                            Weekly Reports
                        </h2>
                        <FileText size={18} className="text-gray-400" />
                    </div>

                    {loadingReports ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                            <RefreshCw className="animate-spin mx-auto mb-3 text-pastel-pink" size={32} />
                            <p className="text-sm text-gray-500">Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                            <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
                            <p className="text-sm text-gray-500 mb-1">No reports yet</p>
                            <p className="text-xs text-gray-400">Start tracking to generate reports!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report, idx) => (
                                <motion.div
                                    key={report.report_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleViewReport(report.week_start)}
                                >
                                    <div className="flex items-start justify-between">
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
                                                <span>{report.metrics.days_tracked} days</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 ml-2">
                                            <button
                                                onClick={(e) => handleDeleteReport(report.report_id, e)}
                                                className="p-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 size={14} className="text-red-500" />
                                            </button>
                                            <ChevronRight size={20} className="text-gray-400" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

            </div>

            <BottomNav />

            {/* Report Viewer Modal */}
            <AnimatePresence>
                {reportHtml && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
                        onClick={() => {
                            setReportHtml(null);
                            setSelectedReport(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                                <h3 className="font-display font-bold text-lg text-[#1A1A1A]">
                                    Weekly Report
                                </h3>
                                <button
                                    onClick={() => {
                                        setReportHtml(null);
                                        setSelectedReport(null);
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                    <X size={18} />
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
            </AnimatePresence>
        </div>
    );
};

export default InsightsPage;