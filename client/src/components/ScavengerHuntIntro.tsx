import React, { useState } from "react";

interface ScavengerHuntIntroProps {
  onStart: () => void;
}

const ScavengerHuntIntro: React.FC<ScavengerHuntIntroProps> = ({ onStart }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleHowToPlay = () => {
    setShowInstructions(true);
  };

  const handleStart = () => {
    // Set localStorage to indicate user has read the scavenger rules
    localStorage.setItem("readScavengerRules", "true");
    console.log("readScavengerRules set to true");
    if (onStart) onStart();
  };

           if (showInstructions) {
        return (
          <div className="h-[100svh] relative overflow-hidden font-body">
        {/* Background SVG - intro.svg with all content */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/intro.svg"
            alt="How to Play Instructions"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content overlay - only button at bottom */}
        <div className="relative z-10 h-full flex flex-col justify-end pb-6">
          {/* Let's Go Button - positioned at bottom center */}
          <div className="flex w-full justify-center px-4">
            <button
              onClick={handleStart}
                             className="w-[70%] bg-[#411517] text-white text-lg font-semibold sm:text-xl lg:text-2xl font-heading py-2 sm:py-4 lg:py-5 px-8 sm:px-10 lg:px-12 rounded-full transition-colors duration-200 shadow-lg active:scale-95 transform"
            >
              Let's Go
            </button>
          </div>
        </div>
      </div>
    );
  }

           return (
        <div className="h-[100svh] relative overflow-hidden font-body">
      {/* Background SVG - covers entire screen */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="/splash.svg"
          alt="Scavenger Hunt Splash"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-6">
        {/* How to Play Button - positioned at bottom center */}
                 <div className="flex w-full justify-center px-4">
           <button
             onClick={handleHowToPlay}
                           className="w-[70%] bg-[#F4EDE3] hover:bg-gray-100 text-[#411517] text-lg font-semibold sm:text-xl lg:text-2xl font-heading py-2 sm:py-4 lg:py-5 px-8 sm:px-10 lg:px-12 rounded-full transition-colors duration-200 shadow-lg active:scale-95 transform"
           >
             How to Play
           </button>
         </div>
      </div>
    </div>
  );
};

export default ScavengerHuntIntro;
