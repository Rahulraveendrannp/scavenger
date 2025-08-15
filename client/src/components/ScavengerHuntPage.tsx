// components/ScavengerHuntPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, QrCode, CheckCircle } from 'lucide-react';
import { ScavengerAPI } from '../api';
import type { ClueItem, GameProgress } from '../types';

interface ScavengerHuntPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  onGameComplete: (timeElapsed: number, scannedQRs: string[]) => void;
  onScanQR: (checkpointId: number) => void;
}

const ScavengerHuntPage: React.FC<ScavengerHuntPageProps> = ({ session, onGameComplete, onScanQR }) => {
  // Initialize hint credits and revealed hints from localStorage
  const [hintCredits, setHintCredits] = useState(() => {
    const saved = localStorage.getItem('talabat_scavenger_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.hintCredits ?? 3;
      } catch (error) {
        return 3;
      }
    }
    return 3;
  });
  
  const [revealedHints, setRevealedHints] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('talabat_scavenger_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed.revealedHints || []);
      } catch (error) {
        return new Set();
      }
    }
    return new Set();
  });
  const [checkpoints, setCheckpoints] = useState<ClueItem[]>(() => {
    // Load saved scavenger hunt progress
    const savedProgress = localStorage.getItem('talabat_scavenger_progress');
    const defaultCheckpoints = [
      {
        id: 1,
        location: 'Reception Desk',
        clue: 'Where visitors first arrive and greet the team, this place holds the main gateway.',
        hint: 'Look near the main entrance for a welcome sign.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 2,
        location: 'Conference Room',
        clue: 'Round tables and big screens, where important meetings convene.',
        hint: 'Check the large room with glass walls.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 3,
        location: 'Kitchen Area',
        clue: 'Coffee brews and lunch is made, where hungry workers get fed.',
        hint: 'Look for appliances and the coffee machine.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 4,
        location: 'Supply Closet',
        clue: 'Papers, pens, and office gear, stored neatly for all to share.',
        hint: 'Find the room with shelves full of office supplies.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 5,
        location: 'Manager Office',
        clue: 'Corner room with the best view, where important decisions come through.',
        hint: 'Look for the private office with windows.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 6,
        location: 'Break Room',
        clue: 'Relax and unwind, leave your work behind, comfy chairs you will find.',
        hint: 'Check the area with couches and recreational items.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 7,
        location: 'IT Department',
        clue: 'Cables and servers, tech support that never defers.',
        hint: 'Look for the area with lots of computer equipment.',
        isCompleted: false,
        isExpanded: false
      },
      {
        id: 8,
        location: 'Main Workspace',
        clue: 'Desks in rows, where daily productivity flows.',
        hint: 'Find the open area with multiple workstations.',
        isCompleted: false,
        isExpanded: false
      }
    ];

    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        return defaultCheckpoints.map(checkpoint => ({
          ...checkpoint,
          isCompleted: parsed.completedCheckpoints?.includes(checkpoint.id) || false
        }));
      } catch (error) {
        console.error('Error parsing scavenger progress:', error);
        return defaultCheckpoints;
      }
    }
    
    return defaultCheckpoints;
  });
  
  const [progress, setProgress] = useState<GameProgress>(() => {
    // Calculate initial progress from loaded checkpoints
    const completedCount = checkpoints.filter(cp => cp.isCompleted).length;
    return {
      totalFound: completedCount,
      totalCheckpoints: 8,
      currentTier: 'Bronze',
      hintCredits: hintCredits
    };
  });
  const [expandedId, setExpandedId] = useState<number | null>(1);

  useEffect(() => {
    // Load initial progress
    loadProgress();
  }, []);



  const loadProgress = async () => {
    try {
      const response = await ScavengerAPI.getGameProgress();
      if (response.success && response.data) {
        setProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  // Show completion celebration
  const showCompletionCelebration = (location: string) => {
    // Create a temporary celebration element
    const celebration = document.createElement('div');
    celebration.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        animation: celebrationPop 2s ease-in-out;
      ">
        🎉 ${location} Found! ✓
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
    
    // Remove after animation
    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
    }, 2000);
  };

  const markCheckpointComplete = useCallback(async (checkpointId: number) => {
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint || checkpoint.isCompleted) return;

    const updatedCheckpoints = checkpoints.map(cp => 
      cp.id === checkpointId ? { ...cp, isCompleted: true } : cp
    );
    setCheckpoints(updatedCheckpoints);
    
    // Update progress
    const newProgress = {
      ...progress,
      totalFound: progress.totalFound + 1
    };
    setProgress(newProgress);

    // Save progress to localStorage
    saveProgressToStorage(updatedCheckpoints, hintCredits, revealedHints);

    // Save progress to database
    try {
      const response = await ScavengerAPI.completeCheckpoint(checkpointId, checkpoint.location);
      if (response.success) {
        console.log('Checkpoint completed in database:', response.data);
        
        // Show success notification
        showCompletionCelebration(checkpoint.location);
      } else {
        console.error('Failed to save checkpoint progress:', response.error);
      }
    } catch (error) {
      console.error('Error saving checkpoint progress:', error);
    }
  }, [checkpoints, hintCredits, revealedHints, progress]);

  // Listen for QR scan success from other components
  useEffect(() => {
    const handleQRSuccess = (event: CustomEvent) => {
      const { checkpointId } = event.detail;
      console.log('QR scan success event received for checkpoint:', checkpointId);
      markCheckpointComplete(checkpointId);
    };

    window.addEventListener('qr-scan-success', handleQRSuccess as EventListener);
    return () => {
      window.removeEventListener('qr-scan-success', handleQRSuccess as EventListener);
    };
  }, [markCheckpointComplete]);

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper function to save progress to localStorage
  const saveProgressToStorage = (checkpoints: ClueItem[], credits: number, hints: Set<number>) => {
    const progressData = {
      completedCheckpoints: checkpoints.filter(cp => cp.isCompleted).map(cp => cp.id),
      hintCredits: credits,
      revealedHints: Array.from(hints),
      lastUpdated: Date.now()
    };
    localStorage.setItem('talabat_scavenger_progress', JSON.stringify(progressData));
  };

  const useHint = useCallback(async (checkpointId: number) => {
    if (hintCredits <= 0 && !revealedHints.has(checkpointId)) {
      return; // Do nothing if no credits and hint not already revealed
    }

    if (!revealedHints.has(checkpointId)) {
      // Reveal hint and deduct credit
      const newCredits = hintCredits - 1;
      const newRevealedHints = new Set([...revealedHints, checkpointId]);
      
      setHintCredits(newCredits);
      setRevealedHints(newRevealedHints);
      
      // Save progress to localStorage
      saveProgressToStorage(checkpoints, newCredits, newRevealedHints);

      // Save hint usage to database
      try {
        const response = await ScavengerAPI.useHint(checkpointId);
        if (response.success) {
          console.log('Hint used and saved to database:', response.data);
        } else {
          console.error('Failed to save hint usage:', response.error);
        }
      } catch (error) {
        console.error('Error saving hint usage:', error);
      }
    }
    // If already revealed, the hint will just be visible without any action needed
  }, [hintCredits, revealedHints, checkpoints]);

  const scanQR = (checkpointId: number) => {
    onScanQR(checkpointId);
  };

  const handleFinish = () => {
    const timeElapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const scannedQRs = checkpoints.filter(cp => cp.isCompleted).map(cp => cp.id.toString());
    onGameComplete(timeElapsed, scannedQRs);
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-2 sm:p-4">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#8B4513] mb-2">Scavenger Hunt</h1>
        <p className="text-[#8B4513] text-base sm:text-lg">You can do these in any order.</p>
        
        {/* Progress and Hint Credits */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-2 gap-2">
          {/* Progress Counter */}
          <div className="flex items-center">
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-sm sm:text-base text-green-700 font-bold">
                {progress.totalFound}/{progress.totalCheckpoints} Completed
              </span>
            </div>
          </div>
          
          {/* Hint Credits */}
          <div className="flex items-center">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF8C00] mr-2" />
            <span className="text-sm sm:text-base text-[#8B4513] font-semibold">{hintCredits} hint credits</span>
          </div>
        </div>
      </div>

      {/* Checkpoints List */}
      <div className="space-y-2 sm:space-y-3 mb-16 sm:mb-20">
        {checkpoints.map((checkpoint) => (
          <div key={checkpoint.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Checkpoint Header */}
            <div 
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer"
              onClick={() => toggleExpanded(checkpoint.id)}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                {checkpoint.isCompleted ? (
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-300 rounded-full"></div>
                )}
                <span className={`text-sm sm:text-base font-semibold ${
                  checkpoint.isCompleted ? 'text-green-600 line-through' : 'text-[#8B4513]'
                }`}>
                  {checkpoint.location}
                  {checkpoint.isCompleted && ' ✓'}
                </span>
              </div>
              {expandedId === checkpoint.id ? (
                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B4513]" />
              ) : (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B4513]" />
              )}
            </div>

            {/* Expanded Content */}
            {expandedId === checkpoint.id && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                  <p className="text-sm sm:text-base text-[#8B4513]">{checkpoint.clue}</p>
                  
                  {/* Hint Section */}
                  {revealedHints.has(checkpoint.id) && (
                    <div className="bg-green-50 p-2 sm:p-3 rounded border border-green-200">
                      <p className="text-sm sm:text-base text-green-700 font-medium">💡 Hint: {checkpoint.hint}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={() => useHint(checkpoint.id)}
                      disabled={hintCredits <= 0 && !revealedHints.has(checkpoint.id)}
                      className={`flex-1 py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base ${
                        revealedHints.has(checkpoint.id) 
                          ? 'bg-green-200 text-green-700' 
                          : 'bg-gray-200 text-[#8B4513]'
                      }`}
                    >
                      <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>
                        {revealedHints.has(checkpoint.id) ? 'View hint' : 'Reveal hint'}
                      </span>
                    </button>
                    <button
                      onClick={() => scanQR(checkpoint.id)}
                      className="flex-1 bg-[#8B4513] text-white py-2 px-3 sm:px-4 rounded-lg flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Scan QR</span>
                    </button>
                  </div>
                  
                  {hintCredits <= 0 && !revealedHints.has(checkpoint.id) && (
                    <p className="text-xs sm:text-sm text-red-500 text-center">No hint credits remaining!</p>
                  )}
                  {!revealedHints.has(checkpoint.id) && hintCredits > 0 && (
                    <p className="text-xs sm:text-sm text-gray-500 text-center">Costs 1 hint credit</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-sm sm:text-base text-[#8B4513] font-semibold">
              Progress: {progress.totalFound}/{progress.totalCheckpoints}
            </div>
            {/* Progress Bar */}
            <div className="w-20 sm:w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(progress.totalFound / progress.totalCheckpoints) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs sm:text-sm text-gray-500">
              {Math.round((progress.totalFound / progress.totalCheckpoints) * 100)}%
            </span>
          </div>
          <button
            onClick={handleFinish}
            className={`px-4 sm:px-8 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
              progress.totalFound === progress.totalCheckpoints
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-[#FF8C00] hover:bg-[#FF7F00] text-white'
            }`}
          >
            {progress.totalFound === progress.totalCheckpoints ? '🎉 Complete!' : 'Finish Early'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScavengerHuntPage; 