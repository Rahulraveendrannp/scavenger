import React, { useState } from "react";

interface ScavengerHuntIntroProps {
  onStart: () => void;
}

const ScavengerHuntIntro: React.FC<ScavengerHuntIntroProps> = ({ onStart }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleHowItWorks = () => {
    setShowInstructions(true);
  };

  const handleStart = () => {
    if (onStart) onStart();
    // Optionally keep localStorage logic if needed, but parent now controls flow
    // localStorage.setItem('readScavengerRules', 'true');
    // console.log('readScavengerRules set to true');
  };

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center text-center space-y-8 min-h-screen">
          {/* Instructions */}
          <div className="flex-1 flex flex-col justify-center space-y-6 px-6">
            <div className="space-y-4 text-[#8B4513]">
              <div className="text-left">
                <span className="text-2xl font-medium">
                  1. You'll get 8 clues.
                </span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-medium">
                  2. Find as many checkpoints as you can.
                </span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-medium">
                  3. Scan each QR to mark it as found.
                </span>
              </div>
              <div className="text-left">
                <span className="text-2xl font-medium">
                  4. Return to the booth to claim your prize.
                </span>
              </div>
            </div>
          </div>
          {/* Start Button */}
          <div className="w-full pb-8">
            <button
              onClick={handleStart}
              className="w-full bg-[#FF5900] hover:bg-[#E54D00] text-white text-xl font-semibold py-4 px-8 rounded-full transition-colors duration-200 shadow-lg"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center text-center space-y-8 min-h-screen">
        {/* Welcome Text */}
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#8B4513] leading-tight">
            Welcome to Tasku's
          </h1>
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#8B4513]">
              SCAVENGER
            </h2>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#8B4513]">
              HUNT
            </h2>
          </div>
        </div>
        {/* How it works Button */}
        <div className="w-full pb-8">
          <button
            onClick={handleHowItWorks}
            className="w-full bg-[#FF5900] hover:bg-[#E54D00] text-white text-xl font-semibold py-4 px-8 rounded-full transition-colors duration-200 shadow-lg"
          >
            How it works
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScavengerHuntIntro;
