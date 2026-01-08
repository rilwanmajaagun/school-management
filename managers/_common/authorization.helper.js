const { nonAuthorizedError } = require('./error.handler');

const AuthorizationHelper = {
  checkAuthorization: ({ role, schoolId }, allowedRoles, entitySchoolId = null) => {

    if (allowedRoles.length) {
      if (!allowedRoles.includes(role)) {
        throw nonAuthorizedError("Access denied");
      }
      if (role !== "superadmin" || !schoolId) {
        if (schoolId && entitySchoolId && !entitySchoolId.equals(schoolId)) {
          throw nonAuthorizedError("Access denied");
        }
      }
    }

  }
};

module.exports = AuthorizationHelper;