// src/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendOTP, sendOTPAlternative, generateOTP } = require('../services/otpServices');
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
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be exactly 6 digits'),
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

  // Generate OTP
  const otpCode = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

  // Send OTP via SMS using Twilio
  try {
    await sendOTP(normalizedPhone, otpCode);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        otpSent: true,
        expiresIn: 600 // 10 minutes in seconds
      }
    });
  } catch (error) {
    // Remove OTP data if SMS failed
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }
}));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and authenticate user
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

  // Find user with OTP data
  const user = await User.findByPhoneNumber(normalizedPhone).select('+otpCode +otpExpires +otpAttempts');
  
  if (!user || !user.otpCode) {
    return next(new AppError('No OTP request found. Please request a new OTP.', 404));
  }

  // Check if too many attempts
  if (user.otpAttempts >= 5) {
    // Clear OTP data after too many failed attempts
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();
    
    return next(new AppError('Too many failed attempts. Please request a new OTP.', 429));
  }

  // Check if OTP expired
  if (user.isOTPExpired()) {
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();
    
    return next(new AppError('OTP has expired. Please request a new OTP.', 400));
  }

  // Verify OTP
  const isValidOTP = await user.compareOTP(otpCode);
  
  if (!isValidOTP) {
    user.otpAttempts += 1;
    await user.save();
    
    return next(new AppError(`Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`, 400));
  }

  // OTP is valid - clear OTP data and verify user
  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.isVerified = true;
  await user.save();

  // Generate session (you can implement JWT here if needed)
  const sessionData = {
    userId: user._id,
    phoneNumber: user.phoneNumber,
    isVerified: true
  };

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, phoneNumber: user.phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
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

  // Generate new OTP
  const otpCode = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  user.otpCode = otpCode;
  user.otpExpires = otpExpires;
  user.otpAttempts = 0;
  user.lastOtpRequest = new Date();
  await user.save();

  // Send OTP using Twilio
  try {
    await sendOTP(normalizedPhone, otpCode);
    
    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpSent: true,
        expiresIn: 600
      }
    });
  } catch (error) {
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }
}));

/**
 * @route   POST /api/auth/firebase-verify
 * @desc    Verify Firebase token and create/update user
 * @access  Public
 */
router.post('/firebase-verify', asyncHandler(async (req, res, next) => {
  const { phoneNumber, firebaseToken } = req.body;

  if (!phoneNumber || !firebaseToken) {
    return next(new AppError('Phone number and Firebase token are required', 400));
  }

  try {
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    
    if (decodedToken.phone_number !== phoneNumber) {
      return next(new AppError('Phone number mismatch', 400));
    }

    // Find or create user
    let user = await User.findByPhoneNumber(phoneNumber);
    
    if (!user) {
      // Create new user
      user = new User({
        phoneNumber,
        firebaseUid: decodedToken.uid,
        isVerified: true,
        gameStats: {
          totalGames: 0,
          completedGames: 0,
          bestTime: null,
          totalRewards: 0,
          currentStreak: 0
        }
      });
    } else {
      // Update existing user
      user.firebaseUid = decodedToken.uid;
      user.isVerified = true;
    }

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session data
    const sessionData = {
      userId: user._id,
      phoneNumber: user.phoneNumber,
      isVerified: true
    };

    res.status(200).json({
      success: true,
      message: 'Firebase verification successful',
      data: {
        session: sessionData,
        token
      }
    });

  } catch (error) {
    console.error('Firebase verification error:', error);
    return next(new AppError('Invalid Firebase token', 401));
  }
}));

module.exports = router;