import React, { useState } from 'react';
import { Gamepad2, Puzzle, Car, Search, QrCode, Star, Trophy } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'offline' | 'scavenger';
  isCompleted: boolean;
}

interface DashboardProps {
  phoneNumber: string;
  onStartScavengerHunt: () => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ phoneNumber, onStartScavengerHunt, onLogout }) => {
  const [games, setGames] = useState<Game[]>(() => {
    // Load saved progress from localStorage
    const savedProgress = localStorage.getItem('talabat_user_progress');
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

    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        // Merge saved progress with default games
        return defaultGames.map(game => ({
          ...game,
          isCompleted: parsed[game.id] || false
        }));
      } catch (error) {
        console.error('Error parsing saved progress:', error);
        return defaultGames;
      }
    }
    
    return defaultGames;
  });

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [scanError, setScanError] = useState('');

  const completedGames = games.filter(game => game.isCompleted).length;
  const progressPercentage = (completedGames / games.length) * 100;

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
        // For scavenger hunt, start the game
        setShowQRScanner(false);
        onStartScavengerHunt();
      } else {
        // For offline games, mark as completed
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
        
        setShowQRScanner(false);
        setScanError('');
      }
    } else {
      setScanError('Wrong QR code! Please scan the correct QR for this game.');
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
    setSelectedGame(null);
    setScanError('');
  };

  if (showQRScanner) {
    return (
      <QRScannerModal
        gameName={selectedGame?.title || ''}
        onScanResult={handleQRScanResult}
        onClose={closeQRScanner}
        error={scanError}
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
              onClick={() => handleScanQR(game.id)}
              disabled={game.isCompleted}
              className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors text-sm sm:text-base ${
                game.isCompleted
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : game.type === 'scavenger'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">
                {game.isCompleted 
                  ? 'Completed' 
                  : game.type === 'scavenger' 
                  ? 'Scan to Enter Hunt' 
                  : 'Scan to Complete'
                }
              </span>
              <span className="sm:hidden">
                {game.isCompleted 
                  ? 'Done' 
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
      <div className="text-center">
        <button
          onClick={onLogout}
          className="bg-white text-gray-600 px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

// QR Scanner Modal Component
const QRScannerModal: React.FC<{
  gameName: string;
  onScanResult: (qrData: string) => void;
  onClose: () => void;
  error: string;
}> = ({ gameName, onScanResult, onClose, error }) => {
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
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Scan QR Code</h3>
        <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Scan the QR code for: <strong>{gameName}</strong></p>
        
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
      </div>
    </div>
  );
};

export default Dashboard;