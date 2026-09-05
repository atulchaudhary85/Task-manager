const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'todo',
        'in-progress',
        'done',
        'missed',
      ],
      default: 'todo',
    },

    priority: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
        'urgent',
      ],
      default: 'medium',
    },

    category: {
      type: String,
      trim: true,
      default: 'General',
    },

    tags: {
      type: [String],
      default: [],
    },

    taskDate: {
      type: Date,
      default: null,
    },

    deadline: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    estimatedMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    subtasks: {
      type: [subtaskSchema],
      default: [],
    },

    recurring: {
      enabled: {
        type: Boolean,
        default: false,
      },

      frequency: {
        type: String,
        enum: [
          'none',
          'daily',
          'weekdays',
          'weekly',
          'monthly',
          'custom',
        ],
        default: 'none',
      },

      interval: {
        type: Number,
        default: 1,
        min: 1,
      },

      daysOfWeek: {
        type: [Number],
        default: [],
      },

      endDate: {
        type: Date,
        default: null,
      },
    },

    recurrenceSource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },

    recurrenceKey: {
      type: String,
      trim: true,
      default: undefined,
    },

    generatedOccurrence: {
      type: Boolean,
      default: false,
    },

    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },

      remindAt: {
        type: Date,
        default: null,
      },

      notifiedAt: {
        type: Date,
        default: null,
      },

      snoozedUntil: {
        type: Date,
        default: null,
      },
    },

    focus: {
      sessions: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastFocusedAt: {
        type: Date,
        default: null,
      },
    },

    notes: {
      type: String,
      default: '',
      trim: true,
    },

    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| AUTOMATIC COMPLETION DATA
|--------------------------------------------------------------------------
*/

taskSchema.pre('save', function () {
  if (this.status === 'done') {
    this.progress = 100;

    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else {
    this.completedAt = null;

    if (this.progress === 100) {
      this.progress = 0;
    }
  }

  if (
    !this.reminder?.enabled ||
    !this.reminder?.remindAt
  ) {
    this.reminder.enabled = false;
    this.reminder.remindAt = null;
    this.reminder.notifiedAt = null;
    this.reminder.snoozedUntil = null;
  }
});

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

taskSchema.index({
  owner: 1,
  taskDate: 1,
});

taskSchema.index({
  owner: 1,
  status: 1,
});

taskSchema.index({
  owner: 1,
  deadline: 1,
});

taskSchema.index({
  owner: 1,
  priority: 1,
});

taskSchema.index({
  owner: 1,
  recurrenceSource: 1,
});

taskSchema.index({
  owner: 1,
  archived: 1,
});

taskSchema.index({
  owner: 1,
  'reminder.enabled': 1,
  'reminder.remindAt': 1,
});

taskSchema.index({
  owner: 1,
  completedAt: 1,
});

taskSchema.index(
  {
    owner: 1,
    recurrenceKey: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model(
  'Task',
  taskSchema
);