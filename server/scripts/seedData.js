// src/scripts/seedData.js
const mongoose = require('mongoose');
const Checkpoint = require('../models/Checkpoint');
require('dotenv').config();

// Sample checkpoint data
const checkpointsData = [
  {
    id: 1,
    name: 'Electronics Hub',
    location: 'Electronics Store - Level 2',
    description: 'Major electronics retailer with latest gadgets and smartphones',
    clue: 'Where gadgets gleam and screens light up, find me near the smartphone setup.',
    hint: 'Look for the Samsung Galaxy display stand',
    qrCode: 'TLB_CP_001_ELECTRONICS',
    coordinates: {
      latitude: 25.3548,
      longitude: 51.1839
    },
    venue: 'Mall of Qatar',
    floor: 'Level 2',
    section: 'Electronics Wing',
    difficulty: 'easy',
    category: 'retail',
    order: 1,
    image: {
      url: 'https://example.com/electronics-store.jpg',
      alt: 'Electronics store interior'
    },
    rewards: [
      { tier: 'Gold', description: 'Electronics voucher', points: 100 },
      { tier: 'Silver', description: 'Accessory discount', points: 75 },
      { tier: 'Bronze', description: 'Store merchandise', points: 50 }
    ]
  },
  {
    id: 2,
    name: 'Fashion Central',
    location: 'Fashion Outlet - Level 1',
    description: 'Trendy clothing store with latest fashion collections',
    clue: 'Threads and trends in every hue, behind the mannequin dressed in blue.',
    hint: 'Check behind the blue dress display near the changing rooms',
    qrCode: 'TLB_CP_002_FASHION',
    coordinates: {
      latitude: 25.3549,
      longitude: 51.1840
    },
    venue: 'Mall of Qatar',
    floor: 'Level 1',
    section: 'Fashion District',
    difficulty: 'medium',
    category: 'retail',
    order: 2,
    image: {
      url: 'https://example.com/fashion-store.jpg',
      alt: 'Fashion store with mannequins'
    },
    rewards: [
      { tier: 'Gold', description: 'Fashion voucher', points: 100 },
      { tier: 'Silver', description: 'Clothing discount', points: 75 },
      { tier: 'Bronze', description: 'Accessory gift', points: 50 }
    ]
  },
  {
    id: 3,
    name: 'Culinary Corner',
    location: 'Food Court - Level 3',
    description: 'Diverse food court with international cuisines',
    clue: 'Where aromas dance and hunger fades, look beside the lemonade cascades.',
    hint: 'Find the fresh juice stand with the yellow sign',
    qrCode: 'TLB_CP_003_FOODCOURT',
    coordinates: {
      latitude: 25.3550,
      longitude: 51.1841
    },
    venue: 'Mall of Qatar',
    floor: 'Level 3',
    section: 'Food Court',
    difficulty: 'easy',
    category: 'food',
    order: 3,
    image: {
      url: 'https://example.com/food-court.jpg',
      alt: 'Busy food court area'
    },
    rewards: [
      { tier: 'Gold', description: 'Dining voucher', points: 100 },
      { tier: 'Silver', description: 'Free meal combo', points: 75 },
      { tier: 'Bronze', description: 'Beverage coupon', points: 50 }
    ]
  },
  {
    id: 4,
    name: 'Knowledge Nook',
    location: 'Bookstore - Level 2',
    description: 'Large bookstore with books, magazines, and educational materials',
    clue: 'Knowledge lives on every page, find me in the children\'s age.',
    hint: 'Look in the children\'s book section near the reading area',
    qrCode: 'TLB_CP_004_BOOKSTORE',
    coordinates: {
      latitude: 25.3551,
      longitude: 51.1842
    },
    venue: 'Mall of Qatar',
    floor: 'Level 2',
    section: 'Educational Zone',
    difficulty: 'medium',
    category: 'retail',
    order: 4,
    image: {
      url: 'https://example.com/bookstore.jpg',
      alt: 'Bookstore interior with shelves'
    },
    rewards: [
      { tier: 'Gold', description: 'Book voucher', points: 100 },
      { tier: 'Silver', description: 'Magazine subscription', points: 75 },
      { tier: 'Bronze', description: 'Stationery set', points: 50 }
    ]
  },
  {
    id: 5,
    name: 'Toy Wonderland',
    location: 'Toy Store - Level 1',
    description: 'Large toy store with games, puzzles, and plush toys',
    clue: 'Where joy is stacked on every shelf, and plushies know no tricks.',
    hint: 'Look near the stuffed animal section by the game displays',
    qrCode: 'TLB_CP_005_TOYSTORE',
    coordinates: {
      latitude: 25.3552,
      longitude: 51.1843
    },
    venue: 'Mall of Qatar',
    floor: 'Level 1',
    section: 'Family Zone',
    difficulty: 'easy',
    category: 'retail',
    order: 5,
    image: {
      url: 'https://example.com/toy-store.jpg',
      alt: 'Colorful toy store with displays'
    },
    rewards: [
      { tier: 'Gold', description: 'Toy voucher', points: 100 },
      { tier: 'Silver', description: 'Game discount', points: 75 },
      { tier: 'Bronze', description: 'Small toy gift', points: 50 }
    ]
  },
  {
    id: 6,
    name: 'Coffee Paradise',
    location: 'Coffee Shop - Level 2',
    description: 'Premium coffee shop with artisanal beverages',
    clue: 'Where beans are ground and steam does rise, find me where the barista tries.',
    hint: 'Check behind the espresso machine counter',
    qrCode: 'TLB_CP_006_COFFEESHOP',
    coordinates: {
      latitude: 25.3553,
      longitude: 51.1844
    },
    venue: 'Mall of Qatar',
    floor: 'Level 2',
    section: 'Cafe District',
    difficulty: 'medium',
    category: 'food',
    order: 6,
    image: {
      url: 'https://example.com/coffee-shop.jpg',
      alt: 'Modern coffee shop interior'
    },
    rewards: [
      { tier: 'Gold', description: 'Coffee subscription', points: 100 },
      { tier: 'Silver', description: 'Free coffee week', points: 75 },
      { tier: 'Bronze', description: 'Coffee mug', points: 50 }
    ]
  },
  {
    id: 7,
    name: 'Sports Arena',
    location: 'Sports Store - Level 1',
    description: 'Athletic wear and sports equipment store',
    clue: 'Where athletes gear up for the game, find me where champions claim their fame.',
    hint: 'Look near the trophy display case',
    qrCode: 'TLB_CP_007_SPORTS',
    coordinates: {
      latitude: 25.3554,
      longitude: 51.1845
    },
    venue: 'Mall of Qatar',
    floor: 'Level 1',
    section: 'Sports Zone',
    difficulty: 'hard',
    category: 'retail',
    order: 7,
    image: {
      url: 'https://example.com/sports-store.jpg',
      alt: 'Sports equipment and clothing store'
    },
    rewards: [
      { tier: 'Gold', description: 'Sports gear voucher', points: 100 },
      { tier: 'Silver', description: 'Athletic wear discount', points: 75 },
      { tier: 'Bronze', description: 'Water bottle', points: 50 }
    ]
  },
  {
    id: 8,
    name: 'Beauty Haven',
    location: 'Cosmetics Store - Level 2',
    description: 'Premium beauty and cosmetics retailer',
    clue: 'Where beauty meets the mirror\'s gaze, find me in the makeup maze.',
    hint: 'Check the lipstick testing station',
    qrCode: 'TLB_CP_008_BEAUTY',
    coordinates: {
      latitude: 25.3555,
      longitude: 51.1846
    },
    venue: 'Mall of Qatar',
    floor: 'Level 2',
    section: 'Beauty Boulevard',
    difficulty: 'medium',
    category: 'retail',
    order: 8,
    image: {
      url: 'https://example.com/beauty-store.jpg',
      alt: 'Modern cosmetics store'
    },
    rewards: [
      { tier: 'Gold', description: 'Beauty package', points: 100 },
      { tier: 'Silver', description: 'Makeup kit', points: 75 },
      { tier: 'Bronze', description: 'Skincare sample', points: 50 }
    ]
  }
];

