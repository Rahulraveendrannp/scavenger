/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { ScavengerAPI } from "../api";
import { useNavigate } from "react-router-dom";

function ScavengerHuntFinish() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState<any>();

  console.log("progress-found checkpoints", progress, progress?.totalFound);

  useEffect(() => {
    getGameProgress();
  }, []);

  const getGameProgress = async () => {
    const response = await ScavengerAPI.getGameProgress();
    if (response) setProgress(response?.data);
  };

  const handleClaimPrize = () => {
    console.log("Generate claim QR and redirect to /claim");
    navigate("/dashboard");
  };

  const gameState =
    progress?.totalFound > 0
      ? progress?.totalFound <= 3
        ? "Bronze"
        : progress?.totalFound <= 6
        ? "Silver"
        : "Gold"
      : "No";

  return (
    <div className="h-screen bg-[#F5F5DC] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-['TT_Commons_Pro_DemiBold'] overflow-hidden">
      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto flex flex-col justify-center items-center text-center space-y-4 sm:space-y-6 lg:space-y-8 h-full">
        <div className="flex items-center justify-start w-full flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-4xl font-['TT_Commons_Pro_ExtraBold'] text-[#8B4513] leading-tight text-left">
            Scavenger Hunt
          </h1>
        </div>
        {/* Welcome Text */}
        <div className="flex-1 flex flex-col justify-center space-y-3 sm:space-y-4 lg:space-y-6 min-h-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-4xl font-['TT_Commons_Pro_ExtraBold'] text-[#8B4513] leading-tight px-2">
            You have found {progress?.totalFound} out of{" "}
            {progress?.totalCheckpoints} checkpoints!
          </h1>
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#8B4513] px-2">
              Collect your prize at the booth!
            </h2>
          </div>
        </div>

        <div className="px-2 flex-shrink-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#8B4513] leading-relaxed">
            Want to go for more? The higher your tier, the bigger your prize!
          </h2>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 px-2 flex-shrink-0 pb-4 lg:pb-8">
          <button
            onClick={() => navigate("/game")}
            className="flex-1 bg-[#F4EDE3] hover:bg-[#F4EDE3] text-[#FF5900] border border-[#FF5900] text-base sm:text-lg lg:text-xl font-['TT_Commons_Pro_DemiBold'] py-2 sm:py-4 lg:py-4 px-6 sm:px-8 lg:px-10 rounded-full transition-colors duration-200 shadow-lg"
          >
            Continue hunt
          </button>

          <button
            onClick={handleClaimPrize}
            className="flex-1 bg-[#FF5900] hover:bg-[#E54D00] text-white text-base sm:text-lg lg:text-xl font-['TT_Commons_Pro_DemiBold'] py-2 sm:py-4 lg:py-4 px-6 sm:px-8 lg:px-10 rounded-full transition-colors duration-200 shadow-lg"
          >
            Claim prize
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScavengerHuntFinish;
