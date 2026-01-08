module.exports = {
  enroll: [
    {
      label: "email",
      model: "email",
      required: true,
    },
    {
      label: "phone",
      model: "phone",
      required: true,
    },
    {
      label: "name",
      model: "name",
      required: true,
    },
    {
      label: "dateOfBirth",
      model: "dateOfBirth",
      required: true,
    },
    {
      label: "gender",
      model: "gender",
      required: true,
      oneOf: ['male', 'female']
    },
    {
      label: "classRoomId",
      model: "id",
      required: true,
      custom: 'isValidMongoId',
      customError: 'Class room id must be a valid Id',
    }
  ],
  update: [
    {
      label: "email",
      model: "email",
    },
    {
      label: "phone",
      model: "phone",
    },
    {
      label: "name",
      model: "name",
    },
    {
      label: "dateOfBirth",
      model: "dateOfBirth",
    },
    {
      label: "gender",
      model: "gender",
      oneOf: ['male', 'female']
    },
    {
      label: "classRoomId",
      model: "id",
      custom: 'isValidMongoId',
      customError: 'Class room id must be a valid Id',
    }
  ],
  transfer: [
    {
      label: "targetClassroomId",
      model: "id",
      custom: 'isValidMongoId',
      customError: 'Target classroom id must be a valid Id',
    }
  ]
};
