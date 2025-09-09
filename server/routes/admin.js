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
    // Parse pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25; // Default to 25 users per page
    const search = req.query.search || ''; // Search term for phone number or voucher code
    const skip = (page - 1) * limit;
    
    console.log('📊 Admin: Search parameters:', { page, limit, search, skip });

    // Use aggregation pipeline for efficient data retrieval with pagination
    const pipeline = [
      // Add search filter if search term is provided
      ...(search ? [{
        $match: {
          $or: [
            { phoneNumber: { $regex: search, $options: 'i' } },
            { voucherCode: { $regex: search, $options: 'i' } }
          ]
        }
      }] : []),
      {
        $lookup: {
          from: 'userprogresses', // MongoDB collection name for UserProgress
          localField: '_id',
          foreignField: 'userId',
          as: 'progress'
        }
      },
      {
        $addFields: {
          // Get the first (most recent) progress record, or null if no progress
          progress: {
            $cond: [
              { $gt: [{ $size: '$progress' }, 0] },
              { $arrayElemAt: ['$progress', 0] },
              null
            ]
          }
        }
      },
      {
        $addFields: {
          completedGames: {
            $size: {
              $filter: {
                input: {
                  $objectToArray: {
                    $ifNull: ['$progress.dashboardGames', {}]
                  }
                },
                cond: { $eq: ['$$this.v.isCompleted', true] }
              }
            }
          },
          scavengerProgress: {
            $size: {
              $ifNull: ['$progress.scavengerHuntProgress.completedCheckpoints', []]
            }
          }
        }
      },
      {
        $addFields: {
          scavengerCompleted: { $gte: ['$scavengerProgress', 5] }
        }
      },
      {
        $project: {
          _id: 1,
          phoneNumber: 1,
          createdAt: 1,
          lastQRScanAt: 1,
          isClaimed: { $ifNull: ['$isClaimed', false] },
          voucherCode: 1,
          completedGames: { $concat: [{ $toString: '$completedGames' }, '/4'] },
          scavengerProgress: { $concat: [{ $toString: '$scavengerProgress' }, '/10'] },
          scavengerCompleted: 1
        }
      },
      {
        $sort: { lastQRScanAt: -1, createdAt: -1 }
      }
    ];

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await User.aggregate(countPipeline);
    const totalUsers = totalResult[0]?.total || 0;

    // Add pagination to main pipeline
    pipeline.push(
      { $skip: skip },
      { $limit: limit }
    );

    const usersWithProgress = await User.aggregate(pipeline);

    console.log(`📊 Admin: Found ${usersWithProgress.length} users (page ${page}/${Math.ceil(totalUsers / limit)}) with optimized query`);
    if (search) {
      console.log(`📊 Admin: Search results for "${search}": ${totalUsers} total matches, showing ${usersWithProgress.length} on this page`);
    }
    console.log('📊 Admin: Successfully loaded users with progress, sorted by recent QR scan activity');
    
    res.status(200).json({
      success: true,
      users: usersWithProgress,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers,
        usersPerPage: limit,
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPrevPage: page > 1
      }
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
    // Use optimized aggregation pipeline - single query, database-level calculations
    const pipeline = [
      {
        $lookup: {
          from: 'userprogresses',
          localField: '_id',
          foreignField: 'userId',
          as: 'progress'
        }
      },
      {
        $addFields: {
          // Get the first (and should be only) progress record
          progress: { $arrayElemAt: ['$progress', 0] }
        }
      },
      {
        $addFields: {
          // Calculate completed games count
          completedGames: {
            $cond: [
              { $ne: ['$progress', null] },
              {
                $size: {
                  $filter: {
                    input: {
                      $objectToArray: {
                        $ifNull: ['$progress.dashboardGames', {}]
                      }
                    },
                    cond: { $eq: ['$$this.v.isCompleted', true] }
                  }
                }
              },
              0
            ]
          },
          // Calculate scavenger progress
          scavengerProgress: {
            $cond: [
              { $ne: ['$progress', null] },
              {
                $size: {
                  $ifNull: ['$progress.scavengerHuntProgress.completedCheckpoints', []]
                }
              },
              0
            ]
          },
          // Check if scavenger hunt is completed (5+ checkpoints)
          scavengerCompleted: {
            $and: [
              { $ne: ['$progress', null] },
              {
                $gte: [
                  {
                    $size: {
                      $ifNull: ['$progress.scavengerHuntProgress.completedCheckpoints', []]
                    }
                  },
                  5
                ]
              }
            ]
          },
          // Per-game completion flags
          lunchboxCompleted: {
            $and: [
              { $ne: ['$progress', null] },
              { $ifNull: ['$progress.dashboardGames.lunchboxMatcher.isCompleted', false] }
            ]
          },
          cityRunCompleted: {
            $and: [
              { $ne: ['$progress', null] },
              { $ifNull: ['$progress.dashboardGames.cityRun.isCompleted', false] }
            ]
          },
          talabeatsCompleted: {
            $and: [
              { $ne: ['$progress', null] },
              { $ifNull: ['$progress.dashboardGames.talabeats.isCompleted', false] }
            ]
          },
          // Additional flags
          hasVoucherCode: { $ne: ['$voucherCode', null] },
          isRecentActivity: {
            $and: [
              { $ne: ['$lastQRScanAt', null] },
              {
                $gte: [
                  '$lastQRScanAt',
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalClaimed: {
            $sum: { $cond: [{ $ifNull: ['$isClaimed', false] }, 1, 0] }
          },
          // Collect data for further processing
          userData: {
            $push: {
              isClaimed: { $ifNull: ['$isClaimed', false] },
              completedGames: '$completedGames',
              scavengerProgress: '$scavengerProgress',
              scavengerCompleted: '$scavengerCompleted',
              lunchboxCompleted: '$lunchboxCompleted',
              cityRunCompleted: '$cityRunCompleted',
              talabeatsCompleted: '$talabeatsCompleted',
              hasVoucherCode: '$hasVoucherCode',
              isRecentActivity: '$isRecentActivity'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          totalClaimed: 1,
          totalUnclaimed: { $subtract: ['$totalUsers', '$totalClaimed'] },
          // Calculate claimed by completion level
          claimedByCompletion: {
            '0/4': {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: {
                    $and: [
                      '$$this.isClaimed',
                      { $eq: ['$$this.completedGames', 0] }
                    ]
                  }
                }
              }
            },
            '1/4': {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: {
                    $and: [
                      '$$this.isClaimed',
                      { $eq: ['$$this.completedGames', 1] }
                    ]
                  }
                }
              }
            },
            '2/4': {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: {
                    $and: [
                      '$$this.isClaimed',
                      { $eq: ['$$this.completedGames', 2] }
                    ]
                  }
                }
              }
            },
            '3/4': {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: {
                    $and: [
                      '$$this.isClaimed',
                      { $eq: ['$$this.completedGames', 3] }
                    ]
                  }
                }
              }
            },
            '4/4': {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: {
                    $and: [
                      '$$this.isClaimed',
                      { $eq: ['$$this.completedGames', 4] }
                    ]
                  }
                }
              }
            }
          },
          // Calculate scavenger hunt stats
          scavengerStats: {
            totalCompleted: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.scavengerCompleted'
                }
              }
            },
            totalIncomplete: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: { $not: '$$this.scavengerCompleted' }
                }
              }
            },
            averageProgress: {
              $round: [
                {
                  $divide: [
                    {
                      $sum: '$userData.scavengerProgress'
                    },
                    '$totalUsers'
                  ]
                },
                1
              ]
            }
          },
          // Calculate per-game completions
          perGameCompletions: {
            lunchboxMatcher: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.lunchboxCompleted'
                }
              }
            },
            cityRun: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.cityRunCompleted'
                }
              }
            },
            talabeats: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.talabeatsCompleted'
                }
              }
            },
            scavengerHunt: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.scavengerCompleted'
                }
              }
            }
          },
          // Calculate additional stats
          additionalStats: {
            usersWithVoucherCodes: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.hasVoucherCode'
                }
              }
            },
            usersWithoutVoucherCodes: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: { $not: '$$this.hasVoucherCode' }
                }
              }
            },
            recentActivity: {
              $size: {
                $filter: {
                  input: '$userData',
                  cond: '$$this.isRecentActivity'
                }
              }
            }
          }
        }
      }
    ];

    const result = await User.aggregate(pipeline);
    const stats = result[0] || {
      totalUsers: 0,
      totalClaimed: 0,
      totalUnclaimed: 0,
      claimedByCompletion: { '0/4': 0, '1/4': 0, '2/4': 0, '3/4': 0, '4/4': 0 },
      scavengerStats: { totalCompleted: 0, totalIncomplete: 0, averageProgress: 0 },
      additionalStats: { usersWithVoucherCodes: 0, usersWithoutVoucherCodes: 0, recentActivity: 0 },
      perGameCompletions: { lunchboxMatcher: 0, cityRun: 0, talabeats: 0, scavengerHunt: 0 }
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Admin: Error getting statistics:', error);
    console.error('❌ Admin: Error stack:', error.stack);
    throw new AppError('Failed to get statistics', 500);
  }
}));

module.exports = router;
