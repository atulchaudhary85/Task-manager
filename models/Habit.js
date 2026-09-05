const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: true,
  }
);

const habitSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    category: {
      type: String,
      default: 'Personal',
      trim: true,
    },

    trackingType: {
      type: String,
      enum: ['boolean', 'quantity'],
      default: 'boolean',
    },

    targetQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    unit: {
      type: String,
      default: '',
      trim: true,
    },

    frequency: {
      type: String,
      enum: [
        'daily',
        'weekdays',
        'weekly',
        'custom',
      ],
      default: 'daily',
    },

    daysOfWeek: {
      type: [Number],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },

    logs: {
      type: [habitLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

habitSchema.index({
  owner: 1,
  active: 1,
});

module.exports = mongoose.model(
  'Habit',
  habitSchema
);