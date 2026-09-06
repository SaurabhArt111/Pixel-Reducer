import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CompletionModal from './components/CompletionModal';
import Home from './pages/Home';
import History from './pages/History';
import Storage from './pages/Storage';
import { JobProvider } from './context/JobContext';

export default function App() {
  return (
    <JobProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/storage" element={<Storage />} />
          </Routes>
        </div>
        <CompletionModal />
      </div>
    </JobProvider>
  );
}
