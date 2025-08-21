const express = require('express');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const router = express.Router();

// No authentication required for admin routes

// Get total users count
router.get('/total-users', catchAsync(async (req, res) => {
  console.log('📊 Admin: Getting total users count...');

  try {
    const totalUsers = await User.countDocuments();
    console.log(`📊 Admin: Total users: ${totalUsers}`);

    res.status(200).json({
      success: true,
      totalUsers
    });

  } catch (error) {
    console.error('❌ Admin: Error getting total users:', error);
    throw new AppError('Failed to get total users', 500);
  }
}));

// Get all users with progress and claim status
router.get('/all-users', catchAsync(async (req, res) => {
  console.log('📊 Admin: Getting all users with progress...');

  try {
    const users = await User.find().sort({ createdAt: -1 });
    console.log(`📊 Admin: Found ${users.length} users`);

    const usersWithProgress = await Promise.all(
      users.map(async (user) => {
        try {
          const userProgress = await UserProgress.findOne({ userId: user._id });
          
          // Calculate completed games
          const dashboardGames = userProgress?.dashboardGames || {};
          const completedGames = Object.values(dashboardGames).filter(game => game?.isCompleted).length;
          
          // Get scavenger hunt progress
          const scavengerProgress = userProgress?.scavengerHuntProgress?.completedCheckpoints?.length || 0;
          
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            completedGames: `${completedGames}/4`,
            scavengerProgress: `${scavengerProgress}/8`,
            isClaimed: user.isClaimed || false
          };
        } catch (err) {
          console.error(`❌ Error loading progress for user ${user._id}:`, err);
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            completedGames: '0/4',
            scavengerProgress: '0/8',
            isClaimed: user.isClaimed || false
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

// Generate claim QR code for user
router.post('/generate-claim-qr', catchAsync(async (req, res) => {
  const { phoneNumber } = req.body;
  
  console.log('🎫 Admin: Generating claim QR code...', { phoneNumber });

  if (!phoneNumber) {
    throw new AppError('Phone number is required', 400);
  }

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user already has a QR code
    if (user.claimQRCode) {
      // Return existing QR code
      console.log(`🎫 Admin: User ${phoneNumber} already has QR code: ${user.claimQRCode}`);
      
      return res.status(200).json({
        success: true,
        data: {
          qrCode: user.claimQRCode,
          phoneNumber: user.phoneNumber,
          userId: user._id
        }
      });
    }

    // Generate unique QR code with phone number and user ID (not timestamp)
    const qrCode = `TALABAT_CLAIM_${phoneNumber}_${user._id}`;
    
    // Save QR code to user
    user.claimQRCode = qrCode;
    await user.save();

    console.log(`🎫 Admin: Generated QR code for user ${phoneNumber}`);

    res.status(200).json({
      success: true,
      data: {
        qrCode,
        phoneNumber: user.phoneNumber,
        userId: user._id
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error generating QR code:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to generate QR code', 500);
  }
}));

// Mark user as claimed (for QR code scanning)
router.post('/mark-claimed', catchAsync(async (req, res) => {
  const { qrCode } = req.body;
  
  console.log('🏆 Admin: Scanning QR code for claim...', { qrCode });

  if (!qrCode) {
    throw new AppError('QR code is required', 400);
  }

  try {
    // Find user by QR code
    const user = await User.findOne({ claimQRCode: qrCode });
    if (!user) {
      throw new AppError('Invalid QR code or user not found', 404);
    }

    // Check if already claimed
    if (user.isClaimed) {
      throw new AppError('User has already claimed their reward', 400);
    }

    // Mark as claimed
    user.isClaimed = true;
    await user.save();

    console.log(`🏆 Admin: Successfully marked user ${user.phoneNumber} as claimed`);

    res.status(200).json({
      success: true,
      message: `User ${user.phoneNumber} marked as claimed successfully!`,
      data: {
        phoneNumber: user.phoneNumber,
        userId: user._id,
        isClaimed: true,
        qrCode: user.claimQRCode
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error marking user as claimed:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to mark user as claimed', 500);
  }
}));

// Check if user is claimed
router.get('/check-claimed/:phoneNumber', catchAsync(async (req, res) => {
  const { phoneNumber } = req.params;
  
  console.log('🔍 Admin: Checking if user is claimed...', { phoneNumber });

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        isClaimed: user.isClaimed || false
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error checking claim status:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to check claim status', 500);
  }
}));



module.exports = router;
