# API Documentation

## Overview

The School Management System API provides RESTful endpoints for managing schools, classrooms, students, and users with role-based access control.

## Accessing API Documentation

### Swagger UI (Interactive Documentation)

Once the server is running, access the interactive API documentation at:

```
http://localhost:5111/api-docs
```

### OpenAPI JSON Specification

Get the raw OpenAPI 3.0 specification:

```
http://localhost:5111/api-docs.json
```

## API Base URL

```
http://localhost:5111/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

To obtain a token, use the login endpoint (no authentication required).

## API Endpoints

### Authentication

#### Login
- **POST** `/api/user/login`
- **Description**: Authenticate user and receive JWT token
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- **Response**: Returns user object and `longToken` (JWT)

### Users

#### Create User
- **POST** `/api/user/createUser`
- **Description**: Create a new user account
- **Auth Required**: Yes (Superadmin only)
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "role": "admin",
    "schoolId": "507f1f77bcf86cd799439011"
  }
  ```

#### Change Password
- **PATCH** `/api/user/changePassword`
- **Description**: Change user password
- **Auth Required**: Yes

### Schools

#### Create School
- **POST** `/api/school/createSchool`
- **Description**: Create a new school
- **Auth Required**: Yes (Superadmin only)
- **Request Body**:
  ```json
  {
    "name": "Kings Academy",
    "address": "123 Main Street",
    "email": "info@kingsacademy.com",
    "phone": "+1234567890",
    "website": "https://www.kingsacademy.com",
    "logo": "https://www.kingsacademy.com/logo.png"
  }
  ```

#### Get All Schools
- **GET** `/api/school/get`
- **Description**: Get all schools
- **Auth Required**: Yes (Superadmin only)

#### Get School by ID
- **GET** `/api/school/getById/{id}`
- **Description**: Get school details by ID
- **Auth Required**: Yes (Superadmin or Admin for their school)

#### Update School
- **PATCH** `/api/school/update/{id}`
- **Description**: Update school information
- **Auth Required**: Yes (Superadmin only)

#### Delete School
- **DELETE** `/api/school/delete/{id}`
- **Description**: Soft delete a school
- **Auth Required**: Yes (Superadmin only)

#### Assign Admin to School
- **POST** `/api/school/assignAdmin`
- **Description**: Assign an admin user to a school
- **Auth Required**: Yes (Superadmin only)
- **Request Body**:
  ```json
  {
    "userId": "507f1f77bcf86cd799439011",
    "schoolId": "507f1f77bcf86cd799439011"
  }
  ```

### Classrooms

#### Create Classroom
- **POST** `/api/classroom/create`
- **Description**: Create a new classroom
- **Auth Required**: Yes (Superadmin or Admin)
- **Request Body**:
  ```json
  {
    "name": "Math 101",
    "schoolId": "507f1f77bcf86cd799439011",
    "capacity": 30,
    "resources": [
      {
        "type": "book",
        "name": "Mathematics Textbook",
        "quantity": 25
      }
    ]
  }
  ```

#### Get All Classrooms
- **GET** `/api/classroom/get`
- **Description**: Get all classrooms (Superadmin sees all, Admin sees only their school's)
- **Auth Required**: Yes

#### Get Classroom by ID
- **GET** `/api/classroom/getById/{id}`
- **Description**: Get classroom details by ID
- **Auth Required**: Yes

#### Update Classroom
- **PATCH** `/api/classroom/update/{id}`
- **Description**: Update classroom information
- **Auth Required**: Yes

#### Delete Classroom
- **DELETE** `/api/classroom/delete/{id}`
- **Description**: Soft delete a classroom
- **Auth Required**: Yes

#### Update Classroom Resource
- **PATCH** `/api/classroom/updateResource/{id}`
- **Description**: Update a specific resource in a classroom
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "resourceId": "507f1f77bcf86cd799439011",
    "name": "Updated Textbook",
    "type": "book",
    "quantity": 30
  }
  ```

#### Get Students in Classroom
- **GET** `/api/classroom/students/{id}`
- **Description**: Get all students enrolled in a classroom
- **Auth Required**: Yes

### Students

#### Enroll Student
- **POST** `/api/student/enroll`
- **Description**: Enroll a new student in a classroom
- **Auth Required**: Yes (Superadmin or Admin)
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1234567890",
    "gender": "female",
    "dateOfBirth": "2005-05-15",
    "classRoomId": "507f1f77bcf86cd799439011"
  }
  ```

