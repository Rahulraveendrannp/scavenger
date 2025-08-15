// RegistrationPage.tsx - Twilio OTP Registration
import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { ScavengerAPI } from '../api';

interface RegistrationPageProps {
  onBack?: () => void;
  onSuccess: (phoneNumber: string) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onSuccess }) => {
  const [localPhone, setLocalPhone] = useState('12345678'); // Pre-filled for testing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');



  const handleSubmit = async () => {
    // Validate Qatar phone number format
    if (!/^\d{8}$/.test(localPhone)) {
      setError('Please enter a valid 8-digit Qatar phone number');
      return;
    }
    
    const phoneNumber = `+974${localPhone}`;
    
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting to send OTP to:', phoneNumber);
      
      const response = await ScavengerAPI.registerUser(phoneNumber);
      
      if (response.success) {
        console.log('OTP sent successfully to:', phoneNumber);
        onSuccess(phoneNumber);
      } else {
        console.error('OTP send failed:', response.error);
        setError(response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 max-w-md w-full">
        <div className="text-center mb-4 sm:mb-6">
          <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Register to Play</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Enter your Qatar phone number to get started</p>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex items-center">
              <span className="px-2 sm:px-3 py-2 sm:py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 select-none text-sm sm:text-base">+974</span>
              <input
                type="tel"
                value={localPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setLocalPhone(val);
                  if (error) setError('');
                }}
                placeholder="12345678"
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-r-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
                maxLength={8}
                inputMode="numeric"
              />
            </div>
          </div>
          
          {error && (
            <p className="mt-2 text-xs sm:text-sm text-red-600">{error}</p>
          )}
          
          <button 
            onClick={handleSubmit}
            disabled={isLoading || localPhone.length !== 8}
            className="w-full bg-orange-500 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;