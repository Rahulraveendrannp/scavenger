const express = require('express');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const router = express.Router();

// No authentication required for admin routes

// Get all users with their progress and prize claim status
router.get('/users', catchAsync(async (req, res) => {
  console.log('📊 Admin: Getting all users...');

  try {
    // Get all users
    const users = await User.find().sort({ createdAt: -1 });
    console.log(`📊 Admin: Found ${users.length} users`);

    // Get progress for each user
    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        try {
          // Get user progress
          const userProgress = await UserProgress.findOne({ userId: user._id });
          
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            progress: userProgress ? {
              dashboardGames: userProgress.dashboardGames || {},
              scavengerHunt: {
                completedCheckpoints: userProgress.completedCheckpoints || [],
                totalFound: userProgress.totalFound || 0,
                isCompleted: userProgress.isCompleted || false
              }
            } : {},
            hasClaimed: user.hasClaimed || {
              cardGame: false,
              puzzle: false,
              carRace: false,
              scavengerHunt: false
            }
          };
        } catch (err) {
          console.error(`❌ Error loading progress for user ${user._id}:`, err);
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            progress: {},
            hasClaimed: {
              cardGame: false,
              puzzle: false,
              carRace: false,
              scavengerHunt: false
            }
          };
        }
      })
    );

    console.log('📊 Admin: Successfully loaded all users with progress');
    res.status(200).json({
      success: true,
      users: usersWithProgress
    });

  } catch (error) {
    console.error('❌ Admin: Error loading users:', error);
    throw new AppError('Failed to load users', 500);
  }
}));

// Update prize claim status for a user
router.post('/prize-claim', catchAsync(async (req, res) => {
  const { userId, prizeType, claimed } = req.body;
  
  console.log('🏆 Admin: Updating prize claim...', { userId, prizeType, claimed });

  // Validate input
  if (!userId || !prizeType || typeof claimed !== 'boolean') {
    throw new AppError('Missing required fields: userId, prizeType, claimed', 400);
  }

  const validPrizeTypes = ['cardGame', 'puzzle', 'carRace', 'scavengerHunt'];
  if (!validPrizeTypes.includes(prizeType)) {
    throw new AppError(`Invalid prize type. Must be one of: ${validPrizeTypes.join(', ')}`, 400);
  }

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Initialize hasClaimed if it doesn't exist
    if (!user.hasClaimed) {
      user.hasClaimed = {
        cardGame: false,
        puzzle: false,
        carRace: false,
        scavengerHunt: false
      };
    }

    // Update the specific prize claim status
    user.hasClaimed[prizeType] = claimed;
    
    // Save the user
    await user.save();

    console.log(`🏆 Admin: Successfully updated ${prizeType} prize claim for user ${userId} to ${claimed}`);

    res.status(200).json({
      success: true,
      message: `Prize claim ${claimed ? 'marked' : 'unmarked'} successfully`,
      data: {
        userId,
        prizeType,
        claimed,
        hasClaimed: user.hasClaimed
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error updating prize claim:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update prize claim', 500);
  }
}));

// Get admin statistics (optional - for dashboard stats)
router.get('/stats', catchAsync(async (req, res) => {
  console.log('📈 Admin: Getting statistics...');

  try {
    const totalUsers = await User.countDocuments();
    const totalProgress = await UserProgress.countDocuments();
    
    // Count users with completed scavenger hunts
    const completedHunts = await UserProgress.countDocuments({ isCompleted: true });
    
    // Count total prize claims
    const users = await User.find();
    let totalPrizeClaims = 0;
    
    users.forEach(user => {
      if (user.hasClaimed) {
        totalPrizeClaims += Object.values(user.hasClaimed).filter(Boolean).length;
      }
    });

    const stats = {
      totalUsers,
      totalProgress,
      completedHunts,
      totalPrizeClaims
    };

    console.log('📈 Admin: Statistics:', stats);

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Admin: Error getting statistics:', error);
    throw new AppError('Failed to get statistics', 500);
  }
}));

module.exports = router;
