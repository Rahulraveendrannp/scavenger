// components/CompletionPage.tsx
import React, { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { ScavengerAPI } from "../api";
import type { RewardTier } from "../types";
import { formatTime, calculateRewardTier, generateRewardToken } from "../utils";

interface CompletionPageProps {
  phoneNumber: string;
  timeElapsed: number;
  scannedQRs: string[];
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
}

const CompletionPage: React.FC<CompletionPageProps> = ({
  phoneNumber,
  timeElapsed,
  //   scannedQRs,
  onViewLeaderboard,
}) => {
  const [rewardTier, setRewardTier] = useState<RewardTier>("Bronze");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardToken, setRewardToken] = useState("");

  useEffect(() => {
    const finalTimeMinutes = Math.floor(timeElapsed / 60);
    const tier = calculateRewardTier(finalTimeMinutes);
    setRewardTier(tier);
    setRewardToken(generateRewardToken(phoneNumber));

    // Submit completion to backend
    const submitCompletion = async () => {
      setIsSubmitting(true);
      try {
        await ScavengerAPI.submitGameCompletion(phoneNumber);
      } catch (error) {
        console.error("Failed to submit completion:", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    submitCompletion();
  }, [phoneNumber, timeElapsed]);

  const getRewardsList = (tier: RewardTier): string[] => {
    const baseRewards = ["Tasku Keychain"];

    switch (tier) {
      case "Gold":
        return [...baseRewards, "Pencil Case", "Special Badge"];
      case "Silver":
        return [...baseRewards, "Reusable Cup"];
      default:
        return baseRewards;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Congratulations!
          </h1>
          <p className="text-gray-600">You've completed the scavenger hunt!</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {formatTime(timeElapsed)}
            </div>
            <div
              className={`text-lg font-semibold mb-4 ${
                rewardTier === "Gold"
                  ? "text-yellow-600"
                  : rewardTier === "Silver"
                    ? "text-gray-500"
                    : "text-orange-600"
              }`}
            >
              {rewardTier} Tier
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">Your Rewards:</p>
              <div className="space-y-1">
                {getRewardsList(rewardTier).map((reward, index) => (
                  <p key={index}>• {reward}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onViewLeaderboard}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            View Leaderboard
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Redeem your rewards at the Talabat booth!
            </p>
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium">
              Reward Token: {rewardToken}
            </div>
          </div>

          {isSubmitting && (
            <p className="text-xs text-gray-500">Saving your score...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletionPage;
