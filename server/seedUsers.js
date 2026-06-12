const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config({ path: __dirname + '/.env' });

const seedUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skywave';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding users...');

    // Clear existing seeded users
    const emailsToClear = ['user@skywave.com', 'admin@skywave.com', 'superadmin@skywave.com'];
    await User.deleteMany({ email: { $in: emailsToClear } });
    console.log('Cleared existing seeded user accounts.');

    // Generate hashed passwords
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Create users
    const users = [
      {
        name: 'SkyWave Traveler',
        email: 'user@skywave.com',
        passwordHash,
        role: 'user',
        loyaltyTier: 'Bronze',
        loyaltyPoints: 1200,
        passportNumber: 'Z1234567',
        nationality: 'India',
        dateOfBirth: '1995-05-15'
      },
      {
        name: 'SkyWave Operations Admin',
        email: 'admin@skywave.com',
        passwordHash,
        role: 'admin',
        loyaltyTier: 'Gold',
        loyaltyPoints: 18500,
        passportNumber: 'A7654321',
        nationality: 'United Kingdom',
        dateOfBirth: '1988-10-22'
      },
      {
        name: 'SkyWave System Director',
        email: 'superadmin@skywave.com',
        passwordHash,
        role: 'superadmin',
        loyaltyTier: 'Platinum',
        loyaltyPoints: 42000,
        passportNumber: 'S9876543',
        nationality: 'United States',
        dateOfBirth: '1980-01-01'
      }
    ];

    await User.insertMany(users);
    console.log('\n==================================================');
    console.log('Successfully seeded user roles in the database!');
    console.log('==================================================');
    console.log('User Role Details (Localhost):');
    console.log('--------------------------------------------------');
    console.log('1. Customer User:');
    console.log('   - Email: user@skywave.com');
    console.log('   - Password: password123');
    console.log('   - Role: user (Standard passenger bookings, PNR, dashboard)');
    console.log('--------------------------------------------------');
    console.log('2. Operations Admin User:');
    console.log('   - Email: admin@skywave.com');
    console.log('   - Password: password123');
    console.log('   - Role: admin (Accesses Operations and Analytics console)');
    console.log('--------------------------------------------------');
    console.log('3. Super Admin User:');
    console.log('   - Email: superadmin@skywave.com');
    console.log('   - Password: password123');
    console.log('   - Role: superadmin (Accesses all systems)');
    console.log('==================================================\n');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding users failed:', error);
    process.exit(1);
  }
};

seedUsers();
