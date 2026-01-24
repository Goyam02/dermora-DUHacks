import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Icons (Simple SVGs)
const HomeIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className={active ? "text-pastel-orange" : "text-white"}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const ScanIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-pastel-blue" : "text-white"}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"} className={active ? "text-pastel-blue" : ""} />
    </svg>
);

const MoodIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className={active ? "text-pastel-pink" : "text-white"}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
);

const SolaceIcon = ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round" className={active ? "text-pastel-green" : "text-white"}>
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
);

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const tabs = [
        { id: 'home', icon: HomeIcon, path: '/home', label: 'Home' },
        { id: 'detect', icon: ScanIcon, path: '/detect', label: 'Detect' },
        { id: 'mood', icon: MoodIcon, path: '/mood', label: 'Mood' },
        { id: 'solace', icon: SolaceIcon, path: '/solace', label: 'Solace' },
    ];

    return (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center">
            <div className="bg-[#1A1A1A] w-full max-w-[360px] h-16 rounded-full flex items-center justify-between px-8 shadow-nav relative">

                {tabs.map((tab) => {
                    const isActive = currentPath === tab.path;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => tab.path && navigate(tab.path)}
                            className="flex flex-col items-center justify-center w-10 h-full relative"
                        >
                            <tab.icon active={isActive} />
                            {isActive && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-white"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
