// server/models/UserProgress.js
const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  
  // Dashboard games progress
  dashboardGames: {
    lunchboxMatcher: {
      isCompleted: { type: Boolean, default: false },
      completedAt: Date,
      completionTime: Number // in seconds
    },
    cityRun: {
      isCompleted: { type: Boolean, default: false },
      completedAt: Date,
      completionTime: Number
    },
    talabeats: {
      isCompleted: { type: Boolean, default: false },
      completedAt: Date,
      completionTime: Number
    },
    scavengerHunt: {
      isStarted: { type: Boolean, default: false },
      isCompleted: { type: Boolean, default: false },
      startedAt: Date,
      completedAt: Date,
      totalTime: Number
    }
  },

  // Scavenger hunt detailed progress
  scavengerHuntProgress: {
    completedCheckpoints: [{
      checkpointId: Number,
      location: String,
      completedAt: Date,
      scanCount: { type: Number, default: 1 } // Track multiple scans
    }],
    hintCredits: { type: Number, default: 3 },
    revealedHints: [Number], // Array of checkpoint IDs with revealed hints
    totalCheckpoints: { type: Number, default: 11 },
    currentCheckpoint: Number, // Last active checkpoint
    startedAt: Date,
    lastActivityAt: Date
  },

  // Overall game statistics
  gameStats: {
    totalTimeSpent: { type: Number, default: 0 }, // in seconds
    totalScans: { type: Number, default: 0 },
    totalHintsUsed: { type: Number, default: 0 },
    gameStartedAt: Date,
    lastLoginAt: Date,
    loginCount: { type: Number, default: 0 }
  },

  // Current state for resuming
  currentState: {
    currentPage: {
      type: String,
      enum: ['registration', 'otp', 'dashboard', 'scavenger-hunt', 'completed'],
      default: 'registration'
    },
    lastCheckpoint: Number,
    canResume: { type: Boolean, default: false }
  },

  // Completion status
  isGameCompleted: { type: Boolean, default: false },
  completedAt: Date,
  finalScore: Number,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userProgressSchema.index({ phoneNumber: 1 }, { unique: true }); // Make phoneNumber unique
userProgressSchema.index({ userId: 1 }, { unique: true }); // Also make userId unique
userProgressSchema.index({ 'currentState.currentPage': 1 });
userProgressSchema.index({ 'scavengerHuntProgress.lastActivityAt': -1 });
userProgressSchema.index({ isGameCompleted: 1 });

// Virtual for completion percentage
userProgressSchema.virtual('completionPercentage').get(function() {
  const dashboardCompleted = Object.values(this.dashboardGames).reduce((count, game) => {
    return count + (game.isCompleted ? 1 : 0);
  }, 0);
  
  // Consider scavenger hunt completed when 5+ checkpoints are done (half completion)
  const scavengerCompleted = this.scavengerHuntProgress.completedCheckpoints.length >= 5 ? 1 : 0;
  const totalTasks = 4 + 1; // 4 dashboard games + 1 scavenger hunt task
  
  return Math.round(((dashboardCompleted + scavengerCompleted) / totalTasks) * 100);
});

// Virtual for current progress summary
userProgressSchema.virtual('progressSummary').get(function() {
  return {
    dashboardGamesCompleted: Object.values(this.dashboardGames).reduce((count, game) => {
      return count + (game.isCompleted ? 1 : 0);
    }, 0),
    scavengerCheckpointsCompleted: this.scavengerHuntProgress.completedCheckpoints.length,
    scavengerHuntCompleted: this.scavengerHuntProgress.completedCheckpoints.length >= 5, // Half completion
    totalHintsUsed: this.gameStats.totalHintsUsed,
    hintCreditsRemaining: this.scavengerHuntProgress.hintCredits,
    canResume: this.currentState.canResume,
    currentPage: this.currentState.currentPage
  };
});

// Methods
userProgressSchema.methods.markDashboardGameComplete = function(gameName) {
  if (this.dashboardGames[gameName]) {
    this.dashboardGames[gameName].isCompleted = true;
    this.dashboardGames[gameName].completedAt = new Date();
    this.currentState.canResume = true;
    this.markModified('dashboardGames');
    
    // Also update the User's lastQRScanAt field for offline games
    this.updateUserLastQRScan();
  }
};

userProgressSchema.methods.markCheckpointComplete = function(checkpointId, location) {
  console.log('🔍 markCheckpointComplete: Starting with checkpointId:', checkpointId, 'location:', location);
  console.log('🔍 markCheckpointComplete: Current completed checkpoints:', this.scavengerHuntProgress.completedCheckpoints);
  
  // Check if already completed
  const existingIndex = this.scavengerHuntProgress.completedCheckpoints.findIndex(
    cp => cp.checkpointId === checkpointId
  );
  
  console.log('🔍 markCheckpointComplete: Existing index:', existingIndex);
  
  if (existingIndex === -1) {
    console.log('🔍 markCheckpointComplete: Adding new checkpoint to completed list');
    this.scavengerHuntProgress.completedCheckpoints.push({
      checkpointId,
      location,
      completedAt: new Date(),
      scanCount: 1
    });
  } else {
    console.log('🔍 markCheckpointComplete: Incrementing scan count for existing checkpoint');
    // Increment scan count if already completed
    this.scavengerHuntProgress.completedCheckpoints[existingIndex].scanCount += 1;
  }
  
  this.scavengerHuntProgress.lastActivityAt = new Date();
  this.gameStats.totalScans += 1;
  this.markModified('scavengerHuntProgress');
  this.markModified('gameStats');
  
  // Also update the User's lastQRScanAt field
  this.updateUserLastQRScan();
  
  console.log('🔍 markCheckpointComplete: After update - completed checkpoints:', this.scavengerHuntProgress.completedCheckpoints);
};

