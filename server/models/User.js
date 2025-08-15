// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^(\+974|974)?[3456789]\d{7}$/, 'Please enter a valid Qatar phone number']
  },

  isVerified: {
    type: Boolean,
    default: false
  },
  otpCode: {
    type: String,
    select: false // Don't include in queries by default
  },
  otpExpires: {
    type: Date,
    select: false
  },
  otpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lastOtpRequest: {
    type: Date,
    select: false
  },
  profile: {
    name: String,
    email: String,
    avatar: String
  },
  gameStats: {
    totalGames: {
      type: Number,
      default: 0
    },
    completedGames: {
      type: Number,
      default: 0
    },
    bestTime: Number, // in seconds
    totalRewards: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    lastPlayedAt: Date
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'gameStats.bestTime': 1 });

// Virtual for user's rank
userSchema.virtual('rank', {
  ref: 'GameSession',
  localField: '_id',
  foreignField: 'userId',
  count: true
});

// Pre-save middleware to hash OTP
userSchema.pre('save', async function(next) {
  // Update the updatedAt field
  this.updatedAt = new Date();

  // Hash OTP if modified
  if (this.isModified('otpCode') && this.otpCode) {
    this.otpCode = await bcrypt.hash(this.otpCode, 10);
  }

  next();
});

// Instance method to check OTP
userSchema.methods.compareOTP = async function(candidateOTP) {
  if (!this.otpCode) return false;
  return await bcrypt.compare(candidateOTP, this.otpCode);
};

// Instance method to check if OTP is expired
userSchema.methods.isOTPExpired = function() {
  return !this.otpExpires || this.otpExpires < new Date();
};

// Instance method to update game stats
userSchema.methods.updateGameStats = function(gameResult) {
  this.gameStats.totalGames += 1;
  
  if (gameResult.completed) {
    this.gameStats.completedGames += 1;
    
    // Update best time if this is better
    if (!this.gameStats.bestTime || gameResult.timeElapsed < this.gameStats.bestTime) {
      this.gameStats.bestTime = gameResult.timeElapsed;
    }
    
    // Update current streak
    const lastPlayed = this.gameStats.lastPlayedAt;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (!lastPlayed || lastPlayed < yesterday) {
      this.gameStats.currentStreak = 1;
    } else {
      this.gameStats.currentStreak += 1;
    }
    
    // Add rewards based on tier
    const rewardPoints = {
      'Gold': 100,
      'Silver': 75,
      'Bronze': 50
    };
    this.gameStats.totalRewards += rewardPoints[gameResult.tier] || 0;
  }
  
  this.gameStats.lastPlayedAt = new Date();
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({
    'gameStats.completedGames': { $gt: 0 },
    isActive: true
  })
  .select('phoneNumber gameStats.bestTime gameStats.completedGames gameStats.totalRewards')
  .sort({ 'gameStats.bestTime': 1, 'gameStats.completedGames': -1 })
  .limit(limit)
  .lean();
};

// Static method to find by phone number
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
  return this.findOne({ phoneNumber });
};

module.exports = mongoose.model('User', userSchema);