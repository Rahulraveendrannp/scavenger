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
    console.log('🔍 GamePage component rendered!'); // Test if component renders
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [scannedQRs, setScannedQRs] = useState<string[]>([]);
    const [currentClue, setCurrentClue] = useState(session.route[0]?.clue || '');
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [completedCheckpoint, setCompletedCheckpoint] = useState<string>('');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [qrInput, setQrInput] = useState('');
    const [showQRScannerPage, setShowQRScannerPage] = useState(false);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Load existing progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progressResponse = await ScavengerAPI.getGameProgress();
        console.log('Loading progress from database:', progressResponse);
        
        // Check for token expiration
        if (!progressResponse.success && progressResponse.error?.includes('Session expired')) {
          // Redirect to registration page
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
          
          // Update current state to track progress
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

  const handleQRScan = async (scannedQRCode?: string) => {
    console.log('🔍 handleQRScan called with:', scannedQRCode);
    console.log('🔍 isScanning:', isScanning);
    
    if (isScanning) {
      console.log('🔍 Already scanning, returning early');
      return;
    }
    
    console.log('🔍 Setting isScanning to true');
    setIsScanning(true);
    setScanError('');
    
    // Clear any previous error messages
    setScanError('');

    try {
      // Get the current checkpoint based on scanned count
      const currentCheckpoint = session.route[scannedQRs.length];
      if (!currentCheckpoint) {
        setScanError('No more checkpoints available.');
        setIsScanning(false);
        return;
      }

             const currentCheckpointId = scannedQRs.length + 1;
       const expectedQRCode = getExpectedQRCode(currentCheckpointId);
       
       console.log('🔍 Starting QR scan for checkpoint:', currentCheckpointId);
       console.log('🔍 Current checkpoint location:', currentCheckpoint.location);
       console.log('🔍 Expected QR code:', expectedQRCode);
       console.log('🔍 Scanned QR code:', scannedQRCode);

       if (!scannedQRCode || !validateQRCode(scannedQRCode, expectedQRCode)) {
         console.log('❌ Invalid QR code scanned');
         setScanError('Incorrect QR code! Please scan the correct QR code for this checkpoint.');
         setIsScanning(false);
         return;
       }

       console.log('✅ Valid QR code! Making API call to save progress...');

       const response = await ScavengerAPI.completeCheckpoint(
         currentCheckpointId,
         currentCheckpoint.location
       );

      console.log('🔍 API Response:', response);

      // Check for token expiration
      if (!response.success && response.error?.includes('Session expired')) {
        console.log('🔍 Session expired, redirecting to registration');
        // Redirect to registration page
        window.location.href = '/';
        return;
      }
      
             if (response.success) {
         console.log('🔍 Checkpoint completed successfully!');
         console.log('🔍 Response data:', response.data);
         
         const newScanned = [...scannedQRs, `qr-${currentCheckpointId}`];
         setScannedQRs(newScanned);

         console.log('🔍 Updated scannedQRs:', newScanned);
         console.log('🔍 Progress should now show:', newScanned.length, '/', session.route.length);

         // Show success popup and auto-close after 2 seconds
         setCompletedCheckpoint(currentCheckpoint.location);
         setShowSuccessPopup(true);
         
         // Clear QR scanner state
         setShowQRScanner(false);
         setShowQRScannerPage(false);
         setQrInput('');
         setScanError('');
         
         // Auto-close popup after 2 seconds
         setTimeout(() => {
           setShowSuccessPopup(false);
         }, 2000);

        // Check if game is complete
        if (newScanned.length >= session.route.length) {
          setIsCompleted(true);
          console.log('🎉 Game completed! All checkpoints finished.');
          onGameComplete(timeElapsed, newScanned);
        } else if (session.route[newScanned.length]) {
          // Set next clue from route
          setCurrentClue(session.route[newScanned.length].clue);
          console.log('🔍 Next clue set:', session.route[newScanned.length].clue);
        }
             } else {
         console.error('❌ Checkpoint completion failed:', response.error);
         console.error('❌ Full response:', response);
         setScanError(`Failed to complete checkpoint: ${response.error}`);
       }
    } catch (error) {
      console.error('❌ QR scan error:', error);
      setScanError('Failed to validate QR code. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const progress = session.route.length > 0 ? (scannedQRs.length / session.route.length) * 100 : 0;
  const timeRemaining = Math.max(0, 1800 - timeElapsed); // 30 minutes = 1800 seconds
  const isOvertime = timeElapsed > 1800;
  const isGameComplete = isCompleted || scannedQRs.length >= session.route.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* DEBUG INFO */}
      <div className="bg-red-100 p-2 mb-4 text-red-800 text-xs">
        DEBUG: Component rendered | isScanning: {isScanning.toString()} | qrInput: "{qrInput}" | Button disabled: {(isScanning || !qrInput.trim()).toString()}
      </div>
      
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
                   alert('Main Scan QR Code button clicked!'); // Simple test
                   setShowQRScannerPage(true);
                 }}
                 disabled={isScanning}
                 className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 {isScanning ? 'Scanning...' : 'Scan QR Code'}
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

       {/* QR Scanner Page */}
        {showQRScannerPage && (
          <div className="fixed inset-0 bg-gray-900 z-50">
            <div className="min-h-screen p-4">
              <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setShowQRScannerPage(false)}
                    className="text-white hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-bold text-white">{completedCheckpoint || `Checkpoint ${scannedQRs.length + 1}`}</h2>
                  <div className="w-6"></div>
                </div>

                                 {/* Scanner Content */}
                 <div className="space-y-6">
                   <p className="text-white text-center">Scan QR code of this checkpoint</p>
                   
                   {/* Camera Button */}
                   <div className="text-center">
                                           <button
                        onClick={() => {
                          alert('Camera button clicked!'); // Simple test
                          console.log('🔍 Camera button clicked!');
                          const expectedQR = getExpectedQRCode(scannedQRs.length + 1);
                          console.log('🔍 Expected QR for camera:', expectedQR);
                          handleQRScan(expectedQR);
                        }}
                        disabled={isScanning}
                        className="bg-green-500 text-white px-8 py-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                      >
                        {isScanning ? 'Scanning...' : '📷 Open Camera'}
                      </button>
                   </div>

                                       {/* Manual Input */}
                    <div className="space-y-2">
                      <p className="text-center text-gray-300">Or enter QR code:</p>
                      <input
                        type="text"
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="Enter QR code here..."
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      
                      {/* Test Button */}
                      <button
                        onClick={() => {
                          alert('TEST BUTTON WORKING!');
                          console.log('🔍 TEST BUTTON CLICKED!');
                        }}
                        className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        TEST BUTTON
                      </button>
                      
                      <button
                        onClick={() => {
                          alert('Button clicked!'); // Simple test
                          console.log('🔍 Validate QR Code button clicked!');
                          console.log('🔍 qrInput value:', qrInput);
                          console.log('🔍 isScanning:', isScanning);
                          console.log('🔍 qrInput.trim():', qrInput.trim());
                          console.log('🔍 Button disabled:', isScanning || !qrInput.trim());
                          handleQRScan(qrInput);
                        }}
                        disabled={isScanning || !qrInput.trim()}
                        className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isScanning ? 'Validating...' : 'Validate QR Code'}
                      </button>
                    </div>

                   {/* Error Display */}
                   {scanError && (
                     <div className="p-3 bg-red-900 border border-red-500 rounded-lg">
                       <p className="text-red-300 text-sm">{scanError}</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default GamePage;