userProgressSchema.methods.useHint = function(checkpointId) {
  if (this.scavengerHuntProgress.hintCredits > 0 && 
      !this.scavengerHuntProgress.revealedHints.includes(checkpointId)) {
    
    this.scavengerHuntProgress.hintCredits -= 1;
    this.scavengerHuntProgress.revealedHints.push(checkpointId);
    this.gameStats.totalHintsUsed += 1;
    this.scavengerHuntProgress.lastActivityAt = new Date();
    
    this.markModified('scavengerHuntProgress');
    this.markModified('gameStats');
  }
};

userProgressSchema.methods.updateCurrentState = function(page, checkpoint = null) {
  this.currentState.currentPage = page;
  if (checkpoint !== null) {
    this.currentState.lastCheckpoint = checkpoint;
  }
  this.currentState.canResume = page !== 'registration' && page !== 'completed';
  this.scavengerHuntProgress.lastActivityAt = new Date();
  this.markModified('currentState');
  this.markModified('scavengerHuntProgress');
};

// Method to check if scavenger hunt is completed (half completion rule)
userProgressSchema.methods.isScavengerHuntCompleted = function() {
  return this.scavengerHuntProgress.completedCheckpoints.length >= 5;
};

// Method to update User's lastQRScanAt field
userProgressSchema.methods.updateUserLastQRScan = async function() {
  try {
    const User = require('./User');
    await User.findByIdAndUpdate(
      this.userId,
      { lastQRScanAt: new Date() },
      { new: true }
    );
    console.log('✅ Updated User lastQRScanAt for user:', this.phoneNumber);
  } catch (error) {
    console.error('❌ Error updating User lastQRScanAt:', error);
  }
};

// Static method to safely get or create user progress (race condition safe)
userProgressSchema.statics.getOrCreateProgress = async function(phoneNumber, userId) {
  try {
    // First try to find existing progress
    let progress = await this.findOne({ phoneNumber: phoneNumber });
    
    if (progress) {
      // Update existing progress
      progress.gameStats.lastLoginAt = new Date();
      progress.gameStats.loginCount += 1;
      await progress.save();
      console.log('📊 Found existing UserProgress for phone:', phoneNumber, 'login count:', progress.gameStats.loginCount);
      return progress;
    }
    
    // If no existing progress, create new one
    console.log('📊 Creating new UserProgress for phone:', phoneNumber);
    try {
      progress = new this({
        userId: userId,
        phoneNumber: phoneNumber,
        gameStats: {
          gameStartedAt: new Date(),
          lastLoginAt: new Date(),
          loginCount: 1
        }
      });
      
      await progress.save();
      console.log('📊 Successfully created new UserProgress for phone:', phoneNumber);
      return progress;
    } catch (saveError) {
      // If save fails due to duplicate key (race condition), try to find the existing one
      if (saveError.code === 11000) {
        console.log('⚠️ Duplicate key error, trying to find existing UserProgress for phone:', phoneNumber);
        const existingProgress = await this.findOne({ phoneNumber: phoneNumber });
        if (existingProgress) {
          // Update login count
          existingProgress.gameStats.lastLoginAt = new Date();
          existingProgress.gameStats.loginCount += 1;
          await existingProgress.save();
          console.log('📊 Found existing UserProgress after duplicate key error for phone:', phoneNumber);
          return existingProgress;
        }
      }
      throw saveError;
    }
    
  } catch (error) {
    console.error('❌ Error in getOrCreateProgress:', error);
    throw error;
  }
};

// Pre-save middleware
userProgressSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update total time spent
  if (this.gameStats.gameStartedAt) {
    this.gameStats.totalTimeSpent = Math.floor((Date.now() - this.gameStats.gameStartedAt.getTime()) / 1000);
  }
  
  // Check if game is completed
  const dashboardCompleted = Object.values(this.dashboardGames).every(game => game.isCompleted);
  const scavengerCompleted = this.scavengerHuntProgress.completedCheckpoints.length >= this.scavengerHuntProgress.totalCheckpoints;
  
  // Mark scavenger hunt as completed in dashboard games when 5+ checkpoints are done (half completion)
  if (this.scavengerHuntProgress.completedCheckpoints.length >= 5 && !this.dashboardGames.scavengerHunt.isCompleted) {
    this.dashboardGames.scavengerHunt.isCompleted = true;
    this.dashboardGames.scavengerHunt.completedAt = new Date();
  }
  
  if (dashboardCompleted && scavengerCompleted && !this.isGameCompleted) {
    this.isGameCompleted = true;
    this.completedAt = new Date();
    this.currentState.currentPage = 'completed';
    this.currentState.canResume = false;
  }
  
  next();
});

module.exports = mongoose.model('UserProgress', userProgressSchema);