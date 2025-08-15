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
    
    let progress = await UserProgress.findOne({ phoneNumber }).populate('userId', 'phoneNumber profile');
    
    if (!progress) {
      console.log('📊 Progress API: Creating new progress record for user');
      // Create new progress record if doesn't exist
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      progress = new UserProgress({
        userId: user._id,
        phoneNumber: phoneNumber,
        gameStats: {
          gameStartedAt: new Date(),
          lastLoginAt: new Date(),
          loginCount: 1
        }
      });
      
      await progress.save();
      console.log('📊 Progress API: New progress record created successfully');
    } else {
      console.log('📊 Progress API: Updating existing progress record');
      // Update login info
      progress.gameStats.lastLoginAt = new Date();
      progress.gameStats.loginCount += 1;
      await progress.save();
      console.log('📊 Progress API: Progress record updated successfully');
    }
    
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
      'card-game': 'cardGame',
      'puzzle': 'puzzle',
      'car-race': 'carRace',
      'scavenger-hunt': 'scavengerHunt'
    };
    
    const gameField = gameMapping[gameId];
    if (!gameField) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID'
      });
    }
    
    let progress = await UserProgress.findOne({ phoneNumber });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'User progress not found'
      });
    }
    
    // Mark game as completed
    progress.markDashboardGameComplete(gameField);
    if (completionTime) {
      progress.dashboardGames[gameField].completionTime = completionTime;
    }
    
    // Update current state
    if (gameId === 'scavenger-hunt') {
      progress.updateCurrentState('scavenger-hunt');
      progress.scavengerHuntProgress.isStarted = true;
      progress.scavengerHuntProgress.startedAt = new Date();
    } else {
      progress.updateCurrentState('dashboard');
    }
    
    await progress.save();
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
    
    let progress = await UserProgress.findOne({ phoneNumber });
    if (!progress) {
      console.log('🔍 Scavenger Hunt API: No progress found, creating new record');
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      progress = new UserProgress({
        userId: user._id,
        phoneNumber: phoneNumber,
        gameStats: {
          gameStartedAt: new Date(),
          lastLoginAt: new Date(),
          loginCount: 1
        }
      });
    }
    
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
    
    let progress = await UserProgress.findOne({ phoneNumber });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'User progress not found'
      });
    }
    
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
    
    let progress = await UserProgress.findOne({ phoneNumber });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'User progress not found'
      });
    }
    
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
    
    let progress = await UserProgress.findOne({ phoneNumber });
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'User progress not found'
      });
    }
    
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