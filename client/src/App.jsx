import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import History from './pages/History';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </div>
  );
}
