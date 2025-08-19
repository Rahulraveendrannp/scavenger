import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Puzzle,
  Car,
  Search,
  QrCode,
  Star,
  Trophy,
} from "lucide-react";
import { ScavengerAPI } from "../api";
import SimpleQRScanner from "./SimpleQRScanner";

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: "offline" | "scavenger";
  isCompleted: boolean;
  isUnlocked?: boolean;
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
          "🔐 Dashboard: No authentication found, redirecting to registration",
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
            healthResponse.error,
          );
          // Continue with fallback data
        }

        const phoneNumber = localStorage.getItem("talabat_phone_number");
        
        const [progressResponse, scavengerProgressResponse, claimResponse] = await Promise.all([
          ScavengerAPI.getUserProgress(), 
          ScavengerAPI.getGameProgress(),
          phoneNumber ? ScavengerAPI.checkUserClaimed(phoneNumber) : Promise.resolve({ success: false, data: { isClaimed: false } })
        ]);

        // Check if user is claimed
        if (claimResponse.success && claimResponse.data?.isClaimed) {
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
            id: "card-game",
            title: "Card Game",
            description: "Complete the offline card game and scan QR",
            icon: <Gamepad2 className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "puzzle",
            title: "Puzzle",
            description: "Solve the puzzle and scan QR to complete",
            icon: <Puzzle className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "car-race",
            title: "Car Race",
            description: "Finish the car race and scan QR",
            icon: <Car className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "scavenger-hunt",
            title: "Scavenger Hunt",
            description: "Scan QR to enter the treasure hunt",
            icon: <Search className="w-8 h-8" />,
            type: "scavenger" as const,
            isCompleted: false,
          },
        ];

                 // Update games based on database progress
         const updatedGames: Game[] = defaultGames.map((game) => {
           if (game.id === "scavenger-hunt") {
             // For scavenger hunt, check if all 8 checkpoints are completed
             const scavengerCompleted =
               scavengerProgressResponse.success &&
               scavengerProgressResponse.data &&
               scavengerProgressResponse.data.totalFound >= 8;
             const completedCount =
               scavengerProgressResponse.success &&
                 scavengerProgressResponse.data
                 ? scavengerProgressResponse.data.totalFound || 0
                 : 0;

             // Check if scavenger hunt has been started (QR scanned)
             const scavengerStarted =
               progressResponse.success &&
               progressResponse.data?.progress?.dashboardGames?.scavengerHunt
                 ?.isStarted;

             return {
               ...game,
               isCompleted: scavengerCompleted || false,
               isUnlocked: scavengerStarted || false,
               description: scavengerCompleted
                 ? `Find all 8 checkpoints (${completedCount}/8 completed)`
                 : scavengerStarted
                   ? `Start your adventure! (${completedCount}/8 completed)`
                   : `Scan QR to enter the treasure hunt`,
             };
          } else {
            // For other games, check dashboard progress from UserProgress model
            const dashboardGames =
              progressResponse.success &&
              progressResponse.data?.progress?.dashboardGames;
            let isCompleted = false;

            if (dashboardGames) {
              switch (game.id) {
                case "card-game":
                  isCompleted = dashboardGames.cardGame?.isCompleted || false;
                  break;
                case "puzzle":
                  isCompleted = dashboardGames.puzzle?.isCompleted || false;
                  break;
                case "car-race":
                  isCompleted = dashboardGames.carRace?.isCompleted || false;
                  break;
              }
            }

            return { ...game, isCompleted: isCompleted || false };
          }
        });

        setGames(updatedGames);
        console.log("✅ Dashboard: Progress loaded successfully");
        console.log("📊 Dashboard: Final games state:", updatedGames);
        console.log(
          "📊 Dashboard: Completed games count:",
          updatedGames.filter((g) => g.isCompleted).length,
        );
      } catch (error) {
        console.error("❌ Dashboard: Error loading progress:", error);
        // Fallback to default games
        setGames([
          {
            id: "card-game",
            title: "Card Game",
            description: "Complete the offline card game and scan QR",
            icon: <Gamepad2 className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "puzzle",
            title: "Puzzle",
            description: "Solve the puzzle and scan QR to complete",
            icon: <Puzzle className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "car-race",
            title: "Car Race",
            description: "Finish the car race and scan QR",
            icon: <Car className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "scavenger-hunt",
            title: "Scavenger Hunt",
            description: "Scan QR to enter the treasure hunt",
            icon: <Search className="w-8 h-8" />,
            type: "scavenger" as const,
            isCompleted: false,
          },
        ]);
      } finally {
        console.log(
          "🏁 Dashboard: Loading completed, setting isLoading to false",
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
  const [isClaimed, setIsClaimed] = useState(false);

  const completedGames = games.filter((game) => game.isCompleted).length;
  const progressPercentage = (completedGames / games.length) * 100;

  // NEW: Function to get expected QR code for each game
  const getExpectedQRCode = (gameId: string): string => {
    const expectedQRCodes = {
      "card-game": "TALABAT_CARD_COMPLETE",
      puzzle: "TALABAT_PUZZLE_COMPLETE",
      "car-race": "TALABAT_RACE_COMPLETE",
      "scavenger-hunt": "TALABAT_SCAVENGER_ENTRY",
    };

    return expectedQRCodes[gameId as keyof typeof expectedQRCodes] || "";
  };

  // Generate claim QR code
  const generateClaimQRCode = async (): Promise<string> => {
    const phoneNumber = localStorage.getItem("talabat_phone_number");
    if (!phoneNumber) {
      throw new Error("Phone number not found");
    }

    try {
      const response = await ScavengerAPI.generateClaimQR(phoneNumber);
      if (response.success && response.data?.qrCode) {
        return response.data.qrCode;
      } else {
        throw new Error(response.error || "Failed to generate QR code");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      throw error;
    }
  };

  const handleClaimClick = () => {
    setShowClaimQR(true);
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
          response.error,
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

    const celebration = document.createElement("div");
    celebration.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        animation: celebrationPop 2s ease-in-out;
      ">
        🎉 ${game.title} Completed! ✓
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

         if (selectedGame.type === "scavenger") {
       // For scavenger hunt, mark as started (not completed)
       const updatedGames = games.map((game) =>
         game.id === selectedGame.id
           ? {
             ...game,
             isUnlocked: true,
             description: "Start your adventure! (0/8 completed)",
           }
           : game
       );
       setGames(updatedGames);

       // Save progress to localStorage  
       const progressData = updatedGames.reduce((acc, game) => {
         acc[game.id] = game.isCompleted || game.isUnlocked || false;
         return acc;
       }, {} as Record<string, boolean>);
       localStorage.setItem(
         "talabat_user_progress",
         JSON.stringify(progressData)
       );

       // Save to database - mark as started, not completed
       console.log("Saving dashboard game progress for:", selectedGame.id);
       saveDashboardGameProgress(selectedGame.id);

       setShowQRScanner(false);
       onStartScavengerHunt();
    } else {
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
        JSON.stringify(progressData),
      );

      // Save progress to database
      saveDashboardGameProgress(selectedGame.id);

      // Close QR scanner immediately and return to dashboard
      setShowQRScanner(false);

      setScanSuccess(false);
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setSelectedGame(null);
    setScanSuccess(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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

  if (showClaimQR) {
    return (
      <ClaimQRModal
        onClose={closeClaimQR}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 p-2 sm:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">
              talabat
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Gaming Hub</p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-gray-500">Welcome</p>
            <p className="text-sm sm:text-base font-semibold text-gray-700 truncate max-w-[120px] sm:max-w-none">
              {phoneNumber}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500">
                {completedGames}/{games.length} completed
              </span>
              <button
                onClick={handleClaimClick}
                disabled={isClaimed}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  isClaimed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
              >
                {isClaimed ? "CLAIMED" : "CLAIM"}
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div
              className="bg-green-500 h-2 sm:h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
            <span className="hidden sm:inline">{completedGames} Completed</span>
            <span className="sm:hidden">{completedGames}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
            <span className="hidden sm:inline">
              {games.length - completedGames} Remaining
            </span>
            <span className="sm:hidden">{games.length - completedGames}</span>
          </div>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl ${game.isCompleted ? "ring-2 ring-green-500" : ""
              }`}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={`p-2 sm:p-3 rounded-xl ${game.isCompleted
                    ? "bg-green-100 text-green-600"
                    : "bg-orange-100 text-orange-600"
                  }`}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8">{game.icon}</div>
              </div>
              {game.isCompleted && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  <span className="hidden sm:inline">✓ COMPLETED</span>
                  <span className="sm:hidden">✓</span>
                </div>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
              {game.title}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              {game.description}
            </p>

                         <button
               onClick={() => {
                 if (
                   game.type === "scavenger" &&
                   (game.isUnlocked || game.isCompleted)
                 ) {
                   // If scavenger hunt is unlocked or completed, go directly to hunt
                   onStartScavengerHunt();
                 } else if (!game.isCompleted) {
                   // Only show QR scanner if game is not completed
                   handleScanQR(game.id);
                 }
               }}
               disabled={game.isCompleted || isClaimed}
              className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${game.isCompleted
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : game.type === "scavenger" &&
                    (game.isUnlocked || game.isCompleted)
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : game.type === "scavenger"
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                }`}
            >
              {game.type === "scavenger" &&
                (game.isUnlocked || game.isCompleted) ? (
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="hidden sm:inline">
                {game.isCompleted
                  ? "Completed"
                  : game.type === "scavenger" && game.isUnlocked
                    ? "Resume Hunt"
                    : game.type === "scavenger"
                      ? "Scan to Enter Hunt"
                      : "Scan to Complete"}
              </span>
              <span className="sm:hidden">
                {game.isCompleted
                  ? "Done"
                  : game.type === "scavenger" && game.isUnlocked
                    ? "Resume"
                    : game.type === "scavenger"
                      ? "Enter Hunt"
                      : "Complete"}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="text-center mt-6">
        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-medium"
        >
          🔐 Logout
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Logout will clear all your session data
        </p>
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
        <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
              <h3 className="text-lg sm:text-xl font-bold text-green-600 mb-2">
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
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
                Scan QR Code
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                {gameType === "scavenger" ? (
                  `Scan the specific checkpoint QR code to enter the ${gameName} adventure!`
                ) : (
                  <>
                    Scan the checkpoint QR code for: <strong>{gameName}</strong>
                  </>
                )}
              </p>

              {/* Direct QR Scanner with expected QR code validation */}
              <SimpleQRScanner
                title={`Scan QR for ${gameName}`}
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

// Claim QR Modal Component
const ClaimQRModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [qrCode, setQrCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<any>(null);

  useEffect(() => {
    const generateClaimQR = async () => {
      try {
        setIsGenerating(true);
        setError("");
        
        const phoneNumber = localStorage.getItem("talabat_phone_number");
        if (!phoneNumber) {
          throw new Error("Phone number not found");
        }

        // Get game progress and generate QR code in parallel
        const [progressResponse, scavengerProgressResponse, qrResponse] = await Promise.all([
          ScavengerAPI.getUserProgress(),
          ScavengerAPI.getGameProgress(),
          ScavengerAPI.generateClaimQR(phoneNumber)
        ]);

        console.log('ClaimQRModal: API responses:', { progressResponse, scavengerProgressResponse, qrResponse });
        
        // Process QR code
        if (qrResponse.success && qrResponse.data?.qrCode) {
          setQrCode(qrResponse.data.qrCode);
          
          // Generate QR code image
          const QRCode = (await import('qrcode')).default;
          const qrDataURL = await QRCode.toDataURL(qrResponse.data.qrCode, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeImage(qrDataURL);
        } else {
          throw new Error(qrResponse.error || "Failed to generate QR code");
        }

        // Process game status
        const scavengerStarted = progressResponse.success && progressResponse.data?.progress?.dashboardGames?.scavengerHunt?.isStarted || false;
        const status = {
          cardGame: progressResponse.success && progressResponse.data?.progress?.dashboardGames?.cardGame?.isCompleted || false,
          puzzle: progressResponse.success && progressResponse.data?.progress?.dashboardGames?.puzzle?.isCompleted || false,
          carRace: progressResponse.success && progressResponse.data?.progress?.dashboardGames?.carRace?.isCompleted || false,
          scavengerHunt: scavengerProgressResponse.success && (scavengerProgressResponse.data?.totalFound || 0) >= 8 || false,
          scavengerProgress: scavengerProgressResponse.success ? (scavengerProgressResponse.data?.totalFound || 0) : 0,
          scavengerStarted: scavengerStarted
        };
        setGameStatus(status);

      } catch (error) {
        console.error('Error generating QR code:', error);
        setError(error instanceof Error ? error.message : "Failed to generate QR code");
      } finally {
        setIsGenerating(false);
      }
    };

    generateClaimQR();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
            Claim Your Reward
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Show this QR code to the booth staff to claim your reward
          </p>
          
                     {/* QR Code Display */}
           <div className="bg-gray-100 p-4 rounded-lg mb-4">
             <div className="text-center">
               <div className="text-xs text-gray-500 mb-2">QR Code</div>
               <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300 flex justify-center">
                 {isGenerating ? (
                   <div className="flex items-center justify-center h-48">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                     <span className="ml-2 text-gray-600">Generating QR Code...</span>
                   </div>
                 ) : qrCodeImage ? (
                   <img 
                     src={qrCodeImage} 
                     alt="Claim QR Code" 
                     className="w-48 h-48"
                     style={{ imageRendering: 'pixelated' }}
                   />
                                  ) : error ? (
                    <div className="text-red-500 text-sm">{error}</div>
                  ) : (
                    <div className="text-red-500 text-sm">Failed to generate QR code</div>
                  )}
               </div>
               <div className="mt-2 text-xs text-gray-500 font-mono break-all">
                 {qrCode}
               </div>
             </div>
           </div>

                       {/* Game Status Display */}
            {gameStatus && (
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="text-xs text-gray-500 mb-3 text-center">Game Progress</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Card Game</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      gameStatus.cardGame ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {gameStatus.cardGame ? '✓ Completed' : '✗ Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Puzzle</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      gameStatus.puzzle ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {gameStatus.puzzle ? '✓ Completed' : '✗ Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Car Race</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      gameStatus.carRace ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {gameStatus.carRace ? '✓ Completed' : '✗ Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Scavenger Hunt</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      gameStatus.scavengerHunt ? 'bg-green-100 text-green-700' : 
                      gameStatus.scavengerStarted ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {gameStatus.scavengerHunt ? '✓ Completed' : 
                       gameStatus.scavengerStarted ? `${gameStatus.scavengerProgress}/8` : '✗ Pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          
          <button
            onClick={onClose}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
