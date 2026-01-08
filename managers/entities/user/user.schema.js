

module.exports = {
    createUser: [
        {
            label: 'name',
            model: 'name',
            required: true,
        },
        {
            label: 'email',
            model: 'email',
            required: true,
        },
        {
            label: 'password',
            model: 'password',
            required: true,
        },
        {
            label: 'role',
            model: 'role',
            required: true,
            oneOf: ['admin', 'superadmin'],
        },
        {
            label: 'schoolId',
            model: 'schoolId',
            custom: 'isValidMongoId',
            customError: 'School id must be a valid Id',
        }
    ],
    login: [
        {
            label: 'email',
            model: 'email',
            required: true,
        },
        {
            label: 'password',
            model: 'password',
            required: true,
        },
    ],
    changePassword: [
        {
            label: 'oldPassword',
            model: 'password',
            required: true,
        },
        {
            label: 'newPassword',
            model: 'newPassword',
            required: true,
        },
    ],
}


