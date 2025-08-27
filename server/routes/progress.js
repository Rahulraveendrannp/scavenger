// server/routes/progress.js
const express = require('express');
const router = express.Router();
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Get user progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    console.log('📊 Progress API: Fetching progress for phone:', phoneNumber);
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    // Populate user data for response
    progress = await UserProgress.findOne({ phoneNumber }).populate('userId', 'phoneNumber profile');
    
    res.json({
      success: true,
      data: {
        progress: progress,
        summary: progress.progressSummary,
        completionPercentage: progress.completionPercentage
      }
    });
    
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user progress'
    });
  }
});

// Update dashboard game completion
router.post('/dashboard/:gameId/complete', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { gameId } = req.params;
    const { completionTime } = req.body;
    
    console.log('🎮 Dashboard Game API: Completing game:', gameId, 'for phone:', phoneNumber);
    
    const gameMapping = {
      'lunchbox-matcher': 'lunchboxMatcher',
      'city-run': 'cityRun',
      'talabeats': 'talabeats',
      'scavenger-hunt': 'scavengerHunt'
    };
    
    const gameField = gameMapping[gameId];
    if (!gameField) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID'
      });
    }
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    // Handle scavenger hunt differently - mark as started, not completed
    if (gameId === 'scavenger-hunt') {
      // For scavenger hunt, mark as started when QR is scanned
      progress.dashboardGames[gameField].isStarted = true;
      progress.dashboardGames[gameField].startedAt = new Date();
      progress.scavengerHuntProgress.isStarted = true;
      progress.scavengerHuntProgress.startedAt = new Date();
      progress.updateCurrentState('scavenger-hunt');
    } else {
      // For other games, mark as completed
      progress.markDashboardGameComplete(gameField);
      if (completionTime) {
        progress.dashboardGames[gameField].completionTime = completionTime;
      }
      progress.updateCurrentState('dashboard');
    }
    
    await progress.save();
    
    // Update User's lastQRScanAt field for offline games
    if (gameId !== 'scavenger-hunt') {
      try {
        await User.findByIdAndUpdate(
          progress.userId,
          { lastQRScanAt: new Date() },
          { new: true }
        );
        console.log('✅ Updated User lastQRScanAt for offline game completion');
      } catch (error) {
        console.error('❌ Error updating User lastQRScanAt for offline game:', error);
      }
    }
    
    console.log('🎮 Dashboard Game API: Game completed and saved to database');
    
    res.json({
      success: true,
      data: {
        gameCompleted: gameId,
        progress: progress.progressSummary
      }
    });
    
  } catch (error) {
    console.error('Error updating dashboard game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game progress'
    });
  }
});

// Complete scavenger hunt checkpoint
router.post('/scavenger/checkpoint/:checkpointId/complete', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { checkpointId } = req.params;
    const { location } = req.body;
    
    console.log('🔍 Scavenger Hunt API: Completing checkpoint:', checkpointId, 'for phone:', phoneNumber);
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Checkpoint ID type:', typeof checkpointId, 'value:', checkpointId);
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    console.log('🔍 Scavenger Hunt API: Before marking checkpoint - completed checkpoints:', progress.scavengerHuntProgress.completedCheckpoints);
    
    // Mark checkpoint as completed
    progress.markCheckpointComplete(parseInt(checkpointId), location);
    progress.updateCurrentState('scavenger-hunt', parseInt(checkpointId));
    
    console.log('🔍 Scavenger Hunt API: After marking checkpoint - completed checkpoints:', progress.scavengerHuntProgress.completedCheckpoints);
    
    await progress.save();
    console.log('🔍 Scavenger Hunt API: Checkpoint completed and saved to database');
    console.log('🔍 Scavenger Hunt API: Final completed checkpoints:', progress.scavengerHuntProgress.completedCheckpoints);
    
    // Check if all checkpoints are completed
    const allCompleted = progress.scavengerHuntProgress.completedCheckpoints.length >= 
                        progress.scavengerHuntProgress.totalCheckpoints;
    
    console.log('🔍 Scavenger Hunt API: Total completed:', progress.scavengerHuntProgress.completedCheckpoints.length, '/', progress.scavengerHuntProgress.totalCheckpoints);
    
    // If all checkpoints are completed, mark scavenger hunt as completed
    if (allCompleted) {
      progress.dashboardGames.scavengerHunt.isCompleted = true;
      progress.dashboardGames.scavengerHunt.completedAt = new Date();
      progress.scavengerHuntProgress.isCompleted = true;
      progress.updateCurrentState('completed');
      await progress.save();
      console.log('🎉 Scavenger Hunt API: All checkpoints completed! Scavenger hunt marked as completed.');
    }
    
    res.json({
      success: true,
      data: {
        checkpointCompleted: parseInt(checkpointId),
        location: location,
        totalCompleted: progress.scavengerHuntProgress.completedCheckpoints.length,
        allCheckpointsCompleted: allCompleted,
        progress: progress.progressSummary
      }
    });
    
  } catch (error) {
    console.error('Error completing checkpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete checkpoint'
    });
  }
});

