const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/index.config');
const UserModel = require('../managers/entities/user/user.mongoModel');

// Default superadmin credentials (can be overridden via environment variables)
const DEFAULT_SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@example.com';
const DEFAULT_SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'admin123';
const DEFAULT_SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Admin';

async function seedSuperAdmin() {
  try {
    // Connect to MongoDB
    if (!config.dotEnv.MONGO_URI) {
      throw new Error('MONGO_URI is not set in environment');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.dotEnv.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if superadmin already exists
    const existingSuperAdmin = await UserModel.findOne({
      email: DEFAULT_SUPERADMIN_EMAIL,
      role: 'superadmin',
      deletedAt: null,
    });

    if (existingSuperAdmin) {
      console.log(`⚠️  Superadmin with email "${DEFAULT_SUPERADMIN_EMAIL}" already exists. Skipping seed.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(DEFAULT_SUPERADMIN_PASSWORD, 10);

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const superAdmin = await UserModel.create({
      name: DEFAULT_SUPERADMIN_NAME,
      email: DEFAULT_SUPERADMIN_EMAIL,
      password: hashedPassword,
      role: 'superadmin',
      schoolId: null,
      isTemporaryPassword: false,
    });

    console.log('✅ Superadmin created successfully!');
    console.log('\n📋 Superadmin Credentials:');
    console.log(`   Email: ${DEFAULT_SUPERADMIN_EMAIL}`);
    console.log(`   Password: ${DEFAULT_SUPERADMIN_PASSWORD}`);
    console.log(`   Name: ${DEFAULT_SUPERADMIN_NAME}`);
    console.log(`   ID: ${superAdmin._id}`);
    console.log('\n💡 Tip: You can override these defaults by setting environment variables:');
    console.log('   SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME');

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin();

