module.exports = {
  create: [
    {
      label: 'name',
      model: 'name',
      required: true,
    },
    {
      label: 'schoolId',
      model: 'schoolId',
      required: true,
      custom: 'isValidMongoId',
    },
    {
      label: 'capacity',
      model: 'capacity',
      path: 'capacity',
      type: 'number',
      required: true,
    },
    {
      label: 'resources',
      model: 'resources',
      type: 'array',
      items: [{
        label: 'type',
        type: 'string',
        required: true,
      }, {
        label: 'name',
        type: 'string',
        required: true,
      }, {
        label: 'quantity',
        type: 'number',
        required: true,
      }],
    },
  ],
  update: [
    {
      label: "capacity",
      model: "capacity",
      type: "Number",
    },
    {
      label: "name",
      model: "name",
    },
    {
      label: "resources",
      model: "resources",
      type: 'Array',
      items: [
        {
          label: 'type',
          path: 'type',
          type: 'String',
        },
        {
          label: 'name',
          path: 'name',
          type: 'String',
        },
        {
          label: 'quantity',
          path: 'quantity',
          type: 'Number',
        },
      ],
    }
  ],
  updateResources: [
    {
      label: 'resourceId',
      model: 'id',
      type: 'String',
      required: true,
      custom: 'isValidMongoId',
      customError: 'Resource id must be a valid Id',
    },
    {
      label: "name",
      model: "name",
    },
    {
      label: 'quantity',
      path: 'quantity',
      type: 'Number',
    },
    {
      label: 'type',
      path: 'type',
      type: 'String',
    },

  ]
}