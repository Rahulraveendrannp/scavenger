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
    <div className="min-h-screen bg-[#F5F5DC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-full mx-auto flex flex-col justify-center items-center text-center space-y-8 min-h-screen">
        <div className="flex items-center justify-start w-full">
          <h1 className="text-4xl font-bold text-[#8B4513] leading-tight text-left">
            Scavenger Hunt
          </h1>
        </div>
        {/* Welcome Text */}
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <h1 className="text-4xl font-bold text-[#8B4513] leading-tight">
            You have found {progress?.totalFound} out of{" "}
            {progress?.totalCheckpoints} checkpoints!
          </h1>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#8B4513]">
              That's put you in the{" "}
              <span className="font-extrabold">{gameState} Tier</span>
            </h2>
            <h2 className="text-2xl font-bold text-[#8B4513]">
              Collect your prize at the booth!
            </h2>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#8B4513]">
            Want to go for more?The higher your tier, the bigger your
            prize!{" "}
          </h2>
        </div>

        {/* How it works Button */}
        <div className="w-full flex  gap-2 pb-8">
          <button
            onClick={() => navigate("/game")}
            className=" bg-white hover:bg-white text-orange-600 border border-orange-600 text-xl font-semibold py-4 px-8 rounded-full transition-colors duration-200 shadow-lg"
          >
            Continue hunt
          </button>

          <button
            onClick={handleClaimPrize}
            className=" bg-orange-500 hover:bg-orange-600 text-white text-xl font-semibold py-4 px-8 rounded-full transition-colors duration-200 shadow-lg"
          >
            Claim prize
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScavengerHuntFinish;
