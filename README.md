# school-management

A school management system application that provides API endpoints for managing schools, classrooms, students, and users (superadmin and admin roles).

---

## Getting Started

To get a copy of this project up and running on your local machine for testing and development, you would need to have a minimum of the listed prerequisites installed on your local machine.

## Prerequisites

1. Node.js (v8.12.0 or higher) and npm (6.4.1 or higher) installed on your local machine. Run node -v and npm -v in your terminal to confirm that you have them installed

2. GIT and Bash

3. Docker and Docker Compose (for running MongoDB and Redis locally)

### Node
- #### Node installation on Windows

Go to [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might might be dependent on it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, by running the following command.

      $ sudo apt install nodejs
      $ sudo apt install npm

If the installation was successful, you should be able to run the following command.

    $ node --version
    v20.11.0

    $ npm --version
    6.9.0

To update your `npm`, run the following command.

    $ npm install npm -g

---

## Project Install

    $ git clone https://github.com/rilwammajaagun/school-management.git
    $ cd school-management
    $ npm install

## Configure app

Create a `.env` file and add the environment variables described in the `.env.example` file.

## Running the project

### Using Docker Compose (Recommended)

The project includes a `docker-compose.yml` file to help start local development easily. This will start MongoDB and Redis containers.

    $ docker-compose up -d

Then start the application:

    $ npm run dev (development)
    $ npm start (production)

### Without Docker

Ensure MongoDB and Redis are running locally, then:

    $ npm run dev (development)
    $ npm start (production)

## Seeding Database

To seed the database with a default superadmin user for local development:

    $ npm run seed

This will create a superadmin user with the following default credentials:
- **Email**: `admin@example.com` (or set `SUPERADMIN_EMAIL` env variable)
- **Password**: `admin123` (or set `SUPERADMIN_PASSWORD` env variable)
- **Name**: `Super Admin` (or set `SUPERADMIN_NAME` env variable)

**Note**: The seed script will skip creating the superadmin if one already exists with the same email.

## Running tests

    $ npm run test

## Test Coverage
![alt text](<Screenshot 2026-01-09 at 9.26.33 AM.png>)

## Technologies

- NodeJS
- Express
- MongoDB
- Redis
- Supertest and Mocha
- Postman

## API Documentation

### Interactive API Documentation (Swagger UI)

The API includes comprehensive OpenAPI 3.0 documentation accessible via Swagger UI:

**Access Swagger UI**: `http://localhost:5111/api-docs`

**OpenAPI JSON Spec**: `http://localhost:5111/api-docs.json`

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive endpoint testing
- Request/response schema definitions
- Authentication support (JWT Bearer tokens)
- Example requests and responses

### API Endpoints

All API endpoints follow the pattern: `/api/:moduleName/:fnName/:id?`

**Example endpoints:**
- `POST /api/user/login` - User authentication
- `POST /api/school/createSchool` - Create school
- `GET /api/school/get` - Get all schools
- `GET /api/school/getById/:id` - Get school by ID
- `POST /api/classroom/create` - Create classroom
- `POST /api/student/enroll` - Enroll student
- `PATCH /api/student/transfer/:id` - Transfer student

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or visit the Swagger UI.

### Postman Collection
- Postman collection: (Available via Swagger UI export) 

## API Flow
- Creating Users:
To create additional users, you must provide a superadmin token for authorization. 

**To seed a superadmin user for local development, run:**
```bash
npm run seed
```

This will create a superadmin with default credentials:
- Email: `admin@example.com`
- Password: `admin123`

You can override these defaults by setting environment variables:
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`
- `SUPERADMIN_NAME`

**Note**: The seed script checks if a superadmin already exists and will skip creation if found.


## Database Schema Documentation

This section describes the database models for the application. Each schema is defined using Mongoose, with relationships and field-level constraints.

**Note**: For detailed schema reference, see the `mongoModel` files in the `managers/entities/` directory.

---

## User Schema

The `User` schema represents the users in the system, which can be either `superadmin` or `admin`.

| Field                 | Type       | Description                              | Constraints               |
|-----------------------|------------|------------------------------------------|---------------------------|
| `name`                | `String`   | Full name of the user                    | Required                  |
| `email`               | `String`   | User's email address                     | Required, Unique, Indexed |
| `password`            | `String`   | User's hashed password                   | Required                  |
| `isTemporaryPassword` | `Boolean`  | Indicates if the password is temporary   | Default: `false`          |
| `role`                | `String`   | Role of the user (`superadmin`, `admin`) | Required, Enum            |
| `schoolId`            | `ObjectId` | Reference to the associated `School`     | Optional                  |
| `createdAt`           | `Date`     | Record creation timestamp                | Auto-generated            |
| `updatedAt`           | `Date`     | Last update timestamp                    | Auto-generated            |
| `deletedAt`           | `Date`     | Soft delete timestamp                    | Default: `null`           |

**Relationships**:
- Each `User` may be associated with one `School` (via `schoolId`).

---

## School Schema

The `School` schema represents the educational institutions managed by the system.

| Field       | Type     | Description               | Constraints                        |
|-------------|----------|---------------------------|------------------------------------|
| `name`      | `String` | Name of the school        | Required, Unique, Indexed, Trimmed |
| `address`   | `String` | Address of the school     | Required, Trimmed                  |
| `email`     | `String` | Contact email address     | Required, Trimmed                  |
| `phone`     | `String` | Contact phone number      | Required, Trimmed                  |
| `website`   | `String` | School website URL        | Optional, Trimmed                  |
| `logo`      | `String` | School logo URL           | Optional, Trimmed                  |
| `createdAt` | `Date`   | Record creation timestamp | Auto-generated                     |
| `updatedAt` | `Date`   | Last update timestamp     | Auto-generated                     |
| `deletedAt` | `Date`   | Soft delete timestamp     | Default: `null`                    |

**Relationships**:
- Each `School` can have multiple `Classrooms` (referenced via `schoolId` in Classroom).
- Each `School` can have multiple `Students` (referenced via `schoolId` in Student).
- Each `School` can have multiple `admins` (users with the `admin` role via `schoolId`).

---

## Classroom Schema

The `Classroom` schema represents a class within a school.

| Field       | Type       | Description                                | Constraints                       |
|-------------|------------|--------------------------------------------|-----------------------------------|
| `schoolId`  | `ObjectId` | Reference to the associated `School`       | Required, Indexed                 |
| `name`      | `String`   | Name of the classroom                      | Required, Trimmed                 |
| `capacity`  | `Number`   | Maximum number of students                 | Required                          |
| `resources` | `Array`    | List of resources (e.g., books, computers) | Embedded Schema: `ResourceSchema` |
| `createdAt` | `Date`     | Record creation timestamp                  | Auto-generated                    |
| `updatedAt` | `Date`     | Last update timestamp                      | Auto-generated                    |
| `deletedAt` | `Date`     | Soft delete timestamp                      | Default: `null`                   |

**Resource Schema** (Embedded):

| Field      | Type     | Description                                 | Constraints        |
|------------|----------|---------------------------------------------|--------------------|
| `type`     | `String` | Type of resource (e.g., "Book", "Computer") | Required, Trimmed  |
| `name`     | `String` | Name of the resource                        | Required, Trimmed  |
| `quantity` | `Number` | Quantity of the resource                    | Required, Min: `0` |

**Relationships**:
- Each `Classroom` belongs to one `School` (via `schoolId`).
- Each `Classroom` can have multiple `Students` (referenced via `classRoomId` in Student).

---

## Student Schema

The `Student` schema represents students enrolled in classrooms.

| Field         | Type       | Description                             | Constraints                               |
|---------------|------------|-----------------------------------------|-------------------------------------------|
| `name`        | `String`   | Full name of the student                | Required, Trimmed                         |
| `email`       | `String`   | Student's contact email                 | Required, Trimmed                         |
| `phone`       | `String`   | Student's contact phone                 | Required, Trimmed                         |
| `dateOfBirth` | `Date`     | Student's date of birth                 | Required                                  |
| `gender`      | `String`   | Gender of the student                   | Required, Enum: `male`, `female`, `other` |
| `schoolId`    | `ObjectId` | Reference to the associated `School`    | Required, Indexed                         |
| `classRoomId` | `ObjectId` | Reference to the associated `Classroom` | Required, Indexed                         |
| `createdAt`   | `Date`     | Record creation timestamp               | Auto-generated                            |
| `updatedAt`   | `Date`     | Last update timestamp                   | Auto-generated                            |
| `deletedAt`   | `Date`     | Soft delete timestamp                   | Default: `null`, Indexed                  |

**Indexes**:
- Compound unique index on `email` + `schoolId` ensures email uniqueness per school.

**Relationships**:
- Each `Student` belongs to one `School` (via `schoolId`).
- Each `Student` belongs to one `Classroom` (via `classRoomId`).

---

## Copyright

Copyright (c) 2025 Rilwan Majaagun

---

## Additional Notes

- The project includes `docker-compose.yml` to help start local development easily
- Use `mongoModel` files in `managers/entities/` for reference of the Database schema
- All schemas use soft delete pattern via `deletedAt` field
- Timestamps (`createdAt`, `updatedAt`) are automatically managed by Mongoose

