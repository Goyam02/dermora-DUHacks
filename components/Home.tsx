import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
    Flame, 
    Sparkles, 
    Camera, 
    Brain, 
    TrendingUp,
    Activity,
    Calendar,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import BottomNav from './BottomNav';
import { useBackendAuth } from '../contexts/AuthContext';
import { getDashboard, getDailyInsight, dailyCheckIn, DashboardData, DailyInsight } from '../services/api';

const Home: React.FC = () => {
    const { user } = useUser();
    const { getToken } = useAuth();
    const navigate = useNavigate();
    
    // Use global auth context - no more syncing per page!
    const { backendUserId, isLoading: authLoading } = useBackendAuth();
    
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);

    // Fetch dashboard data - only when backendUserId is available
    useEffect(() => {
        const fetchDashboard = async () => {
            if (!backendUserId) return;

            try {
                setLoading(true);
                const token = await getToken();
                
                const [dashboard, insight] = await Promise.all([
                    getDashboard(token, backendUserId),
                    getDailyInsight(token, backendUserId).catch(() => null)
                ]);
                
                setDashboardData(dashboard);
                setDailyInsight(insight);
            } catch (err) {
                console.error("Failed to fetch dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [backendUserId, getToken]);

    // Handle check-in
    const handleCheckIn = async () => {
        if (!backendUserId || checkingIn) return;

        try {
            setCheckingIn(true);
            const token = await getToken();
            await dailyCheckIn(token, backendUserId);
            
            // Refresh dashboard
            const dashboard = await getDashboard(token, backendUserId);
            setDashboardData(dashboard);
        } catch (err) {
            console.error("Check-in failed:", err);
        } finally {
            setCheckingIn(false);
        }
    };

    // Format time ago
    const timeAgo = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMins > 0) return `${diffMins}m ago`;
        return 'Just now';
    };

    // Get activity icon
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'skin': return <Camera size={16} className="text-pastel-pink" />;
            case 'mood': return <Activity size={16} className="text-pastel-blue" />;
            case 'voice': return <Brain size={16} className="text-pastel-lavender" />;
            default: return <Sparkles size={16} className="text-pastel-orange" />;
        }
    };

    // Loading screen - much faster now!
    if (authLoading || loading) {
        return (
            <div className="min-h-screen w-full bg-[#FFF5F5] flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-pastel-pink" size={40} />
                    <p className="text-sm text-gray-500">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const streak = dashboardData?.streak;
    const stats = dashboardData?.quick_stats;
    const activity = dashboardData?.recent_activity || [];

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text overflow-x-hidden pb-24">
            
            {/* Header */}
            <motion.nav 
                className="sticky top-0 z-40 px-5 py-4 bg-[#FFF5F5]/95 backdrop-blur-md border-b border-gray-100"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Welcome Back
                        </span>
                        <span className="font-display font-bold text-xl text-[#1A1A1A]">
                            {user?.firstName || user?.fullName || "User"}
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center overflow-hidden">
                        {user?.imageUrl ? (
                            <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pastel-pink to-pastel-lavender" />
                        )}
                    </div>
                </div>
            </motion.nav>

            <div className="px-5 py-6 max-w-md mx-auto space-y-4">

                {/* Streak Card */}
                {streak && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl p-6 shadow-lg border border-orange-100"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Flame size={28} className="text-orange-500" />
                                    <span className="text-4xl font-display font-bold text-[#1A1A1A]">
                                        {streak.current_streak}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {streak.current_streak === 1 ? 'Day Streak' : 'Day Streak'}
                                </p>
                            </div>
                            {streak.can_check_in_today && (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCheckIn}
                                    disabled={checkingIn}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium shadow-md disabled:opacity-50"
                                >
                                    {checkingIn ? '...' : 'Check In'}
                                </motion.button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>🏆 Best: {streak.longest_streak} days</span>
                            {!streak.can_check_in_today && (
                                <span className="text-green-600">✓ Checked in today</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Daily Insight */}
                {dailyInsight && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-3xl p-5 shadow-md border border-gray-100"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-pink to-pastel-orange flex items-center justify-center flex-shrink-0">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                    Daily Insight
                                </h3>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {dailyInsight.message}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Quick Stats */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-3 gap-3"
                    >
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                            <Camera size={24} className="text-pastel-pink mx-auto mb-2" />
                            <div className="text-2xl font-bold text-[#1A1A1A]">
                                {stats.images_this_week}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Images
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                            <Activity size={24} className="text-pastel-blue mx-auto mb-2" />
                            <div className="text-2xl font-bold text-[#1A1A1A]">
                                {stats.mood_avg_this_week?.toFixed(1) || '—'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Avg Mood
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                            <Calendar size={24} className="text-pastel-lavender mx-auto mb-2" />
                            <div className="text-2xl font-bold text-[#1A1A1A]">
                                {stats.days_active_this_month}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Active Days
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-3xl p-5 shadow-md border border-gray-100"
                >
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/skin')}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 hover:shadow-md transition-shadow"
                        >
                            <Camera size={24} className="text-pink-600" />
                            <span className="text-xs font-medium text-gray-700">Upload</span>
                        </motion.button>
                        
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/mind')}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 hover:shadow-md transition-shadow"
                        >
                            <Activity size={24} className="text-blue-600" />
                            <span className="text-xs font-medium text-gray-700">Log Mood</span>
                        </motion.button>
                        
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/mind')}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 hover:shadow-md transition-shadow"
                        >
                            <Brain size={24} className="text-purple-600" />
                            <span className="text-xs font-medium text-gray-700">Voice</span>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Recent Activity */}
                {activity.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-3xl p-5 shadow-md border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                                Recent Activity
                            </h3>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                        <div className="space-y-3">
                            {activity.slice(0, 5).map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {getActivityIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 truncate">
                                            {item.description}
                                        </p>
                                        <span className="text-xs text-gray-400">
                                            {timeAgo(item.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* View Insights CTA */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/insights')}
                    className="w-full bg-gradient-to-r from-pastel-pink via-pastel-orange to-pastel-lavender rounded-2xl p-4 shadow-lg flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} className="text-white" />
                        <span className="font-semibold text-white">View Full Insights</span>
                    </div>
                    <ChevronRight size={20} className="text-white" />
                </motion.button>

            </div>

            <BottomNav />
        </div>
    );
};

export default Home;