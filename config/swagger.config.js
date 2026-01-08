const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger/OpenAPI Configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System API',
      version: '1.0.0',
      description: 'RESTful API for managing schools, classrooms, students, and users with role-based access control',
      contact: {
        name: 'API Support',
        email: 'support@schoolmanagement.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5111',
        description: 'Development server',
      },
      {
        url: 'https://school-management-8htz.onrender.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        tokenAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'token',
          description: 'JWT token obtained from login endpoint. Include in headers as: token: <your-jwt-token>',
        },
      },
      schemas: {
        // Common Response Schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            code: {
              type: 'integer',
              example: 200,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: false,
            },
            code: {
              type: 'integer',
              example: 400,
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        // User Schemas
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            role: {
              type: 'string',
              enum: ['superadmin', 'admin'],
              example: 'admin',
            },
            schoolId: {
              type: 'string',
              nullable: true,
              example: '507f1f77bcf86cd799439011',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            code: {
              type: 'integer',
              example: 200,
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                longToken: {
                  type: 'string',
                  description: 'JWT token for authentication',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
          },
        },
        // School Schemas
        School: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Kings Academy',
            },
            address: {
              type: 'string',
              example: '123 Main Street, City, State',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@kingsacademy.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            website: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://www.kingsacademy.com',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://www.kingsacademy.com/logo.png',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Classroom Schemas
        Classroom: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Math 101',
            },
            schoolId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            capacity: {
              type: 'integer',
              example: 30,
            },
            resources: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Resource',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Resource: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            type: {
              type: 'string',
              example: 'book',
            },
            name: {
              type: 'string',
              example: 'Mathematics Textbook',
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              example: 25,
            },
          },
        },
        // Student Schemas
        Student: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Jane Smith',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.smith@example.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'female',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              example: '2005-05-15',
            },
            schoolId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            classRoomId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Request Schemas
        CreateSchoolRequest: {
          type: 'object',
          required: ['name', 'address', 'email', 'phone'],
          properties: {
            name: {
              type: 'string',
              example: 'Kings Academy',
            },
            address: {
              type: 'string',
              example: '123 Main Street, City, State',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@kingsacademy.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://www.kingsacademy.com',
            },
            logo: {
              type: 'string',
              format: 'uri',
              example: 'https://www.kingsacademy.com/logo.png',
            },
          },
        },
        CreateClassroomRequest: {
          type: 'object',
          required: ['name', 'schoolId', 'capacity'],
          properties: {
            name: {
              type: 'string',
              example: 'Math 101',
            },
            schoolId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            capacity: {
              type: 'integer',
              minimum: 1,
              example: 30,
            },
            resources: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Resource',
              },
            },
          },
        },
        EnrollStudentRequest: {
          type: 'object',
          required: ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'classRoomId'],
          properties: {
            name: {
              type: 'string',
              example: 'Jane Smith',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.smith@example.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'female',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
              example: '2005-05-15',
            },
            classRoomId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123',
            },
            role: {
              type: 'string',
              enum: ['superadmin', 'admin'],
              example: 'admin',
            },
            schoolId: {
              type: 'string',
              nullable: true,
              example: '507f1f77bcf86cd799439011',
            },
          },
        },
        TransferStudentRequest: {
          type: 'object',
          required: ['targetClassroomId'],
          properties: {
            targetClassroomId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
          },
        },
      },
    },
    security: [
      {
        tokenAuth: [],
      },
    ],
    tags: [
      {
        name: 'User',
        description: 'User management endpoints',
      },
      {
        name: 'Schools',
        description: 'School management endpoints',
      },
      {
        name: 'Classrooms',
        description: 'Classroom management endpoints',
      },
      {
        name: 'Students',
        description: 'Student management endpoints',
      },
    ],
  },
  apis: ['./managers/entities/**/*.js'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;

