const { expect } = require('chai');
const mongoose = require('mongoose');
const config = require('../config/index.config');
const logger = require('../libs/logger');
const ValidatorsLoader = require('../loaders/ValidatorsLoader');
const UserModel = require('../managers/entities/user/user.mongoModel');
const { faker } = require('@faker-js/faker');
const TokenManager = require('../managers/token/Token.manager');
const UserManager = require('../managers/entities/user/User.manager');
const bcrypt = require('bcrypt');
const { StatusCodes } = require('http-status-codes');
const SchoolModel = require('../managers/entities/school/school.mongoModel');

describe('User Manager', () => {
  const validatorsLoader = new ValidatorsLoader({
    models: require('../managers/_common/schema.models'),
    customValidators: require('../managers/_common/schema.validators'),
  });

  const validators = validatorsLoader.load();
  const tokenManager = new TokenManager({
    config: config,
  });

  const userManager = new UserManager({
    mongomodels: { user: UserModel, school: SchoolModel },
    logger: logger,
    validators: validators,
    managers: { token: tokenManager },
    cortex: null,
    cache: null,
    config: config,
    utils: {},
  });

  const superAdminPayload = {
    name: faker.person.fullName(),
    email: 'admin@example.com',
    password: 'password',
    role: 'superadmin',
    schoolId: null,
  };

  // Connect to MongoDB before all tests
  before(async () => {
    if (!config.dotEnv.MONGO_URI) {
      throw new Error('MONGO_URI is not set in test environment');
    }

    // Connect to MongoDB
    await mongoose.connect(config.dotEnv.MONGO_URI, {
      // MongoDB connection options
    });

    // Wait for connection to be established
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });

    // Clear users collection before creating test user (prevents duplicate key errors)
    await UserModel.deleteMany({});

    // Hash password before saving superadmin user
    const hashedPassword = await bcrypt.hash(superAdminPayload.password, 10);
    await new UserModel({
      ...superAdminPayload,
      password: hashedPassword
    }).save();
  });


  // Close MongoDB connection after all tests
  after(async () => {
    await UserModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Create Admin User', () => {
    const userPayload = {
      __longToken: {
        role: 'superadmin',
        schoolId: null,
      },
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: 'password',
      role: 'admin',
      schoolId: null,
    };
    it('create admin user successfully', async () => {
      const result = await userManager.createUser(userPayload);
      expect(result.message).to.equal('User created successfully');
      expect(result.code).to.equal(StatusCodes.CREATED);
      expect(result.data.user.email).to.equal(userPayload.email);
      expect(result.data.user.role).to.equal('admin');
      expect(result.data.user.schoolId).to.equal(null);
      expect(result.data.longToken).to.exist;
      expect(result.data.user.password).to.not.exist;

    });
    it('should get created admin user', async () => {
      const result = await UserModel.findOne({ email: userPayload.email });

      const hashedPassword = await bcrypt.compare(userPayload.password, result.password);

      expect(hashedPassword).to.be.true;
      expect(result).to.exist;
      expect(result.email).to.equal(userPayload.email);
      expect(result.role).to.equal('admin');
      expect(result.schoolId).to.equal(null);
      expect(result.password).to.exist;
      expect(result.password).to.not.equal(userPayload.password);
    });
    it('should not create admin user with invalid email', async () => {
      const result = await userManager.createUser({ ...userPayload, email: 'invalid-email' });
      expect(result.message).to.equal('email has invalid format');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });
    it('should not create user if already exists', async () => {
      const result = await userManager.createUser(userPayload);
      expect(result.message).to.equal('User already exists');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should not create user if role is invalid', async () => {
      const result = await userManager.createUser({ ...userPayload, role: 'invalid-role' });
      expect(result.message).to.equal('role invalid option');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should not create user if token role is admin', async () => {
      const result = await userManager.createUser({ ...userPayload, __longToken: { role: 'admin', schoolId: null } });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should not create user if school id is invalid', async () => {
      const result = await userManager.createUser({ ...userPayload, schoolId: 'invalid-school-id' });
      expect(result.message).to.equal('School id must be a valid Id');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should not create user if school id is not found', async () => {
      const result = await userManager.createUser({ ...userPayload, email: faker.internet.email(), schoolId: '666666666666666666666666' });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
  });

  describe('Login User', () => {
    it('should login user successfully', async () => {
      const result = await userManager.login({ email: 'admin@example.com', password: 'password' });
      expect(result.message).to.equal('Login successful');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.user.email).to.equal('admin@example.com');
      expect(result.data.user.role).to.equal('superadmin');
      expect(result.data.user.schoolId).to.equal(null);
      expect(result.data.longToken).to.exist;
      expect(result.data.user.password).to.not.exist;
    });
    it('should not login user with invalid email', async () => {
      const result = await userManager.login({ email: 'test@example.com', password: 'password' });
      expect(result.message).to.equal('Invalid email or password');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });
    it('should not login user with invalid password', async () => {
      const result = await userManager.login({ email: 'admin@example.com', password: 'invalid-password' });
      expect(result.message).to.equal('Invalid email or password');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

  });

  describe('Change Password', () => {
    it('should change password successfully', async () => {
      const oldPassword = "oldPassword123";
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
      const newPassword = "newPassword123";

      const user = await UserModel.create({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: hashedOldPassword,
        role: "admin",
        schoolId: new mongoose.Types.ObjectId(),
      });

      const result = await userManager.changePassword({ __longToken: { role: 'admin', schoolId: user.schoolId, userId: user._id }, oldPassword: oldPassword, newPassword: newPassword });
      expect(result.message).to.equal('Password changed successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data).to.exist;
    });

    it('should not change password with invalid old password', async () => {
      const oldPassword = "oldPassword123";
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
      const newPassword = "newPassword123";

      const user = await UserModel.create({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: hashedOldPassword,
        role: "admin",
        schoolId: new mongoose.Types.ObjectId(),
      });

      const result = await userManager.changePassword({ __longToken: { role: 'admin', schoolId: user.schoolId, userId: user._id }, oldPassword: 'invalid-password', newPassword: newPassword });
      expect(result.message).to.equal('Invalid old password');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should not change password with new password same as old password', async () => {
      const oldPassword = "oldPassword123";
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
      const newPassword = "oldPassword123";

      const user = await UserModel.create({
        email: faker.internet.email(),
        name: faker.person.fullName(),
        password: hashedOldPassword,
        role: "admin",
        schoolId: new mongoose.Types.ObjectId(),
      });

      const result = await userManager.changePassword({ __longToken: { role: 'admin', schoolId: user.schoolId, userId: user._id }, oldPassword: oldPassword, newPassword: newPassword });
      expect(result.message).to.equal('New password cannot be the same as old password');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });
    //should not change password if user is not found
    it('should not change password if user is not found', async () => {
      const result = await userManager.changePassword({ __longToken: { role: 'admin', schoolId: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId() }, oldPassword: 'oldPassword123', newPassword: 'newPassword123' });
      expect(result.message).to.equal('User not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

  });

  describe('Get Users', () => {
    let testSchoolId;
    let adminUser;
    let adminUser2;
    let superAdminUser;

    before(async () => {
      // Create a test school
      const school = await SchoolModel.create({
        name: faker.company.name(),
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
      });
      testSchoolId = school._id;

      // Create admin users for the school
      const adminPassword = await bcrypt.hash('password123', 10);
      adminUser = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: adminPassword,
        role: 'admin',
        schoolId: testSchoolId,
      });

      adminUser2 = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: adminPassword,
        role: 'admin',
        schoolId: testSchoolId,
      });

      // Create a superadmin user
      const superAdminPassword = await bcrypt.hash('password123', 10);
      superAdminUser = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: superAdminPassword,
        role: 'superadmin',
        schoolId: null,
      });
    });

    it('should get all users successfully as superadmin', async () => {
      const result = await userManager.get({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdminUser._id,
        },
      });

      expect(result.message).to.equal('Users fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data).to.exist;
      expect(result.data).to.be.an('array');
      // Should include all users (superadmin, admins, and the initial test user)
      expect(result.data.length).to.be.at.least(4);
    });

    it('should get users from own school as admin', async () => {
      const result = await userManager.get({
        __longToken: {
          role: 'admin',
          schoolId: testSchoolId,
          userId: adminUser._id,
        },
      });

      expect(result.message).to.equal('Users fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data).to.exist;
      expect(result.data).to.be.an('array');
      // Should only include users from the same school
      result.data.forEach((user) => {
        expect(user.schoolId?.toString()).to.equal(testSchoolId.toString());
      });
      // Should include at least the two admin users we created
      expect(result.data.length).to.be.at.least(2);
    });

    it('should not get users as admin without schoolId', async () => {
      const result = await userManager.get({
        __longToken: {
          role: 'admin',
          schoolId: null,
          userId: adminUser._id,
        },
      });

      expect(result.message).to.equal('School ID is required for admin');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should get only own user for non-admin/superadmin role', async () => {
      // Test the "other roles" case - user can only see themselves
      // Since we only have 'superadmin' and 'admin' roles, we'll simulate with a non-existent role
      // The code will fall into the else block
      const result = await userManager.get({
        __longToken: {
          role: 'user', // Non-admin/superadmin role
          schoolId: null,
          userId: adminUser._id,
        },
      });

      expect(result.message).to.equal('Users fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data).to.exist;
      expect(result.data).to.be.an('array');
      // Should only return the user themselves
      expect(result.data.length).to.equal(1);
      expect(result.data[0]._id.toString()).to.equal(adminUser._id.toString());
    });
  });
});