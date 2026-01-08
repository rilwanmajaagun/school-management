const { default: mongoose } = require("mongoose");

module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next }) => {
        const params = {
            ...req.params,  // moduleName, fnName, id (if present)
        };

        // Validate ID if present
        if (params.id && !mongoose.Types.ObjectId.isValid(params.id)) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 400,
                errors: ['Invalid ID format']
            });
        }

        next(params);
    }
}