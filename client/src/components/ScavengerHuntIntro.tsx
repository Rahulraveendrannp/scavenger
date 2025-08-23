import React, { useState } from "react";
import welcomeScavengerSvg from "../assets/welcome_scavenger.svg";
import introSvg from "../assets/intro.svg";
import findPointsSvg from "../assets/find_points.svg";

interface ScavengerHuntIntroProps {
  onStart: () => void;
}

const ScavengerHuntIntro: React.FC<ScavengerHuntIntroProps> = ({ onStart }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleHowItWorks = () => {
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
      <div className="h-screen bg-[#FF5900] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-['TT_Commons_Pro_DemiBold'] overflow-hidden">
        {/* Middle - Find Points SVG */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-0">
          <img
            src={findPointsSvg}
            alt="Find Points"
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>

        {/* Bottom - Start Button */}
        <div className="flex-shrink-0 w-full max-w-md mx-auto pb-4 sm:pb-6 lg:pb-8">
          <button
            onClick={handleStart}
            className="w-full bg-white hover:bg-gray-100 text-[#FF5900] text-lg sm:text-xl lg:text-2xl font-['TT_Commons_Pro_DemiBold'] py-3 sm:py-4 lg:py-5 px-6 sm:px-8 lg:px-10 rounded-full transition-colors duration-200 shadow-lg active:scale-95 transform"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FF5900] flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8 font-['TT_Commons_Pro_DemiBold'] overflow-hidden">
      {/* Top layer - Welcome Scavenger SVG */}
      <div className="flex-shrink-0 flex items-center justify-center pt-2 sm:pt-4 lg:pt-6 px-4 sm:px-6 lg:px-8 max-h-[30vh] sm:max-h-[35vh] lg:max-h-[40vh]">
        <img
          src={welcomeScavengerSvg}
          alt="Welcome Scavenger"
          className="max-w-full max-h-full w-auto h-auto object-contain"
        />
      </div>

      {/* Middle layer - Intro SVG */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-0">
        <img
          src={introSvg}
          alt="Scavenger Hunt Intro"
          className="max-w-full max-h-full w-auto h-auto object-contain"
        />
      </div>

      {/* Bottom layer - Let's Go Button */}
      <div className="flex-shrink-0 w-full max-w-md mx-auto pb-4 sm:pb-6 lg:pb-8">
        <button
          onClick={handleHowItWorks}
          className="w-full bg-white hover:bg-gray-100 text-[#FF5900] text-lg sm:text-xl lg:text-2xl font-['TT_Commons_Pro_DemiBold'] py-3 sm:py-4 lg:py-5 px-6 sm:px-8 lg:px-10 rounded-full transition-colors duration-200 shadow-lg active:scale-95 transform"
        >
          Let's Go
        </button>
      </div>
    </div>
  );
};

export default ScavengerHuntIntro;
