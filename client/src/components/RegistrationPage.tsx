import React, { useState } from "react";
import { ScavengerAPI } from "../api";

interface RegistrationPageProps {
  onBack?: () => void;
  onSuccess: (phoneNumber: string) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onSuccess }) => {
  const [localPhone, setLocalPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    // Validate Qatar phone number format
    if (!/^\d{8}$/.test(localPhone)) {
      setError("Please enter a valid 8-digit Qatar phone number");
      return;
    }

    const phoneNumber = `+974${localPhone}`;

    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting to send OTP to:", phoneNumber);

      const response = await ScavengerAPI.registerUser(phoneNumber);

      if (response.success) {
        console.log("OTP sent successfully to:", phoneNumber);
        onSuccess(phoneNumber);
      } else {
        console.error("OTP send failed:", response.error);
        setError(response.error || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FF5900] relative overflow-hidden">

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
        <h1 className="text-2xl font-bold text-[#5D4E37] mb-2">
          Register to play
        </h1>
        
        {/* Subtitle */}
        <p className="text-gray-600 text-sm mb-8 text-center">
          Enter your Qatar phone number to get started
        </p>

        {/* Phone input */}
        <div className="w-full max-w-xs mb-6">
          <div className="flex bg-white border-2 border-[#FF5900] rounded-lg overflow-hidden shadow-lg">
            <div className="px-4 py-3 bg-gray-50 border-r border-[#FF5900]">
              <span className="text-[#5D4E37] font-medium">+974</span>
            </div>
            <input
              type="tel"
              value={localPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                setLocalPhone(val);
                if (error) setError("");
              }}
              className="flex-1 px-3 py-3 text-[#5D4E37] focus:outline-none"
              placeholder="12345678"
              disabled={isLoading}
              maxLength={8}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm text-center mb-4 max-w-xs">{error}</p>
        )}

        {/* Send OTP button */}
        <div className="w-full max-w-xs">
          <button
            onClick={handleSubmit}
            disabled={isLoading || localPhone.length !== 8}
            className="w-full bg-[#FF5900] text-white py-2 rounded-full text-base font-semibold hover:bg-[#E54D00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;