// Use hint for checkpoint
router.post('/scavenger/checkpoint/:checkpointId/hint', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { checkpointId } = req.params;
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    const checkpointIdNum = parseInt(checkpointId);
    
    // Check if hint can be used
    if (progress.scavengerHuntProgress.hintCredits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No hint credits remaining'
      });
    }
    
    if (progress.scavengerHuntProgress.revealedHints.includes(checkpointIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Hint already revealed for this checkpoint'
      });
    }
    
    // Use hint
    progress.useHint(checkpointIdNum);
    await progress.save();
    
    res.json({
      success: true,
      data: {
        hintRevealed: checkpointIdNum,
        hintsRemaining: progress.scavengerHuntProgress.hintCredits,
        totalHintsUsed: progress.gameStats.totalHintsUsed
      }
    });
    
  } catch (error) {
    console.error('Error using hint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to use hint'
    });
  }
});

// Update current state/page
router.post('/state', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { currentPage, checkpoint } = req.body;
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    progress.updateCurrentState(currentPage, checkpoint);
    await progress.save();
    
    res.json({
      success: true,
      data: {
        currentState: progress.currentState
      }
    });
    
  } catch (error) {
    console.error('Error updating state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update state'
    });
  }
});

// Get leaderboard/stats
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await UserProgress.find({ isGameCompleted: true })
      .populate('userId', 'phoneNumber profile')
      .sort({ completedAt: 1 }) // Fastest completion first
      .limit(10)
      .select('phoneNumber gameStats completedAt scavengerHuntProgress.completedCheckpoints');
    
    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      phoneNumber: user.phoneNumber.replace(/(\+974)(\d{4})(\d{4})/, '$1****$3'), // Mask phone number
      totalTime: user.gameStats.totalTimeSpent,
      hintsUsed: user.gameStats.totalHintsUsed,
      completedAt: user.completedAt,
      checkpointsFound: user.scavengerHuntProgress.completedCheckpoints.length
    }));
    
    res.json({
      success: true,
      data: leaderboard
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

// Complete entire game
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    const { finalScore, timeElapsed } = req.body;
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    if (!progress.isGameCompleted) {
      progress.isGameCompleted = true;
      progress.completedAt = new Date();
      progress.finalScore = finalScore || 0;
      progress.scavengerHuntProgress.completedAt = new Date();
      progress.updateCurrentState('completed');
      
      if (timeElapsed) {
        progress.scavengerHuntProgress.totalTime = timeElapsed;
      }
      
      await progress.save();
    }
    
    res.json({
      success: true,
      data: {
        gameCompleted: true,
        finalScore: progress.finalScore,
        completionTime: progress.gameStats.totalTimeSpent,
        rank: await getUserRank(progress._id)
      }
    });
    
  } catch (error) {
    console.error('Error completing game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game'
    });
  }
});

// Start scavenger hunt
router.post('/scavenger/start', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.user;
    
    console.log('🎯 Scavenger Hunt API: Starting hunt for phone:', phoneNumber);
    
    // Find user's progress using the safe method
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let progress = await UserProgress.getOrCreateProgress(phoneNumber, user._id);
    
    // Mark scavenger hunt as started
    if (!progress.dashboardGames.scavengerHunt.isStarted) {
      progress.dashboardGames.scavengerHunt.isStarted = true;
      progress.dashboardGames.scavengerHunt.startedAt = new Date();
      await progress.save();
      
      console.log('✅ Scavenger Hunt API: Hunt marked as started for user:', phoneNumber);
    } else {
      console.log('ℹ️ Scavenger Hunt API: Hunt already started for user:', phoneNumber);
    }
    
    res.json({
      success: true,
      data: {
        message: 'Scavenger hunt started successfully',
        isStarted: true,
        startedAt: progress.dashboardGames.scavengerHunt.startedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error starting scavenger hunt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scavenger hunt'
    });
  }
});

// Helper function to get user rank
async function getUserRank(progressId) {
  try {
    const userProgress = await UserProgress.findById(progressId);
    if (!userProgress || !userProgress.isGameCompleted) return null;
    
    const betterUsers = await UserProgress.countDocuments({
      isGameCompleted: true,
      completedAt: { $lt: userProgress.completedAt }
    });
    
    return betterUsers + 1;
  } catch (error) {
    console.error('Error calculating rank:', error);
    return null;
  }
}

module.exports = router;