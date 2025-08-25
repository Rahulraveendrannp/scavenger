/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
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

  const handleFinish = () => {
    navigate("/dashboard");
  };

  // Decide which finish view to show
  const variant = useMemo(() => {
    const found = progress?.totalFound ?? 0;
    const total = progress?.totalCheckpoints ?? 8;
    if (found >= total && total > 0) return "all"; // Crushed it
    if (found >= 4) return "mid"; // Good progress (prize eligible in your rules)
    return "low"; // Needs more to win
  }, [progress]);

  return (
    <div className="h-screen relative font-body overflow-hidden">
      {/* Background layout image */}
      <div className="absolute inset-0 w-full h-full">
        <img src="/final.svg" alt="Finish Background" className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-6 px-4 text-center">
        {/* Top spacer for header area already baked into SVG */}
        <div />

        {/* Middle content */}
        <div className="space-y-3 mt-[60%]">
          {variant === "all" ? (
            <>
              <h1 className="text-3xl sm:text-3xl font-heading text-[#411517]">Crushed it!</h1>
              <p className="text-md w-[90%] mx-auto sm:text-base text-[#411517]">You found all the checkpoints. Fantastic job!</p>
              <div className="flex items-center justify-center pt-2">
                <img src="/star.svg" alt="Star" className="w-32 h-32" />
              </div>
            </>
          ) : variant === "mid" ? (
            <>
              <h1 className="text-3xl mx-auto w-[80%] sm:text-3xl font-heading text-[#411517]">
                You found {progress?.totalFound}/{progress?.totalCheckpoints} checkpoints!
              </h1>
              <p className="text-md sm:text-base text-[#411517]">Great job! But there's still more.</p>
              <div className="flex items-center justify-center pt-2">
                <img src="/thump.svg" alt="Thumb" className="w-16 h-16" />
              </div>
              <p className="text-md sm:text-sm text-[#411517] mt-2">
                Are you sure you want to finish?<br />
                You can't go back.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl w-[80%] mx-auto sm:text-3xl font-heading text-[#411517]">
                You found {progress?.totalFound}/{progress?.totalCheckpoints} checkpoints!
              </h1>
              <p className="text-md sm:text-base text-[#411517]">You need more to win a prize.</p>
              <div className="flex items-center justify-center pt-2">
                <img src="/heart.svg" alt="Heart" className="w-16 h-16" />
              </div>
              <p className="mt-2 text-md sm:text-sm text-[#411517]">
                Are you sure you want to finish?<br />
                You can't go back.
              </p>
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div className="w-full max-w-md mx-auto flex gap-3 pb-2">
          {variant === "all" ? (
            <button
              onClick={handleFinish}
                              className="flex-1 bg-[#411517] text-white py-3 font-bold rounded-full text-sm sm:text-base font-body"
            >
              Return to Home
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/game")}
                className="flex-1 bg-[#FF5900] text-white py-3 rounded-full text-base font-body"
              >
                Keep hunting
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 bg-[#411517] text-white py-3 rounded-full text-base font-body"
              >
                Finish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScavengerHuntFinish;
