// components/GamePage.tsx
import React, { useState, useEffect } from 'react';
import { QrCode, MapPin, CheckCircle } from 'lucide-react';
import { ScavengerAPI } from '../api';
import type { GameSession } from '../types';
import { formatTime } from '../utils';
import SimpleQRScanner from './SimpleQRScanner';

interface GamePageProps {
  session: GameSession;
  onGameComplete: (timeElapsed: number, scannedQRs: string[]) => void;
}

const GamePage: React.FC<GamePageProps> = ({ session, onGameComplete }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [scannedQRs, setScannedQRs] = useState<string[]>([]);
  const [currentClue, setCurrentClue] = useState(session.route[0]?.clue || '');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [completedCheckpoint, setCompletedCheckpoint] = useState<string>('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load existing progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progressResponse = await ScavengerAPI.getGameProgress();
        console.log('Loading progress from database:', progressResponse);
        
        // Check for token expiration
        if (!progressResponse.success && progressResponse.error?.includes('Session expired')) {
          window.location.href = '/';
          return;
        }
        
        if (progressResponse.success && progressResponse.data) {
          const completedCount = progressResponse.data.totalFound || 0;
          const completedQRs = Array.from({ length: completedCount }, (_, i) => `qr-${i + 1}`);
          setScannedQRs(completedQRs);
          
          // Set current clue based on progress
          if (completedCount < session.route.length) {
            setCurrentClue(session.route[completedCount]?.clue || '');
          } else {
            setIsCompleted(true);
          }
          
          console.log('Loaded progress:', completedCount, 'checkpoints completed');
        } else {
          console.log('No progress found, starting fresh');
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };
    
    loadProgress();
  }, [session.route.length]);

  // Save progress to database whenever scannedQRs changes
  useEffect(() => {
    const saveProgress = async () => {
      if (scannedQRs.length > 0) {
        try {
          console.log('Saving progress to database:', scannedQRs.length, 'checkpoints completed');
          
          const stateResponse = await ScavengerAPI.updateCurrentState('scavenger-hunt', scannedQRs.length);
          console.log('State update response:', stateResponse);
          
          if (!stateResponse.success) {
            console.error('Failed to update state:', stateResponse.error);
          }
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
      }
    };
    
    saveProgress();
  }, [scannedQRs.length]);

  // Timer effect
  useEffect(() => {
    let interval: number = 0;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      setTimeElapsed(elapsed);
    };
    
    interval = window.setInterval(updateTimer, 1000);
    updateTimer(); // Initial update

    return () => clearInterval(interval);
  }, [session.startTime]);

  // Get expected QR code for current checkpoint
  const getExpectedQRCode = (checkpointId: number) => {
    const qrCodes: { [key: number]: string } = {
      1: 'TALABAT_HUNT_RECEPTION_DESK',
      2: 'TALABAT_HUNT_CONFERENCE_ROOM', 
      3: 'TALABAT_HUNT_KITCHEN_AREA',
      4: 'TALABAT_HUNT_SUPPLY_CLOSET',
      5: 'TALABAT_HUNT_MANAGER_OFFICE',
      6: 'TALABAT_HUNT_BREAK_ROOM',
      7: 'TALABAT_HUNT_IT_DEPARTMENT',
      8: 'TALABAT_HUNT_MAIN_WORKSPACE'
    };
    return qrCodes[checkpointId] || '';
  };

  // Validate QR code
  const validateQRCode = (scannedQR: string, expectedQR: string) => {
    return scannedQR.trim().toUpperCase() === expectedQR.trim().toUpperCase();
  };

  const handleQRScan = async (scannedQRCode: string) => {
    try {
      // Get the current checkpoint based on scanned count
      const currentCheckpoint = session.route[scannedQRs.length];
      if (!currentCheckpoint) {
        setErrorMessage('No more checkpoints available.');
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 3000);
        return;
      }

      const currentCheckpointId = scannedQRs.length + 1;
      const expectedQRCode = getExpectedQRCode(currentCheckpointId);
      
      // Validate QR code
      if (!scannedQRCode || !validateQRCode(scannedQRCode, expectedQRCode)) {
        setErrorMessage('Incorrect QR code! Please scan the correct QR code for this checkpoint.');
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 3000);
        return;
      }

      // Make API call to save progress
      const response = await ScavengerAPI.completeCheckpoint(
        currentCheckpointId,
        currentCheckpoint.location
      );

      // Check for token expiration
      if (!response.success && response.error?.includes('Session expired')) {
        window.location.href = '/';
        return;
      }
      
      if (response.success) {
        // Show success popup and close QR scanner
        setCompletedCheckpoint(currentCheckpoint.location);
        setShowSuccessPopup(true);
        setShowQRScanner(false); // Close QR scanner when success shows
        
        // Update progress
        const newScanned = [...scannedQRs, `qr-${currentCheckpointId}`];
        setScannedQRs(newScanned);
        
        console.log('📊 Progress update:', {
          currentCheckpointId,
          newScannedLength: newScanned.length,
          totalCheckpoints: session.route.length,
          isGameComplete: newScanned.length >= session.route.length
        });
        
        // Auto-close popup after 2 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 2000);

        // Check if game is complete
        if (newScanned.length >= session.route.length) {
          // Game is 100% complete - all checkpoints done
          setIsCompleted(true);
          console.log('🎉 Game completed! All checkpoints done.');
          // Only call onGameComplete when ALL checkpoints are done
          onGameComplete(timeElapsed, newScanned);
        } else {
          // Game is NOT complete - continue hunting
          console.log('🔍 Checkpoint completed, continuing hunt...');
          // Update to next clue and stay in game
          if (session.route[newScanned.length]) {
            setCurrentClue(session.route[newScanned.length].clue);
          }
        }
      } else {
        setErrorMessage(`Failed to complete checkpoint: ${response.error}`);
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to validate QR code. Please try again.');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
    }
  };

  const progress = session.route.length > 0 ? (scannedQRs.length / session.route.length) * 100 : 0;
  const timeRemaining = Math.max(0, 1800 - timeElapsed); // 30 minutes = 1800 seconds
  const isOvertime = timeElapsed > 1800;
  const isGameComplete = isCompleted || scannedQRs.length >= session.route.length;

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
            <span className="text-sm text-gray-600 ml-2">{scannedQRs.length}/{session.route.length}</span>
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
            Current Clue {!isGameComplete && `(${scannedQRs.length + 1}/${session.route.length})`}
          </h3>
          {!isGameComplete ? (
            <p className="text-gray-700 italic text-lg leading-relaxed">
              "{currentClue}"
            </p>
          ) : (
            <div className="text-center">
              <div className="text-green-600 text-6xl mb-2">🎉</div>
              <p className="text-green-600 font-semibold text-lg">
                All clues completed! Great job!
              </p>
              <p className="text-gray-600 text-sm mt-2">
                You've successfully completed the scavenger hunt!
              </p>
            </div>
          )}
        </div>

        {/* QR Scanner */}
        {!isGameComplete && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <QrCode className="w-5 h-5 mr-2 text-orange-500" />
              Scan QR Code
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Scan the QR code for checkpoint {scannedQRs.length + 1}</p>
              
              <button 
                onClick={() => {
                  console.log('🔍 Scan button clicked! Setting showQRScanner to true');
                  setShowQRScanner(true);
                  console.log('🔍 showQRScanner state set to:', true);
                }}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                📷 Scan QR Code
              </button>
            </div>
          </div>
        )}

        {/* Scanned QRs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Checkpoints Found</h3>
          <div className="space-y-2">
            {session.route.map((checkpoint, index) => (
              <div key={checkpoint.id} className={`flex items-center ${scannedQRs.length > index ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className={`w-5 h-5 mr-2 ${scannedQRs.length > index ? 'text-green-600' : 'text-gray-300'}`} />
                <span>Checkpoint {index + 1} {scannedQRs.length > index ? 'completed' : 'pending'}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({checkpoint.location})
                </span>
                {scannedQRs.length > index && (
                  <span className="text-xs text-green-600 ml-2 font-medium">
                    ✓ Completed
                  </span>
                )}
              </div>
            ))}
          </div>
          {isGameComplete && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">
                ✅ All checkpoints completed successfully!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Task Completed!</h3>
            <p className="text-gray-600 mb-4">
              <strong>{completedCheckpoint}</strong> checkpoint completed successfully!
            </p>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-600 mb-2">Error!</h3>
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* QR Scanner - Direct Camera Access */}
      {showQRScanner && (
        <SimpleQRScanner
          title={`Checkpoint ${scannedQRs.length + 1}`}
          onScan={(scannedCode: string) => {
            console.log('🔍 QR Code scanned:', scannedCode);
            handleQRScan(scannedCode);
            // Don't close scanner automatically - let the success popup handle it
            // setShowQRScanner(false); // Remove this line
          }}
          onClose={() => {
            console.log('🔍 QR Scanner closing');
            setShowQRScanner(false);
          }}
        />
      )}
      
      {/* Debug Info */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
        Debug: showQRScanner = {showQRScanner.toString()}
      </div>
    </div>
  );
};

export default GamePage;