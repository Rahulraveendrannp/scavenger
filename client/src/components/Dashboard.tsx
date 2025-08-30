
import React, { useState, useEffect } from "react";
import {
  QrCode,
  Search,
  Star,
  Trophy,
} from "lucide-react";
import { ScavengerAPI } from "../api";
import SimpleQRScanner from "./SimpleQRScanner";

// Custom SVG Icon Components
const LunchboxIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img src="/Lunchbox.svg" alt="Lunchbox" className={className} />
);

const RunnerIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img src="/Runner.svg" alt="Runner" className={className} />
);

const ScavengerIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img src="/Scavenger.svg" alt="Scavenger" className={className} />
);

const TalabeatIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img src="/Talabeat.svg" alt="Talabeat" className={className} />
);

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: "offline" | "scavenger";
  isCompleted: boolean;
  isStarted?: boolean;
}

interface DashboardProps {
  phoneNumber: string;
  onStartScavengerHunt: () => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  phoneNumber,
  onStartScavengerHunt,
  onLogout,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuthentication = () => {
      const token = localStorage.getItem("jwt_token");
      const phoneNumber = localStorage.getItem("talabat_phone_number");

      console.log("🔐 Dashboard: Checking authentication...");
      console.log("🔐 Dashboard: Token exists:", !!token);
      console.log("🔐 Dashboard: Phone number exists:", !!phoneNumber);

      if (!token || !phoneNumber) {
        console.log(
          "🔐 Dashboard: No authentication found, redirecting to registration"
        );
        window.location.href = "/";
        return false;
      }

      console.log("🔐 Dashboard: Authentication verified");
      return true;
    };

