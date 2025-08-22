import React, { useState, useEffect } from "react";
import { ScavengerAPI } from "../api";

interface ClaimPrizeProps {}

const ClaimPrize: React.FC<ClaimPrizeProps> = () => {
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    loadVoucherCode();
  }, []);

  const loadVoucherCode = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get phone number from localStorage
      const storedPhoneNumber = localStorage.getItem("talabat_phone_number");
      if (!storedPhoneNumber) {
        setError("Phone number not found. Please register again.");
        return;
      }
      
      setPhoneNumber(storedPhoneNumber);
      
      // Generate voucher code
      const response = await ScavengerAPI.generateVoucher(storedPhoneNumber);
      
      if (response.success && response.data?.voucherCode) {
        setVoucherCode(response.data.voucherCode);
      } else {
        setError(response.error || "Failed to generate voucher code");
      }
    } catch (err) {
      console.error("Error loading voucher code:", err);
      setError("Failed to load voucher code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScratch = () => {
    setIsScratched(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B4513] mx-auto mb-4"></div>
          <p className="text-lg text-[#8B4513]">Loading your voucher...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={loadVoucherCode}
            className="bg-[#8B4513] text-white px-6 py-2 rounded-lg hover:bg-[#A0522D] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center text-[#8B4513] mt-10 mb-4">
          Claim Your Prize
        </h1>
        <p className="text-center text-lg text-[#8B4513] mb-8">
          Congratulations on completing the scavenger hunt! Your prize can be
          claimed by showing the voucher code below at booth 5.
        </p>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-center text-[#8B4513] mb-4">
            Your Voucher Code
          </h2>
          
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Scratch here to see your voucher code:</p>
            
            <div 
              className={`relative inline-block cursor-pointer ${
                isScratched ? 'pointer-events-none' : ''
              }`}
              onClick={handleScratch}
            >
              <div className="bg-gray-300 rounded-lg p-4 min-w-[120px] text-center">
                {isScratched ? (
                  <span className="text-2xl font-bold text-[#8B4513] tracking-wider">
                    {voucherCode}
                  </span>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="text-gray-500 text-sm">👆 Scratch Here</span>
                  </div>
                )}
              </div>
              
              {!isScratched && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">👆 Scratch Here</span>
                </div>
              )}
            </div>
          </div>

          {isScratched && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Show this code to claim your reward:
              </p>
              <div className="bg-[#8B4513]/10 border-2 border-[#8B4513] rounded-lg p-3">
                <span className="text-3xl font-bold text-[#8B4513] tracking-wider">
                  {voucherCode}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Scratch the area above to reveal your voucher code</li>
            <li>• Take a screenshot or remember the code</li>
            <li>• Visit booth 5 and show the code to claim your prize</li>
            <li>• Each code can only be used once</li>
          </ul>
        </div>

        {phoneNumber && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Phone: {phoneNumber}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimPrize;
