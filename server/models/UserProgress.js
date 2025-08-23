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
    totalCheckpoints: { type: Number, default: 8 },
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
userProgressSchema.index({ phoneNumber: 1 });
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ 'currentState.currentPage': 1 });
userProgressSchema.index({ 'scavengerHuntProgress.lastActivityAt': -1 });
userProgressSchema.index({ isGameCompleted: 1 });

// Virtual for completion percentage
userProgressSchema.virtual('completionPercentage').get(function() {
  const dashboardCompleted = Object.values(this.dashboardGames).reduce((count, game) => {
    return count + (game.isCompleted ? 1 : 0);
  }, 0);
  
  const scavengerCompleted = this.scavengerHuntProgress.completedCheckpoints.length;
  const totalTasks = 4 + this.scavengerHuntProgress.totalCheckpoints; // 4 dashboard games + 8 checkpoints
  
  return Math.round(((dashboardCompleted + scavengerCompleted) / totalTasks) * 100);
});

// Virtual for current progress summary
userProgressSchema.virtual('progressSummary').get(function() {
  return {
    dashboardGamesCompleted: Object.values(this.dashboardGames).reduce((count, game) => {
      return count + (game.isCompleted ? 1 : 0);
    }, 0),
    scavengerCheckpointsCompleted: this.scavengerHuntProgress.completedCheckpoints.length,
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
  
  if (dashboardCompleted && scavengerCompleted && !this.isGameCompleted) {
    this.isGameCompleted = true;
    this.completedAt = new Date();
    this.currentState.currentPage = 'completed';
    this.currentState.canResume = false;
  }
  
  next();
});

module.exports = mongoose.model('UserProgress', userProgressSchema);