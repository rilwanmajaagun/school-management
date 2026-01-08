const { StatusCodes } = require("http-status-codes");
const AuthorizationHelper = require("../../_common/authorization.helper");
const { genericError, conflictError, notFoundError, validationError } = require("../../_common/error.handler");
const QueryHelper = require("../../_common/query.helper");
const ResponseHelper = require("../../_common/response.helper");
const CapacityHelper = require("../../_common/capacity.helper");
const { default: mongoose } = require("mongoose");

module.exports = class Student {
  constructor({ utils, cache, config, cortex, managers, validators, mongomodels, logger } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.logger = logger;
    this.studentsCollection = "students";
    this.httpExposed = [
      'post=enroll',
      'get=getById',
      'get=getByClassroomId',
      'patch=update',
      'patch=transfer',
      'delete=delete',
    ];
  }
  async enroll({ __longToken, name, email, phone, gender, dateOfBirth, classRoomId }) {
    const enrollPayload = { name, email, phone, gender, dateOfBirth, id: classRoomId };
    try {
      const validationResult = await this.validators.student.enroll(enrollPayload);
      if (validationResult) return validationError(validationResult[0].message);

      const { role, schoolId } = __longToken;

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        classRoomId
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      // Verify classroom has schoolId
      if (!classRoom.schoolId) {
        return genericError(
          'Classroom must be associated with a school',
          StatusCodes.BAD_REQUEST
        );
      }

      // Check capacity
      const capacityError = await CapacityHelper.validateCapacity(
        this.mongomodels.student,
        classRoomId,
        classRoom.capacity
      );
      if (capacityError) return conflictError(capacityError);

      // Check for duplicate student
      const existingStudent = await QueryHelper.existsActive(
        this.mongomodels.student,
        { email, schoolId: classRoom.schoolId }
      );
      if (existingStudent) {
        return conflictError('Student already exists in this school');
      }

      // Create student
      const studentData = {
        name,
        email,
        phone,
        gender,
        dateOfBirth,
        classRoomId,
        schoolId: classRoom.schoolId
      };

      const newStudent = await this.mongomodels.student.create(studentData);

      this.logger.info('Student enrolled successfully', {
        studentId: newStudent._id,
        classRoomId,
        schoolId: classRoom.schoolId
      });

      return ResponseHelper.created(newStudent, 'student', 'Student enrolled successfully');
    } catch (error) {
      this.logger.error('Error enrolling student', {
        error: error.message,
        stack: error.stack,
        payload: { name, email, phone, gender, dateOfBirth, classRoomId }
      });
      const message = error?.code ? error.message : "An error occurred while creating student";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
  async getById({ __longToken, __params }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;

      // Get student
      const student = await QueryHelper.findActiveById(
        this.mongomodels.student,
        id
      );
      if (!student) return notFoundError('Student not found');

      // Get classroom for authorization check
      const classroom = await this.mongomodels.classroom.findById(student.classRoomId);
      if (!classroom) return notFoundError('Classroom not found');

      const entitySchoolId = student.schoolId || classroom.schoolId;
      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        entitySchoolId
      );

      return ResponseHelper.successSingle(
        student,
        'student',
        'Student fetched successfully'
      );
    } catch (error) {
      this.logger.error('Error getting student by id', {
        error: error.message,
        stack: error.stack,
        payload: { id }
      });
      const message = error?.code ? error.message : "An error occurred while getting student";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async delete({ __longToken, __params }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;

      // Get student and verify existence
      const student = await QueryHelper.findActiveById(
        this.mongomodels.student,
        id
      );
      if (!student) return notFoundError('Student not found');

      const classroom = await this.mongomodels.classroom.findById(student.classRoomId);
      if (!classroom) return notFoundError('Classroom not found');

      const entitySchoolId = student.schoolId || classroom.schoolId;
      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        entitySchoolId
      );

      await QueryHelper.softDeleteById(this.mongomodels.student, id);

      return ResponseHelper.deleted(id, 'Student deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting student', {
        error: error.message,
        stack: error.stack,
        payload: { id }
      });
      const message = error?.code ? error.message : "An error occurred while deleting student";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
  async getByClassroomId({ __longToken, __params }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;

      // Get classroom and verify existence
      const classroom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        id
      );
      if (!classroom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classroom.schoolId
      );

      const students = await this.mongomodels.student.find(
        QueryHelper.activeFilter({ classRoomId: id })
      ).exec();

      return ResponseHelper.successList(
        students,
        'student',
        'Students fetched successfully'
      );
    } catch (error) {
      this.logger.error('Error getting students by classroom id', {
        error: error.message,
        stack: error.stack,
        payload: { id }
      });
      const message = error?.code ? error.message : "An error occurred while getting students by classroom id";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async update({ __longToken, __params, name, email, phone, gender, dateOfBirth, classRoomId }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;

      const updatePayload = { name, email, phone, gender, dateOfBirth, classRoomId };
      const validationResult = await this.validators.student.update(updatePayload);
      if (validationResult) return validationError(validationResult[0].message);

      // Get student and verify existence
      const student = await QueryHelper.findActiveById(
        this.mongomodels.student,
        id
      );
      if (!student) return notFoundError('Student not found');

      // Determine target classroom
      const targetClassroomId = classRoomId || student.classRoomId;
      const isChangingClassroom = classRoomId &&
        classRoomId.toString() !== student.classRoomId.toString();

      // Get target classroom
      const classroom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        targetClassroomId
      );
      if (!classroom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classroom.schoolId
      );

      // If transferring to new classroom, check capacity
      if (isChangingClassroom) {
        const capacityError = await CapacityHelper.validateCapacity(
          this.mongomodels.student,
          classRoomId,
          classroom.capacity,
          id // Exclude current student from count
        );
        if (capacityError) return conflictError(capacityError);
      }

      const allowedFields = ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'classRoomId'];
      const updates = QueryHelper.buildUpdateObject(updatePayload, allowedFields);

      // Update schoolId if changing classroom
      if (isChangingClassroom && classroom.schoolId) {
        updates.schoolId = classroom.schoolId;
      }

      const updatedStudent = await QueryHelper.updateActiveById(
        this.mongomodels.student,
        id,
        updates
      );

      if (!updatedStudent) return notFoundError('Student not found');

      return ResponseHelper.successSingle(
        updatedStudent,
        'student',
        'Student updated successfully'
      );
    } catch (error) {
      this.logger.error('Error updating student', {
        error: error.message,
        stack: error.stack,
        payload: { id, name, email, phone, gender, dateOfBirth, classRoomId }
      });
      const message = error?.code ? error.message : "An error occurred while updating student";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async transfer({ __longToken, __params, targetClassroomId }) {
    try {
      const { id: studentId } = __params;
      const { role, schoolId } = __longToken;

      const student = await QueryHelper.findActiveById(
        this.mongomodels.student,
        studentId
      );
      if (!student) return notFoundError('Student not found');

      // Get current classroom
      const currentClassroom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        student.classRoomId
      );
      if (!currentClassroom) return notFoundError('Current classroom not found');

      // Get target classroom
      const targetClassroom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        targetClassroomId
      );
      if (!targetClassroom) return notFoundError('Target classroom not found');

      // Check authorization for current classroom
      const currentSchoolId = student.schoolId || currentClassroom.schoolId;
      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        currentSchoolId
      );

      // Check authorization for target classroom
      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        targetClassroom.schoolId
      );

      // Verify classrooms are in same school (or allow cross-school if superadmin)
      if (role !== 'superadmin' &&
        currentSchoolId.toString() !== targetClassroom.schoolId.toString()) {
        return validationError('Cannot transfer student to different school');
      }

      // Check if already in target classroom
      if (student.classRoomId.toString() === targetClassroomId.toString()) {
        return conflictError('Student is already in the target classroom');
      }

      // Check target classroom capacity
      const capacityError = await CapacityHelper.validateCapacity(
        this.mongomodels.student,
        targetClassroomId,
        targetClassroom.capacity,
        studentId // Exclude current student from count
      );
      if (capacityError) return conflictError(capacityError);

      const updates = {
        classRoomId: targetClassroomId,
        schoolId: targetClassroom.schoolId
      };

      const updatedStudent = await QueryHelper.updateActiveById(
        this.mongomodels.student,
        studentId,
        updates
      );

      if (!updatedStudent) return notFoundError('Student not found');

      this.logger.info('Student transferred successfully', {
        studentId,
        fromClassroom: student.classRoomId,
        toClassroom: targetClassroomId
      });

      return ResponseHelper.successSingle(
        updatedStudent,
        'student',
        'Student transferred successfully'
      );
    } catch (error) {
      this.logger.error('Error transferring student', {
        error: error.message,
        stack: error.stack,
        payload: { studentId: __params?.id, targetClassroomId }
      });
      const message = error?.code ? error.message : "An error occurred while transferring student";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
} 