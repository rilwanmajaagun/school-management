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
const ClassroomManager = require("../managers/entities/classroom/Classroom.manager");
const ClassroomModel = require("../managers/entities/classroom/classroom.mongoModel");
const studentMongoModel = require("../managers/entities/student/student.mongoModel");
describe("classroom Manager", () => {
  const validatorsLoader = new ValidatorsLoader({
    models: require("../managers/_common/schema.models"),
    customValidators: require("../managers/_common/schema.validators"),
  });

  const validators = validatorsLoader.load();
  const tokenManager = new TokenManager({
    config: config,
  });

  const classroomManager = new ClassroomManager({
    mongomodels: { user: UserModel, school: SchoolModel, classroom: ClassroomModel, student: studentMongoModel },
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

  const adminPayload = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: "password",
    role: "admin",
    schoolId: null,
  };

  let superAdmin, admin, school, classroom;

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
    superAdmin = await new UserModel({
      ...superAdminPayload,
      password: hashedPassword,
    }).save();


    school = await new SchoolModel({
      name: 'kings academy',
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      logo: faker.image.url(),
    }).save();

    classroom = await new ClassroomModel({
      name: 'Math 101',
      capacity: 30,
      resources: [{
        type: 'book',
        name: 'Mathematics Textbook',
        quantity: 25,
      }],
      schoolId: school._id
    }).save();

    admin = await new UserModel({
      ...adminPayload,
      schoolId: school._id,
      password: hashedPassword,
    }).save();

  });

  // Close MongoDB connection after all tests
  after(async () => {
    await UserModel.deleteMany({});
    await SchoolModel.deleteMany({});
    await ClassroomModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('create', () => {
    it('should create a classroom successfully by superadmin', async () => {
      const result = await classroomManager.create({
        __longToken: {
          role: 'superadmin',
          schoolId: school._id.toString(),
          userId: superAdmin._id,
        },
        name: 'Math 102',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('Classroom created successfully');
      expect(result.code).to.equal(StatusCodes.CREATED);
      expect(result.data.classroom.name).to.equal('Math 102');
      expect(result.data.classroom.capacity).to.equal(30);
      expect(result.data.classroom.schoolId.toString()).to.equal(school._id.toString());
    });

    it('should create a classroom successfully by admin', async () => {
      const result = await classroomManager.create({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: 'Math 104',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('Classroom created successfully');
      expect(result.code).to.equal(StatusCodes.CREATED);
      expect(result.data.classroom.name).to.equal('Math 104');
      expect(result.data.classroom.capacity).to.equal(30);
      expect(result.data.classroom.schoolId.toString()).to.equal(school._id.toString());
    });

    it('should fail if admin is assigned to a different school', async () => {
      const result = await classroomManager.create({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        name: 'Math 105',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should fail if school is not found', async () => {
      const result = await classroomManager.create({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: superAdmin._id.toString(),
        },
        name: 'Math 106',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
        schoolId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('School not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    // should fail if classroom name is already taken
    it('should fail if classroom name is already taken', async () => {
      const result = await classroomManager.create({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: 'Math 102',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
        schoolId: school._id.toString(),
      });
      expect(result.message).to.equal('Classroom already exists');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });
  });

  describe('get', () => {
    it('should get all classrooms successfully by admin', async () => {
      const result = await classroomManager.get({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
      });
      expect(result.message).to.equal('Classrooms fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.classrooms.length).to.equal(3);
      expect(result.data.classrooms[0].name).to.equal('Math 101');
      expect(result.data.classrooms[0].capacity).to.equal(30);
      expect(result.data.classrooms[0].schoolId.toString()).to.equal(school._id.toString());
    });
  });

  describe('getById', () => {
    it('should get a classroom successfully', async () => {
      const result = await classroomManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Classroom fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.classroom.name).to.equal('Math 101');
      expect(result.data.classroom.capacity).to.equal(30);
      expect(result.data.classroom.schoolId.toString()).to.equal(school._id.toString());
    });
    it('should fail if classroom is not found', async () => {
      const result = await classroomManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
      });
      expect(result.message).to.equal('Classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
    it('should fail if admin is assigned to a different school', async () => {
      const result = await classroomManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });
    it('should get classroom students successfully', async () => {
      const result = await classroomManager.students({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Students fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.students.length).to.equal(0);
    });
  });
  describe('updateResource', () => {
    it('should update a classroom resource successfully', async () => {
      const result = await classroomManager.updateResource({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
        name: 'Mathematics Textbook 2',
        quantity: 25,
        type: 'book',
        resourceId: classroom.resources[0]._id.toString(),
      });
      expect(result.message).to.equal('Classroom resource updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.resource.type).to.equal('book');
      expect(result.data.resource.name).to.equal('Mathematics Textbook 2');
      expect(result.data.resource.quantity).to.equal(25);
    });
  });

  describe('update', () => {
    it('should update a classroom successfully', async () => {
      const result = await classroomManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
        name: 'Math 108',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
      });
      expect(result.message).to.equal('Classroom updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.classroom.name).to.equal('Math 108');
      expect(result.data.classroom.capacity).to.equal(30);
      expect(result.data.classroom.schoolId.toString()).to.equal(school._id.toString());
    });
    it('should fail if classroom is not found', async () => {
      const result = await classroomManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        name: 'Math 108',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
      });
      expect(result.message).to.equal('Classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
    it('should fail if admin is assigned to a different school', async () => {
      const result = await classroomManager.update({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);

    });
    it('should fail if classroom name is already taken', async () => {
      const result = await classroomManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
        name: 'Math 102',
        capacity: 30,
        resources: [
          { type: 'book', name: 'Mathematics Textbook', quantity: 25 },
          { type: 'laptop', name: 'Apple mackbook', quantity: 10 }
        ],
      });
      expect(result.message).to.equal('Classroom already exists. Please use a different name.');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

  });


  describe('delete', () => {
    it('should delete a classroom successfully', async () => {
      const result = await classroomManager.delete({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Classroom deleted successfully');
      expect(result.code).to.equal(StatusCodes.OK);
    });
  });
});