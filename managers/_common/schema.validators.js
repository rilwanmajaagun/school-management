const { default: mongoose } = require("mongoose");

module.exports = {
    'username': (data) => {
        if (data.trim().length < 3) {
            return false;
        }
        return true;
    },
    'isValidMongoId': (data) => {

        // Handle undefined/null/empty
        if (data === undefined || data === null || data === '') {
            return false;
        }

        // Convert to string for validation (handles numbers and other types)
        const idString = String(data).trim();

        // MongoDB ObjectId must be exactly 24 hex characters
        if (idString.length !== 24) {
            return false;
        }

        const isValid = mongoose.Types.ObjectId.isValid(idString);
        return isValid;
    },
}