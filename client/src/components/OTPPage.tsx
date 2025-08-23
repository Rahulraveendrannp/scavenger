// components/OTPPage.tsx
import React, { useState } from "react";
import { ScavengerAPI } from "../api";
import { validateOTP } from "../utils";
import type { GameSession } from "../types";

interface OTPPageProps {
  onBack: () => void;
  onSuccess: (session: GameSession) => void;
  phoneNumber: string;
}

const OTPPage: React.FC<OTPPageProps> = ({
  onBack,
  onSuccess,
  phoneNumber,
}) => {
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerifyOTP = async () => {
    if (!validateOTP(otpCode)) {
      setError("Please enter a valid 4-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await ScavengerAPI.verifyOTP(phoneNumber, otpCode);

      if (response.success && response.session) {
        onSuccess(response.session);
      } else {
        setError(response.error || "Invalid OTP. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setOtpCode(value);
    if (error) setError("");
  };

  return (
    <div className="min-h-screen bg-[#FF5900] relative overflow-hidden font-['TT_Commons_Pro_DemiBold']">

      {/* Grey center section with bg.svg - 70% of screen height */}
      <div className="absolute top-[10%] left-[-10%] right-0 h-[80%] w-[120%] bg-[#FF5900]">
        {/* bg.svg as background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: 'url(/bg.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      </div>

      {/* Main content area */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Phone icon */}
        <div className="mb-8">
          <img 
            src="/phone.svg" 
            alt="Phone icon" 
            className="w-16 h-16 mx-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#5D4E37] mb-2">
          Verify OTP
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-600 text-sm mb-8 text-center">
          Enter the 4-digit code sent to {phoneNumber}
        </p>

        {/* OTP input */}
        <div className="w-full max-w-xs mb-6">
          <input
            type="text"
            value={otpCode}
            onChange={handleOtpChange}
            placeholder="Enter 4-digit code"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none text-center text-2xl tracking-widest font-['TT_Commons_Pro_ExtraBold'] ${
              error ? "border-red-500" : "border-[#FF5900]"
            }`}
            disabled={isLoading}
            maxLength={4}
            inputMode="numeric"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm text-center mb-4 max-w-xs">{error}</p>
        )}

        {/* Verify OTP button */}
        <div className="w-full max-w-xs mb-4">
          <button
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 4 || isLoading}
            className="w-full bg-[#FF5900] text-white py-2 rounded-full text-base font-['TT_Commons_Pro_DemiBold'] hover:bg-[#E54D00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          disabled={isLoading}
          className="text-[#5D4E37] text-sm hover:text-[#FF5900] disabled:opacity-50 transition-colors"
        >
          ← Back to registration
        </button>
      </div>
    </div>
  );
};

export default OTPPage;
