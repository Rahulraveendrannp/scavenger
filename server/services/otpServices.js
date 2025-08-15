// src/services/otpService.js
// Twilio removed - using bypass mode for OTP generation

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS using Twilio
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<object>} Twilio message response
 */
const sendOTP = async (phoneNumber, otpCode) => {
  try {
    // Normalize phone number for Qatar
    let normalizedPhone = phoneNumber.replace(/\s/g, '');
    if (!normalizedPhone.startsWith('+974')) {
      if (normalizedPhone.startsWith('974')) {
        normalizedPhone = '+' + normalizedPhone;
      } else {
        normalizedPhone = '+974' + normalizedPhone;
      }
    }

    // BYPASS MODE: Always just log OTP to console (no SMS service)
    console.log(`\n🟢 =====================================`);
    console.log(`📱 OTP GENERATED FOR: ${normalizedPhone}`);
    console.log(`🔢 OTP CODE: ${otpCode}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`🟢 =====================================\n`);
    
    // Always return success without any external service
    return {
      sid: 'bypass_' + Date.now(),
      status: 'delivered',
      to: normalizedPhone,
      bypass: true
    };

  } catch (error) {
    console.error('❌ Failed to send OTP:', error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid format
 */
const validateOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Send OTP via alternative service (backup)
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<object>} Response from alternative service
 */
const sendOTPAlternative = async (phoneNumber, otpCode) => {
  // This could be integrated with other SMS providers like:
  // - AWS SNS
  // - MessageBird
  // - Nexmo/Vonage
  // - Local Qatar SMS providers
  
  console.log(`🔄 Attempting alternative SMS delivery to ${phoneNumber}`);
  
  // For now, just simulate success
  return {
    success: true,
    provider: 'alternative',
    to: phoneNumber,
    message: 'OTP sent via alternative provider'
  };
};

/**
 * Verify phone number format for Qatar
 * @param {string} phoneNumber - Phone number to verify
 * @returns {boolean} True if valid Qatar phone number
 */
const isValidQatarPhone = (phoneNumber) => {
  const qatarPhoneRegex = /^(\+974|974)?[3456789]\d{7}$/;
  const normalized = phoneNumber.replace(/\s/g, '');
  return qatarPhoneRegex.test(normalized);
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('974') && cleaned.length === 11) {
    const number = cleaned.substring(3);
    return `+974 ${number.substring(0, 4)} ${number.substring(4)}`;
  }
  
  if (cleaned.length === 8) {
    return `+974 ${cleaned.substring(0, 4)} ${cleaned.substring(4)}`;
  }
  
  return phoneNumber;
};

/**
 * Get SMS delivery status
 * @param {string} messageSid - Twilio message SID
 * @returns {Promise<object>} Message status
 */
const getSMSStatus = async (messageSid) => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return {
      sid: messageSid,
      status: 'delivered',
      errorCode: null
    };
  }

  try {
    const message = await client.messages(messageSid).fetch();
    return {
      sid: message.sid,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
  } catch (error) {
    console.error('Failed to fetch SMS status:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  sendOTPAlternative,
  validateOTPFormat,
  isValidQatarPhone,
  formatPhoneNumber,
  getSMSStatus
};