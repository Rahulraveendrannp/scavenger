// App.tsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import type { GameSession } from "./types";
import { ScavengerAPI } from "./api";

// Import all page components
import LandingPage from "./components/LandingPage";
import InstructionsPage from "./components/InstructionsPage";
import RegistrationPage from "./components/RegistrationPage";
import OTPPage from "./components/OTPPage";
import Dashboard from "./components/Dashboard";
import ScavengerHuntPage from "./components/ScavengerHuntPage";
import AdminPage from "./components/AdminPage";
import WelcomePage from "./components/WelcomePage";

import ProgressPage from "./components/ProgressPage";

import ScavengerHuntIntro from "./components/ScavengerHuntIntro";
import ScavengerHuntFinish from "./components/ScavengerHuntFinish";
import ClaimPrize from "./components/ClaimPrize";

// Context to share state across components
const AppContext = React.createContext<{
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  gameSession: GameSession | null;
  setGameSession: (session: GameSession | null) => void;
  gameCompletionData: { timeElapsed: number; scannedQRs: string[] } | null;
  setGameCompletionData: (
    data: { timeElapsed: number; scannedQRs: string[] } | null
  ) => void;
  currentCheckpoint: number | null;
  setCurrentCheckpoint: (id: number | null) => void;
}>({
  phoneNumber: "",
  setPhoneNumber: () => {},
  gameSession: null,
  setGameSession: () => {},
  gameCompletionData: null,
  setGameCompletionData: () => {},
  currentCheckpoint: null,
  setCurrentCheckpoint: () => {},
});

// Wrapper components for each route
const WelcomePageWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/register");
  };

  return <WelcomePage onStart={handleStart} />;
};

const LandingPageWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleStartHunt = () => {
    navigate("/instructions");
  };

  return <LandingPage onStartHunt={handleStartHunt} />;
};

const InstructionsPageWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/register");
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
    navigate("/verify-otp");
  };

  return <RegistrationPage onBack={handleBack} onSuccess={handleSuccess} />;
};

const OTPPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { phoneNumber, setGameSession } = React.useContext(AppContext);

  const handleBack = () => {
    navigate("/register");
  };

  const handleSuccess = (session: GameSession) => {
    setGameSession(session);
    navigate("/dashboard");
  };

  return (
    <OTPPage
      onBack={handleBack}
      onSuccess={handleSuccess}
      phoneNumber={phoneNumber}
    />
  );
};

const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate();
  const {
    phoneNumber,
    gameSession,
    setGameSession,
    setPhoneNumber,
    setGameCompletionData,
    setCurrentCheckpoint,
  } = React.useContext(AppContext);

  const handleStartScavengerHunt = async () => {
    try {
      console.log("🎯 App: Starting scavenger hunt...");
      
      // Mark scavenger hunt as started in the database
      const response = await ScavengerAPI.startScavengerHunt();
      
      if (response.success) {
        console.log("✅ App: Scavenger hunt marked as started");
        navigate("/game");
      } else {
        console.error("❌ App: Failed to start scavenger hunt:", response.error);
        // Still navigate to game even if marking as started fails
        navigate("/game");
      }
    } catch (error) {
      console.error("❌ App: Error starting scavenger hunt:", error);
      // Still navigate to game even if there's an error
      navigate("/game");
    }
  };

  const handleLogout = () => {
    console.log("🔐 App: Logging out user...");

    // Clean up session-specific intro state
    if (gameSession) {
      const sessionIntroKey = `readScavengerRules_${gameSession.userId}`;
      localStorage.removeItem(sessionIntroKey);
    }

    // Clean up any other session-specific intro keys from previous sessions
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("readScavengerRules_")) {
        localStorage.removeItem(key);
      }
    });

    // Call the API logout method to clear tokens properly
    ScavengerAPI.logout();
    // Clear all localStorage data
    localStorage.removeItem("talabat_phone_number");
    localStorage.removeItem("talabat_game_session");
    localStorage.removeItem("talabat_completion_data");
    localStorage.removeItem("talabat_current_checkpoint");
    localStorage.removeItem("talabat_user_progress");
    localStorage.removeItem("talabat_scavenger_progress");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("readScavengerRules"); // Clean up old key as well

    // Reset all state
    setGameSession(null);
    setPhoneNumber("");
    setGameCompletionData(null);
    setCurrentCheckpoint(null);
    console.log("🔐 App: Logout completed, redirecting to registration");
    navigate("/");
  };

  return (
    <Dashboard
      phoneNumber={phoneNumber}
      onStartScavengerHunt={handleStartScavengerHunt}
      onLogout={handleLogout}
    />
  );
};

