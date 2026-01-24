import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SkinLayersVisual from './SkinLayersVisual';

// Placeholder icons for Google and Apple
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
        />
    </svg>
);

const AppleIcon = () => (
    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.05 19.095c-.95 1.39-2.05 2.825-3.625 2.86-.92.015-1.925-.565-2.925-.565-.965 0-2.075.59-3.04.56-2.485-.05-4.835-2.67-6.085-5.63-1.615-3.8-.02-8.525 3.32-8.625 1.48-.05 2.92.935 3.87.935.91-.015 2.505-1.165 4.11-1.07 1.005.06 3.085.645 4.3 2.37-3.69 1.875-2.97 6.945.74 8.52.275.125.55.23.825.31l.01.005zm-4.49-16.79c.785-1.25 1.83-1.995 3.235-2.305.28 1.635-1.015 3.195-2.31 3.73-1.21.51-2.615-.145-3.155-1.425.045-.045.09-.09.135-.135.03-.03.065-.06.095-.09.025-.02.055-.045.08-.065.655-.655 1.315-1.3 1.92-1.91z" />
    </svg>
);

const GoogleLogo = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Login: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Navigate to home on click
        navigate('/home');
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-[#FFF5F5] font-sans text-skin-text flex flex-col justify-between overflow-hidden">

            {/* Top Section: Visual & Logo */}
            {/* Top Section: Visual & Logo */}
            <div className="flex-1 w-full flex items-center justify-center relative min-h-[50%]">

                {/* Logo - Absolute Center, On Top */}
                <h1 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-display text-5xl font-bold tracking-tight text-[#1A1A1A] z-30 whitespace-nowrap">
                    Dermora.ai
                </h1>

                {/* Skin Visual - Scaled Up */}
                <div className="w-full max-w-[400px] aspect-square flex items-center justify-center relative z-0">
                    <div className="transform scale-110 opacity-100">
                        {/* Size: Clean concentric circles variant */}
                        <SkinLayersVisual size="lg" variant="clean" />
                    </div>
                </div>

                {/* Floating decorative elements */}
                <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-pastel-pink blur-2xl opacity-50 pointer-events-none" />
                <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-pastel-blue blur-2xl opacity-50 pointer-events-none" />
            </div>

            {/* Bottom Section: Content Card */}
            <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full bg-white rounded-t-[3rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] px-8 pt-14 pb-16 flex flex-col items-center gap-6 z-20"
                style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
            >
                <div className="text-center mb-2">
                    <p className="text-[#5f6368] text-xl font-normal tracking-wide">
                        Sign in to get started
                    </p>
                </div>

                {/* Auth Buttons */}
                <div className="w-full max-w-sm space-y-4">
                    <motion.button
                        onClick={handleLogin}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full bg-white text-[#1f1f1f] border border-gray-200 font-medium text-lg py-4 px-6 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                        <div className="mr-3">
                            <GoogleLogo />
                        </div>
                        <span>Sign in with Google</span>
                    </motion.button>

                    <motion.button
                        onClick={handleLogin}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full bg-black text-white font-medium text-lg py-4 px-6 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-900 transition-colors"
                    >
                        <AppleIcon />
                        <span>Sign in with Apple</span>
                    </motion.button>
                </div>

                <div className="text-center mt-2">
                    <p className="text-xs text-skin-muted/70">
                        By continuing, you agree to Dermora's
                        <a href="#" className="underline ml-1 hover:text-skin-text">Terms</a> &
                        <a href="#" className="underline ml-1 hover:text-skin-text">Privacy Policy</a>.
                    </p>
                </div>
            </motion.div>

        </div>
    );
};

export default Login;
