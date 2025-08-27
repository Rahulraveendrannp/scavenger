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

// Get all users with progress and claim status, sorted by recent QR scan activity
router.get('/all-users', catchAsync(async (req, res) => {
  console.log('📊 Admin: Getting all users with progress, sorted by recent QR scan activity...');

  try {
    // Get all users sorted by lastQRScanAt (most recent first)
    const users = await User.find().sort({ lastQRScanAt: -1, createdAt: -1 });
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
          
          // Check if scavenger hunt is completed (5+ checkpoints = half completion)
          const scavengerCompleted = scavengerProgress >= 5;
          
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            lastQRScanAt: user.lastQRScanAt,
            completedGames: `${completedGames}/4`,
            scavengerProgress: `${scavengerProgress}/11`,
            scavengerCompleted: scavengerCompleted,
            isClaimed: user.isClaimed || false,
            voucherCode: user.voucherCode || null
          };
        } catch (err) {
          console.error(`❌ Error loading progress for user ${user._id}:`, err);
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            lastQRScanAt: user.lastQRScanAt,
            completedGames: '0/4',
            scavengerProgress: '0/11',
            isClaimed: user.isClaimed || false,
            voucherCode: user.voucherCode || null
          };
        }
      })
    );

    console.log('📊 Admin: Successfully loaded all users with progress, sorted by recent QR scan activity');
    res.status(200).json({
      success: true,
      users: usersWithProgress
    });

  } catch (error) {
    console.error('❌ Admin: Error loading users:', error);
    throw new AppError('Failed to load users', 500);
  }
}));

// Generate voucher code for user
router.post('/generate-voucher', catchAsync(async (req, res) => {
  const { phoneNumber } = req.body;
  
  console.log('🎫 Admin: Generating voucher code...', { phoneNumber });

  if (!phoneNumber) {
    throw new AppError('Phone number is required', 400);
  }

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user already has a voucher code
    if (user.voucherCode) {
      // Return existing voucher code
      console.log(`🎫 Admin: User ${phoneNumber} already has voucher code: ${user.voucherCode}`);
      
      return res.status(200).json({
        success: true,
        data: {
          voucherCode: user.voucherCode,
          phoneNumber: user.phoneNumber,
          userId: user._id
        }
      });
    }

    // No generation here: voucher codes are created at registration time
    // If we reach here, this user unexpectedly has no voucher code
    throw new AppError('User has no voucher code. Voucher codes are created at registration.', 400);

  } catch (error) {
    console.error('❌ Admin: Error generating voucher code:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to generate voucher code', 500);
  }
}));

// Mark user as claimed (for voucher code)
router.post('/mark-claimed', catchAsync(async (req, res) => {
  const { voucherCode } = req.body;
  
  console.log('🏆 Admin: Processing voucher code for claim...', { voucherCode });

  if (!voucherCode) {
    throw new AppError('Voucher code is required', 400);
  }

  try {
    // Find user by voucher code
    const user = await User.findOne({ voucherCode: voucherCode.toUpperCase() });
    if (!user) {
      throw new AppError('Invalid voucher code or user not found', 404);
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
        voucherCode: user.voucherCode
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

// Toggle claim status for user
router.post('/toggle-claim-status', catchAsync(async (req, res) => {
  const { userId } = req.body;
  
  console.log('🔄 Admin: Toggling claim status...', { userId });

  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Toggle claim status
    user.isClaimed = !user.isClaimed;
    await user.save();

    console.log(`🔄 Admin: Successfully toggled claim status for user ${user.phoneNumber} to ${user.isClaimed}`);

    res.status(200).json({
      success: true,
      message: `User ${user.phoneNumber} claim status updated successfully!`,
      data: {
        phoneNumber: user.phoneNumber,
        userId: user._id,
        isClaimed: user.isClaimed,
        voucherCode: user.voucherCode
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error toggling claim status:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle claim status', 500);
  }
}));

// Get detailed statistics for admin dashboard
router.get('/statistics', catchAsync(async (req, res) => {
  console.log('📊 Admin: Getting detailed statistics...');

  try {
    // Get all users with their progress
    const users = await User.find();
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
            isClaimed: user.isClaimed || false,
            completedGames,
            scavengerProgress
          };
        } catch (err) {
          return {
            _id: user._id,
            phoneNumber: user.phoneNumber,
            isClaimed: user.isClaimed || false,
            completedGames: 0,
            scavengerProgress: 0
          };
        }
      })
    );

    // Calculate statistics
    const totalUsers = usersWithProgress.length;
    const totalClaimed = usersWithProgress.filter(user => user.isClaimed).length;
    const totalUnclaimed = totalUsers - totalClaimed;

    // Breakdown by completion levels (1/4, 2/4, 3/4, 4/4)
    const claimedByCompletion = {
      '1/4': usersWithProgress.filter(user => user.isClaimed && user.completedGames === 1).length,
      '2/4': usersWithProgress.filter(user => user.isClaimed && user.completedGames === 2).length,
      '3/4': usersWithProgress.filter(user => user.isClaimed && user.completedGames === 3).length,
      '4/4': usersWithProgress.filter(user => user.isClaimed && user.completedGames === 4).length,
      '0/4': usersWithProgress.filter(user => user.isClaimed && user.completedGames === 0).length
    };

    // Scavenger hunt completion statistics
    const scavengerStats = {
      totalCompleted: usersWithProgress.filter(user => user.scavengerProgress >= 5).length,
      totalIncomplete: usersWithProgress.filter(user => user.scavengerProgress < 5).length,
      averageProgress: usersWithProgress.length > 0 
        ? Math.round((usersWithProgress.reduce((sum, user) => sum + user.scavengerProgress, 0) / usersWithProgress.length) * 10) / 10
        : 0
    };

    // Per-game completion counts
    const perGameCompletions = {
      lunchboxMatcher: 0,
      cityRun: 0,
      talabeats: 0,
      scavengerHunt: 0
    };

    // Count by looking up progress docs in one extra pass
    try {
      const progresses = await UserProgress.find();
      progresses.forEach((p) => {
        if (p.dashboardGames?.lunchboxMatcher?.isCompleted) perGameCompletions.lunchboxMatcher += 1;
        if (p.dashboardGames?.cityRun?.isCompleted) perGameCompletions.cityRun += 1;
        if (p.dashboardGames?.talabeats?.isCompleted) perGameCompletions.talabeats += 1;
        // Scavenger considered completed at 5+ checkpoints
        if ((p.scavengerHuntProgress?.completedCheckpoints?.length || 0) >= 5) perGameCompletions.scavengerHunt += 1;
      });
    } catch (e) {
      console.error('❌ Admin: Error aggregating per-game completions:', e);
    }

    // Additional statistics
    const additionalStats = {
      usersWithVoucherCodes: users.filter(user => user.voucherCode).length,
      usersWithoutVoucherCodes: users.filter(user => !user.voucherCode).length,
      recentActivity: users.filter(user => user.lastQRScanAt && 
        new Date(user.lastQRScanAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length // Last 24 hours
    };

    console.log('📊 Admin: Successfully calculated detailed statistics');

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalClaimed,
        totalUnclaimed,
        claimedByCompletion,
        scavengerStats,
        additionalStats,
        perGameCompletions
      }
    });

  } catch (error) {
    console.error('❌ Admin: Error getting statistics:', error);
    throw new AppError('Failed to get statistics', 500);
  }
}));

module.exports = router;
