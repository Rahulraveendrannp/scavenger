import React, { useState, useEffect } from 'react';
import { Gamepad2, Puzzle, Car, Search, QrCode, Star, Trophy } from 'lucide-react';
import { ScavengerAPI } from '../api';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'offline' | 'scavenger';
  isCompleted: boolean;
  isUnlocked?: boolean;
}

interface DashboardProps {
  phoneNumber: string;
  onStartScavengerHunt: () => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ phoneNumber, onStartScavengerHunt, onLogout }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuthentication = () => {
      const token = localStorage.getItem('jwt_token');
      const phoneNumber = localStorage.getItem('talabat_phone_number');
      
      console.log('🔐 Dashboard: Checking authentication...');
      console.log('🔐 Dashboard: Token exists:', !!token);
      console.log('🔐 Dashboard: Phone number exists:', !!phoneNumber);
      
      if (!token || !phoneNumber) {
        console.log('🔐 Dashboard: No authentication found, redirecting to registration');
        window.location.href = '/';
        return false;
      }
      
      console.log('🔐 Dashboard: Authentication verified');
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
        console.log('🔍 Dashboard: API health check:', healthResponse);
        
        if (!healthResponse.success) {
          console.error('❌ Dashboard: API server is not accessible:', healthResponse.error);
          // Continue with fallback data
        }
        
        const [progressResponse, scavengerProgressResponse] = await Promise.all([
          ScavengerAPI.getUserProgress(),
          ScavengerAPI.getGameProgress()
        ]);
        
        console.log('📊 Dashboard: Progress responses:', {
          userProgress: progressResponse,
          scavengerProgress: scavengerProgressResponse
        });
        
        // Check for token expiration
        if (!progressResponse.success && progressResponse.error?.includes('Session expired')) {
          // Redirect to registration page
          window.location.href = '/';
          return;
        }
        
        if (!scavengerProgressResponse.success && scavengerProgressResponse.error?.includes('Session expired')) {
          // Redirect to registration page
          window.location.href = '/';
          return;
        }
        
        const defaultGames = [
          {
            id: 'card-game',
            title: 'Card Game',
            description: 'Complete the offline card game and scan QR',
            icon: <Gamepad2 className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'puzzle',
            title: 'Puzzle',
            description: 'Solve the puzzle and scan QR to complete',
            icon: <Puzzle className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'car-race',
            title: 'Car Race',
            description: 'Finish the car race and scan QR',
            icon: <Car className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'scavenger-hunt',
            title: 'Scavenger Hunt',
            description: 'Scan QR to enter the treasure hunt',
            icon: <Search className="w-8 h-8" />,
            type: 'scavenger' as const,
            isCompleted: false
          }
        ];

        // Update games based on database progress
        const updatedGames: Game[] = defaultGames.map(game => {
          if (game.id === 'scavenger-hunt') {
            // For scavenger hunt, check if all 8 checkpoints are completed
            const scavengerCompleted = scavengerProgressResponse.success && 
              scavengerProgressResponse.data && 
              scavengerProgressResponse.data.totalFound >= 8;
            const completedCount = scavengerProgressResponse.success && scavengerProgressResponse.data 
              ? scavengerProgressResponse.data.totalFound || 0 
              : 0;
            
            // Check if scavenger hunt has been unlocked (QR scanned)
            const scavengerUnlocked = progressResponse.success && 
              progressResponse.data?.progress?.dashboardGames?.scavengerHunt?.isCompleted;
            
            return { 
              ...game, 
              isCompleted: scavengerCompleted || false,
              isUnlocked: scavengerUnlocked || false,
              description: scavengerCompleted 
                ? `Find all 8 checkpoints (${completedCount}/8 completed)`
                : scavengerUnlocked 
                ? `Start your adventure! (${completedCount}/8 completed)`
                : `Scan QR to enter the treasure hunt`
            };
          } else {
            // For other games, check dashboard progress from UserProgress model
            const dashboardGames = progressResponse.success && progressResponse.data?.progress?.dashboardGames;
            let isCompleted = false;
            
            if (dashboardGames) {
              switch (game.id) {
                case 'card-game':
                  isCompleted = dashboardGames.cardGame?.isCompleted || false;
                  break;
                case 'puzzle':
                  isCompleted = dashboardGames.puzzle?.isCompleted || false;
                  break;
                case 'car-race':
                  isCompleted = dashboardGames.carRace?.isCompleted || false;
                  break;
              }
            }
            
            return { ...game, isCompleted: isCompleted || false };
          }
        });

        setGames(updatedGames);
        console.log('✅ Dashboard: Progress loaded successfully');
        console.log('📊 Dashboard: Final games state:', updatedGames);
        console.log('📊 Dashboard: Completed games count:', updatedGames.filter(g => g.isCompleted).length);
      } catch (error) {
        console.error('❌ Dashboard: Error loading progress:', error);
        // Fallback to default games
        setGames([
          {
            id: 'card-game',
            title: 'Card Game',
            description: 'Complete the offline card game and scan QR',
            icon: <Gamepad2 className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'puzzle',
            title: 'Puzzle',
            description: 'Solve the puzzle and scan QR to complete',
            icon: <Puzzle className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'car-race',
            title: 'Car Race',
            description: 'Finish the car race and scan QR',
            icon: <Car className="w-8 h-8" />,
            type: 'offline' as const,
            isCompleted: false
          },
          {
            id: 'scavenger-hunt',
            title: 'Scavenger Hunt',
            description: 'Scan QR to enter the treasure hunt',
            icon: <Search className="w-8 h-8" />,
            type: 'scavenger' as const,
            isCompleted: false
          }
        ]);
      } finally {
        console.log('🏁 Dashboard: Loading completed, setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadProgress();
  }, []);

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

  const completedGames = games.filter(game => game.isCompleted).length;
  const progressPercentage = (completedGames / games.length) * 100;

  // Save dashboard game progress to database
  const saveDashboardGameProgress = async (gameId: string) => {
    try {
      console.log('Calling completeDashboardGame for:', gameId);
      const response = await ScavengerAPI.completeDashboardGame(gameId);
      
      console.log('completeDashboardGame response:', response);
      
      if (response.success) {
        console.log('Dashboard game progress saved:', response.data);
        
        // Show completion celebration
        showGameCompletionCelebration(gameId);
      } else {
        console.error('Failed to save dashboard game progress:', response.error);
      }
    } catch (error) {
      console.error('Error saving dashboard game progress:', error);
    }
  };

  // Show completion celebration for dashboard games
  const showGameCompletionCelebration = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const celebration = document.createElement('div');
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
    const game = games.find(g => g.id === gameId);
    if (game) {
      setSelectedGame(game);
      setShowQRScanner(true);
      setScanError('');
    }
  };

  const handleQRScanResult = (qrData: string) => {
    if (!selectedGame) return;

    // Expected QR codes for each game
    const expectedQRCodes = {
      'card-game': 'TALABAT_CARD_COMPLETE',
      'puzzle': 'TALABAT_PUZZLE_COMPLETE', 
      'car-race': 'TALABAT_RACE_COMPLETE',
      'scavenger-hunt': 'TALABAT_SCAVENGER_ENTRY'
    };

    const expectedCode = expectedQRCodes[selectedGame.id as keyof typeof expectedQRCodes];

    if (qrData === expectedCode) {
      if (selectedGame.type === 'scavenger') {
        // For scavenger hunt, mark as unlocked and start the game
        const updatedGames = games.map(game => 
          game.id === selectedGame.id 
            ? { ...game, isUnlocked: true, description: 'Start your adventure! (0/8 completed)' }
            : game
        );
        setGames(updatedGames);
        
        // Save progress to localStorage  
        const progressData = updatedGames.reduce((acc, game) => {
          acc[game.id] = game.isCompleted || (game.isUnlocked || false);
          return acc;
        }, {} as Record<string, boolean>);
        localStorage.setItem('talabat_user_progress', JSON.stringify(progressData));
        
        // Save to database
        console.log('Saving dashboard game progress for:', selectedGame.id);
        saveDashboardGameProgress(selectedGame.id);
        
        setShowQRScanner(false);
        onStartScavengerHunt();
      } else {
        // For offline games, mark as completed and return to dashboard immediately
        const updatedGames = games.map(game => 
          game.id === selectedGame.id 
            ? { ...game, isCompleted: true }
            : game
        );
        setGames(updatedGames);
        
        // Save progress to localStorage
        const progressData = updatedGames.reduce((acc, game) => {
          acc[game.id] = game.isCompleted;
          return acc;
        }, {} as Record<string, boolean>);
        localStorage.setItem('talabat_user_progress', JSON.stringify(progressData));
        
        // Save progress to database
        saveDashboardGameProgress(selectedGame.id);
        
        // Close QR scanner immediately and return to dashboard
        setShowQRScanner(false);
        setScanError('');
        setScanSuccess(false);
      }
    } else {
      setScanError('Wrong QR code! Please scan the correct QR for this game.');
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setSelectedGame(null);
    setScanError('');
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
        gameName={selectedGame?.title || ''}
        gameType={selectedGame?.type || 'offline'}
        onScanResult={handleQRScanResult}
        onClose={closeQRScanner}
        error={scanError}
        isSuccess={scanSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 p-2 sm:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Talabat</h1>
            <p className="text-sm sm:text-base text-gray-600">Gaming Hub</p>
          </div>
          <div className="text-right">
            <p className="text-xs sm:text-sm text-gray-500">Welcome</p>
            <p className="text-sm sm:text-base font-semibold text-gray-700 truncate max-w-[120px] sm:max-w-none">{phoneNumber}</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-xs sm:text-sm text-gray-500">{completedGames}/{games.length} completed</span>
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
            <span className="hidden sm:inline">{games.length - completedGames} Remaining</span>
            <span className="sm:hidden">{games.length - completedGames}</span>
          </div>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        {games.map((game) => (
          <div 
            key={game.id}
            className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl ${
              game.isCompleted ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl ${
                game.isCompleted ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                <div className="w-6 h-6 sm:w-8 sm:h-8">
                  {game.icon}
                </div>
              </div>
              {game.isCompleted && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  ✓ COMPLETED
                </div>
              )}
            </div>
            
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{game.title}</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{game.description}</p>
            
            <button
              onClick={() => {
                if (game.type === 'scavenger' && (game.isUnlocked || game.isCompleted)) {
                  // If scavenger hunt is unlocked or completed, go directly to hunt
                  onStartScavengerHunt();
                } else {
                  // Otherwise, show QR scanner
                  handleScanQR(game.id);
                }
              }}
              disabled={game.isCompleted && game.type !== 'scavenger'}
              className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${
                game.isCompleted && game.type !== 'scavenger'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : game.type === 'scavenger' && (game.isUnlocked || game.isCompleted)
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : game.type === 'scavenger'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {game.type === 'scavenger' && (game.isUnlocked || game.isCompleted) ? (
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="hidden sm:inline">
                {game.isCompleted && game.type !== 'scavenger'
                  ? 'Completed' 
                  : game.type === 'scavenger' && game.isCompleted
                  ? 'Continue Hunt'
                  : game.type === 'scavenger' && game.isUnlocked
                  ? 'Resume Hunt'
                  : game.type === 'scavenger' 
                  ? 'Scan to Enter Hunt' 
                  : 'Scan to Complete'
                }
              </span>
              <span className="sm:hidden">
                {game.isCompleted && game.type !== 'scavenger'
                  ? 'Done' 
                  : game.type === 'scavenger' && game.isCompleted
                  ? 'Continue'
                  : game.type === 'scavenger' && game.isUnlocked
                  ? 'Resume'
                  : game.type === 'scavenger' 
                  ? 'Enter Hunt' 
                  : 'Complete'
                }
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

// QR Scanner Modal Component
const QRScannerModal: React.FC<{
  gameName: string;
  gameType: 'offline' | 'scavenger';
  onScanResult: (qrData: string) => void;
  onClose: () => void;
  error: string;
  isSuccess: boolean;
}> = ({ gameName, gameType, onScanResult, onClose, error, isSuccess }) => {
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScanResult(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-green-600 mb-2">Success!</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">{gameName} completed successfully!</p>
            <div className="text-sm text-gray-500">Returning to dashboard...</div>
          </div>
        ) : (
          <>
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Scan QR Code</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              {gameType === 'scavenger' 
                ? `Scan the QR code to enter the ${gameName} adventure!`
                : <>Scan the QR code for: <strong>{gameName}</strong></>
              }
            </p>
          </>
        )}
        
        {!isSuccess && (
          <>
            {/* QR Scanner would go here - for now showing manual input */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center mb-3 sm:mb-4">
              <QrCode className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm sm:text-base text-gray-500">QR Scanner will be here</p>
            </div>

            {/* Manual Code Input for Testing */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Manual Code Entry (for testing)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter QR code"
                  className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                />
                <button
                  onClick={handleManualSubmit}
                  className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-600 text-sm sm:text-base"
                >
                  Submit
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-3 sm:mb-4 text-sm sm:text-base">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>

            {/* Expected codes for testing */}
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Expected codes for testing:</p>
              <div className="text-xs space-y-1">
                <p>Card Game: TALABAT_CARD_COMPLETE</p>
                <p>Puzzle: TALABAT_PUZZLE_COMPLETE</p>
                <p>Car Race: TALABAT_RACE_COMPLETE</p>
                <p>Scavenger Hunt: TALABAT_SCAVENGER_ENTRY</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;