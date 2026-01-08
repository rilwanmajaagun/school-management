const { StatusCodes } = require("http-status-codes");
const AuthorizationHelper = require("../../_common/authorization.helper");
const { genericError, validationError, conflictError, notFoundError } = require("../../_common/error.handler");
const QueryHelper = require("../../_common/query.helper");
const ResponseHelper = require("../../_common/response.helper");

module.exports = class School {
  constructor({ utils, cache, config, cortex, managers, validators, mongomodels, logger } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.logger = logger;
    this.schoolsCollection = "schools";
    this.httpExposed = [
      'post=createSchool',
      'get=get',
      "get=getById",
      "patch=update",
      "delete=delete",
      "post=assignAdmin",
    ];
  }

  async createSchool({ __longToken, name, address, email, phone, website, logo }) {
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin']);

      const schoolPayload = { name, address, email, phone, website, logo };
      let error = await this.validators.school.createSchool(schoolPayload);
      if (error) return validationError(error[0].message);

      const existingSchool = await QueryHelper.existsActive(
        this.mongomodels.school,
        { name }
      );
      if (existingSchool) return conflictError('School already exists');

      const school = await this.mongomodels.school.create(schoolPayload);

      return ResponseHelper.created(school, 'school', 'School created successfully');
    } catch (error) {
      this.logger.error('Error creating school', {
        error: error.message,
        stack: error.stack,
        payload: { name, address, email, phone, website, logo }
      });
      const message = error?.code ? error.message : "An error occurred while creating school";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async get({ __longToken }) {
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin']);
      const schools = await this.mongomodels.school.aggregate([
        {
          $match: {
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'school',
            as: 'admins',
            pipeline: [
              {
                $project: {
                  password: 0,
                  temporaryPassword: 0,
                  deletedAt: 0,
                },
              },
            ]
          },
        },
        {
          $lookup: {
            from: 'classrooms',
            localField: '_id',
            foreignField: 'schoolId',
            as: 'classrooms',
            pipeline: [
              {
                $project: {
                  deletedAt: 0,
                },
              },
            ]
          },
        },
        {
          $lookup: {
            from: 'students',
            localField: '_id',
            foreignField: 'schoolId',
            as: 'students',
            pipeline: [
              {
                $project: {
                  deletedAt: 0,
                },
              },
            ]
          },
        },
        {
          $project: {
            name: 1,
            address: 1,
            email: 1,
            phone: 1,
            createdAt: 1,
            updatedAt: 1,
            deletedAt: 1,
            admins: 1,
            classrooms: 1,
            students: 1,
            website: 1,
            logo: 1,
          },
        },
      ]);
      return ResponseHelper.successList(schools, 'school', 'Schools fetched successfully');
    }
    catch (error) {
      this.logger.error('Error getting schools', {
        error: error.message,
        stack: error.stack,
      });
      const message = error?.code ? error.message : "An error occurred while getting schools";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getById({ __longToken, __params }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;

      const school = await QueryHelper.findActiveById(
        this.mongomodels.school,
        id
      );
      if (!school) return notFoundError('School not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        school._id
      );

      return ResponseHelper.successSingle(
        school,
        'school',
        'School fetched successfully'
      );
    }
    catch (error) {
      this.logger.error('Error getting school by id', {
        error: error.message,
        stack: error.stack,
        payload: { id }
      });
      const message = error?.code ? error.message : "An error occurred while getting school by id";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async update({ __longToken, __params, name, address, email, phone, website, logo }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin']);

      const schoolPayload = { name, address, email, phone, website, logo };
      let error = await this.validators.school.updateSchool(schoolPayload);
      if (error) return validationError(error[0].message);

      // Check for existing school with same name (excluding current school and deleted schools)
      if (name) {
        const existingSchool = await QueryHelper.existsActive(
          this.mongomodels.school,
          { name, _id: { $ne: QueryHelper.validateObjectId(id) } }
        );
        if (existingSchool) return conflictError('School already exists');
      }

      // Build update object (filter undefined values)
      const updates = QueryHelper.buildUpdateObject(schoolPayload);

      const school = await QueryHelper.updateActiveById(
        this.mongomodels.school,
        id,
        updates
      );
      if (!school) return notFoundError('School not found');

      return ResponseHelper.successSingle(
        school,
        'school',
        'School updated successfully'
      );
    }
    catch (error) {
      this.logger.error('Error updating school', {
        error: error.message,
        stack: error.stack,
        payload: { id, name, address, email, phone, website, logo }
      });
      const message = error?.code ? error.message : "An error occurred while updating school";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async delete({ __longToken, __params }) {
    const { id } = __params;
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin']);

      const school = await QueryHelper.softDeleteById(
        this.mongomodels.school,
        id
      );
      if (!school) return notFoundError('School not found');

      return ResponseHelper.deleted(id, 'School deleted successfully');
    }
    catch (error) {
      this.logger.error('Error deleting school', {
        error: error.message,
        stack: error.stack,
        payload: { id }
      });
      const message = error?.code ? error.message : "An error occurred while deleting school";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async assignAdmin({ __longToken, userId, schoolId: assignedSchoolId }) {
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin']);

      const schoolPayload = { userId, schoolId: assignedSchoolId };
      let error = await this.validators.school.assignAdmin(schoolPayload);
      if (error) return validationError(error[0].message);
      const user = await QueryHelper.findActiveById(
        this.mongomodels.user,
        userId
      );
      if (!user) return notFoundError('User not found');

      if (user.role !== 'admin') {
        return validationError('User can not be assigned to a school as admin, Kindly check the user role');
      }

      const school = await QueryHelper.findActiveById(
        this.mongomodels.school,
        assignedSchoolId
      );
      if (!school) return notFoundError('School not found');


      const updatedUser = await QueryHelper.updateActiveById(
        this.mongomodels.user,
        userId,
        { schoolId: school._id }
      );
      if (!updatedUser) return notFoundError('User not found');

      return ResponseHelper.success(
        {
          user: {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            schoolId: updatedUser.schoolId
          },
          school: {
            _id: school._id,
            name: school.name
          }
        },
        'Admin assigned to school successfully'
      );
    }
    catch (error) {
      this.logger.error('Error assigning admin', {
        error: error.message,
        stack: error.stack,
        payload: { userId, assignedSchoolId }
      });
      const message = error?.code ? error.message : "An error occurred while assigning admin";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}
