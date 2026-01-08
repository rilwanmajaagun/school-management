const swaggerSpec = require('../../config/swagger.config');
const { StatusCodes } = require('http-status-codes');

/**
 * Swagger Manager - Generates OpenAPI documentation dynamically from exposed endpoints
 */
module.exports = class SwaggerManager {
  constructor({ managers, config }) {
    this.managers = managers;
    this.config = config;
    this.swaggerSpec = swaggerSpec;
  }

  /**
   * Generate OpenAPI paths from exposed endpoints
   */
  generatePaths() {
    const paths = {};

    // Scan all managers for httpExposed methods
    Object.keys(this.managers).forEach(moduleName => {
      const manager = this.managers[moduleName];

      if (!manager?.httpExposed) return;

      manager.httpExposed.forEach(endpoint => {
        const [method, fnName] = endpoint.split('=');
        const httpMethod = method || 'post';

        // Generate path based on route pattern: /api/:moduleName/:fnName/:id?
        const needsId = this.requiresId(fnName, httpMethod);
        const path = needsId
          ? `/api/${moduleName}/${fnName}/{id}`
          : `/api/${moduleName}/${fnName}`;

        if (!paths[path]) {
          paths[path] = {};
        }

        // Generate OpenAPI path item based on method
        const pathItem = this.generatePathItem(moduleName, fnName, httpMethod);
        paths[path][httpMethod] = pathItem;
      });
    });

    return paths;
  }

  /**
   * Check if endpoint requires ID parameter
   */
  requiresId(fnName, method) {
    // Methods that don't require ID even if they use GET/PATCH/DELETE
    const noIdMethods = ['changePassword', 'get', 'assignAdmin'];
    if (noIdMethods.includes(fnName)) {
      return false;
    }

    const idRequiredMethods = ['getById', 'update', 'delete', 'transfer', 'getByClassroomId', 'students'];
    return idRequiredMethods.includes(fnName) || method === 'get' || method === 'patch' || method === 'delete';
  }

  /**
   * Generate OpenAPI path item for an endpoint
   */
  generatePathItem(moduleName, fnName, method) {
    const tag = this.getTag(moduleName);
    const summary = this.getSummary(moduleName, fnName);
    const description = this.getDescription(moduleName, fnName);
    const operationId = `${moduleName}_${fnName}`;

    const pathItem = {
      tags: [tag],
      summary,
      description,
      operationId,
      security: this.getSecurity(moduleName, fnName),
      responses: this.getResponses(moduleName, fnName, method),
    };

    // Add parameters for ID-based endpoints
    if (this.requiresId(fnName, method)) {
      pathItem.parameters = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: `${this.getEntityName(moduleName)} ID`,
        },
      ];
    }

    // Add request body for POST/PATCH methods
    if (method === 'post' || method === 'patch') {
      pathItem.requestBody = this.getRequestBody(moduleName, fnName, method);
    }

    return pathItem;
  }

  /**
   * Get tag for module
   */
  getTag(moduleName) {
    const tagMap = {
      user: 'User',
      school: 'Schools',
      classroom: 'Classrooms',
      student: 'Students',
    };
    return tagMap[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  }

  /**
   * Get entity name from module name
   */
  getEntityName(moduleName) {
    const nameMap = {
      user: 'User',
      school: 'School',
      classroom: 'Classroom',
      student: 'Student',
    };
    return nameMap[moduleName] || moduleName;
  }

  /**
   * Get summary for endpoint
   */
  getSummary(moduleName, fnName) {
    const summaries = {
      user: {
        createUser: 'Create a new user',
        login: 'User login',
        changePassword: 'Change user password',
        get: 'Get all user(s)',
      },
      school: {
        createSchool: 'Create a new school',
        get: 'Get all schools',
        getById: 'Get school by ID',
        update: 'Update school',
        delete: 'Delete school',
        assignAdmin: 'Assign admin to school',
      },
      classroom: {
        create: 'Create a new classroom',
        get: 'Get all classrooms',
        getById: 'Get classroom by ID',
        update: 'Update classroom',
        delete: 'Delete classroom',
        updateResource: 'Update classroom resource',
        students: 'Get students in classroom',
      },
      student: {
        enroll: 'Enroll a new student',
        getById: 'Get student by ID',
        getByClassroomId: 'Get students by classroom ID',
        update: 'Update student',
        transfer: 'Transfer student to different classroom',
        delete: 'Delete student',
      },
    };
    return summaries[moduleName]?.[fnName] || `${fnName} ${moduleName}`;
  }

  /**
   * Get description for endpoint
   */
  getDescription(moduleName, fnName) {
    const descriptions = {
      user: {
        createUser: 'Create a new user account. Requires superadmin role.',
        login: 'Authenticate user and receive JWT token.',
        changePassword: 'Change user password. Requires authentication.',
        get: 'Get all users by super admin, admin can only get their own users.',
      },
      school: {
        createSchool: 'Create a new school. Requires superadmin role.',
        get: 'Get all schools. Requires superadmin role.',
        getById: 'Get school details by ID. Superadmin can access any school, admin can only access their assigned school.',
        update: 'Update school information. Requires superadmin role.',
        delete: 'Soft delete a school. Requires superadmin role.',
        assignAdmin: 'Assign an admin user to a school. Requires superadmin role.',
      },
      classroom: {
        create: 'Create a new classroom. Requires superadmin or admin role.',
        get: 'Get all classrooms. Superadmin sees all, admin sees only their school\'s classrooms.',
        getById: 'Get classroom details by ID.',
        update: 'Update classroom information.',
        delete: 'Soft delete a classroom.',
        updateResource: 'Update a specific resource in a classroom.',
        students: 'Get all students enrolled in a classroom.',
      },
      student: {
        enroll: 'Enroll a new student in a classroom. Validates capacity and checks for duplicates.',
        getById: 'Get student details by ID.',
        getByClassroomId: 'Get all students enrolled in a specific classroom.',
        update: 'Update student information. Can transfer student to different classroom.',
        transfer: 'Transfer student from one classroom to another. Validates capacity and authorization.',
        delete: 'Soft delete a student.',
      },
    };
    return descriptions[moduleName]?.[fnName] || `${this.getSummary(moduleName, fnName)}.`;
  }

  /**
   * Get security requirements for endpoint
   */
  getSecurity(moduleName, fnName) {
    // Login endpoint doesn't require authentication
    if (moduleName === 'user' && fnName === 'login') {
      return [];
    }
    return [{ tokenAuth: [] }];
  }

  /**
   * Get request body schema
   */
  getRequestBody(moduleName, fnName, method) {
    const requestBodies = {
      user: {
        createUser: {
          $ref: '#/components/schemas/CreateUserRequest',
        },
        login: {
          $ref: '#/components/schemas/LoginRequest',
        },
        changePassword: {
          type: 'object',
          required: ['oldPassword', 'newPassword'],
          properties: {
            oldPassword: {
              type: 'string',
              format: 'password',
            },
            newPassword: {
              type: 'string',
              format: 'password',
            },
          },
        },
      },
      school: {
        createSchool: {
          $ref: '#/components/schemas/CreateSchoolRequest',
        },
        update: {
          $ref: '#/components/schemas/CreateSchoolRequest',
        },
        assignAdmin: {
          type: 'object',
          required: ['userId', 'schoolId'],
          properties: {
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            schoolId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
          },
        },
      },
      classroom: {
        create: {
          $ref: '#/components/schemas/CreateClassroomRequest',
        },
        update: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            capacity: {
              type: 'integer',
            },
            resources: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Resource',
              },
            },
          },
        },
        updateResource: {
          type: 'object',
          required: ['resourceId'],
          properties: {
            resourceId: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            type: {
              type: 'string',
            },
            quantity: {
              type: 'integer',
            },
          },
        },
      },
      student: {
        enroll: {
          $ref: '#/components/schemas/EnrollStudentRequest',
        },
        update: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phone: {
              type: 'string',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
            },
            classRoomId: {
              type: 'string',
            },
          },
        },
        transfer: {
          $ref: '#/components/schemas/TransferStudentRequest',
        },
      },
    };

    const schema = requestBodies[moduleName]?.[fnName];
    if (!schema) return null;

    return {
      required: true,
      content: {
        'application/json': {
          schema,
        },
      },
    };
  }

  /**
   * Get response schemas
   */
  getResponses(moduleName, fnName, method) {
    const entityName = this.getEntityName(moduleName);
    const isList = fnName === 'get' || fnName === 'getByClassroomId' || fnName === 'students';
    const isCreate = method === 'post' && fnName !== 'login';
    const isDelete = method === 'delete' || fnName === 'delete';

    const responses = {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse',
            },
            examples: {
              single: {
                value: {
                  ok: true,
                  code: StatusCodes.OK,
                  data: {
                    [moduleName]: {},
                  },
                  message: `${entityName} fetched successfully`,
                },
              },
              list: {
                value: {
                  ok: true,
                  code: StatusCodes.OK,
                  data: {
                    [`${moduleName}s`]: [],
                  },
                  message: `${entityName}s fetched successfully`,
                },
              },
            },
          },
        },
      },
      '201': {
        description: 'Created',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse',
            },
          },
        },
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '403': {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '404': {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '409': {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    };

    // Customize based on method
    if (isCreate) {
      responses['201'].description = `${entityName} created successfully`;
    } else if (isDelete) {
      responses['200'].description = `${entityName} deleted successfully`;
    } else if (isList) {
      responses['200'].description = `List of ${entityName}s`;
    }

    return responses;
  }

  /**
   * Get complete Swagger specification with generated paths
   */
  getSpec() {
    // Deep clone swagger spec
    const spec = structuredClone ? structuredClone(this.swaggerSpec) : JSON.parse(JSON.stringify(this.swaggerSpec));
    spec.paths = this.generatePaths();
    return spec;
  }
};

