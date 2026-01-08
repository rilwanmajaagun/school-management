const bcrypt = require("bcrypt");
const { omit } = require('lodash');
const { StatusCodes } = require('http-status-codes');
const {
    conflictError,
    validationError,
    notFoundError,
    genericError,
} = require('../../_common/error.handler');
const AuthorizationHelper = require("../../_common/authorization.helper");
const QueryHelper = require("../../_common/query.helper");
const ResponseHelper = require("../../_common/response.helper");

module.exports = class User {

    constructor({ utils, cache, config, cortex, managers, validators, mongomodels, logger } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.logger = logger;
        this.validators = validators;
        this.mongomodels = mongomodels;
        this.tokenManager = managers.token;
        this.usersCollection = "users";
        this.httpExposed = [
            'post=createUser',
            'post=login',
            'patch=changePassword',
            'get=get',
        ];
    }

    async createUser({ __longToken, name, email, password, role, schoolId }) {
        try {
            const { role: tokenRole, schoolId: tokenSchoolId } = __longToken;
            AuthorizationHelper.checkAuthorization(
                { role: tokenRole, schoolId: tokenSchoolId },
                ['superadmin']
            );


            const userPayload = { name, email, password, role, schoolId };
            const validationResult = await this.validators.user.createUser(userPayload);
            if (validationResult) return validationError(validationResult[0].message);


            const existingUser = await QueryHelper.existsActive(
                this.mongomodels.user,
                { email }
            );
            if (existingUser) {
                return conflictError('User already exists');
            }

            // Verify school exists if schoolId provided
            if (schoolId) {
                const school = await QueryHelper.findActiveById(
                    this.mongomodels.school,
                    schoolId
                );
                if (!school) {
                    return notFoundError('School not found');
                }
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const createdUser = await this.mongomodels.user.create({
                ...userPayload,
                password: hashedPassword,
                schoolId: schoolId || null,
            });

            const userObj = createdUser.toObject();
            const longToken = this.tokenManager.genLongToken({
                userId: userObj._id?.toString(),
                role: userObj.role,
                schoolId: userObj?.schoolId?.toString()
            });

            return ResponseHelper.success(
                {
                    user: omit(userObj, 'password'),
                    longToken
                },
                'User created successfully',
                StatusCodes.CREATED
            );
        } catch (error) {
            this.logger.error('Error creating user', {
                error: error.message,
                stack: error.stack,
                payload: { name, email, password, role, schoolId }
            });
            const message = error?.code ? error.message : "An error occurred while creating user";
            return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
    async login({ email, password }) {
        try {
            const loginPayload = { email, password };
            const validationResult = await this.validators.user.login(loginPayload);
            if (validationResult) return validationError(validationResult[0].message);

            // Find user by email
            const user = await this.mongomodels.user.findOne(
                QueryHelper.activeFilter({ email })
            ).exec();

            if (!user) {
                return validationError('Invalid email or password');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return validationError('Invalid email or password');
            }

            // Generate token
            const userObj = user.toObject();
            const longToken = this.tokenManager.genLongToken({
                userId: userObj._id?.toString(),
                role: userObj.role,
                schoolId: userObj?.schoolId?.toString()
            });

            return ResponseHelper.success(
                {
                    user: omit(userObj, 'password'),
                    longToken
                },
                'Login successful'
            );
        } catch (error) {
            this.logger.error('Error logging in', {
                error: error.message,
                stack: error.stack,
                payload: { email, password }
            });
            const message = error?.code ? error.message : "An error occurred while logging in";
            return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
    async changePassword({ __longToken, oldPassword, newPassword }) {
        try {
            const changePasswordPayload = { password: oldPassword, newPassword };
            const validationResult = await this.validators.user.changePassword(changePasswordPayload);
            if (validationResult) return validationError(validationResult[0].message);

            // Get user
            const user = await QueryHelper.findActiveById(
                this.mongomodels.user,
                __longToken.userId
            );
            if (!user) {
                return notFoundError('User not found');
            }

            // Verify old password
            const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isPasswordValid) {
                return validationError('Invalid old password');
            }

            // Check if new password is different
            if (newPassword === oldPassword) {
                return validationError('New password cannot be the same as old password');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            const updates = {
                password: hashedNewPassword,
                isTemporaryPassword: false
            };

            const updatedUser = await QueryHelper.updateActiveById(
                this.mongomodels.user,
                __longToken.userId,
                updates
            );

            if (!updatedUser) return notFoundError('User not found');

            return ResponseHelper.success(
                { userId: updatedUser._id },
                'Password changed successfully'
            );
        } catch (error) {
            this.logger.error('Error changing password', {
                error: error.message,
                stack: error.stack,
                payload: { oldPassword, newPassword }
            });
            const message = error?.code ? error.message : "An error occurred while changing password";
            return genericError(message, error?.code || StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    async get({ __longToken }) {
        try {
            const { role, schoolId, userId } = __longToken;

            let users;
            if (role === 'superadmin') {
                // Superadmin can fetch all users
                users = await this.mongomodels.user.find();
            } else if (role === 'admin') {
                // Admin can fetch only users belonging to their school
                if (!schoolId) {
                    return genericError('School ID is required for admin', StatusCodes.FORBIDDEN);
                }
                users = await this.mongomodels.user.find({ schoolId });
            } else {
                // Other roles can only see themselves
                users = await this.mongomodels.user.find({ _id: userId });
            }

            return ResponseHelper.success(users, 'Users fetched successfully');
        } catch (error) {
            this.logger.error('Error getting users', { error: error.message, stack: error.stack });
            return genericError(error.message, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

}
