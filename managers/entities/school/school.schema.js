module.exports = {
  createSchool: [
    {
      label: 'name',
      model: 'name',
      required: true,
    },
    {
      label: 'address',
      model: 'address',
      required: true,
    },
    {
      label: 'email',
      model: 'email',
      required: true,
    },
    {
      label: 'phone',
      model: 'phone',
      required: true,
    },
    {
      label: 'website',
      model: 'website',
    },
    {
      label: 'logo',
      model: 'logo',
    },
  ],
  updateSchool: [
    {
      label: 'name',
      model: 'name',
    },
    {
      label: 'email',
      model: 'email',
    },
    {
      label: 'phone',
      model: 'phone',
    },
    {
      label: 'address',
      model: 'address',
    },
    {
      label: 'website',
      model: 'website',
    },
    {
      label: 'logo',
      model: 'logo',
    },
  ],
  assignAdmin: [
    {
      label: 'userId',
      model: 'userId',
      custom: 'isValidMongoId',
      customError: 'User id must be a valid Id',
      required: true,
    },
    {
      label: 'schoolId',
      model: 'schoolId',
      custom: 'isValidMongoId',
      customError: 'School id must be a valid Id',
      required: true,
    },
  ],
}