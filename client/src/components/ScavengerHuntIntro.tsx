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
        {/* Background SVG - covers entire screen */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src="/SH2.svg"
            alt="How to Play Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full">
          {/* Top overlay image */}
          <div className="flex w-full justify-center px-5 pt-2">
            <img
              src="/img2.svg"
              alt="How to Play"
              className="w-full max-w-[98%] mx-auto md:max-w-sm"
            />
          </div>

          {/* Let's Go Button around 70% of the screen height */}
          <div className="absolute top-[86%] left-1/2 -translate-x-1/2 w-full flex justify-center px-4">
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
          src="/SH1.svg"
          alt="Scavenger Hunt Splash"
          className="w-[100svw] h-full object-cover"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between pt-[17%] pb-6">
        {/* Top overlay text image */}
        <div className="flex w-full justify-center px-5">
          <img
            src="/img1.svg"
            alt="Scavenger Hunt Intro"
            className="w-full max-w-[98%] mx-auto md:max-w-sm"
          />
        </div>

        {/* How to Play Button - positioned at bottom center */}
                 <div className="flex w-full justify-center px-4 mb-10">
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
