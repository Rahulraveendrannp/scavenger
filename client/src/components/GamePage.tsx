// components/GamePage.tsx
import React, { useState, useEffect } from 'react';
import { QrCode, MapPin, CheckCircle } from 'lucide-react';
import { ScavengerAPI } from '../api';
import type { GameSession } from '../types';
import { formatTime } from '../utils';

interface GamePageProps {
  session: GameSession;
  onGameComplete: (timeElapsed: number, scannedQRs: string[]) => void;
}

const GamePage: React.FC<GamePageProps> = ({ session, onGameComplete }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [scannedQRs, setScannedQRs] = useState<string[]>([]);
  const [currentClue, setCurrentClue] = useState(session.route[0]?.clue || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // Timer effect
  useEffect(() => {
    let interval: number    = 0;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      setTimeElapsed(elapsed);
    };
    
    interval = window.setInterval(updateTimer, 1000);
    updateTimer(); // Initial update

    return () => clearInterval(interval);
  }, [session.startTime]);

  const handleQRScan = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScanError('');

    try {
      const response = await ScavengerAPI.validateQRScan(
        session.userId, 
        `qr-${scannedQRs.length + 1}`, 
        scannedQRs.length
      );

      if (response.success && response.isValid) {
        const newScanned = [...scannedQRs, `qr-${scannedQRs.length + 1}`];
        setScannedQRs(newScanned);

        if (response.gameComplete) {
          onGameComplete(timeElapsed, newScanned);
        } else if (response.nextClue) {
          setCurrentClue(response.nextClue);
        }
      } else {
        setScanError('Invalid QR code. Please try scanning the correct code.');
      }
    } catch {
      setScanError('Failed to validate QR code. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const progress = (scannedQRs.length / 5) * 100;
  const timeRemaining = Math.max(0, 1800 - timeElapsed); // 30 minutes = 1800 seconds
  const isOvertime = timeElapsed > 1800;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Scavenger Hunt</h2>
            <div className={`text-lg font-mono ${isOvertime ? 'text-red-500' : 'text-gray-700'}`}>
              {formatTime(timeElapsed)}
              {isOvertime && ' (Overtime)'}
            </div>
          </div>
          
          <div className="flex items-center mb-2">
            <span className="text-sm text-gray-600 mr-2">Progress:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 ml-2">{scannedQRs.length}/5</span>
          </div>
          
          {timeRemaining > 0 && (
            <div className="text-xs text-gray-500">
              Time remaining: {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Current Clue */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-orange-500" />
            Current Clue {scannedQRs.length < 5 && `(${scannedQRs.length + 1}/5)`}
          </h3>
          {scannedQRs.length < 5 ? (
            <p className="text-gray-700 italic text-lg leading-relaxed">
              "{currentClue}"
            </p>
          ) : (
            <p className="text-green-600 font-semibold">
              All clues completed! Great job! 🎉
            </p>
          )}
        </div>

        {/* QR Scanner Simulation */}
        {scannedQRs.length < 5 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <QrCode className="w-5 h-5 mr-2 text-orange-500" />
              Scan QR Code
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Position QR code within the frame</p>
              
              {scanError && (
                <p className="text-red-600 text-sm mb-4">{scanError}</p>
              )}
              
              <button 
                onClick={handleQRScan}
                disabled={isScanning}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isScanning ? 'Scanning...' : 'Simulate QR Scan'}
              </button>
            </div>
          </div>
        )}

        {/* Scanned QRs */}
        {scannedQRs.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Checkpoints Found</h3>
            <div className="space-y-2">
              {scannedQRs.map((qr, index) => (
                <div key={qr} className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Checkpoint {index + 1} completed</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({session.route[index]?.location})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;