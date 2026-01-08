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
const ClassroomModel = require("../managers/entities/classroom/classroom.mongoModel");
const StudentMongoModel = require("../managers/entities/student/student.mongoModel");
const StudentManager = require("../managers/entities/student/Student.manager");

describe("classroom Manager", () => {
  const validatorsLoader = new ValidatorsLoader({
    models: require("../managers/_common/schema.models"),
    customValidators: require("../managers/_common/schema.validators"),
  });

  const validators = validatorsLoader.load();
  const tokenManager = new TokenManager({
    config: config,
  });

  const studentManager = new StudentManager({
    mongomodels: {
      user: UserModel,
      school: SchoolModel,
      classroom: ClassroomModel,
      student: StudentMongoModel,
    },
    logger: logger,
    validators: validators,
    managers: { token: tokenManager },
    cortex: null,
    utils: null,
    cache: null,
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

  let superAdmin, admin, school, classroom, student, secondClassroom, secondSchool, secondAdmin;

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

    student = await new StudentMongoModel({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: '1234567890',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      classRoomId: classroom._id.toString(),
      schoolId: school._id,
    }).save();

    // Create second classroom in same school
    secondClassroom = await new ClassroomModel({
      name: 'Science 101',
      capacity: 26,
      resources: [{
        type: 'book',
        name: 'Science Textbook',
        quantity: 20,
      }],
      schoolId: school._id
    }).save();

    // Create second school for cross-school transfer tests
    secondSchool = await new SchoolModel({
      name: 'Queens Academy',
      address: faker.location.streetAddress(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      logo: faker.image.url(),
    }).save();

    // Create admin for second school
    secondAdmin = await new UserModel({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      schoolId: secondSchool._id,
      password: hashedPassword,
      role: 'admin',
    }).save();
  });

  // Close MongoDB connection after all tests
  after(async () => {
    await StudentMongoModel.deleteMany({});
    await UserModel.deleteMany({});
    await SchoolModel.deleteMany({});
    await ClassroomModel.deleteMany({});
    await mongoose.connection.close();
  });


  describe('enroll', () => {
    it('should enroll a student successfully', async () => {
      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: faker.person.fullName(),
        email: 'kingsacademy@example.com',
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Student enrolled successfully');
      expect(result.code).to.equal(StatusCodes.CREATED);
      expect(result.data.student.phone).to.equal('1234567890');
      expect(result.data.student.gender).to.equal('male');
    });

    it('should fail if student already exists', async () => {
      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: faker.person.fullName(),
        email: 'kingsacademy@example.com',
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Student already exists in this school');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should fail if classroom is not found', async () => {
      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: faker.person.fullName(),
        email: 'kingsacademy@example.com',
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('Classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });


    it('should fail if admin is assigned to a different school', async () => {
      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should fail if classroom capacity is exceeded', async () => {
      // Fill classroom to capacity
      const capacity = classroom.capacity;
      for (let i = 0; i < capacity - 1; i++) {
        await new StudentMongoModel({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          gender: 'male',
          dateOfBirth: '1990-01-01',
          classRoomId: classroom._id,
          schoolId: school._id,
        }).save();
      }

      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.include('Classroom is at full capacity');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should fail with invalid input validation', async () => {
      const result = await studentManager.enroll({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        name: '',
        email: 'invalid-email',
        phone: '',
        gender: 'invalid',
        dateOfBirth: '',
        classRoomId: classroom._id.toString(),
      });
      expect(result.ok).to.equal(false);
      expect(result.code).to.equal(StatusCodes.BAD_REQUEST);
    });

    it('should allow superadmin to enroll students', async () => {
      const freshClassroom = await new ClassroomModel({
        name: 'Fresh Classroom',
        capacity: 30,
        schoolId: school._id
      }).save();

      const result = await studentManager.enroll({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'female',
        dateOfBirth: '1995-05-15',
        classRoomId: freshClassroom._id.toString(),
      });
      expect(result.message).to.equal('Student enrolled successfully');
      expect(result.code).to.equal(StatusCodes.CREATED);
    });
  });

  describe('getById', () => {
    it('should get a student by id successfully', async () => {
      const result = await studentManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
      });
      expect(result.message).to.equal('Student fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.name).to.equal(student.name);
      expect(result.data.student.email).to.equal(student.email);
      expect(result.data.student.phone).to.equal(student.phone);
      expect(result.data.student.gender).to.equal(student.gender);
    });

    it('should fail if student is not found', async () => {
      const result = await studentManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
      });
      expect(result.message).to.equal('Student not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
    it('should fail if admin is assigned to a different school', async () => {
      const result = await studentManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should allow superadmin to get any student', async () => {
      const result = await studentManager.getById({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
      });
      expect(result.message).to.equal('Student fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student._id.toString()).to.equal(student._id.toString());
    });

    it('should fail with invalid student ID format', async () => {
      const result = await studentManager.getById({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: 'invalid-id',
        },
      });
      expect(result.ok).to.equal(false);
    });
  });

  describe('getByClassroomId', () => {
    it('should get students by classroom id successfully', async () => {
      // Use a fresh classroom with known students to avoid test interference
      const testClassroom = await new ClassroomModel({
        name: 'Test Classroom',
        capacity: 30,
        schoolId: school._id
      }).save();

      await new StudentMongoModel({
        name: 'Test Student 1',
        email: faker.internet.email(),
        phone: '1111111111',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: testClassroom._id,
        schoolId: school._id,
      }).save();

      await new StudentMongoModel({
        name: 'Test Student 2',
        email: faker.internet.email(),
        phone: '2222222222',
        gender: 'female',
        dateOfBirth: '1991-01-01',
        classRoomId: testClassroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.getByClassroomId({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: testClassroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Students fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.students.length).to.equal(2);
      const studentNames = result.data.students.map(s => s.name);
      expect(studentNames).to.include('Test Student 1');
      expect(studentNames).to.include('Test Student 2');
    });

    it('should fail if classroom is not found', async () => {
      const result = await studentManager.getByClassroomId({
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

    it('should return empty array if classroom has no students', async () => {
      const emptyClassroom = await new ClassroomModel({
        name: 'Empty Classroom',
        capacity: 20,
        schoolId: school._id
      }).save();

      const result = await studentManager.getByClassroomId({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: emptyClassroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Students fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.students.length).to.equal(0);
    });

    it('should allow superadmin to get students from any classroom', async () => {
      const result = await studentManager.getByClassroomId({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        __params: {
          id: classroom._id.toString(),
        },
      });
      expect(result.message).to.equal('Students fetched successfully');
      expect(result.code).to.equal(StatusCodes.OK);
    });
  });

  describe('update', () => {
    it('should update a student successfully', async () => {
      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
        name: 'John Doe',
        email: 'john.doe@example.com',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Student updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.name).to.equal('John Doe');
      expect(result.data.student.email).to.equal('john.doe@example.com');
      expect(result.data.student.phone).to.equal(student.phone);
      expect(result.data.student.gender).to.equal(student.gender);
    });
    it('should fail if classroom is not found', async () => {
      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
        name: 'John Doe',
        email: 'john.doe@example.com',
        classRoomId: new mongoose.Types.ObjectId().toString(),
      });
      expect(result.message).to.equal('Classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });
    it('should fail if admin is assigned to a different school', async () => {
      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
        name: 'John Doe',
        email: 'john.doe@example.com',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });
    it('should fail if student is not found', async () => {
      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        name: 'John Doe',
        email: 'john.doe@example.com',
        classRoomId: classroom._id.toString(),
      });
      expect(result.message).to.equal('Student not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should update student and transfer to different classroom', async () => {
      const updateTestClassroom = await new ClassroomModel({
        name: 'Update Test Classroom',
        capacity: 30,
        schoolId: school._id
      }).save();

      const newStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'female',
        dateOfBirth: '1995-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: newStudent._id.toString(),
        },
        classRoomId: updateTestClassroom._id.toString(),
      });
      expect(result.message).to.equal('Student updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.classRoomId.toString()).to.equal(updateTestClassroom._id.toString());
    });

    it('should fail if target classroom is at capacity during transfer', async () => {
      const fullClassroom = await new ClassroomModel({
        name: 'Full Classroom for Update',
        capacity: 5,
        schoolId: school._id
      }).save();

      // Fill classroom to capacity
      const capacity = fullClassroom.capacity;
      for (let i = 0; i < capacity; i++) {
        await new StudentMongoModel({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          gender: 'male',
          dateOfBirth: '1990-01-01',
          classRoomId: fullClassroom._id,
          schoolId: school._id,
        }).save();
      }

      const newStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'female',
        dateOfBirth: '1995-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: newStudent._id.toString(),
        },
        classRoomId: fullClassroom._id.toString(),
      });
      expect(result.message).to.include('Classroom is at full capacity');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should update only provided fields', async () => {
      const newStudent = await new StudentMongoModel({
        name: 'Original Name',
        email: 'original@example.com',
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.update({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: newStudent._id.toString(),
        },
        name: 'Updated Name',
      });
      expect(result.message).to.equal('Student updated successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.name).to.equal('Updated Name');
      expect(result.data.student.email).to.equal('original@example.com');
    });
  });

  describe('delete', () => {
    it('should delete a student successfully', async () => {
      const result = await studentManager.delete({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: student._id.toString(),
        },
      });
      expect(result.message).to.equal('Student deleted successfully');
      expect(result.code).to.equal(StatusCodes.OK);
    });
    it('should fail if student is not found', async () => {
      const result = await studentManager.delete({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
      });
      expect(result.message).to.equal('Student not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should allow superadmin to delete any student', async () => {
      const newStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.delete({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        __params: {
          id: newStudent._id.toString(),
        },
      });
      expect(result.message).to.equal('Student deleted successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.id).to.equal(newStudent._id.toString());
    });

    it('should fail if admin tries to delete student from different school', async () => {
      const testStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();

      const result = await studentManager.delete({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(), // Different school
          userId: admin._id.toString(),
        },
        __params: {
          id: testStudent._id.toString(),
        },
      });
      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });
  });

  describe('transfer', () => {
    let transferStudent, transferClassroom;

    beforeEach(async () => {
      transferClassroom = await new ClassroomModel({
        name: 'Transfer Target Classroom',
        capacity: 30,
        schoolId: school._id
      }).save();

      transferStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: classroom._id,
        schoolId: school._id,
      }).save();
    });

    it('should transfer student to different classroom successfully', async () => {
      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: transferClassroom._id.toString(),
      });

      expect(result.message).to.equal('Student transferred successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.classRoomId.toString()).to.equal(transferClassroom._id.toString());
      expect(result.data.student.schoolId.toString()).to.equal(school._id.toString());
    });

    it('should fail if student is not found', async () => {
      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: new mongoose.Types.ObjectId().toString(),
        },
        targetClassroomId: transferClassroom._id.toString(),
      });

      expect(result.message).to.equal('Student not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should fail if current classroom is not found', async () => {
      const invalidStudent = await new StudentMongoModel({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: '1234567890',
        gender: 'male',
        dateOfBirth: '1990-01-01',
        classRoomId: new mongoose.Types.ObjectId(),
        schoolId: school._id,
      }).save();

      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: invalidStudent._id.toString(),
        },
        targetClassroomId: transferClassroom._id.toString(),
      });

      expect(result.message).to.equal('Current classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should fail if target classroom is not found', async () => {
      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: new mongoose.Types.ObjectId().toString(),
      });

      expect(result.message).to.equal('Target classroom not found');
      expect(result.code).to.equal(StatusCodes.NOT_FOUND);
    });

    it('should fail if target classroom is at full capacity', async () => {
      const fullClassroom = await new ClassroomModel({
        name: 'Full Classroom',
        capacity: 5,
        schoolId: school._id
      }).save();

      // Fill classroom to capacity
      const capacity = fullClassroom.capacity;
      for (let i = 0; i < capacity; i++) {
        await new StudentMongoModel({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          gender: 'male',
          dateOfBirth: '1990-01-01',
          classRoomId: fullClassroom._id,
          schoolId: school._id,
        }).save();
      }

      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: fullClassroom._id.toString(),
      });

      expect(result.message).to.include('Classroom is at full capacity');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should fail if student is already in target classroom', async () => {
      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: classroom._id.toString(), // Same as current
      });

      expect(result.message).to.equal('Student is already in the target classroom');
      expect(result.code).to.equal(StatusCodes.CONFLICT);
    });

    it('should fail if admin tries to transfer to different school', async () => {
      const otherSchoolClassroom = await new ClassroomModel({
        name: 'Other School Classroom',
        capacity: 20,
        schoolId: secondSchool._id
      }).save();

      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: otherSchoolClassroom._id.toString(),
      });

      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should allow superadmin to transfer across schools', async () => {
      const otherSchoolClassroom = await new ClassroomModel({
        name: 'Other School Classroom',
        capacity: 20,
        schoolId: secondSchool._id
      }).save();

      const result = await studentManager.transfer({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: otherSchoolClassroom._id.toString(),
      });

      expect(result.message).to.equal('Student transferred successfully');
      expect(result.code).to.equal(StatusCodes.OK);
      expect(result.data.student.classRoomId.toString()).to.equal(otherSchoolClassroom._id.toString());
      expect(result.data.student.schoolId.toString()).to.equal(secondSchool._id.toString());
    });

    it('should fail if admin lacks authorization for current classroom', async () => {
      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: new mongoose.Types.ObjectId().toString(), // Different school
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: transferClassroom._id.toString(),
      });

      expect(result.message).to.equal('Access denied');
      expect(result.code).to.equal(StatusCodes.FORBIDDEN);
    });

    it('should fail if admin lacks authorization for target classroom', async () => {
      const otherSchoolClassroom = await new ClassroomModel({
        name: 'Other School Classroom',
        capacity: 20,
        schoolId: secondSchool._id
      }).save();

      const result = await studentManager.transfer({
        __longToken: {
          role: 'admin',
          schoolId: school._id.toString(),
          userId: admin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: otherSchoolClassroom._id.toString(),
      });

      expect(result.ok).to.equal(false);
      expect([StatusCodes.FORBIDDEN, StatusCodes.BAD_REQUEST]).to.include(result.code);
    });

    it('should update schoolId when transferring to different school (superadmin)', async () => {
      const otherSchoolClassroom = await new ClassroomModel({
        name: 'Other School Classroom',
        capacity: 20,
        schoolId: secondSchool._id
      }).save();

      const result = await studentManager.transfer({
        __longToken: {
          role: 'superadmin',
          schoolId: null,
          userId: superAdmin._id.toString(),
        },
        __params: {
          id: transferStudent._id.toString(),
        },
        targetClassroomId: otherSchoolClassroom._id.toString(),
      });

      expect(result.data.student.schoolId.toString()).to.equal(secondSchool._id.toString());
      expect(result.data.student.classRoomId.toString()).to.equal(otherSchoolClassroom._id.toString());
    });
  });
});