// Additional venues data
const additionalVenues = [
  // City Center Doha checkpoints
  {
    id: 9,
    name: 'Tech Galaxy',
    location: 'Technology Store - Ground Floor',
    clue: 'Where future meets the present day, among the screens in bright display.',
    qrCode: 'TLB_CP_009_TECH_CCD',
    venue: 'City Center Doha',
    category: 'retail',
    difficulty: 'easy'
  },
  {
    id: 10,
    name: 'Sweet Treats',
    location: 'Dessert Shop - Food Court',
    clue: 'Where sugar crystals dance and play, find me where the sweets display.',
    qrCode: 'TLB_CP_010_SWEETS_CCD',
    venue: 'City Center Doha',
    category: 'food',
    difficulty: 'medium'
  }
];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talabat_scavenger_hunt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Seed checkpoints data
 */
const seedCheckpoints = async () => {
  try {
    console.log('🌱 Starting checkpoint seeding...');

    // Clear existing checkpoints
    await Checkpoint.deleteMany({});
    console.log('🗑️ Cleared existing checkpoints');

    // Combine all checkpoint data
    const allCheckpoints = [...checkpointsData, ...additionalVenues.map(venue => ({
      ...venue,
      coordinates: { latitude: 25.3500 + Math.random() * 0.01, longitude: 51.1800 + Math.random() * 0.01 },
      floor: 'Ground Floor',
      section: 'Main Area',
      order: venue.id,
      isActive: true,
      rewards: [
        { tier: 'Gold', description: 'Premium voucher', points: 100 },
        { tier: 'Silver', description: 'Standard voucher', points: 75 },
        { tier: 'Bronze', description: 'Basic voucher', points: 50 }
      ]
    }))];

    // Insert checkpoints
    const createdCheckpoints = await Checkpoint.insertMany(allCheckpoints);
    console.log(`✅ Created ${createdCheckpoints.length} checkpoints`);

    // Display summary
    const summary = createdCheckpoints.reduce((acc, cp) => {
      acc[cp.venue] = (acc[cp.venue] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Checkpoint Summary:');
    Object.entries(summary).forEach(([venue, count]) => {
      console.log(`   ${venue}: ${count} checkpoints`);
    });

  } catch (error) {
    console.error('❌ Error seeding checkpoints:', error);
    throw error;
  }
};

/**
 * Create sample users for testing
 */
const seedSampleUsers = async () => {
  try {
    const User = require('../models/User');
    console.log('🌱 Starting user seeding...');

    // Clear existing test users
    await User.deleteMany({ phoneNumber: /^\+974555/ });

    const sampleUsers = [
      {
        phoneNumber: '+97455501234',
        isVerified: true,
        gameStats: {
          totalGames: 5,
          completedGames: 4,
          bestTime: 1250, // ~20 minutes
          totalRewards: 325,
          currentStreak: 2
        }
      },
      {
        phoneNumber: '+97455505678',
        isVerified: true,
        gameStats: {
          totalGames: 3,
          completedGames: 2,
          bestTime: 1890, // ~31 minutes
          totalRewards: 175,
          currentStreak: 1
        }
      },
      {
        phoneNumber: '+97455509876',
        isVerified: true,
        gameStats: {
          totalGames: 8,
          completedGames: 7,
          bestTime: 945, // ~15 minutes
          totalRewards: 650,
          currentStreak: 5
        }
      }
    ];

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} sample users`);

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

/**
 * Create sample game sessions
 */
const seedSampleSessions = async () => {
  try {
    const GameSession = require('../models/GameSession');
    const User = require('../models/User');
    
    console.log('🌱 Starting game session seeding...');

    // Get sample users
    const users = await User.find({ phoneNumber: /^\+974555/ });
    if (users.length === 0) {
      console.log('⚠️ No sample users found, skipping session seeding');
      return;
    }

    // Clear existing test sessions
    await GameSession.deleteMany({ userId: { $in: users.map(u => u._id) } });

    const sampleSessions = users.map((user, index) => ({
      userId: user._id,
      sessionId: `test-session-${Date.now()}-${index}`,
      startTime: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000), // Different days
      endTime: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000 + user.gameStats.bestTime * 1000),
      timeElapsed: user.gameStats.bestTime,
      status: 'completed',
      checkpoints: checkpointsData.slice(0, 5).map(cp => ({
        id: cp.id,
        location: cp.location,
        clue: cp.clue,
        qrCode: cp.qrCode,
        isCompleted: true,
        scannedAt: new Date()
      })),
      completedCheckpoints: 5,
      totalCheckpoints: 5,
      rewardTier: user.gameStats.bestTime < 1200 ? 'Gold' : user.gameStats.bestTime < 2400 ? 'Silver' : 'Bronze',
      rewardToken: `TLB-${user.phoneNumber.slice(-4)}-${Date.now()}-TEST`
    }));

    const createdSessions = await GameSession.insertMany(sampleSessions);
    console.log(`✅ Created ${createdSessions.length} sample game sessions`);

  } catch (error) {
    console.error('❌ Error seeding game sessions:', error);
    throw error;
  }
};

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Starting database seeding process...\n');

    await seedCheckpoints();
    console.log('');

    await seedSampleUsers();
    console.log('');

    await seedSampleSessions();
    console.log('');

    console.log('🎉 Database seeding completed successfully!');
    console.log('📝 Summary:');
    console.log('   - Checkpoints created for multiple venues');
    console.log('   - Sample users created for testing');
    console.log('   - Sample game sessions created');
    console.log('\n💡 You can now start the server and test the API endpoints.');

  } catch (error) {
    console.error('💥 Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
    process.exit(0);
  }
};

/**
 * Clear all data (for development reset)
 */
const clearDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🗑️ Clearing database...');
    
    const User = require('../models/User');
    const GameSession = require('../models/GameSession');
    
    await Promise.all([
      Checkpoint.deleteMany({}),
      User.deleteMany({}),
      GameSession.deleteMany({})
    ]);
    
    console.log('✅ Database cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'seed':
    seedDatabase();
    break;
  case 'clear':
    clearDatabase();
    break;
  case 'checkpoints':
    connectDB().then(() => seedCheckpoints()).then(() => process.exit(0));
    break;
  case 'users':
    connectDB().then(() => seedSampleUsers()).then(() => process.exit(0));
    break;
  default:
    console.log('Usage: node seedData.js [seed|clear|checkpoints|users]');
    console.log('  seed        - Seed all data');
    console.log('  clear       - Clear all data');
    console.log('  checkpoints - Seed only checkpoints');
    console.log('  users       - Seed only users');
    process.exit(1);
}