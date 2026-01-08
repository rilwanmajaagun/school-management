const { StatusCodes } = require("http-status-codes");
const AuthorizationHelper = require("../../_common/authorization.helper");
const { validationError, notFoundError, genericError, conflictError } = require("../../_common/error.handler");
const QueryHelper = require("../../_common/query.helper");
const ResponseHelper = require("../../_common/response.helper");

module.exports = class Classroom {
  constructor({ utils, cache, config, cortex, managers, validators, mongomodels, logger } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.logger = logger;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.classroomsCollection = "classrooms";
    this.httpExposed = [
      'post=create',
      'patch=update',
      'get=get',
      "get=getById",
      'delete=delete',
      'patch=updateResource',
      'get=students',
    ];
  }

  async create({ __longToken, name, schoolId: schoolIdPayload, capacity, resources }) {
    try {
      const { role, schoolId } = __longToken;

      const classroomPayload = { name, schoolId: schoolIdPayload, capacity, resources };
      let error = await this.validators.classroom.create(classroomPayload);
      if (error) return validationError(error[0].message);

      const school = await QueryHelper.findActiveById(
        this.mongomodels.school,
        schoolIdPayload
      );
      if (!school) return notFoundError('School not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        school._id
      );

      const existingClassroom = await QueryHelper.existsActive(
        this.mongomodels.classroom,
        { name, schoolId: schoolIdPayload }
      );
      if (existingClassroom) return conflictError('Classroom already exists');

      const newClassroom = await this.mongomodels.classroom.create(classroomPayload);

      return ResponseHelper.created(
        newClassroom,
        'classroom',
        'Classroom created successfully'
      );
    } catch (error) {
      this.logger.error('Error creating classroom', {
        error: error.message,
        stack: error.stack,
        payload: { name, schoolId: schoolIdPayload, capacity, resources }
      });
      const message = error?.code ? error.message : "An error occurred while creating classroom";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
  async get({ __longToken }) {
    try {
      const { role, schoolId } = __longToken;
      AuthorizationHelper.checkAuthorization({ role, schoolId }, ['superadmin', 'admin']);

      // Superadmin can see all classrooms, admin only their school's classrooms
      const query = role === 'superadmin'
        ? { deletedAt: null }
        : { schoolId, deletedAt: null };

      const classRooms = await this.mongomodels.classroom.find(query).exec();

      return ResponseHelper.successList(
        classRooms,
        'classroom',
        'Classrooms fetched successfully'
      );
    }
    catch (error) {
      this.logger.error('Error getting classrooms', {
        error: error.message,
        stack: error.stack,
      });
      const message = error?.code ? error.message : "An error occurred while getting classrooms";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async getById({ __longToken, __params }) {
    try {
      const { id } = __params;

      const { role, schoolId } = __longToken;

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        id
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      return ResponseHelper.successSingle(
        classRoom,
        'classroom',
        'Classroom fetched successfully'
      );
    } catch (error) {
      this.logger.error('Error getting classroom by id', {
        error: error.message,
        stack: error.stack,
        payload: { id: __params?.id }
      });
      const message = error?.code ? error.message : "An error occurred while getting classroom by id";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async update({ __longToken, __params, name, capacity, resources }) {
    try {
      const { id } = __params;

      const classroomPayload = { name, capacity, resources };
      let error = await this.validators.classroom.update(classroomPayload);
      if (error) return validationError(error[0].message);

      const { role, schoolId } = __longToken;

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        id
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      // Check for duplicate name if name is being updated
      if (name && name !== classRoom.name) {
        const existingClassroom = await QueryHelper.existsActive(
          this.mongomodels.classroom,
          { name, schoolId: classRoom.schoolId, _id: { $ne: QueryHelper.validateObjectId(id) } }
        );
        if (existingClassroom) {
          return conflictError('Classroom already exists. Please use a different name.');
        }
      }

      // Build update object (filter undefined values)
      const allowedFields = ['name', 'capacity', 'resources'];
      const updates = QueryHelper.buildUpdateObject(
        { name, capacity, resources },
        allowedFields
      );

      const updatedClassroom = await QueryHelper.updateActiveById(
        this.mongomodels.classroom,
        id,
        updates
      );

      if (!updatedClassroom) return notFoundError('Classroom not found');

      return ResponseHelper.successSingle(
        updatedClassroom,
        'classroom',
        'Classroom updated successfully'
      );
    }
    catch (error) {
      this.logger.error('Error updating classroom', {
        error: error.message,
        stack: error.stack,
        payload: { id: __params?.id, name, capacity, resources }
      });
      const message = error?.code ? error.message : "An error occurred while updating classroom";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }


  async delete({ __longToken, __params }) {
    try {
      const { id } = __params;

      const { role, schoolId } = __longToken;

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        id
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      const deletedClassroom = await QueryHelper.softDeleteById(
        this.mongomodels.classroom,
        id
      );
      if (!deletedClassroom) return notFoundError('Classroom not found');

      return ResponseHelper.deleted(id, 'Classroom deleted successfully');
    }
    catch (error) {
      this.logger.error('Error deleting classroom', {
        error: error.message,
        stack: error.stack,
        payload: { id: __params?.id }
      });
      const message = error?.code ? error.message : "An error occurred while deleting classroom";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async updateResource({ __longToken, __params, name, quantity, type, resourceId }) {
    try {
      const { id: classroomId } = __params;

      const { role, schoolId } = __longToken;

      const resourcesPayload = { name, quantity, type, id: resourceId };

      let error = await this.validators.classroom.updateResources(resourcesPayload);
      if (error) return validationError(error[0].message);

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        classroomId
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      const resource = classRoom.resources.id(resourceId);
      if (!resource) return notFoundError('Resource not found');

      // Update resource fields using buildUpdateObject
      const updates = QueryHelper.buildUpdateObject({ type, name, quantity }, ['type', 'name', 'quantity']);
      Object.assign(resource, updates);

      await classRoom.save();
      return ResponseHelper.successSingle(
        resource,
        'resource',
        'Classroom resource updated successfully'
      );
    } catch (error) {
      this.logger.error('Error updating resources', {
        error: error.message,
        stack: error.stack,
        payload: { id: classroomId, name, quantity, type, resourceId }
      });
      const message = error?.code ? error.message : "An error occurred while updating resources";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  async students({ __longToken, __params }) {
    try {
      const { id } = __params;

      const { role, schoolId } = __longToken;

      const classRoom = await QueryHelper.findActiveById(
        this.mongomodels.classroom,
        id
      );
      if (!classRoom) return notFoundError('Classroom not found');

      AuthorizationHelper.checkAuthorization(
        { role, schoolId },
        ['superadmin', 'admin'],
        classRoom.schoolId
      );

      const students = await this.mongomodels.student.find(
        QueryHelper.activeFilter({ classRoomId: id })
      ).exec();

      return ResponseHelper.successList(
        students,
        'student',
        'Students fetched successfully'
      );
    }
    catch (error) {
      this.logger.error('Error getting students', {
        error: error.message,
        stack: error.stack,
        payload: { id: __params?.id }
      });
      const message = error?.code ? error.message : "An error occurred while getting students";
      return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}