// components/ProgressPage.tsx
import React from "react";

interface ProgressPageProps {
  totalFound: number;
  totalCheckpoints: number;
  currentTier: string;
  onContinueHunt: () => void;
  onClaimPrize: () => void;
}

const ProgressPage: React.FC<ProgressPageProps> = ({
  totalFound,
  totalCheckpoints,
  currentTier,
  onContinueHunt,
  onClaimPrize,
}) => {
  return (
    <div className="min-h-screen bg-[#F5F5DC] flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#8B4513] mb-6">
          Scavenger Hunt
        </h1>
      </div>

      {/* Progress Information */}
      <div className="text-center mb-8 max-w-md">
        <div className="space-y-4 text-[#8B4513]">
          <p className="text-xl">
            You've found <span className="font-bold">{totalFound}</span> out of{" "}
            <span className="font-bold">{totalCheckpoints}</span> checkpoints.
          </p>
          <p className="text-lg">
            That puts you in the{" "}
            <span className="font-bold">{currentTier} Tier</span>.
          </p>
          <p className="text-lg">Collect your prize at the booth.</p>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="text-center mb-12 max-w-md">
        <p className="text-[#8B4513] text-lg">
          Want to go for more? The higher your tier, the bigger your prize!
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 w-full max-w-md">
        <button
          onClick={onContinueHunt}
          className="flex-1 border-2 border-[#FF8C00] text-[#FF8C00] py-3 px-6 rounded-lg font-semibold hover:bg-[#FF8C00] hover:text-white transition-colors"
        >
          Continue hunt
        </button>
        <button
          onClick={onClaimPrize}
          className="flex-1 bg-[#FF8C00] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#FF7F00] transition-colors"
        >
          Claim prize
        </button>
      </div>
    </div>
  );
};

export default ProgressPage;
