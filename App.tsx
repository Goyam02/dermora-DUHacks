import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import Login from './components/Login';
import SignUpPage from './components/SignUpPage';
import Home from './components/Home';
import DetectPage from './components/DetectPage';
import SolacePage from './components/SolacePage';
import MoodPage from './components/MoodPage';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const App: React.FC = () => {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <>
              <SignedIn>
                <Navigate to="/home" replace />
              </SignedIn>
              <SignedOut>
                <Login />
              </SignedOut>
            </>
          } />
          <Route path="/home" element={<Home />} />
          <Route path="/detect" element={
            <>
              <SignedIn>
                <DetectPage />
              </SignedIn>
              <SignedOut>
                <Navigate to="/" replace />
              </SignedOut>
            </>
          } />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/solace" element={<SolacePage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
};

export default App;