#### Get Student by ID
- **GET** `/api/student/getById/{id}`
- **Description**: Get student details by ID
- **Auth Required**: Yes

#### Get Students by Classroom ID
- **GET** `/api/student/getByClassroomId/{id}`
- **Description**: Get all students enrolled in a specific classroom
- **Auth Required**: Yes

#### Update Student
- **PATCH** `/api/student/update/{id}`
- **Description**: Update student information (can transfer to different classroom)
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1234567890",
    "gender": "female",
    "dateOfBirth": "2005-05-15",
    "classRoomId": "507f1f77bcf86cd799439011"
  }
  ```

#### Transfer Student
- **PATCH** `/api/student/transfer/{id}`
- **Description**: Transfer student from one classroom to another
- **Auth Required**: Yes (Superadmin can transfer across schools, Admin only within school)
- **Request Body**:
  ```json
  {
    "targetClassroomId": "507f1f77bcf86cd799439011"
  }
  ```

#### Delete Student
- **DELETE** `/api/student/delete/{id}`
- **Description**: Soft delete a student
- **Auth Required**: Yes

## Response Format

### Success Response
```json
{
  "ok": true,
  "code": 200,
  "data": {
    "school": { ... }
  },
  "message": "School fetched successfully"
}
```

### Error Response
```json
{
  "ok": false,
  "code": 400,
  "errors": ["Validation error message"],
  "message": "Validation error message"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized
- `403` - Forbidden (Authorization failed)
- `404` - Not Found
- `409` - Conflict (Duplicate or capacity exceeded)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error

## Role-Based Access Control

### Superadmin
- Full system access
- Can create schools, users
- Can access all schools, classrooms, students
- Can transfer students across schools

### Admin (School Administrator)
- Limited to their assigned school
- Can manage classrooms and students within their school
- Cannot transfer students to different schools
- Cannot create schools or other admins

## Rate Limiting

API requests are rate-limited:
- **Window**: 15 minutes (900000ms)
- **Max Requests**: 100 per window per IP
- **Response**: 429 Too Many Requests when exceeded

## Examples

### Example: Login and Get Schools

```bash
# 1. Login
curl -X POST http://localhost:5111/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin1@gmail.com",
    "password": "Qgubinl_653nop"
  }'

# Response includes longToken
# 2. Use token to get schools
curl -X GET http://localhost:5111/api/school/get \
  -H "Authorization: Bearer <your-token>"
```

### Example: Create School

```bash
curl -X POST http://localhost:5111/api/school/createSchool \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kings Academy",
    "address": "123 Main Street",
    "email": "info@kingsacademy.com",
    "phone": "+1234567890"
  }'
```

### Example: Enroll Student

```bash
curl -X POST http://localhost:5111/api/student/enroll \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1234567890",
    "gender": "female",
    "dateOfBirth": "2005-05-15",
    "classRoomId": "507f1f77bcf86cd799439011"
  }'
```

## Testing

Use the Swagger UI at `/api-docs` to test endpoints interactively. You can:
- View all available endpoints
- See request/response schemas
- Test endpoints directly from the browser
- Authenticate using the "Authorize" button

## Additional Resources

- **Swagger UI**: `http://localhost:5111/api-docs`
- **OpenAPI Spec**: `http://localhost:5111/api-docs.json`
- **Static Files**: `http://localhost:5111/static`

