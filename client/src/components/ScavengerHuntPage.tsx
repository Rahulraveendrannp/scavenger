/* eslint-disable @typescript-eslint/no-unused-vars */
// components/ScavengerHuntPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  QrCode,
  CheckCircle,
} from "lucide-react";
import { ScavengerAPI } from "../api";
import SimpleQRScanner from "./SimpleQRScanner";
import type { ClueItem, GameProgress } from "../types";

interface ScavengerHuntPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  onGameComplete: (timeElapsed: number, scannedQRs: string[]) => void;
  onScanQR?: (checkpointId: number) => void;
}

const ScavengerHuntPage: React.FC<ScavengerHuntPageProps> = ({
  session,
  onGameComplete,
  onScanQR,
}) => {
  // Initialize hint credits and revealed hints from localStorage
  const [hintCredits, setHintCredits] = useState(() => {
    const saved = localStorage.getItem("talabat_scavenger_progress");
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
    const saved = localStorage.getItem("talabat_scavenger_progress");
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
    // Initialize with default checkpoints, but don't load completed status from localStorage
    const defaultCheckpoints = [
      {
        id: 1,
        location: "Reception Desk",
        clue: "Where visitors first arrive and greet the team, this place holds the main gateway.",
        hint: "Look near the main entrance for a welcome sign.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 2,
        location: "Conference Room",
        clue: "Round tables and big screens, where important meetings convene.",
        hint: "Check the large room with glass walls.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 3,
        location: "Kitchen Area",
        clue: "Coffee brews and lunch is made, where hungry workers get fed.",
        hint: "Look for appliances and the coffee machine.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 4,
        location: "Supply Closet",
        clue: "Papers, pens, and office gear, stored neatly for all to share.",
        hint: "Find the room with shelves full of office supplies.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 5,
        location: "Manager Office",
        clue: "Corner room with the best view, where important decisions come through.",
        hint: "Look for the private office with windows.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 6,
        location: "Break Room",
        clue: "Relax and unwind, leave your work behind, comfy chairs you will find.",
        hint: "Check the area with couches and recreational items.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 7,
        location: "IT Department",
        clue: "Cables and servers, tech support that never defers.",
        hint: "Look for the area with lots of computer equipment.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 8,
        location: "Main Workspace",
        clue: "Desks in rows, where daily productivity flows.",
        hint: "Find the open area with multiple workstations.",
        isCompleted: false,
        isExpanded: false,
      },
    ];

    return defaultCheckpoints;
  });

  const [progress, setProgress] = useState<GameProgress>(() => {
    // Initialize with default progress, will be updated from backend
    return {
      totalFound: 0,
      totalCheckpoints: 8,
      currentTier: "Bronze",
      isCompleted: false,
      hintCredits: hintCredits,
    };
  });

  const [expandedId, setExpandedId] = useState<number | null>(() => {
    // Find the first uncompleted checkpoint to expand on load
    const firstUncompleted = checkpoints.find(cp => !cp.isCompleted);
    return firstUncompleted ? firstUncompleted.id : null;
  });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannerCheckpointId, setScannerCheckpointId] = useState<number | null>(
    null
  );
  const [scannerError, setScannerError] = useState<string>("");

  useEffect(() => {
    // Load initial progress from backend
    loadProgress();
    
    // Set up interval to refresh data every 30 seconds to keep it in sync
    const refreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing progress from backend...");
      loadProgress();
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);



  const loadProgress = async () => {
    try {
      console.log("🔄 Loading latest progress from backend...");
      const response = await ScavengerAPI.getGameProgress();
      
      if (response.success && response.data) {
        console.log("✅ Backend progress loaded:", response.data);
        
        // Update progress state
        setProgress(response.data);
        
        // Update checkpoints with completed status from backend
        const updatedCheckpoints = checkpoints.map((checkpoint) => {
          // Check if this checkpoint is completed based on backend data
          // We'll use the totalFound count to determine which checkpoints are completed
          // For now, we'll assume checkpoints are completed in order (1, 2, 3, etc.)
          const isCompleted = checkpoint.id <= (response.data?.totalFound || 0);
          
          return {
            ...checkpoint,
            isCompleted: isCompleted,
          };
        });
        
        setCheckpoints(updatedCheckpoints);
        console.log("✅ Checkpoints updated with backend completion status:", updatedCheckpoints);
        
        // Also load hint credits from backend if available
        if (response.data.hintCredits !== undefined) {
          setHintCredits(response.data.hintCredits);
        }
        
        // Load revealed hints from backend if available (safely handle optional property)
        if (response.data && 'revealedHints' in response.data && Array.isArray(response.data.revealedHints)) {
          setRevealedHints(new Set(response.data.revealedHints));
        }
        
      } else {
        console.error("❌ Failed to load progress from backend:", response.error);
        // Fallback to localStorage if backend fails
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error("❌ Error loading progress from backend:", error);
      // Fallback to localStorage if backend fails
      loadFromLocalStorage();
    }
  };

  // Fallback function to load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const savedProgress = localStorage.getItem("talabat_scavenger_progress");
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        console.log("📱 Loading fallback data from localStorage:", parsed);
        
        // Update checkpoints with localStorage data
        const updatedCheckpoints = checkpoints.map((checkpoint) => ({
          ...checkpoint,
          isCompleted: parsed.completedCheckpoints?.includes(checkpoint.id) || false,
        }));
        
        setCheckpoints(updatedCheckpoints);
        
        // Update progress
        const completedCount = updatedCheckpoints.filter((cp) => cp.isCompleted).length;
        setProgress(prev => ({
          ...prev,
          totalFound: completedCount,
          isCompleted: completedCount >= 4,
        }));
        
        // Update hint credits and revealed hints
        if (parsed.hintCredits !== undefined) {
          setHintCredits(parsed.hintCredits);
        }
        if (parsed.revealedHints) {
          setRevealedHints(new Set(parsed.revealedHints));
        }
      }
    } catch (error) {
      console.error("❌ Error loading from localStorage:", error);
    }
  };

  // Show completion celebration
  const showCompletionCelebration = (location: string) => {
    // Create a temporary celebration element
    const celebration = document.createElement("div");
    celebration.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #10B981, #059669);
        color: #F4EDE3;
        padding: 20px 30px;
        border-radius: 15px;
        font-size: 18px;
        font-family: 'TT Commons Pro ExtraBold', sans-serif;
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

  const markCheckpointComplete = useCallback(
    async (checkpointId: number) => {
      const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);
      if (!checkpoint || checkpoint.isCompleted) return;

      const updatedCheckpoints = checkpoints.map((cp) =>
        cp.id === checkpointId ? { ...cp, isCompleted: true } : cp
      );
      setCheckpoints(updatedCheckpoints);

      // Update progress
      const newProgress = {
        ...progress,
        totalFound: progress.totalFound + 1,
      };
      setProgress(newProgress);

      // Save progress to localStorage
      saveProgressToStorage(updatedCheckpoints, hintCredits, revealedHints);

      // Save progress to database
      try {
        const response = await ScavengerAPI.completeCheckpoint(
          checkpointId,
          checkpoint.location
        );
        if (response.success) {
          console.log("Checkpoint completed in database:", response.data);

          // Show success notification
          showCompletionCelebration(checkpoint.location);
        } else {
          console.error("Failed to save checkpoint progress:", response.error);
        }
      } catch (error) {
        console.error("Error saving checkpoint progress:", error);
      }
    },
    [checkpoints, hintCredits, revealedHints, progress]
  );

  // Map checkpoint -> expected QR code
  const getExpectedQRCode = (id: number) => {
    const qrCodes: { [key: number]: string } = {
      1: "TALABAT_HUNT_RECEPTION_DESK",
      2: "TALABAT_HUNT_CONFERENCE_ROOM",
      3: "TALABAT_HUNT_KITCHEN_AREA",
      4: "TALABAT_HUNT_SUPPLY_CLOSET",
      5: "TALABAT_HUNT_MANAGER_OFFICE",
      6: "TALABAT_HUNT_BREAK_ROOM",
      7: "TALABAT_HUNT_IT_DEPARTMENT",
      8: "TALABAT_HUNT_MAIN_WORKSPACE",
    };
    return qrCodes[id] || "";
  };

  const handleScannerResult = async (scannedText: string) => {
    if (!scannerCheckpointId) return;
    const expected = getExpectedQRCode(scannerCheckpointId);
    const isMatch =
      scannedText.trim().toUpperCase() === expected.trim().toUpperCase();
    if (!isMatch) {
      setScannerError(
        "Incorrect QR code for this checkpoint. Please try again."
      );
      setTimeout(() => setScannerError(""), 2000);
      return;
    }

    await markCheckpointComplete(scannerCheckpointId);
    setShowQRScanner(false);
    setScannerCheckpointId(null);
  };

  // Listen for QR scan success from other components
  useEffect(() => {
    const handleQRSuccess = (event: CustomEvent) => {
      const { checkpointId } = event.detail;
      console.log(
        "QR scan success event received for checkpoint:",
        checkpointId
      );
      markCheckpointComplete(checkpointId);
    };

    window.addEventListener(
      "qr-scan-success",
      handleQRSuccess as EventListener
    );
    return () => {
      window.removeEventListener(
        "qr-scan-success",
        handleQRSuccess as EventListener
      );
    };
  }, [markCheckpointComplete]);

  const toggleExpanded = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper function to save progress to localStorage
  const saveProgressToStorage = (
    checkpoints: ClueItem[],
    credits: number,
    hints: Set<number>
  ) => {
    const progressData = {
      completedCheckpoints: checkpoints
        .filter((cp) => cp.isCompleted)
        .map((cp) => cp.id),
      hintCredits: credits,
      revealedHints: Array.from(hints),
      lastUpdated: Date.now(),
    };
    localStorage.setItem(
      "talabat_scavenger_progress",
      JSON.stringify(progressData)
    );
  };

  const useHint = useCallback(
    async (checkpointId: number) => {
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
            console.log("Hint used and saved to database:", response.data);
          } else {
            console.error("Failed to save hint usage:", response.error);
          }
        } catch (error) {
          console.error("Error saving hint usage:", error);
        }
      }
      // If already revealed, the hint will just be visible without any action needed
    },
    [hintCredits, revealedHints, checkpoints]
  );

  const scanQR = (checkpointId: number) => {
    // Open in-page scanner instead of navigating to a separate route
    setScannerCheckpointId(checkpointId);
    setShowQRScanner(true);
    setScannerError("");
    // Optionally notify parent
    if (onScanQR) onScanQR(checkpointId);
  };

  const handleFinish = () => {
    const timeElapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const scannedQRs = checkpoints
      .filter((cp) => cp.isCompleted)
      .map((cp) => cp.id.toString());
    onGameComplete(timeElapsed, scannedQRs);
  };

  return (
    <>
      <div className="min-h-screen relative font-['TT_Commons_Pro_DemiBold']">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/sh-bg.svg"
            alt="Scavenger Hunt Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6">
            {/* Top Section with Hint Credits */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#411517] leading-none">
                  Scavenger
                </h1>
                <h1 className="text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#411517] leading-none relative inline-block">
                  <span className="relative">
                    Checklist
                    <span className="absolute bottom-1 left-0 w-full h-[20%] bg-[#CFFF00] -z-10"></span>
                  </span>
                </h1>
              </div>
              
                             <div className="flex items-center">
                 {/* Hint Credits - Top Right */}
                <div className="flex items-center bg-[#CFFF00] px-3 py-1 rounded-full">
                  <Lightbulb className="w-5 h-5 text-[#411517] stroke-2" />
                  <span className="text-2xl text-[#411517] font-black mr-1">
                      {hintCredits} 
                    </span>
                   <div className="flex flex-col -space-y-1">
                     <span className="text-md text-[#411517] font-['TT_Commons_Pro_ExtraBold'] leading-none">
                       hints
                     </span>
                     <span className="text-md text-[#411517] font-['TT_Commons_Pro_DemiBold'] leading-none">
                       available
                     </span>
                   </div>
                </div>
              </div>
            </div>
            
            <p className="text-[#411517] text-sm font-['TT_Commons_Pro_DemiBold'] mb-4">
              There's no specific order — it's your call.
            </p>
          </div>

          {/* Checkpoints List */}
          <div className="space-y-3 mb-20">
            {checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md overflow-hidden border border-gray-200"
              >
                {/* Checkpoint Header */}
                <div
                  className={`flex items-center justify-between p-4 ${
                    checkpoint.isCompleted ? "" : "cursor-pointer"
                  }`}
                  onClick={() =>
                    !checkpoint.isCompleted && toggleExpanded(checkpoint.id)
                  }
                >
                                    <div className="flex items-center space-x-3">
                    {checkpoint.isCompleted ? (
                      <div className="w-6 h-6 bg-[#FF5900] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                       <div className="w-6 h-6 border-2 border-[#FF5900] rounded-full"></div>
                    )}
                    <span className="text-base font-['TT_Commons_Pro_ExtraBold'] text-[#411517]">
                      {checkpoint.location}
                    </span>
                  </div>
                  {/* Show expand/collapse icons for all checkpoints */}
                  {expandedId === checkpoint.id ? (
                    <ChevronUp className="w-5 h-5 text-[#411517]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#411517]" />
                  )}
                </div>

              {/* Expanded Content */}
              {expandedId === checkpoint.id && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-[#411517] font-['TT_Commons_Pro_DemiBold']">
                      {checkpoint.clue}
                    </p>

                    {/* Hint Section */}
                    {revealedHints.has(checkpoint.id) && (
                      <div className="bg-[#CFFF00]/20 p-3 rounded-lg border border-[#CFFF00]">
                        <p className="text-sm text-[#411517] font-['TT_Commons_Pro_DemiBold']">
                          💡 Hint: {checkpoint.hint}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-row space-x-3">
                      <button
                        onClick={() => useHint(checkpoint.id)}
                        disabled={
                          hintCredits <= 0 && !revealedHints.has(checkpoint.id)
                        }
                        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 text-sm font-['TT_Commons_Pro_ExtraBold'] ${
                          revealedHints.has(checkpoint.id)
                            ? "bg-[#F4EDE3] text-[#411517]"
                            : "bg-[#F4EDE3] text-[#411517]"
                        }`}
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>
                          {revealedHints.has(checkpoint.id)
                            ? "View hint"
                            : "Reveal hint"}
                        </span>
                      </button>
                      <button
                        onClick={() => scanQR(checkpoint.id)}
                        className="flex-1 bg-[#FF5900] text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm font-['TT_Commons_Pro_ExtraBold'] hover:bg-[#411517]/80"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Scan QR</span>
                      </button>
                    </div>

                    {hintCredits <= 0 && !revealedHints.has(checkpoint.id) && (
                      <p className="text-xs sm:text-sm text-red-500 text-center font-['TT_Commons_Pro_DemiBold']">
                        No hint credits remaining!
                      </p>
                    )}
                    {!revealedHints.has(checkpoint.id) && hintCredits > 0 && (
                      <p className="text-xs sm:text-sm text-gray-500 text-center font-['TT_Commons_Pro_DemiBold']">
                        Costs 1 hint credit
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

          {/* Progress Footer */}
          <div className="fixed bottom-4 left-4 right-4">
            <div className="bg-[#411517] rounded-full flex items-center overflow-hidden">
              <div className="flex-1 px-6 py-3">
                <span className="text-white font-['TT_Commons_Pro_ExtraBold']">
                  Total found: {progress.totalFound}
                </span>
              </div>
              <button
                onClick={handleFinish}
                className="bg-[#CFFF00] hover:bg-[#CFFF00]/80 text-[#411517] px-8 py-3 font-bold font-['TT_Commons_Pro_ExtraBold'] transition-colors rounded-full ml-2"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-page QR Scanner Overlay */}
      {showQRScanner && (
        <SimpleQRScanner
          title={""}
          onScan={handleScannerResult}
          onClose={() => {
            setShowQRScanner(false);
            setScannerCheckpointId(null);
          }}
          expectedQRCode={getExpectedQRCode(scannerCheckpointId ?? -1)}
        />
      )}

      {/* Scanner Error Toast */}
      {scannerError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 font-['TT_Commons_Pro_DemiBold']">
          {scannerError}
        </div>
      )}
    </>
  );
};

export default ScavengerHuntPage;
