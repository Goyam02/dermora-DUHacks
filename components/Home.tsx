import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import SkinLayersVisual from './SkinLayersVisual';
import FeatureCard from './FeatureCard';
import { FaceScanIcon, ActivityIcon, SparklesIcon, BookOpenIcon } from './icons/AppIcons';
import BottomNav from './BottomNav';

const Home: React.FC = () => {
    const { user } = useUser();
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 50], [0, 1]);

    // Visuals definitions from previous version
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
                style={{ borderBottom: `1px solid rgba(0,0,0, ${useTransform(scrollY, [0, 50], [0, 0.05])})` }}
            >
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-skin-muted uppercase tracking-wider">Welcome Back</span>
                    <span className="font-display font-bold text-lg text-[#1A1A1A]">
                        {user?.firstName || user?.fullName || "User"}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                    {/* Profile placeholder or Clerk Image */}
                    {user?.imageUrl ? (
                        <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-skin-nude/50" />
                    )}
                </div>
            </motion.nav>

            {/* Hero Section */}
            <motion.section
                className="relative pt-24 pb-6 px-6 flex flex-col items-center"
            >
                <div className="mb-2 text-center">
                    <h1 className="font-display text-4xl font-normal text-[#1A1A1A] mb-2">
                        Your Skin<br />
                        <span className="font-bold">Dashboard</span>
                    </h1>
                </div>

                {/* Blob Visual */}
                <div className="transform scale-90">
                    <SkinLayersVisual size="sm" />
                </div>
            </motion.section>

            {/* Feature List (Restored) */}
            <section className="relative px-5 z-10 -mt-2">
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
            {/* Fade at bottom */}
            <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFF5F5] to-transparent pointer-events-none z-30" />
        </div>
    );
};

export default Home;
