const emojis = require('../../public/emojis.data.json');

module.exports = {
    id: {
        path: "id",
        type: "string",
        length: { min: 1, max: 50 },
        custom: 'isValidMongoId',
        customError: 'id must be a valid Id',
    },
    username: {
        path: 'username',
        type: 'string',
        length: { min: 3, max: 20 },
        custom: 'username',
    },
    name: {
        path: 'name',
        type: 'string',
    },
    role: {
        path: 'role',
        type: 'string',
        oneOf: ['admin', 'superadmin'],
    },
    schoolId: {
        path: 'schoolId',
        type: 'string',
        custom: 'isValidMongoId',
        customError: 'schoolId must be a valid Id',
    },
    userId: {
        path: 'userId',
        type: 'string',
        custom: 'isValidMongoId',
        customError: 'userId must be a valid Id',
    },
    password: {
        path: 'password',
        type: 'string',
        length: { min: 8, max: 100 },
    },
    newPassword: {
        path: 'newPassword',
        type: 'string',
        length: { min: 8, max: 100 },
    },
    title: {
        path: 'title',
        type: 'string',
        length: { min: 3, max: 300 }
    },
    label: {
        path: 'label',
        type: 'string',
        length: { min: 3, max: 100 }
    },
    shortDesc: {
        path: 'desc',
        type: 'string',
        length: { min: 3, max: 300 }
    },
    longDesc: {
        path: 'desc',
        type: 'string',
        length: { min: 3, max: 2000 }
    },
    url: {
        path: 'url',
        type: 'string',
        length: { min: 9, max: 300 },
    },
    emoji: {
        path: 'emoji',
        type: 'Array',
        items: {
            type: 'string',
            length: { min: 1, max: 10 },
            oneOf: emojis.value,
        }
    },
    price: {
        path: 'price',
        type: 'number',
    },
    avatar: {
        path: 'avatar',
        type: 'string',
        length: { min: 8, max: 100 },
    },
    text: {
        type: 'String',
        length: { min: 3, max: 15 },
    },
    longText: {
        type: 'String',
        length: { min: 3, max: 250 },
    },
    paragraph: {
        type: 'String',
        length: { min: 3, max: 10000 },
    },
    phone: {
        path: 'phone',
        type: 'String',
        length: { min: 10, max: 13 },
    },
    address: {
        path: 'address',
        type: 'String',
    },
    email: {
        path: 'email',
        length: { min: 3, max: 100 },
        type: 'String',
        regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
    number: {
        type: 'Number',
        length: { min: 1, max: 6 },
    },
    logo: {
        path: 'logo',
        type: 'string',
    },
    website: {
        path: 'website',
        type: 'String',
        length: { min: 3, max: 100 },
        regex: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    },
    arrayOfStrings: {
        type: 'Array',
        items: {
            type: 'String',
            length: { min: 3, max: 100 }
        }
    },
    obj: {
        type: 'Object',
    },
    bool: {
        type: 'Boolean',
    },
    capacity: {
        path: 'capacity',
        type: 'Number',
        length: { min: 1 },
    },
    resources: {
        path: 'resources',
        type: 'Array',
        items: [
            {
                path: 'type',
                type: 'String',
            },
            {
                path: 'name',
                type: 'String',
            },
            {
                path: 'quantity',
                type: 'Number',
            },
        ]
    },
    dateOfBirth: {
        path: 'dateOfBirth',
        type: 'String',
        regex: /^\d{4}-\d{2}-\d{2}$/
    },
    gender: {
        path: 'gender',
        type: 'string',
        oneOf: ['male', 'female', 'other'],
    },
}