    if (!checkAuthentication()) {
      return;
    }
  }, []);

  // Load progress from database on mount
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const healthResponse = await ScavengerAPI.healthCheck();
        console.log("🔍 Dashboard: API health check:", healthResponse);

        if (!healthResponse.success) {
          console.error(
            "❌ Dashboard: API server is not accessible:",
            healthResponse.error
          );
          // Continue with fallback data
        }

        const phoneNumber = localStorage.getItem("talabat_phone_number");

        const [progressResponse, scavengerProgressResponse, claimResponse] =
          await Promise.all([
            ScavengerAPI.getUserProgress(),
            ScavengerAPI.getGameProgress(),
            phoneNumber
              ? ScavengerAPI.checkUserClaimed(phoneNumber)
              : Promise.resolve({ success: false, data: { isClaimed: false } }),
          ]);

        // Check if user is claimed
        console.log("🔍 Dashboard: Claim response structure:", claimResponse);
        let isUserClaimed = false;
        if (claimResponse.success && claimResponse.data?.isClaimed) {
          console.log("✅ Dashboard: User is claimed, setting isClaimed to true");
          isUserClaimed = true;
          setIsClaimed(true);
        }

        console.log("📊 Dashboard: Progress responses:", {
          userProgress: progressResponse,
          scavengerProgress: scavengerProgressResponse,
        });

        // Check for token expiration
        if (
          !progressResponse.success &&
          progressResponse.error?.includes("Session expired")
        ) {
          // Redirect to registration page
          window.location.href = "/";
          return;
        }

        if (
          !scavengerProgressResponse.success &&
          scavengerProgressResponse.error?.includes("Session expired")
        ) {
          // Redirect to registration page
          window.location.href = "/";
          return;
        }

                 const defaultGames = [
           {
             id: "lunchbox-matcher",
             title: "Zoomu's Lunchbox Matcher",
             description: "Pair up and match the lunchbox.",
             icon: <LunchboxIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
           {
             id: "city-run",
             title: "Flexu's City Run",
             description: "Beat the clock and grab the goodies.",
             icon: <RunnerIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
           {
             id: "scavenger-hunt",
             title: "Tasku's Scavenger Hunt",
             description: "Get your clues and hunt for hidden codes.",
             icon: <ScavengerIcon className="w-8 h-8" />,
             type: "scavenger" as const,
             isCompleted: false,
           },
           {
             id: "talabeats",
             title: "Funzu's talabeats",
             description: "Tap to the rhythm of the talabat jingle.",
             icon: <TalabeatIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
         ];

        // Update games based on database progress
        const updatedGames: Game[] = defaultGames.map((game) => {
          if (game.id === "scavenger-hunt") {
            // For scavenger hunt, check if at least 4 checkpoints are completed (half completion)
            const completedCount =
              scavengerProgressResponse.success &&
              scavengerProgressResponse.data
                ? scavengerProgressResponse.data.totalFound || 0
                : 0;
            
            // Check if all 10 checkpoints are completed
            const allCheckpointsCompleted = completedCount >= 10;
            
            // Use the isCompleted field from API if available, otherwise calculate based on 5+ checkpoints
            const scavengerCompleted = 
              scavengerProgressResponse.success &&
              scavengerProgressResponse.data?.isCompleted !== undefined
                ? scavengerProgressResponse.data.isCompleted
                : completedCount >= 5;
            
            // Check if scavenger hunt has been started (QR scanned)
            const scavengerStarted =
              progressResponse.success &&
              progressResponse.data?.progress?.dashboardGames?.scavengerHunt
                ?.isStarted;

            return {
              ...game,
              isCompleted: scavengerCompleted || false,
              isStarted: scavengerStarted || false,
              allCheckpointsCompleted: allCheckpointsCompleted,
              isClaimed: isUserClaimed,
              description: isUserClaimed
                ? `Reward claimed! Thank you for playing!`
                : allCheckpointsCompleted
                ? `All checkpoints completed!`
                : scavengerCompleted
                ? `Prize unlocked! (${completedCount}/10)\nHunt all for bigger prizes!`
                : scavengerStarted
                                      ? `Continue your adventure! (${completedCount}/10 completed)`
                  : `Start your treasure hunt adventure!`,
            };
          } else {
            // For other games, check dashboard progress from UserProgress model
            const dashboardGames =
              progressResponse.success &&
              progressResponse.data?.progress?.dashboardGames;
            let isCompleted = false;

            if (dashboardGames) {
              switch (game.id) {
                case "lunchbox-matcher":
                  isCompleted = dashboardGames.lunchboxMatcher?.isCompleted || false;
                  break;
                case "city-run":
                  isCompleted = dashboardGames.cityRun?.isCompleted || false;
                  break;
                case "talabeats":
                  isCompleted = dashboardGames.talabeats?.isCompleted || false;
                  break;
              }
            }

                         return { ...game, isCompleted: isCompleted || false, isClaimed: isUserClaimed };
          }
        });

        setGames(updatedGames);
        console.log("✅ Dashboard: Progress loaded successfully");
        console.log("📊 Dashboard: Final games state:", updatedGames);
        console.log(
          "📊 Dashboard: Completed games count:",
          updatedGames.filter((g) => g.isCompleted).length
        );
      } catch (error) {
        console.error("❌ Dashboard: Error loading progress:", error);
        // Fallback to default games
                 setGames([
           {
             id: "lunchbox-matcher",
             title: "Zoomu's Lunchbox Matcher",
             description: "Pair up and match the lunchbox.",
             icon: <LunchboxIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
           {
             id: "city-run",
             title: "Flexu's City Run",
             description: "Beat the clock and grab the goodies.",
             icon: <RunnerIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
           {
             id: "scavenger-hunt",
             title: "Tasku's Scavenger Hunt",
             description: "Get your clues and hunt for hidden codes.",
             icon: <ScavengerIcon className="w-8 h-8" />,
             type: "scavenger" as const,
             isCompleted: false,
           },
           {
             id: "talabeats",
             title: "Funzu's talabeats",
             description: "Tap to the rhythm of the talabat jingle.",
             icon: <TalabeatIcon className="w-8 h-8" />,
             type: "offline" as const,
             isCompleted: false,
           },
         ]);
      } finally {
        console.log(
          "🏁 Dashboard: Loading completed, setting isLoading to false"
        );
        setIsLoading(false);
      }
    };

    loadProgress();
  }, []);

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [showClaimQR, setShowClaimQR] = useState(false);
  const [showConfirmClaim, setShowConfirmClaim] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);

  const completedGames = games.filter((game) => game.isCompleted).length;
  const progressPercentage = (completedGames / games.length) * 100;
  
  // Get scavenger hunt progress for display
  const scavengerGame = games.find(game => game.id === "scavenger-hunt");
  const scavengerProgress = scavengerGame?.isStarted 
    ? (() => {
        // Extract progress from description if available
                 const match = scavengerGame.description.match(/\((\d+)\/10/);
        return match ? parseInt(match[1]) : 0;
      })()
    : 0;

  // NEW: Function to get expected QR code for each game
  const getExpectedQRCode = (gameId: string): string => {
    const expectedQRCodes = {
      "lunchbox-matcher": "TALABAT_LUNCHBOX_MATCHER_COMPLETE",
      "city-run": "TALABAT_CITY_RUN_COMPLETE",
      "talabeats": "TALABAT_TALABEATS_COMPLETE",
    };

    return expectedQRCodes[gameId as keyof typeof expectedQRCodes] || "";
  };



  const handleClaimClick = () => {
    // Check if user has completed at least two games
    if (completedGames < 2) {
      // Show user-friendly message
             const message = document.createElement("div");
       message.innerHTML = `
         <div style="
           position: fixed;
           top: 50%;
           left: 50%;
           transform: translate(-50%, -50%);
           background: #FF5900;
           color: white;
           padding: 20px 30px;
           border-radius: 15px;
           font-size: 16px;
           font-weight: bold;
           z-index: 1000;
           box-shadow: 0 10px 25px rgba(0,0,0,0.3);
           animation: messagePop 3s ease-in-out;
           text-align: center;
           width: 80%;
           max-width: 400px;
         ">
           🎮 You need to complete at least two games to claim your reward!
         </div>
        <style>
          @keyframes messagePop {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
          }
        </style>
      `;

      document.body.appendChild(message);

      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 3000);
      
      return;
    }
    
    // Show confirmation modal for claim flow
    setShowConfirmClaim(true);
  };

  const closeClaimQR = () => {
    setShowClaimQR(false);
  };

  // Save dashboard game progress to database
  const saveDashboardGameProgress = async (gameId: string) => {
    try {
      // Check if game is already completed to avoid duplicate celebrations
      const game = games.find((g) => g.id === gameId);
      if (game?.isCompleted) {
        console.log("Game already completed, skipping celebration:", gameId);
        return;
      }

      console.log("Calling completeDashboardGame for:", gameId);
      const response = await ScavengerAPI.completeDashboardGame(gameId);

      console.log("completeDashboardGame response:", response);

      if (response.success) {
        console.log("Dashboard game progress saved:", response.data);

        // Show completion celebration only for newly completed games
        showGameCompletionCelebration(gameId);
      } else {
        console.error(
          "Failed to save dashboard game progress:",
          response.error
        );
      }
    } catch (error) {
      console.error("Error saving dashboard game progress:", error);
    }
  };

  // Show completion celebration for dashboard games
  const showGameCompletionCelebration = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    const message = game.type === "scavenger" 
      ? "🎯 start hunting!" 
      : `🎉 ${game.title} Completed! ✓`;

    const celebration = document.createElement("div");
    celebration.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #FF5900;
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        animation: celebrationPop 2s ease-in-out;
      ">
        ${message}
      </div>
      <style>
        @keyframes celebrationPop {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      </style>
    `;

    document.body.appendChild(celebration);

    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
    }, 2000);
  };

  const handleScanQR = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (game) {
      // Check if game is already completed
      if (game.isCompleted) {
        console.log("Game already completed, cannot scan again:", gameId);
        return;
      }
      
      // Don't allow QR scanning for scavenger hunt games
      if (game.type === "scavenger") {
        console.log("Scavenger hunt games don't need QR scanning, starting directly:", gameId);
        onStartScavengerHunt();
        return;
      }
      
      setSelectedGame(game);
      setShowQRScanner(true);
    }
  };

  const handleQRScanResult = (qrData: string) => {
    if (!selectedGame) return;

    // Check if game is already completed
    if (selectedGame.isCompleted) {
      console.log("Game already completed, ignoring scan:", selectedGame.id);
      setShowQRScanner(false);
      return;
    }

    console.log("QR Scan Result:", qrData);
    console.log("Expected QR Code:", getExpectedQRCode(selectedGame.id));

    // The validation is now handled inside SimpleQRScanner
    // This function will only be called if the QR code is valid

    // For offline games, mark as completed and return to dashboard immediately
    const updatedGames = games.map((game) =>
      game.id === selectedGame.id ? { ...game, isCompleted: true } : game
    );
    setGames(updatedGames);

    // Save progress to localStorage
    const progressData = updatedGames.reduce((acc, game) => {
      acc[game.id] = game.isCompleted;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem(
      "talabat_user_progress",
      JSON.stringify(progressData)
    );

    // Save progress to database
    saveDashboardGameProgress(selectedGame.id);

    // Close QR scanner immediately and return to dashboard
    setShowQRScanner(false);

    setScanSuccess(false);
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setSelectedGame(null);
    setScanSuccess(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FF5900] flex items-center justify-center">
        <div className="bg-[#F4EDE3] rounded-sm p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5900] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (showQRScanner) {
    return (
      <QRScannerModal
        gameName={selectedGame?.title || ""}
        gameType={selectedGame?.type || "offline"}
        expectedQRCode={getExpectedQRCode(selectedGame?.id || "")}
        onScanResult={handleQRScanResult}
        onClose={closeQRScanner}
        isSuccess={scanSuccess}
      />
    );
  }

  if (showConfirmClaim) {
    return (
      <ConfirmClaimModal
        allGamesWon={completedGames === games.length}
        onCancel={() => setShowConfirmClaim(false)}
        onContinue={() => {
          setShowConfirmClaim(false);
          setShowClaimQR(true);
        }}
      />
    );
  }

  if (showClaimQR) {
    return <ClaimVoucherModal onClose={closeClaimQR} />;
  }

  return (
    <div className="min-h-screen bg-[#FF5900] p-4 font-body">
      {/* Header */}
      <div className="bg-[#F4EDE3] rounded-sm shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading text-[#FF5900] mb-1">
              <span className="text-2xl sm:text-3xl">talabat</span>{" "}
              <span className="text-xl sm:text-2xl">Game Zone</span>
            </h1>
            <p className="text-sm w-[80%] sm:text-base text-gray-600 mt-1">
              Your digital Back to Something stamp card.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-gray-500">Welcome</p>
            <p className="text-sm sm:text-base font-body text-gray-700 truncate max-w-[120px] sm:max-w-none">
              {phoneNumber}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-body text-gray-700">
              You've completed {completedGames}/4 games
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-green-500 h-2 sm:h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
              <span className="hidden sm:inline">{completedGames} Completed</span>
              <span className="sm:hidden">{completedGames}</span>
            </div>
          </div>
          <button
            onClick={handleClaimClick}
            disabled={isClaimed}
            className={`px-6 py-2 rounded-full text-sm font-body transition-colors ${
              isClaimed
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#FF5900] hover:bg-[#E54D00] text-white"
            }`}
          >
            {isClaimed ? "Claimed" : "Claim"}
          </button>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`bg-[#F4EDE3] rounded-sm shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl flex flex-col h-full ${
              game.isCompleted ? "ring-2 ring-green-500" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={`p-1 sm:p-3 rounded-xl`}
              >
                <div className="w-8 h-6 sm:w-8 sm:h-8">{game.icon}</div>
              </div>
              {game.isCompleted && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-body">
                  <span className="hidden sm:inline">
                    {game.id === "scavenger-hunt" && (game as any).allCheckpointsCompleted ? "✓ COMPLETED" : game.id === "scavenger-hunt" ? "✓ HALF COMPLETE" : "✓ COMPLETED"}
                  </span>
                  <span className="sm:hidden">
                    {game.id === "scavenger-hunt" ? "✓" : "✓"}
                  </span>
                </div>
              )}
            </div>

            <h3 className="text-sm sm:text-lg font-heading text-gray-800 mb-2 min-h-[2rem] sm:min-h-[2.5rem] leading-tight">
              {game.title}
            </h3>
            <p className="text-sm font-body sm:text-base text-gray-600 mb-3 sm:mb-4 flex-grow">
              {game.description}
            </p>

            <div className="mt-auto">
              <button
                onClick={() => {
                  // If user has claimed, don't allow any actions
                  if ((game as any).isClaimed) {
                    console.log("User has claimed, no actions allowed");
                    return;
                  }
                  
                  if (game.type === "scavenger") {
                    // For scavenger hunt, check if all checkpoints are completed
                    if ((game as any).allCheckpointsCompleted) {
                      console.log("All checkpoints completed, cannot start hunt");
                      return;
                    }
                    // For scavenger hunt, always go directly to hunt (no QR scanning needed)
                    onStartScavengerHunt();
                  } else if (!game.isCompleted) {
                    // For other games, show QR scanner if not completed
                    handleScanQR(game.id);
                  }
                }}
                disabled={(game as any).isClaimed || (game.type === "scavenger" && (game as any).allCheckpointsCompleted)}
                className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-full font-body flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${
                  (game as any).isClaimed
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : (game as any).allCheckpointsCompleted
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : game.isCompleted
                    ? game.type === "scavenger"
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : game.type === "scavenger"
                    ? "bg-purple-500 hover:bg-purple-600 text-white"
                    : "bg-[#FF5900] hover:bg-[#E54D00] text-white"
                }`}
              >
                {game.type === "scavenger" ? (
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline">
                  {(game as any).allCheckpointsCompleted
                    ? "Done"
                    : game.isCompleted
                    ? game.type === "scavenger" 
                      ? "Resume Hunt"
                      : "Completed"
                    : game.type === "scavenger" && game.isStarted
                    ? "Resume Hunt"
                    : game.type === "scavenger"
                    ? "Start Hunt"
                    : "Scan to Complete"}
                </span>
                <span className="sm:hidden">
                  {(game as any).allCheckpointsCompleted
                    ? "Done"
                    : game.isCompleted
                    ? game.type === "scavenger" 
                      ? "Resume"
                      : "Done"
                    : game.type === "scavenger" && game.isStarted
                    ? "Resume"
                    : game.type === "scavenger"
                    ? "Start"
                    : "Scan"}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="text-center mt-6">
        <button
          onClick={onLogout}
          className="bg-[#411517] text-white px-4 py-2 rounded-full hover:bg-[#411517]/80 transition-colors text-xs sm:text-base font-body"
        >
           Logout
        </button>
      </div>
    </div>
  );
};

// Updated QR Scanner Modal Component
const QRScannerModal: React.FC<{
  gameName: string;
  gameType: "offline" | "scavenger";
  expectedQRCode: string;
  onScanResult: (qrData: string) => void;
  onClose: () => void;
  isSuccess: boolean;
}> = ({
  gameName,
  gameType,
  expectedQRCode,
  onScanResult,
  onClose,
  isSuccess,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-[#F4EDE3] rounded-sm p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-heading text-green-600 mb-2">
              Success!
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {gameName} completed successfully!
            </p>
            <div className="text-sm text-gray-500">
              Returning to dashboard...
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-lg sm:text-xl font-heading mb-3 sm:mb-4">
              Scan QR Code
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Scan the checkpoint QR code for: <strong>{gameName}</strong>
            </p>

            {/* Direct QR Scanner with expected QR code validation */}
            <SimpleQRScanner
              title={""}
              expectedQRCode={expectedQRCode}
              onScan={(scannedCode: string) => {
                onScanResult(scannedCode);
              }}
              onClose={onClose}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Claim Voucher Modal Component
const ClaimVoucherModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isScratched, setIsScratched] = useState(false);
  const [error, setError] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<any>(null);

  useEffect(() => {
    const generateVoucher = async () => { 
      try {
        setIsGenerating(true);
        setError("");

        const phoneNumber = localStorage.getItem("talabat_phone_number");
        if (!phoneNumber) {
          throw new Error("Phone number not found");
        }

        // Get game progress and generate voucher code in parallel
        const [progressResponse, scavengerProgressResponse, voucherResponse] =
          await Promise.all([
            ScavengerAPI.getUserProgress(),
            ScavengerAPI.getGameProgress(),
            ScavengerAPI.generateVoucher(phoneNumber),
          ]);

        // Process voucher code
        if (voucherResponse.success && voucherResponse.data?.voucherCode) {
          setVoucherCode(voucherResponse.data.voucherCode);
          console.log('ClaimVoucherModal: Voucher code retrieved/generated for user');
        } else {
          throw new Error(voucherResponse.error || "Failed to generate voucher code");
        }

        // Process game status
        if (progressResponse.success && scavengerProgressResponse.success) {
          const dashboardGames = progressResponse.data?.progress?.dashboardGames;
          const scavengerProgress = scavengerProgressResponse.data?.totalFound || 0;
          const scavengerStarted = dashboardGames?.scavengerHunt?.isStarted || false;
          
          // Use the isCompleted field from API if available, otherwise calculate based on 4+ checkpoints
          const scavengerCompleted = 
            scavengerProgressResponse.data?.isCompleted !== undefined
              ? scavengerProgressResponse.data.isCompleted
              : scavengerProgress >= 5;
          
          setGameStatus({
            lunchboxMatcher: dashboardGames?.lunchboxMatcher?.isCompleted || false,
            cityRun: dashboardGames?.cityRun?.isCompleted || false,
            talabeats: dashboardGames?.talabeats?.isCompleted || false,
            scavengerHunt: scavengerCompleted,
            scavengerStarted: scavengerStarted,
            scavengerProgress: scavengerProgress
          });
        }

      } catch (error) {
        console.error("Error generating voucher code:", error);
        setError(
          error instanceof Error ? error.message : "Failed to generate voucher code"
        );
      } finally {
        setIsGenerating(false);
      }
    };

    generateVoucher();
  }, []);

  const handleScratch = () => {
    setIsScratched(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-sm p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-heading mb-3 sm:mb-4">
            Claim Your Reward
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Tap below to reveal your voucher code and show it to booth staff
          </p>
          
          {/* Voucher Code Display */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <div className="text-center">
              {isGenerating ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5900]"></div>
                  <span className="ml-2 text-gray-600">
                    Generating voucher code...
                  </span>
                </div>
              ) : error ? (
                <div className="text-red-500 text-sm">{error}</div>
              ) : (
                <div className="bg-[#F4EDE3] p-4 rounded-sm border-2 border-dashed border-gray-300">
                  <div 
                    className={`relative inline-block cursor-pointer ${
                      isScratched ? 'pointer-events-none' : ''
                    }`}
                    onClick={handleScratch}
                  >
                    <div className={`rounded-sm p-4 min-w-[120px] text-center ${
                      isScratched ? 'bg-[#F4EDE3]' : 'bg-gray-300'
                    }`}>
                      {isScratched ? (
                        <span className="text-2xl font-heading text-[#8B4513] tracking-wider">
                          {voucherCode}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Tap Here</span>
                        </div>
                      )}
                    </div>
                    
                    {!isScratched && (
                      <div className="absolute inset-0 bg-[#411517] rounded-lg flex items-center justify-center">
                                                 <span className="text-white text-sm font-body"> Tap Here</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

           {/* Game Status Display */}
           {gameStatus && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="text-xs text-gray-500 mb-3 text-center">
                Game Progress
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                                     <span className="text-sm font-body">Lunchbox Matcher</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-heading ${
                      gameStatus.lunchboxMatcher
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {gameStatus.lunchboxMatcher ? "✓ Completed" : "✗ Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                                     <span className="text-sm font-body">City Run</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-heading ${
                      gameStatus.cityRun
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {gameStatus.cityRun ? "✓ Completed" : "✗ Pending"}
                  </span>
                </div>
                                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body">Scavenger Hunt</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-heading ${
                        gameStatus.scavengerHunt
                          ? "bg-green-100 text-green-700"
                          : gameStatus.scavengerStarted
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {gameStatus.scavengerHunt
                                                 ? `✓ Completed (${gameStatus.scavengerProgress}/10)`
                         : gameStatus.scavengerStarted
                         ? `${gameStatus.scavengerProgress}/10`
                        : "✗ Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body">Talabeats</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-heading ${
                        gameStatus.talabeats
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {gameStatus.talabeats ? "✓ Completed" : "✗ Pending"}
                    </span>
                  </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="bg-[#FF5900] text-white px-6 py-2 rounded-lg hover:bg-[#E54D00] transition-colors text-sm sm:text-base font-body"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Confirm Claim Modal Component
const ConfirmClaimModal: React.FC<{
  allGamesWon: boolean;
  onCancel: () => void;
  onContinue: () => void;
}> = ({ allGamesWon, onCancel, onContinue }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel}></div>
      <div className="relative bg-[#F4EDE3] rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-gray-200">
        <div className="text-center">
          <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${allGamesWon ? 'bg-yellow-100' : 'bg-orange-100'}`}>
            <span className={`text-2xl ${allGamesWon ? 'text-yellow-600' : 'text-orange-600'}`}>{allGamesWon ? '🏆' : '🎮'}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-heading text-gray-900 mb-1">Confirm Claim</h3>
          {allGamesWon ? (
            <div className="bg-white rounded-lg border border-yellow-100 p-3 text-left">
              <p className="text-sm sm:text-base text-gray-800 font-heading mb-1">You’ve won it all — time to claim your prize.</p>
              <p className="text-xs sm:text-sm text-gray-600">You can play again, but no extra rewards.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-orange-100 p-3 text-left">
              <p className="text-sm sm:text-base text-gray-800 font-heading mb-1">You haven’t finished all the games.</p>
              <p className="text-xs sm:text-sm text-gray-600">Claiming now ends your chance to win more.</p>
            </div>
          )}
          <div className="h-px bg-gray-200 my-4"></div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="border border-gray-300 bg-white text-gray-800 py-2.5 px-4 rounded-full hover:bg-gray-50 transition-colors font-body text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onContinue}
              className="bg-[#FF5900] text-white py-2.5 px-4 rounded-full hover:bg-[#E54D00] transition-colors font-body text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

