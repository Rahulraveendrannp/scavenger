// src/routes/game.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Checkpoint = require('../models/Checkpoint');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

// Validation middleware
const validateGameStart = [
  body('venue').optional().isString().withMessage('Venue must be a string'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
  body('gameType').optional().isIn(['standard', 'timed', 'unlimited']).withMessage('Invalid game type')
];

const validateQRScan = [
  body('qrData').notEmpty().withMessage('QR data is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('checkpointIndex').isInt({ min: 0 }).withMessage('Valid checkpoint index is required')
];

/**
 * @route   POST /api/game/start
 * @desc    Start a new game session
 * @access  Public (but requires phone verification)
 */
router.post('/start', authMiddleware, validateGameStart, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { phoneNumber, venue = 'Mall of Qatar', difficulty = 'medium', gameType = 'standard' } = req.body;

  if (!phoneNumber) {
    return next(new AppError('Phone number is required', 400));
  }

  // Find user
  const user = await User.findByPhoneNumber(phoneNumber);
  if (!user || !user.isVerified) {
    return next(new AppError('User not found or not verified', 404));
  }

  // Check for existing active session
  const existingSession = await GameSession.getActiveSession(user._id);
  if (existingSession) {
    return res.status(200).json({
      success: true,
      message: 'Active session found',
      data: {
        session: existingSession,
        currentClue: existingSession.getCurrentClue()
      }
    });
  }

  // Get checkpoints for the venue
  let checkpoints = await Checkpoint.getByVenue(venue);
  
  if (checkpoints.length < 5) {
    // Fallback to default checkpoints
    checkpoints = await Checkpoint.generateRandomRoute(venue, 5);
  }

  if (checkpoints.length === 0) {
    return next(new AppError('No checkpoints available for this venue', 404));
  }

  // Take first 5 checkpoints and randomize if needed
  checkpoints = checkpoints.slice(0, 5);

  // Create game session
  const sessionId = uuidv4();
  const gameSession = new GameSession({
    userId: user._id,
    sessionId,
    startTime: new Date(),
    checkpoints: checkpoints.map(cp => ({
      id: cp.id,
      location: cp.location,
      clue: cp.clue,
      qrCode: cp.qrCode,
      coordinates: cp.coordinates
    })),
    totalCheckpoints: checkpoints.length,
    gameType,
    difficulty,
    location: {
      venue,
      city: 'Doha',
      country: 'Qatar'
    },
    metadata: {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    }
  });

  await gameSession.save();

  // Update user stats
  user.gameStats.totalGames += 1;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Game session started successfully',
    data: {
      session: {
        sessionId: gameSession.sessionId,
        startTime: gameSession.startTime,
        totalCheckpoints: gameSession.totalCheckpoints,
        currentCheckpoint: gameSession.currentCheckpoint,
        gameType: gameSession.gameType,
        difficulty: gameSession.difficulty
      },
      currentClue: gameSession.getCurrentClue(),
      progress: {
        completed: 0,
        total: gameSession.totalCheckpoints,
        percentage: 0
      }
    }
  });
}));

/**
 * @route   POST /api/game/validate-qr
 * @desc    Validate QR code scan
 * @access  Public
 */
router.post('/validate-qr', authMiddleware, validateQRScan, asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { sessionId, qrData, checkpointIndex } = req.body;

  // Find game session
  const gameSession = await GameSession.findOne({ sessionId });
  if (!gameSession) {
    return next(new AppError('Game session not found', 404));
  }

  if (gameSession.status !== 'active') {
    return next(new AppError('Game session is not active', 400));
  }

  // Check if game has expired (30 minutes for timed games)
  if (gameSession.gameType === 'timed') {
    const timeElapsed = (Date.now() - gameSession.startTime.getTime()) / 1000;
    if (timeElapsed > 1800) { // 30 minutes
      gameSession.status = 'expired';
      await gameSession.save();
      return next(new AppError('Game session has expired', 400));
    }
  }

  try {
    // Scan QR code
    await gameSession.scanQRCode(qrData, checkpointIndex);
    
    // Record checkpoint scan
    const checkpoint = await Checkpoint.findOne({ qrCode: qrData });
    if (checkpoint) {
      await checkpoint.recordScan(true);
    }

    const isComplete = gameSession.status === 'completed';
    const nextClue = isComplete ? null : gameSession.getCurrentClue();

    // If game is complete, update user stats
    if (isComplete) {
      const user = await User.findById(gameSession.userId);
      await user.updateGameStats({
        completed: true,
        timeElapsed: gameSession.timeElapsed,
        tier: gameSession.rewardTier
      });

      // Generate reward token
      gameSession.rewardToken = `TLB-${user.phoneNumber.slice(-4)}-${Date.now().toString().slice(-6)}`;
      await gameSession.save();
    }

    res.status(200).json({
      success: true,
      message: isComplete ? 'Game completed successfully!' : 'QR code scanned successfully',
      data: {
        isValid: true,
        gameComplete: isComplete,
        nextClue,
        progress: {
          completed: gameSession.completedCheckpoints,
          total: gameSession.totalCheckpoints,
          percentage: gameSession.completionPercentage
        },
        currentCheckpoint: gameSession.currentCheckpoint,
        timeElapsed: Math.floor((Date.now() - gameSession.startTime.getTime()) / 1000),
        ...(isComplete && {
          rewardTier: gameSession.rewardTier,
          rewardToken: gameSession.rewardToken,
          finalTime: gameSession.timeElapsed
        })
      }
    });

  } catch (error) {
    // Record failed scan
    const checkpoint = await Checkpoint.findOne({ qrCode: qrData });
    if (checkpoint) {
      await checkpoint.recordScan(false);
    }

    return next(new AppError(error.message, 400));
  }
}));

