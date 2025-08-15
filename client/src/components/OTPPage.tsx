// components/OTPPage.tsx
import React, { useState } from 'react';
import {  Smartphone } from 'lucide-react';
import { ScavengerAPI } from '../api';
import { validateOTP } from '../utils';
import type { GameSession } from '../types';

interface OTPPageProps {
  onBack: () => void;
  onSuccess: (session: GameSession) => void;
  phoneNumber: string;
}

const OTPPage: React.FC<OTPPageProps> = ({ onBack, onSuccess, phoneNumber }) => {
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyOTP = async () => {
    if (!validateOTP(otpCode)) {
      setError('Please enter a valid 4-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await ScavengerAPI.verifyOTP(phoneNumber, otpCode);
      
      if (response.success && response.session) {
        onSuccess(response.session);
      } else {
        setError(response.error || 'Invalid OTP. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOtpCode(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 max-w-md w-full">
        <div className="text-center mb-4 sm:mb-6">
          <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Verify OTP</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Enter the 4-digit code sent to {phoneNumber}</p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              OTP Code
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={handleOtpChange}
              placeholder="Enter 4-digit code"
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-lg sm:text-2xl tracking-widest ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
              maxLength={4}
              inputMode="numeric"
            />
            {error && (
              <p className="mt-2 text-xs sm:text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <button 
            onClick={handleVerifyOTP}
            disabled={otpCode.length !== 4 || isLoading}
            className="w-full bg-orange-500 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </div>
        
        <button 
          onClick={onBack}
          disabled={isLoading}
          className="w-full mt-3 sm:mt-4 text-gray-500 text-xs sm:text-sm hover:text-gray-700 disabled:opacity-50"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default OTPPage;