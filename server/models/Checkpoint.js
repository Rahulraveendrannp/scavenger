// src/models/Checkpoint.js
const mongoose = require('mongoose');

const checkpointSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  description: String,
  clue: {
    type: String,
    required: true
  },
  hint: String,
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  venue: {
    type: String,
    required: true
  },
  floor: String,
  section: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['retail', 'food', 'entertainment', 'services', 'landmarks'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: true
  },
  image: {
    url: String,
    alt: String
  },
  rewards: [{
    tier: {
      type: String,
      enum: ['Gold', 'Silver', 'Bronze']
    },
    description: String,
    points: Number
  }],
  statistics: {
    totalScans: {
      type: Number,
      default: 0
    },
    successfulScans: {
      type: Number,
      default: 0
    },
    averageTimeToFind: Number, // in seconds
    hintsUsed: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    createdBy: String,
    lastUpdatedBy: String,
    notes: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
checkpointSchema.index({ id: 1 });
checkpointSchema.index({ qrCode: 1 });
checkpointSchema.index({ venue: 1, isActive: 1 });
checkpointSchema.index({ category: 1 });
checkpointSchema.index({ difficulty: 1 });
checkpointSchema.index({ order: 1 });

// Virtual for success rate
checkpointSchema.virtual('successRate').get(function() {
  if (this.statistics.totalScans === 0) return 0;
  return (this.statistics.successfulScans / this.statistics.totalScans) * 100;
});

// Virtual for QR code URL (if using external QR service)
checkpointSchema.virtual('qrCodeUrl').get(function() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.qrCode)}`;
});

// Static method to get checkpoints by venue
checkpointSchema.statics.getByVenue = function(venue, isActive = true) {
  return this.find({ venue, isActive }).sort({ order: 1 });
};

// Static method to get random route
checkpointSchema.statics.generateRandomRoute = function(venue, count = 5) {
  return this.aggregate([
    { $match: { venue, isActive: true } },
    { $sample: { size: count } },
    { $sort: { order: 1 } }
  ]);
};

// Static method to get checkpoints by difficulty
checkpointSchema.statics.getByDifficulty = function(difficulty, venue = null) {
  const match = { difficulty, isActive: true };
  if (venue) match.venue = venue;
  
  return this.find(match).sort({ order: 1 });
};

// Instance method to record scan
checkpointSchema.methods.recordScan = function(successful = true) {
  this.statistics.totalScans += 1;
  if (successful) {
    this.statistics.successfulScans += 1;
  }
  return this.save();
};

// Instance method to record hint usage
checkpointSchema.methods.recordHintUsage = function() {
  this.statistics.hintsUsed += 1;
  return this.save();
};

// Instance method to update average time
checkpointSchema.methods.updateAverageTime = function(timeToFind) {
  const currentAvg = this.statistics.averageTimeToFind || 0;
  const totalSuccessful = this.statistics.successfulScans;
  
  if (totalSuccessful === 0) {
    this.statistics.averageTimeToFind = timeToFind;
  } else {
    this.statistics.averageTimeToFind = ((currentAvg * (totalSuccessful - 1)) + timeToFind) / totalSuccessful;
  }
  
  return this.save();
};

// Pre-save middleware
checkpointSchema.pre('save', function(next) {
  // Ensure QR code is unique and properly formatted
  if (this.isModified('qrCode')) {
    this.qrCode = this.qrCode.trim().toUpperCase();
  }
  
  next();
});

module.exports = mongoose.model('Checkpoint', checkpointSchema);