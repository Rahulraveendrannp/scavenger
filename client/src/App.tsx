// App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { GameSession } from './types';

// Import all page components
import LandingPage from './components/LandingPage';
import InstructionsPage from './components/InstructionsPage';
import RegistrationPage from './components/RegistrationPage';
import OTPPage from './components/OTPPage';
import Dashboard from './components/Dashboard';
import ScavengerHuntPage from './components/ScavengerHuntPage';
import QRScannerPage from './components/QRScannerPage';
import ProgressPage from './components/ProgressPage';
import CompletionPage from './components/CompletionPage';
import LeaderboardPage from './components/LeadrboardPage';

// Context to share state across components
const AppContext = React.createContext<{
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  gameSession: GameSession | null;
  setGameSession: (session: GameSession | null) => void;
  gameCompletionData: { timeElapsed: number; scannedQRs: string[] } | null;
  setGameCompletionData: (data: { timeElapsed: number; scannedQRs: string[] } | null) => void;
  currentCheckpoint: number | null;
  setCurrentCheckpoint: (id: number | null) => void;
}>({
  phoneNumber: '',
  setPhoneNumber: () => {},
  gameSession: null,
  setGameSession: () => {},
  gameCompletionData: null,
  setGameCompletionData: () => {},
  currentCheckpoint: null,
  setCurrentCheckpoint: () => {},
});

// Wrapper components for each route
const LandingPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleStartHunt = () => {
    navigate('/instructions');
  };

  return <LandingPage onStartHunt={handleStartHunt} />;
};

const InstructionsPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleStart = () => {
    navigate('/register');
  };

  return <InstructionsPage onStart={handleStart} />;
};

const RegistrationPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { setPhoneNumber } = React.useContext(AppContext);
  
  const handleBack = () => {
    // No back action since this is the first page
  };
  
  const handleSuccess = (phoneNumber: string) => {
    setPhoneNumber(phoneNumber);
    navigate('/verify-otp');
  };

  return <RegistrationPage onBack={handleBack} onSuccess={handleSuccess} />;
};

const OTPPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { phoneNumber, setGameSession } = React.useContext(AppContext);
  
  const handleBack = () => {
    navigate('/register');
  };
  
  const handleSuccess = (session: GameSession) => {
    setGameSession(session);
    navigate('/dashboard');
  };

  return <OTPPage onBack={handleBack} onSuccess={handleSuccess} phoneNumber={phoneNumber} />;
};

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { phoneNumber, setGameSession, setPhoneNumber, setGameCompletionData, setCurrentCheckpoint } = React.useContext(AppContext);
  
  const handleStartScavengerHunt = () => {
    navigate('/game');
  };
  
  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.removeItem('talabat_phone_number');
    localStorage.removeItem('talabat_game_session');
    localStorage.removeItem('talabat_completion_data');
    localStorage.removeItem('talabat_current_checkpoint');
    localStorage.removeItem('talabat_user_progress');
    localStorage.removeItem('talabat_scavenger_progress');
    
    // Reset all state
    setGameSession(null);
    setPhoneNumber('');
    setGameCompletionData(null);
    setCurrentCheckpoint(null);
    
    navigate('/');
  };

  return (
    <Dashboard 
      phoneNumber={phoneNumber}
      onStartScavengerHunt={handleStartScavengerHunt}
      onLogout={handleLogout}
    />
  );
};

const ScavengerHuntPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { phoneNumber, gameSession } = React.useContext(AppContext);
  
  const handleGameComplete = () => {
    navigate('/complete');
  };

  const handleScanQR = (checkpointId: number) => {
    navigate(`/qr-scanner/${checkpointId}`);
  };

  // Redirect if not authenticated at all
  if (!phoneNumber) {
    return <Navigate to="/" replace />;
  }

  // Create a default session if none exists but user is authenticated
  const currentSession = gameSession || {
    sessionId: `session_${Date.now()}`,
    startTime: Date.now(),
    phoneNumber: phoneNumber,
    status: 'active'
  };

  return <ScavengerHuntPage 
    session={currentSession}
    onGameComplete={handleGameComplete} 
    onScanQR={handleScanQR} 
  />;
};

const QRScannerPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/game');
  };
  
  const handleSuccess = () => {
    navigate('/game');
  };

  return <QRScannerPage onBack={handleBack} onSuccess={handleSuccess} />;
};

const ProgressPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleContinueHunt = () => {
    navigate('/game');
  };
  
  const handleClaimPrize = () => {
    navigate('/complete');
  };

  return <ProgressPage 
    totalFound={3} 
    totalCheckpoints={8} 
    currentTier="Bronze"
    onContinueHunt={handleContinueHunt}
    onClaimPrize={handleClaimPrize}
  />;
};

const CompletionPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handleViewLeaderboard = () => {
    navigate('/leaderboard');
  };
  
  const handlePlayAgain = () => {
    navigate('/');
  };

  return <CompletionPage 
    phoneNumber="+97412345678"
    timeElapsed={1200}
    scannedQRs={['qr1', 'qr2', 'qr3']}
    onViewLeaderboard={handleViewLeaderboard}
    onPlayAgain={handlePlayAgain}
  />;
};

const LeaderboardPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  const handlePlayAgain = () => {
    navigate('/');
  };

  return <LeaderboardPage 
    currentUserPhone="+97412345678"
    onPlayAgain={handlePlayAgain}
  />;
};

// Main App Component
const AppContent: React.FC = () => {
  const { phoneNumber, gameSession } = React.useContext(AppContext);
  
  // If user has a game session, they should be on dashboard or game pages
  const isAuthenticated = phoneNumber && gameSession;
  
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegistrationPageWrapper />
        } 
      />
      <Route path="/landing" element={<LandingPageWrapper />} />
      <Route path="/instructions" element={<InstructionsPageWrapper />} />
      <Route 
        path="/register" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegistrationPageWrapper />
        } 
      />
      <Route 
        path="/verify-otp" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <OTPPageWrapper />
        } 
      />
      <Route path="/dashboard" element={<DashboardWrapper />} />
      <Route path="/game" element={<ScavengerHuntPageWrapper />} />
      <Route path="/qr-scanner/:checkpointId" element={<QRScannerPageWrapper />} />
      <Route path="/progress" element={<ProgressPageWrapper />} />
      <Route path="/complete" element={<CompletionPageWrapper />} />
      <Route path="/leaderboard" element={<LeaderboardPageWrapper />} />
      {/* Catch all route - redirect based on auth status */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
      />
    </Routes>
  );
};

const App: React.FC = () => {
  // Initialize state from localStorage or defaults
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('talabat_phone_number') || '';
  });
  const [gameSession, setGameSession] = useState<GameSession | null>(() => {
    const saved = localStorage.getItem('talabat_game_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [gameCompletionData, setGameCompletionData] = useState<{
    timeElapsed: number;
    scannedQRs: string[];
  } | null>(() => {
    const saved = localStorage.getItem('talabat_completion_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number | null>(() => {
    const saved = localStorage.getItem('talabat_current_checkpoint');
    return saved ? JSON.parse(saved) : null;
  });

  // Enhanced setters that persist to localStorage
  const setPhoneNumberWithPersistence = (phone: string) => {
    setPhoneNumber(phone);
    if (phone) {
      localStorage.setItem('talabat_phone_number', phone);
    } else {
      localStorage.removeItem('talabat_phone_number');
    }
  };

  const setGameSessionWithPersistence = (session: GameSession | null) => {
    setGameSession(session);
    if (session) {
      localStorage.setItem('talabat_game_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('talabat_game_session');
    }
  };

  const setGameCompletionDataWithPersistence = (data: { timeElapsed: number; scannedQRs: string[] } | null) => {
    setGameCompletionData(data);
    if (data) {
      localStorage.setItem('talabat_completion_data', JSON.stringify(data));
    } else {
      localStorage.removeItem('talabat_completion_data');
    }
  };

  const setCurrentCheckpointWithPersistence = (checkpoint: number | null) => {
    setCurrentCheckpoint(checkpoint);
    if (checkpoint !== null) {
      localStorage.setItem('talabat_current_checkpoint', JSON.stringify(checkpoint));
    } else {
      localStorage.removeItem('talabat_current_checkpoint');
    }
  };

  return (
    <AppContext.Provider value={{
      phoneNumber,
      setPhoneNumber: setPhoneNumberWithPersistence,
      gameSession,
      setGameSession: setGameSessionWithPersistence,
      gameCompletionData,
      setGameCompletionData: setGameCompletionDataWithPersistence,
      currentCheckpoint,
      setCurrentCheckpoint: setCurrentCheckpointWithPersistence,
    }}>
      <Router>
        <AppContent />
      </Router>
    </AppContext.Provider>
  );
};

export default App;