const AdminPageWrapper: React.FC = () => {
  return <AdminPage />;
};

const ScavengerHuntPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { phoneNumber, gameSession } = React.useContext(AppContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isScavengerStarted, setIsScavengerStarted] = useState(false);

  // Create a unique key for this game session to track intro completion
  const sessionIntroKey = gameSession
    ? `readScavengerRules_${gameSession.userId}`
    : null;

  // Track if rules have been read for this specific game session
  const [isReadScavengerRulesRed, setIsReadScavengerRulesRed] = useState(() => {
    if (!sessionIntroKey) return false;

    // Clean up old intro keys from previous sessions to prevent localStorage bloat
    const cleanupOldIntroKeys = () => {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("readScavengerRules_") && key !== sessionIntroKey) {
          localStorage.removeItem(key);
        }
      });
    };
    cleanupOldIntroKeys();

    return localStorage.getItem(sessionIntroKey) === "true";
  });

  // Check if scavenger hunt is started from database
  useEffect(() => {
    const checkScavengerStatus = async () => {
      try {
        const response = await ScavengerAPI.getUserProgress();
        if (response.success && response.data?.progress?.dashboardGames?.scavengerHunt?.isStarted) {
          setIsScavengerStarted(true);
        } else {
          // If not started, redirect to dashboard
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Error checking scavenger hunt status:", error);
        // On error, redirect to dashboard
        navigate("/dashboard", { replace: true });
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkScavengerStatus();
  }, [navigate]);

  // Handler for "Start" button in intro
  const handleStartScavengerHuntIntro = () => {
    if (sessionIntroKey) {
      localStorage.setItem(sessionIntroKey, "true");
      setIsReadScavengerRulesRed(true);
    }
  };

  // Handler for game completion
  const handleGameComplete = () => {
    // Don't reset the intro state here - let it persist for the session
    // Go directly back to dashboard instead of completion page
    navigate("/game/finish");
  };

  // Redirect if not authenticated at all
  if (!phoneNumber) {
    return <Navigate to="/" replace />;
  }

    // Check if session exists and is valid
  if (!gameSession) {
    // If no valid session, redirect to registration
    return <Navigate to="/" replace />;
  }

  // Show loading while checking scavenger hunt status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FF5900] flex items-center justify-center">
        <div className="bg-[#F4EDE3] rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5900] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scavenger hunt...</p>
        </div>
      </div>
    );
  }

  // If scavenger hunt is not started, don't render anything (redirect will happen)
  if (!isScavengerStarted) {
    return null;
  }

  return (
    <>
      {!isReadScavengerRulesRed ? (
        <ScavengerHuntIntro onStart={handleStartScavengerHuntIntro} />
      ) : (
        <ScavengerHuntPage
          session={gameSession}
          onGameComplete={handleGameComplete}
        />
      )}
    </>
  );
};

const ProgressPageWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleContinueHunt = () => {
    navigate("/game");
  };

  const handleClaimPrize = () => {
    navigate("/complete");
  };

  return (
    <ProgressPage
      totalFound={3}
      totalCheckpoints={8}
      currentTier="Bronze"
      onContinueHunt={handleContinueHunt}
      onClaimPrize={handleClaimPrize}
    />
  );
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
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <WelcomePageWrapper />
          )
        }
      />
      <Route path="/landing" element={<LandingPageWrapper />} />
      <Route path="/instructions" element={<InstructionsPageWrapper />} />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegistrationPageWrapper />
          )
        }
      />
      <Route
        path="/verify-otp"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <OTPPageWrapper />
          )
        }
      />
      <Route path="/dashboard" element={<DashboardWrapper />} />
      <Route path="/admin" element={<AdminPageWrapper />} />
      <Route path="/game" element={<ScavengerHuntPageWrapper />} />
      <Route path="/game/finish" element={<ScavengerHuntFinish />} />

      <Route path="/claim" element={<ClaimPrize />} />

      <Route path="/progress" element={<ProgressPageWrapper />} />
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
    return localStorage.getItem("talabat_phone_number") || "";
  });
  const [gameSession, setGameSession] = useState<GameSession | null>(() => {
    const saved = localStorage.getItem("talabat_game_session");
    return saved ? JSON.parse(saved) : null;
  });
  const [gameCompletionData, setGameCompletionData] = useState<{
    timeElapsed: number;
    scannedQRs: string[];
  } | null>(() => {
    const saved = localStorage.getItem("talabat_completion_data");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number | null>(
    () => {
      const saved = localStorage.getItem("talabat_current_checkpoint");
      return saved ? JSON.parse(saved) : null;
    }
  );

  const [userProgress, setUserProgress] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Check authentication on app load
  useEffect(() => {
    const checkAuthentication = () => {
      const token = localStorage.getItem("jwt_token");
      const savedPhoneNumber = localStorage.getItem("talabat_phone_number");

      console.log("🔐 App: Checking authentication on load...");
      console.log("🔐 App: Token exists:", !!token);
      console.log("🔐 App: Phone number exists:", !!savedPhoneNumber);

      // If we have a token but no phone number, or vice versa, clear everything
      if ((token && !savedPhoneNumber) || (!token && savedPhoneNumber)) {
        console.log(
          "🔐 App: Inconsistent authentication state, clearing all data"
        );
        localStorage.clear();
        setPhoneNumber("");
        setGameSession(null);
        setGameCompletionData(null);
        setCurrentCheckpoint(null);
        return false;
      }

      // If we have both token and phone number, verify they're valid
      if (token && savedPhoneNumber) {
        console.log("🔐 App: Authentication found, verifying...");
        // The actual verification will happen when components try to use the token
        return true;
      }

      console.log("🔐 App: No authentication found");
      return false;
    };

    checkAuthentication();
  }, []);

  // Load user progress when authenticated
  useEffect(() => {
    const loadUserProgress = async () => {
      if (phoneNumber && gameSession && !userProgress) {
        try {
          const response = await ScavengerAPI.getUserProgress();
          if (response.success) {
            setUserProgress(response.data);
            console.log("User progress loaded:", response.data);
          } else {
            console.error("Failed to load user progress:", response.error);
          }
        } catch (error) {
          console.error("Error loading user progress:", error);
        }
      }
    };

    loadUserProgress();
  }, [phoneNumber, gameSession, userProgress]);

  // Enhanced setters that persist to localStorage
  const setPhoneNumberWithPersistence = (phone: string) => {
    setPhoneNumber(phone);
    if (phone) {
      localStorage.setItem("talabat_phone_number", phone);
    } else {
      localStorage.removeItem("talabat_phone_number");
    }
  };

  const setGameSessionWithPersistence = (session: GameSession | null) => {
    setGameSession(session);
    if (session) {
      localStorage.setItem("talabat_game_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("talabat_game_session");
    }
  };

  const setGameCompletionDataWithPersistence = (
    data: { timeElapsed: number; scannedQRs: string[] } | null
  ) => {
    setGameCompletionData(data);
    if (data) {
      localStorage.setItem("talabat_completion_data", JSON.stringify(data));
    } else {
      localStorage.removeItem("talabat_completion_data");
    }
  };

  const setCurrentCheckpointWithPersistence = (checkpoint: number | null) => {
    setCurrentCheckpoint(checkpoint);
    if (checkpoint !== null) {
      localStorage.setItem(
        "talabat_current_checkpoint",
        JSON.stringify(checkpoint)
      );
    } else {
      localStorage.removeItem("talabat_current_checkpoint");
    }
  };

  return (
    <AppContext.Provider
      value={{
        phoneNumber,
        setPhoneNumber: setPhoneNumberWithPersistence,
        gameSession,
        setGameSession: setGameSessionWithPersistence,
        gameCompletionData,
        setGameCompletionData: setGameCompletionDataWithPersistence,
        currentCheckpoint,
        setCurrentCheckpoint: setCurrentCheckpointWithPersistence,
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </AppContext.Provider>
  );
};

export default App;
