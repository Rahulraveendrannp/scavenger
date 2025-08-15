// server/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const smsService = require('../services/smsService');
const { asyncHandler } = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    error: 'Too many OTP requests, please try again later'
  }
});

// Rate limiting for OTP verification
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: {
    success: false,
    error: 'Too many verification attempts, please try again later'
  }
});

// Validation middleware
const validatePhoneNumber = [
  body('phoneNumber')
    .matches(/^(\+974|974)?[3456789]\d{7}$/)
    .withMessage('Please enter a valid Qatar phone number'),
];

const validateOTP = [
  body('otpCode')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('OTP must be exactly 4 digits'),
];

/**
 * @route   POST /api/auth/register
 * @desc    Register user and send OTP
 * @access  Public
 */
router.post('/register', otpLimiter, validatePhoneNumber, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { phoneNumber } = req.body;

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\s/g, '');

  // Check if user recently requested OTP
  let user = await User.findByPhoneNumber(normalizedPhone).select('+lastOtpRequest +otpAttempts');
  
  if (user && user.lastOtpRequest) {
    const timeSinceLastRequest = Date.now() - user.lastOtpRequest.getTime();
    const cooldownPeriod = 2 * 60 * 1000; // 2 minutes
    
    if (timeSinceLastRequest < cooldownPeriod) {
      return next(new AppError(`Please wait ${Math.ceil((cooldownPeriod - timeSinceLastRequest) / 1000)} seconds before requesting another OTP`, 429));
    }
  }

  // Send OTP via Qatar SMS API
  try {
    const smsResult = await smsService.sendOTPAndReturn(normalizedPhone);
    
    if (!smsResult.success) {
      return next(new AppError('Failed to send OTP. Please try again.', 500));
    }

    const otpCode = smsResult.otp;
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // FOR TESTING: Log the OTP
    console.log('🔐 TESTING MODE: Generated OTP:', otpCode, 'for phone:', normalizedPhone);

    // Create or update user
    if (!user) {
      user = new User({
        phoneNumber: normalizedPhone,
        otpCode,
        otpExpires,
        otpAttempts: 0,
        lastOtpRequest: new Date()
      });
    } else {
      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0;
      user.lastOtpRequest = new Date();
    }

    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        otpSent: true,
        expiresIn: 300 // 5 minutes in seconds
      }
    });
  } catch (error) {
    console.error('SMS sending error:', error);
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }
}));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and authenticate user (TESTING MODE - BYPASSES OTP)
 * @access  Public
 */
router.post('/verify-otp', verifyLimiter, validateOTP, asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { phoneNumber, otpCode } = req.body;
  const normalizedPhone = phoneNumber.replace(/\s/g, '');

  // FOR TESTING: Log OTP and bypass verification
  console.log('🔐 TESTING MODE: OTP received:', otpCode, 'for phone:', normalizedPhone);
  console.log('🔐 TESTING MODE: OTP verification bypassed - always successful');

  // Find user with OTP data
  const user = await User.findByPhoneNumber(normalizedPhone).select('+otpCode +otpExpires +otpAttempts');
  
  if (!user) {
    return next(new AppError('User not found. Please register first.', 404));
  }

  // FOR TESTING: Skip all OTP validation
  console.log('🔐 TESTING MODE: Skipping OTP validation for user:', user.phoneNumber);

  // OTP is valid (bypassed) - clear OTP data and verify user
  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.isVerified = true;
  await user.save();

  // Generate session data
  const sessionData = {
    userId: user._id,
    phoneNumber: user.phoneNumber,
    isVerified: true
  };

  // Generate JWT
  console.log('🔐 TESTING MODE: Generating JWT token...');
  console.log('🔐 TESTING MODE: JWT_SECRET available:', process.env.JWT_SECRET ? 'Yes' : 'No');
  
  const token = jwt.sign(
    { id: user._id, phoneNumber: user.phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('🔐 TESTING MODE: JWT token generated successfully');
  console.log('🔐 TESTING MODE: Token length:', token.length);
  console.log('🔐 TESTING MODE: User verified successfully, token generated');

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully (TESTING MODE)',
    data: {
      session: sessionData,
      token
    }
  });
}));

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', otpLimiter, validatePhoneNumber, asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;
  const normalizedPhone = phoneNumber.replace(/\s/g, '');

  const user = await User.findByPhoneNumber(normalizedPhone).select('+lastOtpRequest');
  
  if (!user) {
    return next(new AppError('User not found. Please register first.', 404));
  }

  // Check cooldown period
  if (user.lastOtpRequest) {
    const timeSinceLastRequest = Date.now() - user.lastOtpRequest.getTime();
    const cooldownPeriod = 2 * 60 * 1000; // 2 minutes
    
    if (timeSinceLastRequest < cooldownPeriod) {
      return next(new AppError(`Please wait ${Math.ceil((cooldownPeriod - timeSinceLastRequest) / 1000)} seconds before requesting another OTP`, 429));
    }
  }

  // Send new OTP via Qatar SMS API
  try {
    const smsResult = await smsService.sendOTPAndReturn(normalizedPhone);
    
    if (!smsResult.success) {
      return next(new AppError('Failed to send OTP. Please try again.', 500));
    }

    const otpCode = smsResult.otp;
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    user.lastOtpRequest = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpSent: true,
        expiresIn: 300
      }
    });
  } catch (error) {
    console.error('SMS sending error:', error);
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }
}));

module.exports = router;