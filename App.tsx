// App.tsx
// Fixed: Token attach + sync only when fully signed in & token available
// Added debug logs + fallback manual token on sync
// No white screen, no hook errors

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  useAuth, 
  useUser 
} from '@clerk/clerk-react';
import { RefreshCw, AlertCircle } from 'lucide-react'; // For UI
import Login from './components/Login';
import SignUpPage from './components/SignUpPage';
import Home from './components/Home';
import DetectPage from './components/DetectPage';
import SolacePage from './components/SolacePage';
import MoodPage from './components/MoodPage';
import api from './services/api';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

// ────────────────────────────────────────────────
// Auth wrapper – handles token interceptor & sync
// ────────────────────────────────────────────────
const AuthenticatedApp = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [authReady, setAuthReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Setup global token interceptor
  useEffect(() => {
    if (!isLoaded) return;

    const interceptorId = api.interceptors.request.use(async (config) => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[API] Token attached to request:', config.url);
          } else {
            console.warn('[API] No token available for request');
          }
        } catch (err) {
          console.error('[API] Token fetch failed:', err);
        }
      }
      return config;
    }, (error) => Promise.reject(error));

    setAuthReady(true);

    return () => {
      api.interceptors.request.eject(interceptorId);
    };
  }, [isLoaded, isSignedIn, getToken]);

  // Sync user with backend once ready
  useEffect(() => {
    if (!authReady || !isSignedIn) return;

    const syncUser = async () => {
      try {
        // Force fresh token for sync
        const token = await getToken();
        if (!token) throw new Error("No token");

        const response = await api.post('/auth/sync-user', {}, {
          headers: { Authorization: `Bearer ${token}` } // Manual attach as fallback
        });

        console.log('Backend sync success:', response.data);
        setSyncError(null);
      } catch (err: any) {
        console.error('User sync failed:', err);
        setSyncError('Failed to sync with backend. Some features may be limited.');
      }
    };

    syncUser();
  }, [authReady, isSignedIn, getToken]);

  // Loading state
  if (!isLoaded || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-pastel-pink" size={48} />
          <p className="text-lg font-medium text-gray-700">Initializing your session...</p>
        </div>
      </div>
    );
  }

  // Sync error banner
  if (syncError) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Issue</h2>
          <p className="text-gray-600 mb-6">{syncError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-pastel-pink text-white rounded-xl font-medium hover:bg-pastel-pink/90 transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isSignedIn ? <Navigate to="/home" replace /> : <Login />
          }
        />
        <Route path="/sign-up" element={<SignUpPage />} />

        <Route path="/home" element={<SignedIn><Home /></SignedIn>} />
        <Route path="/detect" element={<SignedIn><DetectPage /></SignedIn>} />
        <Route path="/mood" element={<SignedIn><MoodPage /></SignedIn>} />
        <Route path="/solace" element={<SignedIn><SolacePage /></SignedIn>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

// ────────────────────────────────────────────────
// Root
// ────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AuthenticatedApp />
    </ClerkProvider>
  );
};

export default App;