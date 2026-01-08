const { StatusCodes } = require('http-status-codes');

/**
 * Response Helper - Standardized API response formatting
 */
class ResponseHelper {
  /**
   * Create success response
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} code - HTTP status code
   * @returns {Object} - Formatted response
   */
  static success(data, message, code = StatusCodes.OK) {
    return {
      ok: true,
      code,
      data,
      message
    };
  }

  /**
   * Create success response for single entity
   * @param {Object} entity - Entity object
   * @param {string} entityName - Name of the entity (singular)
   * @param {string} message - Success message
   * @param {number} code - HTTP status code
   * @returns {Object} - Formatted response
   */
  static successSingle(entity, entityName, message, code = StatusCodes.OK) {
    return this.success({ [entityName]: entity }, message, code);
  }

  /**
   * Create success response for multiple entities
   * @param {Array} entities - Array of entities
   * @param {string} entityName - Name of the entity (singular)
   * @param {string} message - Success message
   * @param {number} code - HTTP status code
   * @returns {Object} - Formatted response
   */
  static successList(entities, entityName, message, code = StatusCodes.OK) {
    const pluralName = `${entityName}s`;
    return this.success({ [pluralName]: entities }, message, code);
  }

  /**
   * Create success response for created entity
   * @param {Object} entity - Created entity
   * @param {string} entityName - Name of the entity (singular)
   * @param {string} message - Success message
   * @returns {Object} - Formatted response
   */
  static created(entity, entityName, message) {
    return this.successSingle(entity, entityName, message, StatusCodes.CREATED);
  }

  /**
   * Create success response for deleted entity
   * @param {string|ObjectId} id - Deleted entity ID
   * @param {string} message - Success message
   * @returns {Object} - Formatted response
   */
  static deleted(id, message) {
    return this.success({ id }, message, StatusCodes.OK);
  }
}

module.exports = ResponseHelper;

