import React from 'react';
import { motion } from 'framer-motion';

// Common Face Shapes
const FaceBase: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <motion.div
        className="w-16 h-16 rounded-full flex items-center justify-center relative shadow-sm"
        style={{ backgroundColor: color }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
            scale: 1,
            opacity: 1,
            y: [0, -4, 0] // Gentle floating
        }}
        transition={{
            scale: { duration: 0.5 },
            opacity: { duration: 0.5 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
    >
        {children}
    </motion.div>
);

// Eye Component with Blinking
const Eye: React.FC<{ cx: string; cy: string }> = ({ cx, cy }) => (
    <motion.circle
        cx={cx}
        cy={cy}
        r="2.5"
        fill="#1A1A1A"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
        transition={{
            duration: 4,
            repeat: Infinity,
            times: [0, 0.05, 0.1, 0.8, 1], // Quick blink
            repeatDelay: Math.random() * 2 // Randomize slightly
        }}
    />
);

export const SadFace = () => (
    <FaceBase color="#FF5252">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <Eye cx="12" cy="18" />
            <Eye cx="28" cy="18" />
            {/* Mouth (Frown) - Draws in */}
            <motion.path
                d="M12 28 C12 28, 20 22, 28 28"
                stroke="#1A1A1A"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
        </svg>
    </FaceBase>
);

export const NeutralFace = () => (
    <FaceBase color="#FFB74D">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {/* Eyes (Blinking Rects) */}
            <motion.rect
                x="10" y="18" width="6" height="3" rx="1.5" fill="#1A1A1A"
                animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 0.8, 1] }}
            />
            <motion.rect
                x="24" y="18" width="6" height="3" rx="1.5" fill="#1A1A1A"
                animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.05, 0.1, 0.8, 1] }}
            />

            {/* Mouth (Straight line expanding) */}
            <motion.rect
                x="14"
                y="26"
                width="12"
                height="3"
                rx="1.5"
                fill="#1A1A1A"
                initial={{ width: 0, x: 20 }} // Start colapsed center
                animate={{ width: [10, 14, 10], x: [15, 13, 15] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </FaceBase>
);

export const GoodFace = () => (
    <FaceBase color="#42A5F5">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <Eye cx="12" cy="18" />
            <Eye cx="28" cy="18" />
            {/* Mouth (Simple Smile) */}
            <motion.path
                d="M12 26 C12 26, 20 32, 28 26"
                stroke="#1A1A1A"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2 }}
            />
        </svg>
    </FaceBase>
);

export const HappyFace = () => (
    <FaceBase color="#66BB6A">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {/* Eyes (Happy Arcs - Draw in) */}
            <motion.path
                d="M10 18 Q13 15 16 18"
                stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
            />
            <motion.path
                d="M24 18 Q27 15 30 18"
                stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
            />

            {/* Mouth (Big Smile) */}
            <motion.path
                d="M10 24 Q20 36 30 24 Z"
                fill="#1A1A1A"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, delay: 0.5 }}
            />
            {/* Tongue (Draws up) */}
            <motion.path
                d="M16 30 Q20 33 24 30"
                stroke="#FF5252" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
            />
        </svg>
    </FaceBase>
);
