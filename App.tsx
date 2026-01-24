import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';
import DetectPage from './components/DetectPage';
import SolacePage from './components/SolacePage';
import MoodPage from './components/MoodPage';
import { PlaceholderPage } from './components/Placeholders';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/detect" element={<DetectPage />} />
        <Route path="/mood" element={<MoodPage />} />
        <Route path="/solace" element={<SolacePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;