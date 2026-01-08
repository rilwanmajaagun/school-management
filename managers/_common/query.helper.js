const { default: mongoose } = require('mongoose');

class QueryHelper {
  /**
   * Validate MongoDB ObjectId format
   * @param {string} id - The ID to validate
   * @returns {ObjectId|null} - Valid ObjectId or null
   */
  static validateObjectId(id) {
    if (!id) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Build query filter for active (non-deleted) documents
   * @param {Object} additionalFilters - Additional filters to merge
   * @returns {Object} - Query filter object
   */
  static activeFilter(additionalFilters = {}) {
    return {
      deletedAt: null,
      ...additionalFilters
    };
  }

  /**
   * Find active document by ID
   * @param {Model} Model - Mongoose model
   * @param {string|ObjectId} id - Document ID
   * @param {Object} projection - Fields to project
   * @returns {Promise<Document|null>} - Found document or null
   */
  static async findActiveById(Model, id, projection = null) {
    const objectId = this.validateObjectId(id);
    if (!objectId) return null;

    const query = Model.findOne({ _id: objectId, deletedAt: null });
    if (projection) {
      query.select(projection);
    }
    return query.exec();
  }

  /**
   * Update document atomically using findOneAndUpdate
   * @param {Model} Model - Mongoose model
   * @param {string|ObjectId} id - Document ID
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Document|null>} - Updated document or null
   */
  static async updateActiveById(Model, id, updateData, options = {}) {
    const objectId = this.validateObjectId(id);
    if (!objectId) return null;

    const defaultOptions = {
      new: true,
      runValidators: true,
      ...options
    };

    return Model.findOneAndUpdate(
      { _id: objectId, deletedAt: null },
      { $set: updateData },
      defaultOptions
    ).exec();
  }

  /**
   * Soft delete document (set deletedAt)
   * @param {Model} Model - Mongoose model
   * @param {string|ObjectId} id - Document ID
   * @returns {Promise<Document|null>} - Updated document or null
   */
  static async softDeleteById(Model, id) {
    return this.updateActiveById(Model, id, { deletedAt: new Date() });
  }

  /**
   * Count active documents matching filter
   * @param {Model} Model - Mongoose model
   * @param {Object} filter - Query filter
   * @returns {Promise<number>} - Count of documents
   */
  static async countActive(Model, filter = {}) {
    return Model.countDocuments({
      deletedAt: null,
      ...filter
    }).exec();
  }

  /**
   * Check if document exists and is active
   * @param {Model} Model - Mongoose model
   * @param {Object} filter - Query filter
   * @returns {Promise<boolean>} - True if exists and active
   */
  static async existsActive(Model, filter) {
    const count = await Model.countDocuments({
      deletedAt: null,
      ...filter
    }).limit(1).exec();
    return count > 0;
  }

  /**
   * Build update object from payload, filtering undefined values
   * @param {Object} payload - Update payload
   * @param {Array<string>} allowedFields - Fields allowed to be updated
   * @returns {Object} - Cleaned update object
   */
  static buildUpdateObject(payload, allowedFields = null) {
    const updates = {};

    Object.keys(payload).forEach(key => {
      if (payload[key] !== undefined) {
        if (!allowedFields || allowedFields.includes(key)) {
          updates[key] = payload[key];
        }
      }
    });

    return updates;
  }
}

module.exports = QueryHelper;

