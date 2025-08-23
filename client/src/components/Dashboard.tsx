
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
        if (claimResponse.success && claimResponse.data?.isClaimed) {
          console.log("✅ Dashboard: User is claimed, setting isClaimed to true");
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
            icon: <Gamepad2 className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "city-run",
            title: "Flexu's City Run",
            description: "Beat the clock and grab the goodies.",
            icon: <Car className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "scavenger-hunt",
            title: "Tasku's Scavenger Hunt",
            description: "Get your clues and hunt for hidden codes.",
            icon: <Search className="w-8 h-8" />,
            type: "scavenger" as const,
            isCompleted: false,
          },
          {
            id: "talabeats",
            title: "Funzu's talabeats",
            description: "Tap to the rhythm of the talabat jingle.",
            icon: <Puzzle className="w-8 h-8" />,
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
            
            // Use the isCompleted field from API if available, otherwise calculate based on 4+ checkpoints
            const scavengerCompleted = 
              scavengerProgressResponse.success &&
              scavengerProgressResponse.data?.isCompleted !== undefined
                ? scavengerProgressResponse.data.isCompleted
                : completedCount >= 4;
            
            // Check if scavenger hunt has been started (QR scanned)
            const scavengerStarted =
              progressResponse.success &&
              progressResponse.data?.progress?.dashboardGames?.scavengerHunt
                ?.isStarted;

            return {
              ...game,
              isCompleted: scavengerCompleted || false,
              isStarted: scavengerStarted || false,
              description: scavengerCompleted
                ? `Scavenger Hunt Completed! (${completedCount}/8 checkpoints found)`
                : scavengerStarted
                  ? `Continue your adventure! (${completedCount}/8 completed)`
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

            return { ...game, isCompleted: isCompleted || false };
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
            icon: <Gamepad2 className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "city-run",
            title: "Flexu's City Run",
            description: "Beat the clock and grab the goodies.",
            icon: <Car className="w-8 h-8" />,
            type: "offline" as const,
            isCompleted: false,
          },
          {
            id: "scavenger-hunt",
            title: "Tasku's Scavenger Hunt",
            description: "Get your clues and hunt for hidden codes.",
            icon: <Search className="w-8 h-8" />,
            type: "scavenger" as const,
            isCompleted: false,
          },
          {
            id: "talabeats",
            title: "Funzu's talabeats",
            description: "Tap to the rhythm of the talabat jingle.",
            icon: <Puzzle className="w-8 h-8" />,
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
  const [isClaimed, setIsClaimed] = useState(false);

  const completedGames = games.filter((game) => game.isCompleted).length;
  const progressPercentage = (completedGames / games.length) * 100;
  
  // Get scavenger hunt progress for display
  const scavengerGame = games.find(game => game.id === "scavenger-hunt");
  const scavengerProgress = scavengerGame?.isStarted 
    ? (() => {
        // Extract progress from description if available
        const match = scavengerGame.description.match(/\((\d+)\/8/);
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

  if (showClaimQR) {
    return <ClaimVoucherModal onClose={closeClaimQR} />;
  }

  return (
    <div className="min-h-screen bg-[#FF5900] p-4 font-['TT_Commons_Pro_DemiBold']">
      {/* Header */}
      <div className="bg-[#F4EDE3] rounded-sm shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['TT_Commons_Pro_ExtraBold'] text-[#FF5900] mb-1">
              <span className="text-2xl sm:text-3xl">talabat</span>{" "}
              <span className="text-xl sm:text-2xl">Game Zone</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Your digital Back to Something stamp card.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-gray-500">Welcome</p>
            <p className="text-sm sm:text-base font-['TT_Commons_Pro_DemiBold'] text-gray-700 truncate max-w-[120px] sm:max-w-none">
              {phoneNumber}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-700">
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
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              <span className="hidden sm:inline">
                {games.length - completedGames} Remaining
              </span>
              <span className="sm:hidden">{games.length - completedGames}</span>
            </div>
          </div>
          <button
            onClick={handleClaimClick}
            disabled={isClaimed}
            className={`px-3 py-1 rounded-lg text-xs font-['TT_Commons_Pro_DemiBold'] transition-colors ${
              isClaimed
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#FF5900] hover:bg-[#E54D00] text-white"
            }`}
          >
            {isClaimed ? "CLAIMED" : "CLAIM"}
          </button>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {games.map((game) => (
          <div
            key={game.id}
            className={`bg-[#F4EDE3] rounded-sm shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl ${
              game.isCompleted ? "ring-2 ring-green-500" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={`p-2 sm:p-3 rounded-xl ${
                  game.isCompleted
                    ? "bg-green-100 text-green-600"
                    : "bg-[#FF5900]/10 text-[#FF5900]"
                }`}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8">{game.icon}</div>
              </div>
              {game.isCompleted && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-['TT_Commons_Pro_DemiBold']">
                  <span className="hidden sm:inline">
                    {game.id === "scavenger-hunt" ? "✓ HALF COMPLETE" : "✓ COMPLETED"}
                  </span>
                  <span className="sm:hidden">
                    {game.id === "scavenger-hunt" ? "✓" : "✓"}
                  </span>
                </div>
              )}
            </div>

            <h3 className="text-sm sm:text-lg font-['TT_Commons_Pro_ExtraBold'] text-gray-800 mb-2 min-h-[2rem] sm:min-h-[2.5rem] leading-tight">
              {game.title}
            </h3>
            <p className="text-sm font-['TT_Commons_Pro_DemiBold'] sm:text-base text-gray-600 mb-3 sm:mb-4">
              {game.description}
            </p>

            <button
              onClick={() => {
                if (game.type === "scavenger") {
                  // For scavenger hunt, always go directly to hunt (no QR scanning needed)
                  onStartScavengerHunt();
                } else if (!game.isCompleted) {
                  // For other games, show QR scanner if not completed
                  handleScanQR(game.id);
                }
              }}
              disabled={game.isCompleted || isClaimed}
              className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-['TT_Commons_Pro_DemiBold'] flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${
                game.isCompleted
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
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
                {game.isCompleted
                  ? "Completed"
                  : game.type === "scavenger" && game.isStarted
                  ? "Resume Hunt"
                  : game.type === "scavenger"
                  ? "Start Hunt"
                  : "Scan to Complete"}
              </span>
              <span className="sm:hidden">
                {game.isCompleted
                  ? "Done"
                  : game.type === "scavenger" && game.isStarted
                  ? "Resume"
                  : game.type === "scavenger"
                  ? "Start"
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
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm sm:text-base font-['TT_Commons_Pro_DemiBold']"
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
            <h3 className="text-lg sm:text-xl font-['TT_Commons_Pro_ExtraBold'] text-green-600 mb-2">
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
            <h3 className="text-lg sm:text-xl font-['TT_Commons_Pro_ExtraBold'] mb-3 sm:mb-4">
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
              : scavengerProgress >= 4;
          
          setGameStatus({
            lunchboxMatcher: dashboardGames?.lunchboxMatcher?.isCompleted || false,
            cityRun: dashboardGames?.cityRun?.isCompleted || false,
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
          <h3 className="text-lg sm:text-xl font-['TT_Commons_Pro_ExtraBold'] mb-3 sm:mb-4">
            Claim Your Reward
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Scratch below to reveal your voucher code and show it to booth staff
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
                        <span className="text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#8B4513] tracking-wider">
                          {voucherCode}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center">
                          <span className="text-gray-500 text-sm">👆 Scratch Here</span>
                        </div>
                      )}
                    </div>
                    
                    {!isScratched && (
                      <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-['TT_Commons_Pro_DemiBold']">👆 Scratch Here</span>
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
                  <span className="text-sm font-['TT_Commons_Pro_DemiBold']">Lunchbox Matcher</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-['TT_Commons_Pro_ExtraBold'] ${
                      gameStatus.lunchboxMatcher
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {gameStatus.lunchboxMatcher ? "✓ Completed" : "✗ Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-['TT_Commons_Pro_DemiBold']">City Run</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-['TT_Commons_Pro_ExtraBold'] ${
                      gameStatus.cityRun
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {gameStatus.cityRun ? "✓ Completed" : "✗ Pending"}
                  </span>
                </div>
                                  <div className="flex items-center justify-between">
                    <span className="text-sm font-['TT_Commons_Pro_DemiBold']">Scavenger Hunt</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-['TT_Commons_Pro_ExtraBold'] ${
                        gameStatus.scavengerHunt
                          ? "bg-green-100 text-green-700"
                          : gameStatus.scavengerStarted
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {gameStatus.scavengerHunt
                        ? "✓ Completed"
                        : gameStatus.scavengerStarted
                        ? `${gameStatus.scavengerProgress}/8`
                        : "✗ Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-['TT_Commons_Pro_DemiBold']">Talabeats</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-['TT_Commons_Pro_ExtraBold'] ${
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
            className="bg-[#FF5900] text-white px-6 py-2 rounded-lg hover:bg-[#E54D00] transition-colors text-sm sm:text-base font-['TT_Commons_Pro_DemiBold']"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

