import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SadFace, NeutralFace, GoodFace, HappyFace } from './MoodFaces';
import BottomNav from './BottomNav';
import { logMood, MoodLogData } from '../services/api';
import { Check } from 'lucide-react';

// --- Configuration Data ---

const moods = [
    { id: 'sad', label: 'Terrible', score: 20, component: SadFace, color: 'text-red-600' },
    { id: 'neutral', label: 'Okay', score: 50, component: NeutralFace, color: 'text-orange-600' },
    { id: 'good', label: 'Good', score: 75, component: GoodFace, color: 'text-blue-600' },
    { id: 'happy', label: 'Excellent', score: 95, component: HappyFace, color: 'text-green-600' },
];

const durations = [
    { id: 'today', label: 'Just today', icon: '🕒' },
    { id: 'days', label: 'A few days', icon: '📅' },
    { id: 'weeks', label: 'Weeks', icon: '🗓️' },
    { id: 'months', label: 'Months', icon: '📆' },
];

const triggers = [
    { id: 'work', label: 'Work / Study', icon: '💼' },
    { id: 'sleep', label: 'Sleep Quality', icon: '😴' },
    { id: 'diet', label: 'Food / Diet', icon: '🥗' },
    { id: 'social', label: 'Relationships', icon: '👥' },
    { id: 'weather', label: 'Weather', icon: '🌦️' },
    { id: 'none', label: 'No specific reason', icon: '🤷' },
];

// --- Components ---

const OptionCard = ({ label, icon, isSelected, onClick, delay }: any) => (
    <motion.button
        onClick={onClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={`
            relative w-full p-4 rounded-full flex items-center gap-4 transition-all duration-300
            ${isSelected
                ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-[1.01]'
                : 'bg-white/60 hover:bg-white/80 shadow-sm'
            }
        `}
    >
        {/* Circular Emoji Container */}
        <div className={`
            w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0
            ${isSelected ? 'bg-orange-50' : 'bg-gray-50'}
            transition-colors duration-300
        `}>
            {icon}
        </div>

        {/* Label */}
        <span className={`text-lg font-bold text-left flex-1 ${isSelected ? 'text-[#1A1A1A]' : 'text-gray-600'}`}>
            {label}
        </span>
    </motion.button>
);

const MoodPage: React.FC = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState<'mood' | 'duration' | 'trigger' | 'success'>('mood');

    const [selectedMood, setSelectedMood] = useState<any>(null);
    const [selectedDuration, setSelectedDuration] = useState<any>(null);
    const [selectedTrigger, setSelectedTrigger] = useState<any>(null);

    const handleMoodSelect = (mood: any) => {
        setSelectedMood(mood);
        setTimeout(() => setStep('duration'), 300);
    };

    const handleDurationSelect = (duration: any) => {
        setSelectedDuration(duration);
        setTimeout(() => setStep('trigger'), 300);
    };

    const handleTriggerSelect = async (trigger: any) => {
        setSelectedTrigger(trigger);

        setTimeout(async () => {
            try {
                const moodData: MoodLogData = {
                    mood_score: selectedMood.score,
                    stress: 50,
                    anxiety: 50,
                    energy: 50,
                    logged_at: new Date().toISOString()
                };
                logMood(moodData).catch(e => console.error(e));
                setStep('success');
                setTimeout(() => navigate('/solace'), 1500);

            } catch (error) {
                console.error("Failed", error);
            }
        }, 300);
    };

    const getHeader = () => {
        switch (step) {
            case 'mood': return <>How are you<br />feeling today?</>;
            case 'duration': return <>How long has this<br />been going on?</>;
            case 'trigger': return <>Any specific<br />trigger?</>;
            case 'success': return <>Check-in<br />Complete</>;
        }
    };

    const getSubtext = () => {
        switch (step) {
            case 'mood': return "Select what best describes your mood.";
            case 'duration': return "Understanding the timeline helps.";
            case 'trigger': return "What might have caused this?";
            case 'success': return "Heading to Solace...";
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#FFF5F5] font-sans text-skin-text pb-24 relative flex flex-col">

            {/* Decorative Background */}
            <div className="fixed top-[-20%] right-[-20%] w-[500px] h-[500px] bg-pastel-pink/30 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-[-20%] left-[-20%] w-[400px] h-[400px] bg-pastel-blue/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="pt-8 px-8 mb-10 text-center relative z-10 min-h-[120px] shrink-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <h1 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2 leading-tight">
                            {getHeader()}
                        </h1>
                        <p className="text-skin-muted text-base">{getSubtext()}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 max-w-sm mx-auto w-full relative z-10 pb-32 no-scrollbar">
                <AnimatePresence mode="wait">

                    {/* STEP 1: MOOD */}
                    {step === 'mood' && (
                        <motion.div key="mood-list" className="flex flex-col gap-3" exit={{ opacity: 0, x: -20 }}>
                            {moods.map((mood, index) => (
                                <OptionCard
                                    key={mood.id}
                                    label={mood.label}
                                    icon={<mood.component />}
                                    isSelected={selectedMood?.id === mood.id}
                                    onClick={() => handleMoodSelect(mood)}
                                    delay={index * 0.05}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* STEP 2: DURATION */}
                    {step === 'duration' && (
                        <motion.div key="duration-list" className="flex flex-col gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            {durations.map((opt, index) => (
                                <OptionCard
                                    key={opt.id}
                                    label={opt.label}
                                    icon={opt.icon}
                                    isSelected={selectedDuration?.id === opt.id}
                                    onClick={() => handleDurationSelect(opt)}
                                    delay={index * 0.05}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* STEP 3: TRIGGER */}
                    {step === 'trigger' && (
                        <motion.div key="trigger-list" className="flex flex-col gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            {triggers.map((opt, index) => (
                                <OptionCard
                                    key={opt.id}
                                    label={opt.label}
                                    icon={opt.icon}
                                    isSelected={selectedTrigger?.id === opt.id}
                                    onClick={() => handleTriggerSelect(opt)}
                                    delay={index * 0.05}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* SUCCESS */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center flex-col h-64"
                        >
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg">
                                <Check size={48} />
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Back Button */}
            {step !== 'mood' && step !== 'success' && (
                <div className="fixed bottom-24 left-0 right-0 z-20 flex justify-center pointer-events-none">
                    <button
                        onClick={() => {
                            if (step === 'duration') setStep('mood');
                            if (step === 'trigger') setStep('duration');
                        }}
                        className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full text-gray-500 font-medium text-sm hover:text-gray-800 shadow-sm pointer-events-auto"
                    >
                        Go Back
                    </button>
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default MoodPage;
