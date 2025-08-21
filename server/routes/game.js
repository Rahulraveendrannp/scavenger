// src/routes/game.js
const express = require('express');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

/**
 * @route   GET /api/game/progress
 * @desc    Get current game progress
 * @access  Private
 */
router.get('/progress', authMiddleware, asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.user;
  console.log('🎮 Game Progress API: Fetching progress for phone:', phoneNumber);

  // Find user's progress
  let userProgress = await UserProgress.findOne({ phoneNumber });
  if (!userProgress) {
    console.log('🎮 Game Progress API: No user progress found, creating new record');
    // Create new progress record if doesn't exist
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    userProgress = new UserProgress({
      userId: user._id,
      phoneNumber: phoneNumber,
      gameStats: {
        gameStartedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1
      }
    });
    await userProgress.save();
    console.log('🎮 Game Progress API: New progress record created');
  }

  // Get scavenger hunt progress
  const scavengerProgress = userProgress.scavengerHuntProgress;
  const totalFound = scavengerProgress.completedCheckpoints.length;
  const totalCheckpoints = scavengerProgress.totalCheckpoints || 8;

  // Calculate current tier based on completion
  const completionPercentage = totalCheckpoints > 0 ? (totalFound / totalCheckpoints) * 100 : 0;
  let currentTier = 'Bronze';
  if (completionPercentage >= 80) currentTier = 'Gold';
  else if (completionPercentage >= 50) currentTier = 'Silver';

  console.log('🎮 Game Progress API: Progress found:', { totalFound, totalCheckpoints, currentTier });

  res.status(200).json({
    success: true,
    data: {
      totalFound,
      totalCheckpoints,
      currentTier,
      hintCredits: scavengerProgress.hintCredits || 3
    }
  });
}));

module.exports = router;