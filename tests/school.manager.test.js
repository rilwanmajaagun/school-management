const { expect } = require("chai");
const mongoose = require("mongoose");
const config = require("../config/index.config");
const logger = require("../libs/logger");
const ValidatorsLoader = require("../loaders/ValidatorsLoader");
const UserModel = require("../managers/entities/user/user.mongoModel");
const { faker } = require("@faker-js/faker");
const TokenManager = require("../managers/token/Token.manager");
const bcrypt = require("bcrypt");
const { StatusCodes } = require("http-status-codes");
const SchoolModel = require("../managers/entities/school/school.mongoModel");
const SchoolManager = require("../managers/entities/school/School.manager");

describe("School Manager", () => {
  const validatorsLoader = new ValidatorsLoader({
    models: require("../managers/_common/schema.models"),
    customValidators: require("../managers/_common/schema.validators"),
  });

  const validators = validatorsLoader.load();
  const tokenManager = new TokenManager({
    config: config,
  });

  const schoolManager = new SchoolManager({
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
    email: "admin@example.com",
    password: "password",
    role: "superadmin",
    schoolId: null,
  };

  // Connect to MongoDB before all tests
  before(async () => {
    if (!config.dotEnv.MONGO_URI) {
      throw new Error(
        "MONGO_URI is not set in test environment"
      );
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
        mongoose.connection.once(
          "connected",
          resolve
        );
      }
    });

    await UserModel.deleteMany({});
    await SchoolModel.deleteMany({});

    const hashedPassword = await bcrypt.hash(
      superAdminPayload.password,
      10
    );
    await new UserModel({
      ...superAdminPayload,
      password: hashedPassword,
    }).save();

    await new SchoolModel({
      name: 'kings academy',
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      logo: faker.image.url(),
    }).save();
  });

  // Close MongoDB connection after all tests
  after(async () => {
    await UserModel.deleteMany({});
    await SchoolModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe("Create School", () => {
    it("should create a school", async () => {
      const schoolPayload = {
        name: 'king academy high school',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: "689-746-2136",
        website: faker.internet.url(),
        logo: faker.image.url(),
      };
      const result = await schoolManager.createSchool({
        __longToken: {
          role: "superadmin",
          schoolId: null,
        },
        ...schoolPayload,
      });
      expect(result.message).to.equal(
        "School created successfully"
      );
      expect(result.code).to.equal(
        StatusCodes.CREATED
      );
      expect(result.data.school.name).to.equal(
        schoolPayload.name
      );
      expect(result.data.school.address).to.equal(
        schoolPayload.address
      );
      expect(result.data.school.email).to.equal(
        schoolPayload.email
      );
      expect(result.data.school.phone).to.equal(
        schoolPayload.phone
      );
      expect(result.data.school.website).to.equal(
        schoolPayload.website
      );
      expect(result.data.school.logo).to.equal(
        schoolPayload.logo
      );
    });
    it("should not create a school if name is required", async () => {
      const result = await schoolManager.createSchool({
        __longToken: {
          role: "superadmin",
          schoolId: null,
        },
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      expect(result.message).to.equal(
        "name is required"
      );
      expect(result.code).to.equal(
        StatusCodes.BAD_REQUEST
      );
    });
    it("should not create a school if address is required", async () => {
      const result = await schoolManager.createSchool({
        __longToken: {
          role: "superadmin",
          schoolId: null,
        },
        name: 'kings academy',
        email: faker.internet.email(),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      expect(result.message).to.equal(
        "address is required"
      );
      expect(result.code).to.equal(
        StatusCodes.BAD_REQUEST
      );
    });
    it("should not create a school if email is required", async () => {
      const result = await schoolManager.createSchool({
        __longToken: {
          role: "superadmin",
          schoolId: null,
        },
        name: 'kings academy',
        address: faker.location.streetAddress(),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      expect(result.message).to.equal(
        "email is required"
      );
      expect(result.code).to.equal(
        StatusCodes.BAD_REQUEST
      );
    });
    it("should not create a school if phone is required", async () => {
      const result = await schoolManager.createSchool({
        __longToken: {
          role: "superadmin",
          schoolId: null,
        },
        name: 'kings academy',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      expect(result.message).to.equal(
        "phone is required"
      );
      expect(result.code).to.equal(
        StatusCodes.BAD_REQUEST
      );
    });
  });
  it("should not create school if name is already taken", async () => {
    const result = await schoolManager.createSchool({
      __longToken: {
        role: "superadmin",
        schoolId: null,
      },
      name: 'kings academy',
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phone: '689-746-2136',
      website: faker.internet.url(),
      logo: faker.image.url(),
    });
    expect(result.message).to.equal("School already exists");
    expect(result.code).to.equal(StatusCodes.CONFLICT);
  });

  // should not create school if role is admin
  it('should not create school if role is admin', async () => {
    const result = await schoolManager.createSchool({
      __longToken: {
        role: 'admin',
        schoolId: null,
      },
      name: 'kings academy',
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phone: '689-746-2136',
      website: faker.internet.url(),
      logo: faker.image.url(),
    });
    expect(result.message).to.equal('Access denied');
    expect(result.code).to.equal(StatusCodes.FORBIDDEN);
  });

  describe('Get Schools', () => {
    it('should get all schools', async () => {
      const result = await schoolManager.get({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
      });
      expect(result.message).to.equal('Schools fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.schools.length).to.equal(2);
      expect(result.data.schools[0].name).to.equal('kings academy');
    });

    // should get school by id
    it('should get school by id', async () => {
      const schooId = new mongoose.Types.ObjectId();
      await SchoolModel.create({
        _id: schooId,
        name: 'kings academy3',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });

      const result = await schoolManager.getById({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schooId,
        },
      });
      expect(result.message).to.equal('School fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.school.name).to.equal('kings academy3');
      expect(result.data.school.phone).to.equal('689-746-2136');
    });

    // should return not found if school not found
    it('should return not found if school not found', async () => {
      const result = await schoolManager.getById({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: new mongoose.Types.ObjectId(),
        },
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

  });


  describe('Update School', () => {
    it('should update a school', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await SchoolModel.create({
        _id: schoolId,
        name: 'kings academy updated',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      const result = await schoolManager.update({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schoolId,
        },
        name: 'kings academy new updated',
      });
      expect(result.message).to.equal('School updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.school.name).to.equal('kings academy new updated');
    });

    it('should return not found if school not found', async () => {
      const result = await schoolManager.update({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: new mongoose.Types.ObjectId(),
        },
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
    it('should return conflict if school already exists', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await SchoolModel.create({
        _id: schoolId,
        name: 'kings academy conflict',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      const result = await schoolManager.update({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schoolId,
        },
        name: 'kings academy new updated',
      });
      expect(result.message).to.equal('School already exists');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

  });

  describe('Delete School', () => {
    it('should delete a school', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await SchoolModel.create({
        _id: schoolId,
        name: 'kings academy deleted',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      const result = await schoolManager.delete({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schoolId,
        },
      });
      expect(result.message).to.equal('School deleted successfully');
      expect(result.code).to.equal(StatusCodes.OK);
    });

    it('should return not found if school not found', async () => {
      const result = await schoolManager.delete({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: new mongoose.Types.ObjectId(),
        },
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    // should not return if school is not deleted
    it('should not return if school is not deleted', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      await SchoolModel.create({
        _id: schoolId,
        name: 'kings academy not deleted',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });

      await schoolManager.delete({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schoolId
        },
      });

      const result = await schoolManager.getById({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        __params: {
          id: schoolId,
        },
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
  });
  describe('assignAdmin', () => {
    it('should assign admin to a school', async () => {
      const user = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        role: 'admin',
        schoolId: null,
      });
      const school = await SchoolModel.create({
        name: 'kings academy assigned',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: user._id.toString(),
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('Admin assigned to school successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.school.name).to.equal('kings academy assigned');
    });
    it('should return not found if user not found', async () => {
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: new mongoose.Types.ObjectId().toString(),
        schoolId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('User not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should return not found if school not found', async () => {
      const user = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        role: 'admin',
        schoolId: null,
      });
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: user._id.toString(),
        schoolId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });


    it('should not assign admin to a school if user is not admin', async () => {
      const user = await UserModel.create({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        role: 'superadmin',
        schoolId: null,
      });
      const school = await SchoolModel.create({
        name: 'kings academy assigned not admin',
        address: faker.location.streetAddress(),
        email: faker.internet.email(),
        phone: '689-746-2136',
        website: faker.internet.url(),
        logo: faker.image.url(),
      });
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: user._id.toString(),
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('User can not be assigned to a school as admin, Kindly check the user role');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should not assign if user id is not valid mongo id', async () => {
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: 'q1223333',
        schoolId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('User id must be a valid Id');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should not assign if shoolid is null or empty', async () => {
      const result = await schoolManager.assignAdmin({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
        },
        userId: new mongoose.Types.ObjectId().toString(),
        schoolId: null,
      });
      expect(result.message).to.equal('schoolId is required');
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

  });
});
