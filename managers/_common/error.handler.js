const {
  StatusCodes,
} = require('http-status-codes');

const errorHandlers = {
  conflictError: (message) => {
    return { ok: false, code: StatusCodes.CONFLICT, data: null, errors: [message], message };
  },
  validationError: (message) => {
    return { ok: false, code: StatusCodes.BAD_REQUEST, data: null, errors: [message], message };
  },

  notFoundError: (message) => {
    return { ok: false, code: StatusCodes.NOT_FOUND, data: null, errors: [message], message };
  },

  nonAuthorizedError: (message) => {
    return { ok: false, code: StatusCodes.FORBIDDEN, data: null, errors: [message], message };
  },

  tooManyRequestError: (message) => {
    return { ok: false, code: StatusCodes.TOO_MANY_REQUESTS, data: null, errors: [message], message };
  },

  genericError: (message, code = StatusCodes.INTERNAL_SERVER_ERROR) => {
    return { ok: false, code: code, data: null, errors: [message], message };
  },
};

module.exports = errorHandlers;