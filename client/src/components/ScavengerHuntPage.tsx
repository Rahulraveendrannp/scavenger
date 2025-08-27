/* eslint-disable @typescript-eslint/no-unused-vars */
// components/ScavengerHuntPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
        const credits = parsed.hintCredits ?? 3;
        console.log("📱 Initial hintCredits from localStorage:", credits);
        return credits;
      } catch (error) {
        console.log("📱 Error parsing localStorage, using fallback hintCredits: 3");
        return 3;
      }
    }
    console.log("📱 No localStorage data, using default hintCredits: 3");
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
  // Simple shuffle function based on phone number for load distribution
  const shuffleCheckpoints = (checkpoints: ClueItem[], phoneNumber: string): ClueItem[] => {
    // Simple hash from phone number
    const hash = phoneNumber.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Use hash to determine shuffle pattern
    const shuffled = [...checkpoints];
    const patterns = [   
      [10,9,8,7,6,5,4,3,2,1,0], // reverse
      [5,6,7,8,9,10,0,1,2,3,4], // middle first
      [0,2,4,6,8,10,1,3,5,7,9], // even then odd
      [1,3,5,7,9,0,2,4,6,8,10], // odd then even
      [5,6,7,8,9,10,0,1,2,3,4], // second half first
      [2,3,4,5,6,7,8,9,10,0,1], // skip first
      [8,9,10,0,1,2,3,4,5,6,7], // skip middle
      [0,1,2,3,4,5,6,7,8,9,10], // original order
    ];
    
    const patternIndex = Math.abs(hash) % patterns.length;
    const pattern = patterns[patternIndex];
    
    return pattern.map(index => shuffled[index]);
  };

  const [checkpoints, setCheckpoints] = useState<ClueItem[]>(() => {
    // Initialize with actual scavenger hunt checkpoints from the image
    const defaultCheckpoints = [
      {
        id: 1,
        location: "Food Zone",
        clue: "Hungry crowds head South to dine, Between the seats, you'll spot a sign. A wall divides the bigger space, Look low, your clue's not far away.",
        hint: "A white vertical surface near the **South** **Food Court** seating.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 2,
        location: "Mirror Mirror",
        clue: "A polished ring not far from cheesecake, Reflects the steps that shoppers take. Its hollow core hides something neat, Get closer to unlock the treat.",
        hint: "A **reflective sculpture** near a popular **cheesecake** place.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 3,
        location: "Second Guess",
        clue: "A glowing frame, a GUESSing game, You're near the mark if that's your claim. The screen is loud, the floor is mute, But something's hiding near your boot.",
        hint: "Look for an **ad screen**. Don't second- **GUESS**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 4,
        location: "Sport Mode",
        clue: "Massive pillar, standing tall, You've probably walked right past them all. It's near a spot for every sport, From yoga mats to tennis courts.",
        hint: "A **pillar** next to the big **blue** shop for **all** **the sports**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 5,
        location: "Bin There",
        clue: "Don't toss this chance, not today. NEXT to trash is where clues may lay. Look around, then take your shot – This bin's hiding more than you thought.",
        hint: "A **trash bin** by some escalator, right **NEXT** to a stylish stop.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 6,
        location: "Map & Marts",
        clue: "Need some help or where to go? This stand's designed to let you know. A scan outside a big grocery aisle, Might just make your checklist smile.",
        hint: "A **screen** where you can get **information**. Next to the **grocery store** that rhymes with Grand Prix.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 7,
        location: "Pill-ar Prescription",
        clue: "It's near a place for meds and more, With a name for shoes that walk the floors. This one pill-ar won't heal your pain, But scan it fast, you've much to gain.",
        hint: "A **pillar** near the **pharmacy** named after a **pair of shoes**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 8,
        location: "Entry Point",
        clue: "Right by the West doors where it all begins, A screen awaits with info within. Don't rush inside, take one quick glance, This entrance spot's your lucky chance.",
        hint: "Find the **info screen** by a **West Court 2**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 9,
        location: "Desert Directions",
        clue: "It's time for things to escalate, Past a desert hill, don't hesitate. Then walk NINE steps to where WEST leans, The sign you seek is in between.",
        hint: "An **escalator sign** near two shops: one named after a **sandy hill** and the other one sounds like **coordinates**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 10,
        location: "Crocodile Hunt",
        clue: "A wide open space, no walls in sight. Just head below the moving flight. Where crocodiles pose with stylish flair, A code awaits beneath the stair.",
        hint: "Look beneath an **escalator** in the open court near a certain **reptilian fashion** **icon**.",
        isCompleted: false,
        isExpanded: false,
      },
      {
        id: 11,
        location: "BONUS ",
        clue: "A bonus clue for eagle eyes, It moves, it stops - a rare surprise. No need to dash, no need to race, Just catch the cart and scan with grace.",
        hint: "The **mall taxi** carts carry more than passengers. Watch for the code. Walk, don't run!",
        isCompleted: false,
        isExpanded: false,
      },
    ];

    // Shuffle checkpoints based on user's phone number for load distribution
    const phoneNumber = localStorage.getItem("talabat_phone_number");
    if (phoneNumber) {
      const shuffledCheckpoints = shuffleCheckpoints(defaultCheckpoints, phoneNumber);
      console.log("🔄 Checkpoints shuffled for user:", phoneNumber);
      console.log("📋 Shuffled order:", shuffledCheckpoints.map(cp => cp.location));
      return shuffledCheckpoints;
    }

    return defaultCheckpoints;
  });

  const [progress, setProgress] = useState<GameProgress>(() => {
    // Initialize with default progress, will be updated from backend
    return {
      totalFound: 0,
      totalCheckpoints: 11,
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
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 200, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

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
      setIsLoadingProgress(true);
      console.log("🔄 Loading latest progress from backend...");
      const response = await ScavengerAPI.getUserProgress();
      
      if (response.success && response.data) {
        console.log("✅ Backend progress loaded:", response.data);
        
        // Update progress state from the correct nested structure
        const progressData = response.data.progress?.scavengerHuntProgress;
        if (progressData) {
          const totalFound = progressData.completedCheckpoints?.length || 0;
          const totalCheckpoints = progressData.totalCheckpoints || 11;
          const isCompleted = totalFound >= 5;
          
          setProgress({
            totalFound,
            totalCheckpoints,
            currentTier: totalFound >= 8 ? 'Gold' : totalFound >= 5 ? 'Silver' : 'Bronze',
            isCompleted,
            hintCredits: progressData.hintCredits || 3,
            revealedHints: progressData.revealedHints || []
          });
          
          console.log("✅ Progress state updated:", {
            totalFound,
            totalCheckpoints,
            isCompleted,
            hintCredits: progressData.hintCredits
          });
        }
        
        // Get the completed checkpoint IDs from backend
        // We need to get the actual completed checkpoint IDs, not just the count
        let completedCheckpointIds: number[] = [];
        
        try {
          // Try to get detailed progress to see which specific checkpoints are completed
          const detailedResponse = await ScavengerAPI.getUserProgress();
          if (detailedResponse.success && detailedResponse.data?.progress?.scavengerHuntProgress?.completedCheckpoints) {
            completedCheckpointIds = detailedResponse.data.progress.scavengerHuntProgress.completedCheckpoints.map(
              (cp: any) => cp.checkpointId
            );
            console.log("✅ Found completed checkpoint IDs from backend:", completedCheckpointIds);
          }
        } catch (error) {
          console.log("⚠️ Could not get detailed progress, using fallback method");
        }
        
        // Update checkpoints with completed status from backend
        // Preserve the shuffled order while updating completion status
        const updatedCheckpoints = checkpoints.map((checkpoint) => {
          // Check if this specific checkpoint is completed based on backend data
          const isCompleted = completedCheckpointIds.includes(checkpoint.id);
          
          return {
            ...checkpoint,
            isCompleted: isCompleted,
          };
        });
        
        setCheckpoints(updatedCheckpoints);
        console.log("✅ Checkpoints updated with backend completion status:", updatedCheckpoints);
        
        // Also load hint credits from backend if available
        const scavengerProgress = response.data.progress?.scavengerHuntProgress;
        if (scavengerProgress) {
          console.log("🔍 Backend hintCredits response:", scavengerProgress.hintCredits);
          if (scavengerProgress.hintCredits !== undefined) {
            setHintCredits(scavengerProgress.hintCredits);
            console.log("✅ Updated hintCredits from backend:", scavengerProgress.hintCredits);
          } else {
            console.log("⚠️ No hintCredits in backend response, keeping current value:", hintCredits);
          }
          
          // Load revealed hints from backend if available
          if (scavengerProgress.revealedHints && Array.isArray(scavengerProgress.revealedHints)) {
            setRevealedHints(new Set(scavengerProgress.revealedHints));
            console.log("✅ Loaded revealed hints from backend:", scavengerProgress.revealedHints);
          } else {
            console.log("ℹ️ No revealed hints found in backend response, keeping current state");
          }
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
    } finally {
      setIsLoadingProgress(false);
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
         // Preserve the shuffled order while updating completion status
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
           isCompleted: completedCount >= 5,
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
    } finally {
      setIsLoadingProgress(false);
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
      1: "TALABAT_HUNT_FOOD_ZONE",
      2: "TALABAT_HUNT_MIRROR_MIRROR",
      3: "TALABAT_HUNT_SECOND_GUESS",
      4: "TALABAT_HUNT_SPORT_MODE",
      5: "TALABAT_HUNT_BIN_THERE",
      6: "TALABAT_HUNT_MAP_MARTS",
      7: "TALABAT_HUNT_PILLAR_PRESCRIPTION",
      8: "TALABAT_HUNT_ENTRY_POINT",
      9: "TALABAT_HUNT_DESERT_DIRECTIONS",
      10: "TALABAT_HUNT_CROCODILE_HUNT",
      11: "TALABAT_HUNT_BONUS",
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

  // Helper function to render bold text from markdown-style formatting
  const renderBoldText = (text: string) => {
    // Remove all forward slashes and replace bold text with heading font
    return text
      .replace(/\//g, '') // Remove all forward slashes
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-heading text-[16px]">$1</span>');
  };

  // Map zoom and pan handlers
  const handleMapZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    setMapZoom(prevZoom => {
      const newZoom = Math.max(0.5, Math.min(3, prevZoom + delta));
      
      // Adjust position to zoom towards the center point
      if (mapContainerRef.current) {
        const container = mapContainerRef.current;
        const rect = container.getBoundingClientRect();
        
        setMapPosition(prev => {
          const zoomRatio = newZoom / prevZoom;
          const newX = centerX - (centerX - prev.x) * zoomRatio;
          const newY = centerY - (centerY - prev.y) * zoomRatio;
          
          return { x: newX, y: newY };
        });
      }
      
      return newZoom;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = e.clientX - rect.left;
    const centerY = e.clientY - rect.top;
    handleMapZoom(delta, centerX, centerY);
  }, [handleMapZoom]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      setDragStart({
        x: touch.clientX - rect.left - mapPosition.x,
        y: touch.clientY - rect.top - mapPosition.y
      });
    }
  }, [mapPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      setMapPosition({
        x: touch.clientX - rect.left - dragStart.x,
        y: touch.clientY - rect.top - dragStart.y
      });
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      if (mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
        const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
        
        // Calculate zoom based on distance change (simplified)
        const delta = distance > 100 ? 0.05 : -0.05;
        handleMapZoom(delta, centerX, centerY);
      }
    }
  }, [isDragging, dragStart, handleMapZoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetMapView = useCallback(() => {
    setMapZoom(1);
    setMapPosition({ x: 0, y: 0 });
  }, []);

  return (
    <>
      {/* Loading Overlay */}
      {isLoadingProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5900]"></div>
            <p className="text-[#411517] font-body text-lg">Loading your progress...</p>
            <p className="text-gray-500 font-body text-sm">Please wait while we sync with the server</p>
          </div>
        </div>
      )}
      
      <div className="min-h-screen relative font-body">
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
            <div className="flex items-center mb-4">
              <div className="flex gap-1 items-center">
                <h1 className="text-2xl font-heading text-[#411517] leading-none">
                  Scavenger
                </h1>
                <h1 className="text-2xl font-heading text-[#411517] leading-none relative inline-block">
                  <span className="relative">
                    Checklist
                    <span className="absolute bottom-1 left-0 w-full h-[20%] bg-[#CFFF00] -z-10"></span>
                  </span>
                </h1>
              </div>
              
                             <div className="flex items-center">
                {/* Hint Credits - Top Right */}
                
              </div>
            </div>
            
            <p className="text-[#411517] text-sm font-body mb-4">
              All checkpoints are on the <strong>ground floor and never inside shops</strong>! There's no specific order — it's your call.
            </p>
            
            {/* Map and Hint Buttons */}
            <div className="flex space-x-1 mb-4">
              <button 
                onClick={() => setShowMap(true)}
                className="w-[70%] bg-[#FF5900] text-white py-3 px-4 rounded-full flex items-center justify-center space-x-2 text-md font-body"
              >
                <img src="/map.svg" alt="Map" className="w-5 h-5" />
                <span>Open Map</span>
              </button>
              <div className="flex items-center text-sm bg-[#CFFF00] px-3 py-1 rounded-full">
              <img src="/light.svg" alt="Map" className="w-5 h-5" />
                  <span className="text-2xl text-[#411517]  mr-1">
                      {hintCredits} 
                    </span>
                   <div className="flex flex-col -space-y-1">
                     <span className="text-md text-[#411517]  leading-none">
                       hints
                     </span>
                                           <span className="text-md text-[#411517]  leading-none">
                       available
                     </span>
                   </div>
                </div>
            </div>
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
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpanded(checkpoint.id)}
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
                    <span className="text-base font-heading text-[#411517]">
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
                    <p 
                      className="text-sm text-[#411517] font-body"
                      dangerouslySetInnerHTML={{ __html: renderBoldText(checkpoint.clue) }}
                    />

                    {/* Hint Section */}
                    {revealedHints.has(checkpoint.id) && (
                      <div className="bg-[#CFFF00]/20 p-3 rounded-lg border border-[#CFFF00]">
                        <p 
                          className="text-sm text-[#411517] font-body"
                          dangerouslySetInnerHTML={{ __html: `Hint: ${renderBoldText(checkpoint.hint || '')}` }}
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-row space-x-3">
                      <button
                        onClick={() => !checkpoint.isCompleted && !revealedHints.has(checkpoint.id) && useHint(checkpoint.id)}
                        disabled={
                          checkpoint.isCompleted || revealedHints.has(checkpoint.id) || (hintCredits <= 0 && !revealedHints.has(checkpoint.id)) || isLoadingProgress
                        }
                        className={`flex-1 py-3 px-4 rounded-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body ${
                          "bg-[#F4EDE3] text-[#411517]"
                        }`}
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>
                          {revealedHints.has(checkpoint.id) ? "Hint revealed" : "Reveal hint"}
                        </span>
                      </button>
                      <button
                        onClick={() => !checkpoint.isCompleted && scanQR(checkpoint.id)}
                        disabled={checkpoint.isCompleted || isLoadingProgress}
                        className="flex-1 bg-[#FF5900] text-white py-3 px-4 rounded-full flex items-center justify-center space-x-2 text-sm font-body hover:bg-[#411517]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>{isLoadingProgress ? "Loading..." : "Scan QR"}</span>
                      </button>
                    </div>

                    {hintCredits <= 0 && !revealedHints.has(checkpoint.id) && (
                      <p className="text-xs sm:text-sm text-red-500 text-center font-body">
                        No hint credits remaining!
                      </p>
                    )}
                    {!revealedHints.has(checkpoint.id) && hintCredits > 0 && (
                      <p className="text-xs sm:text-sm text-gray-500 text-center font-body">
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
                <span className="text-white font-body">
                  Total found: {progress.totalFound}
                </span>
              </div>
              <button
                onClick={handleFinish}
                className="bg-[#CFFF00] hover:bg-[#CFFF00]/80 text-[#411517] px-8 py-3 font-semibold transition-colors rounded-full ml-2"
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

      {/* Map Modal Overlay */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Zoom Controls */}
            <div className="absolute top-2 left-2 z-10 flex flex-col space-y-2">
              <button
                onClick={() => handleMapZoom(0.2, 0, 0)}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => handleMapZoom(-0.2, 0, 0)}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={resetMapView}
                className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* Zoom Level Indicator */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-full px-3 py-1 shadow-lg">
              <span className="text-sm text-gray-600 font-medium">
                {Math.round(mapZoom * 100)}%
              </span>
            </div>
            
            {/* Map Container */}
            <div 
              ref={mapContainerRef}
              className="w-full h-[80vh] overflow-hidden relative cursor-grab active:cursor-grabbing"
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `translate(${mapPosition.x}px, ${mapPosition.y}px) scale(${mapZoom})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                <img 
                  ref={mapImageRef}
                  src="/routemap.svg" 
                  alt="Route Map" 
                  className="max-w-none max-h-none select-none"
                  draggable={false}
                />
              </div>
            </div>
            
            {/* Instructions */}
            <div className="absolute bottom-2 left-2 right-2 z-10 bg-white rounded-lg p-3 shadow-lg">
              <p className="text-sm text-gray-600 text-center">
                <span className="hidden sm:inline">Use mouse wheel to zoom • </span>
                <span className="sm:hidden">Pinch to zoom • </span>
                Drag to pan • Tap reset to return to original view
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Error Toast */}
      {scannerError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 font-body">
          {scannerError}
        </div>
      )}
    </>
  );
};

export default ScavengerHuntPage;