/**
 * @route   GET /api/game/session/:sessionId
 * @desc    Get game session details
 * @access  Public
 */
router.get('/session/:sessionId', asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const gameSession = await GameSession.findOne({ sessionId }).populate('userId', 'phoneNumber gameStats');
  
  if (!gameSession) {
    return next(new AppError('Game session not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      session: gameSession,
      currentClue: gameSession.getCurrentClue(),
      timeElapsed: Math.floor((Date.now() - gameSession.startTime.getTime()) / 1000)
    }
  });
}));

/**
 * @route   POST /api/game/abandon/:sessionId
 * @desc    Abandon current game session
 * @access  Public
 */
router.post('/abandon/:sessionId', asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const gameSession = await GameSession.findOne({ sessionId });
  
  if (!gameSession) {
    return next(new AppError('Game session not found', 404));
  }

  if (gameSession.status !== 'active') {
    return next(new AppError('Game session is not active', 400));
  }

  await gameSession.abandon();

  res.status(200).json({
    success: true,
    message: 'Game session abandoned',
    data: {
      sessionId: gameSession.sessionId,
      status: gameSession.status,
      timeElapsed: gameSession.timeElapsed,
      completedCheckpoints: gameSession.completedCheckpoints
    }
  });
}));

/**
 * @route   GET /api/game/leaderboard
 * @desc    Get game leaderboard
 * @access  Public
 */
router.get('/leaderboard', asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const leaderboard = await GameSession.getLeaderboard(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        phoneNumber: `***${entry.phoneNumber.slice(-4)}`,
        timeElapsed: entry.timeElapsed,
        rewardTier: entry.rewardTier,
        completedAt: entry.completedAt,
        completedCheckpoints: entry.completedCheckpoints
      }))
    }
  });
}));

/**
 * @route   POST /api/game/complete
 * @desc    Submit game completion (backup endpoint)
 * @access  Public
 */
router.post('/complete', authMiddleware, asyncHandler(async (req, res, next) => {
  const { sessionId, phoneNumber } = req.body;

  const gameSession = await GameSession.findOne({ sessionId });
  if (!gameSession) {
    return next(new AppError('Game session not found', 404));
  }

  const user = await User.findByPhoneNumber(phoneNumber);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Ensure session belongs to user
  if (!gameSession.userId.equals(user._id)) {
    return next(new AppError('Unauthorized', 403));
  }

  res.status(200).json({
    success: true,
    message: 'Game completion recorded',
    data: {
      saved: true,
      rewardToken: gameSession.rewardToken,
      rewardTier: gameSession.rewardTier,
      timeElapsed: gameSession.timeElapsed
    }
  });
}));

/**
 * @route   GET /api/game/user/:phoneNumber/history
 * @desc    Get user's game history
 * @access  Public
 */
router.get('/user/:phoneNumber/history', authMiddleware, asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.params;
  const { limit = 10 } = req.query;

  const user = await User.findByPhoneNumber(phoneNumber);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const history = await GameSession.getUserHistory(user._id, parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      gameHistory: history,
      totalGames: user.gameStats.totalGames,
      completedGames: user.gameStats.completedGames,
      bestTime: user.gameStats.bestTime
    }
  });
}));

/**
 * @route   POST /api/game/use-hint
 * @desc    Use a hint for a checkpoint (costs 1 hint credit)
 * @access  Private
 */
router.post('/use-hint', authMiddleware, asyncHandler(async (req, res, next) => {
  const { checkpointId } = req.body;
  const userId = req.user._id;

  if (!checkpointId) {
    return next(new AppError('Checkpoint ID is required', 400));
  }

  // Find user's game session
  const gameSession = await GameSession.findOne({ userId, status: 'active' });
  if (!gameSession) {
    return next(new AppError('No active game session found', 404));
  }

  // Check if user has hint credits
  if (gameSession.hintCredits <= 0) {
    return next(new AppError('No hint credits remaining', 400));
  }

  // Find the checkpoint
  const checkpoint = gameSession.checkpoints.find(cp => cp.id === checkpointId);
  if (!checkpoint) {
    return next(new AppError('Checkpoint not found', 404));
  }

  // Deduct hint credit and return hint
  gameSession.hintCredits -= 1;
  await gameSession.save();

  res.status(200).json({
    success: true,
    message: 'Hint used successfully',
    data: {
      hint: checkpoint.hint || 'No hint available for this checkpoint',
      hintCredits: gameSession.hintCredits
    }
  });
}));

/**
 * @route   GET /api/game/progress
 * @desc    Get current game progress
 * @access  Private
 */
router.get('/progress', authMiddleware, asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Find user's game session
  const gameSession = await GameSession.findOne({ userId, status: 'active' });
  if (!gameSession) {
    return next(new AppError('No active game session found', 404));
  }

  // Calculate current tier based on completion
  const completionPercentage = (gameSession.completedCheckpoints / gameSession.totalCheckpoints) * 100;
  let currentTier = 'Bronze';
  if (completionPercentage >= 80) currentTier = 'Gold';
  else if (completionPercentage >= 50) currentTier = 'Silver';

  res.status(200).json({
    success: true,
    data: {
      totalFound: gameSession.completedCheckpoints,
      totalCheckpoints: gameSession.totalCheckpoints,
      currentTier,
      hintCredits: gameSession.hintCredits,
      timeElapsed: Math.floor((Date.now() - gameSession.startTime.getTime()) / 1000)
    }
  });
}));

module.exports = router;