// src/models/GameSession.js
const mongoose = require('mongoose');

const checkpointSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  clue: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  scannedAt: Date,
  isCompleted: {
    type: Boolean,
    default: false
  }
});

const gameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: Date,
  timeElapsed: {
    type: Number, // in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'expired'],
    default: 'active'
  },
  checkpoints: [checkpointSchema],
  currentCheckpoint: {
    type: Number,
    default: 0
  },
  totalCheckpoints: {
    type: Number,
    default: 5
  },
  completedCheckpoints: {
    type: Number,
    default: 0
  },
  rewardTier: {
    type: String,
    enum: ['Gold', 'Silver', 'Bronze'],
    default: null
  },
  rewardToken: String,
  hints: [{
    checkpointId: Number,
    hintText: String,
    usedAt: Date
  }],
  hintsUsed: {
    type: Number,
    default: 0
  },
  gameType: {
    type: String,
    enum: ['standard', 'timed', 'unlimited'],
    default: 'standard'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  location: {
    venue: String,
    city: String,
    country: {
      type: String,
      default: 'Qatar'
    }
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
gameSessionSchema.index({ userId: 1, createdAt: -1 });
gameSessionSchema.index({ sessionId: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ timeElapsed: 1 });
gameSessionSchema.index({ rewardTier: 1 });

// Virtual for completion percentage
gameSessionSchema.virtual('completionPercentage').get(function() {
  return (this.completedCheckpoints / this.totalCheckpoints) * 100;
});

// Virtual for is completed
gameSessionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' && this.completedCheckpoints === this.totalCheckpoints;
});

// Virtual for time remaining (for timed games)
gameSessionSchema.virtual('timeRemaining').get(function() {
  if (this.gameType !== 'timed') return null;
  const maxTime = 30 * 60; // 30 minutes in seconds
  const elapsed = this.timeElapsed || 0;
  return Math.max(0, maxTime - elapsed);
});

// Pre-save middleware
gameSessionSchema.pre('save', function(next) {
  // Calculate time elapsed if session is being completed
  if (this.isModified('status') && this.status === 'completed' && !this.endTime) {
    this.endTime = new Date();
    this.timeElapsed = Math.floor((this.endTime - this.startTime) / 1000);
  }

  // Calculate reward tier based on time elapsed
  if (this.isModified('timeElapsed') && this.timeElapsed > 0 && !this.rewardTier) {
    const timeInMinutes = this.timeElapsed / 60;
    if (timeInMinutes < 20) {
      this.rewardTier = 'Gold';
    } else if (timeInMinutes <= 40) {
      this.rewardTier = 'Silver';
    } else {
      this.rewardTier = 'Bronze';
    }
  }

  next();
});

// Instance method to scan QR code
gameSessionSchema.methods.scanQRCode = function(qrData, checkpointIndex) {
  if (this.status !== 'active') {
    throw new Error('Game session is not active');
  }

  if (checkpointIndex !== this.currentCheckpoint) {
    throw new Error('Invalid checkpoint sequence');
  }

  const checkpoint = this.checkpoints[checkpointIndex];
  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  if (checkpoint.qrCode !== qrData) {
    throw new Error('Invalid QR code');
  }

  // Mark checkpoint as completed
  checkpoint.isCompleted = true;
  checkpoint.scannedAt = new Date();
  this.completedCheckpoints += 1;
  
  // Move to next checkpoint or complete game
  if (this.completedCheckpoints >= this.totalCheckpoints) {
    this.status = 'completed';
    this.currentCheckpoint = this.totalCheckpoints;
  } else {
    this.currentCheckpoint += 1;
  }

  return this.save();
};

// Instance method to get current clue
gameSessionSchema.methods.getCurrentClue = function() {
  if (this.currentCheckpoint >= this.checkpoints.length) {
    return null;
  }
  return this.checkpoints[this.currentCheckpoint].clue;
};

// Instance method to use hint
gameSessionSchema.methods.useHint = function(hintText) {
  const currentCheckpointId = this.currentCheckpoint + 1;
  this.hints.push({
    checkpointId: currentCheckpointId,
    hintText,
    usedAt: new Date()
  });
  this.hintsUsed += 1;
  return this.save();
};

// Instance method to abandon game
gameSessionSchema.methods.abandon = function() {
  this.status = 'abandoned';
  this.endTime = new Date();
  this.timeElapsed = Math.floor((this.endTime - this.startTime) / 1000);
  return this.save();
};

// Static method to get active session for user
gameSessionSchema.statics.getActiveSession = function(userId) {
  return this.findOne({ userId, status: 'active' });
};

// Static method to get user's game history
gameSessionSchema.statics.getUserHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('startTime endTime timeElapsed status rewardTier completedCheckpoints totalCheckpoints');
};

// Static method to get leaderboard data
gameSessionSchema.statics.getLeaderboard = function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        completedCheckpoints: { $gte: 5 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $sort: { timeElapsed: 1, createdAt: 1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        phoneNumber: '$user.phoneNumber',
        timeElapsed: 1,
        rewardTier: 1,
        completedAt: '$createdAt',
        completedCheckpoints: 1
      }
    }
  ]);
};

module.exports = mongoose.model('GameSession', gameSessionSchema);