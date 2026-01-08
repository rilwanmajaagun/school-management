/**
 * Capacity Helper - Business logic for capacity management
 */
class CapacityHelper {
  /**
   * Check if classroom has available capacity
   * @param {Model} StudentModel - Student mongoose model
   * @param {string|ObjectId} classRoomId - Classroom ID
   * @param {number} capacity - Classroom capacity
   * @param {string|ObjectId} excludeStudentId - Student ID to exclude from count (for updates)
   * @returns {Promise<{available: boolean, currentCount: number, capacity: number}>}
   */
  static async checkCapacity(StudentModel, classRoomId, capacity, excludeStudentId = null) {
    const filter = {
      classRoomId,
      deletedAt: null
    };

    // Exclude current student when updating/transferring
    if (excludeStudentId) {
      filter._id = { $ne: excludeStudentId };
    }

    const currentCount = await StudentModel.countDocuments(filter).exec();

    return {
      available: currentCount < capacity,
      currentCount,
      capacity
    };
  }

  /**
   * Validate capacity before enrollment/transfer
   * @param {Model} StudentModel - Student mongoose model
   * @param {string|ObjectId} classRoomId - Classroom ID
   * @param {number} capacity - Classroom capacity
   * @param {string|ObjectId} excludeStudentId - Student ID to exclude from count
   * @returns {Promise<null|string>} - Error message or null if capacity available
   */
  static async validateCapacity(StudentModel, classRoomId, capacity, excludeStudentId = null) {
    const capacityCheck = await this.checkCapacity(
      StudentModel,
      classRoomId,
      capacity,
      excludeStudentId
    );

    if (!capacityCheck.available) {
      return `Classroom is at full capacity (${capacityCheck.capacity} students)`;
    }

    return null;
  }
}

module.exports = CapacityHelper;

