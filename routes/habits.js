const express = require('express');
const router = express.Router();

const Habit = require('../models/Habit');
const authMiddleware = require(
  '../middleware/authMiddleware'
);

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const VALID_TRACKING_TYPES = [
  'boolean',
  'quantity',
];

const VALID_FREQUENCIES = [
  'daily',
  'weekdays',
  'weekly',
  'custom',
];

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(value || '')
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = value.split('-').map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const isValidDateKey = (value) =>
  Boolean(parseDateKey(value));

const addDays = (date, amount) => {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount
  );

  return result;
};

const cleanDaysOfWeek = (days) => {
  if (!Array.isArray(days)) {
    return [];
  }

  return [
    ...new Set(
      days
        .map(Number)
        .filter(
          (day) =>
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        )
    ),
  ].sort((a, b) => a - b);
};

/*
|--------------------------------------------------------------------------
| HABIT SCHEDULE HELPERS
|--------------------------------------------------------------------------
*/

const getHabitStartDate = (habit) => {
  const createdAt =
    habit?.createdAt
      ? new Date(habit.createdAt)
      : new Date();

  createdAt.setHours(
    12,
    0,
    0,
    0
  );

  return createdAt;
};

const isHabitScheduledForDate = (
  habit,
  date
) => {
  if (!habit || !date) {
    return false;
  }

  const startDate =
    getHabitStartDate(habit);

  const checkDate =
    new Date(date);

  checkDate.setHours(
    12,
    0,
    0,
    0
  );

  if (checkDate < startDate) {
    return false;
  }

  const day =
    checkDate.getDay();

  switch (habit.frequency) {
    case 'weekdays':
      return day >= 1 && day <= 5;

    case 'weekly': {
      const configuredDays =
        cleanDaysOfWeek(
          habit.daysOfWeek
        );

      if (configuredDays.length > 0) {
        return configuredDays.includes(
          day
        );
      }

      return (
        day === startDate.getDay()
      );
    }

    case 'custom': {
      const configuredDays =
        cleanDaysOfWeek(
          habit.daysOfWeek
        );

      if (configuredDays.length === 0) {
        return false;
      }

      return configuredDays.includes(
        day
      );
    }

    case 'daily':
    default:
      return true;
  }
};

const getScheduledDatesBackwards = (
  habit,
  fromDate,
  limit = 3660
) => {
  const result = [];

  let current =
    new Date(fromDate);

  current.setHours(
    12,
    0,
    0,
    0
  );

  const startDate =
    getHabitStartDate(habit);

  for (
    let checked = 0;
    checked < limit;
    checked += 1
  ) {
    if (current < startDate) {
      break;
    }

    if (
      isHabitScheduledForDate(
        habit,
        current
      )
    ) {
      result.push(
        getDateKey(current)
      );
    }

    current = addDays(
      current,
      -1
    );
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| LOG HELPERS
|--------------------------------------------------------------------------
*/

const getCompletedDateSet = (habit) =>
  new Set(
    (habit.logs || [])
      .filter(
        (log) =>
          Boolean(log.completed)
      )
      .map(
        (log) => log.date
      )
  );

const calculateStreak = (habit) => {
  const completedDates =
    getCompletedDateSet(habit);

  const today = new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );

  const scheduledDates =
    getScheduledDatesBackwards(
      habit,
      today
    );

  if (
    scheduledDates.length === 0
  ) {
    return 0;
  }

  let index = 0;

  /*
   * If today's scheduled habit has not
   * been completed yet, yesterday's
   * streak should remain visible.
   */
  if (
    scheduledDates[0] ===
      getDateKey(today) &&
    !completedDates.has(
      scheduledDates[0]
    )
  ) {
    index = 1;
  }

  let streak = 0;

  for (
    ;
    index < scheduledDates.length;
    index += 1
  ) {
    const date =
      scheduledDates[index];

    if (
      completedDates.has(date)
    ) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const getLongestStreak = (habit) => {
  const completedDates =
    getCompletedDateSet(habit);

  const today = new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );

  const scheduledDates =
    getScheduledDatesBackwards(
      habit,
      today
    ).reverse();

  let longest = 0;
  let current = 0;

  scheduledDates.forEach(
    (date) => {
      if (
        completedDates.has(date)
      ) {
        current += 1;

        longest = Math.max(
          longest,
          current
        );
      } else {
        current = 0;
      }
    }
  );

  return longest;
};

const getHabitLog = (
  habit,
  date
) =>
  (habit.logs || []).find(
    (log) =>
      log.date === date
  );

const getDayLogResponse = (
  habit,
  date
) => {
  const log =
    getHabitLog(
      habit,
      date
    );

  if (!log) {
    return {
      date,
      completed: false,
      quantity: 0,
      note: '',
    };
  }

  return {
    id: log._id,
    date: log.date,
    completed:
      Boolean(log.completed),
    quantity:
      Number(log.quantity) || 0,
    note:
      log.note || '',
  };
};

/*
|--------------------------------------------------------------------------
| RESPONSE HELPER
|--------------------------------------------------------------------------
*/

const habitResponse = (
  habit,
  extra = {}
) => {
  const object =
    habit.toObject();

  return {
    ...object,

    currentStreak:
      calculateStreak(habit),

    longestStreak:
      getLongestStreak(habit),

    ...extra,
  };
};

/*
|--------------------------------------------------------------------------
| GET ALL HABITS
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const habits =
        await Habit.find({
          owner: req.userId,
        }).sort({
          active: -1,
          createdAt: -1,
        });

      res.json(
        habits.map(
          (habit) =>
            habitResponse(habit)
        )
      );
    } catch (err) {
      res.status(500).json({
        message:
          'Could not fetch habits',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET HABITS FOR ONE DAY
|--------------------------------------------------------------------------
*/

router.get(
  '/day/:date',
  authMiddleware,
  async (req, res) => {
    try {
      const {
        date,
      } = req.params;

      const parsedDate =
        parseDateKey(date);

      if (!parsedDate) {
        return res
          .status(400)
          .json({
            message:
              'Invalid date format. Use YYYY-MM-DD.',
          });
      }

      const habits =
        await Habit.find({
          owner: req.userId,
          active: true,
        }).sort({
          createdAt: 1,
        });

      const result =
        habits
          .filter(
            (habit) =>
              isHabitScheduledForDate(
                habit,
                parsedDate
              )
          )
          .map(
            (habit) =>
              habitResponse(
                habit,
                {
                  scheduledToday:
                    true,

                  dayLog:
                    getDayLogResponse(
                      habit,
                      date
                    ),
                }
              )
          );

      res.json(result);
    } catch (err) {
      res.status(500).json({
        message:
          'Could not fetch daily habits',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE HABIT
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const {
        name,
        description = '',
        category = 'Personal',
        trackingType = 'boolean',
        targetQuantity = 1,
        unit = '',
        frequency = 'daily',
        daysOfWeek = [],
      } = req.body;

      const cleanName =
        String(
          name || ''
        ).trim();

      if (!cleanName) {
        return res
          .status(400)
          .json({
            message:
              'Habit name is required.',
          });
      }

      if (
        !VALID_TRACKING_TYPES.includes(
          trackingType
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid tracking type.',
          });
      }

      if (
        !VALID_FREQUENCIES.includes(
          frequency
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid habit frequency.',
          });
      }

      const cleanDays =
        cleanDaysOfWeek(
          daysOfWeek
        );

      if (
        frequency === 'custom' &&
        cleanDays.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              'Choose at least one day for a custom habit.',
          });
      }

      const habit =
        new Habit({
          owner: req.userId,

          name: cleanName,

          description:
            String(
              description || ''
            ).trim(),

          category:
            String(
              category ||
                'Personal'
            ).trim() ||
            'Personal',

          trackingType,

          targetQuantity:
            Math.max(
              1,
              Number(
                targetQuantity
              ) || 1
            ),

          unit:
            String(
              unit || ''
            ).trim(),

          frequency,

          daysOfWeek:
            cleanDays,
        });

      await habit.save();

      res.status(201).json(
        habitResponse(habit)
      );
    } catch (err) {
      res.status(500).json({
        message:
          'Could not create habit',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE HABIT
|--------------------------------------------------------------------------
*/

router.put(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const habit =
        await Habit.findOne({
          _id: req.params.id,
          owner: req.userId,
        });

      if (!habit) {
        return res
          .status(404)
          .json({
            message:
              'Habit not found.',
          });
      }

      const {
        name,
        description,
        category,
        trackingType,
        targetQuantity,
        unit,
        frequency,
        daysOfWeek,
        active,
      } = req.body;

      if (
        name !== undefined
      ) {
        const cleanName =
          String(
            name
          ).trim();

        if (!cleanName) {
          return res
            .status(400)
            .json({
              message:
                'Habit name is required.',
            });
        }

        habit.name =
          cleanName;
      }

      if (
        description !==
        undefined
      ) {
        habit.description =
          String(
            description || ''
          ).trim();
      }

      if (
        category !==
        undefined
      ) {
        habit.category =
          String(
            category ||
              'Personal'
          ).trim() ||
          'Personal';
      }

      if (
        trackingType !==
        undefined
      ) {
        if (
          !VALID_TRACKING_TYPES.includes(
            trackingType
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                'Invalid tracking type.',
            });
        }

        habit.trackingType =
          trackingType;
      }

      if (
        targetQuantity !==
        undefined
      ) {
        habit.targetQuantity =
          Math.max(
            1,
            Number(
              targetQuantity
            ) || 1
          );
      }

      if (
        unit !== undefined
      ) {
        habit.unit =
          String(
            unit || ''
          ).trim();
      }

      if (
        frequency !==
        undefined
      ) {
        if (
          !VALID_FREQUENCIES.includes(
            frequency
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                'Invalid habit frequency.',
            });
        }

        habit.frequency =
          frequency;
      }

      if (
        daysOfWeek !==
        undefined
      ) {
        habit.daysOfWeek =
          cleanDaysOfWeek(
            daysOfWeek
          );
      }

      if (
        habit.frequency ===
          'custom' &&
        cleanDaysOfWeek(
          habit.daysOfWeek
        ).length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              'Choose at least one day for a custom habit.',
          });
      }

      if (
        active !== undefined
      ) {
        habit.active =
          Boolean(active);
      }

      await habit.save();

      res.json(
        habitResponse(habit)
      );
    } catch (err) {
      res.status(500).json({
        message:
          'Could not update habit',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LOG / UPDATE A DAY
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/log',
  authMiddleware,
  async (req, res) => {
    try {
      const {
        date = getDateKey(),
        completed,
        quantity,
        note,
      } = req.body;

      const parsedDate =
        parseDateKey(date);

      if (!parsedDate) {
        return res
          .status(400)
          .json({
            message:
              'Invalid date format. Use YYYY-MM-DD.',
          });
      }

      const habit =
        await Habit.findOne({
          _id: req.params.id,
          owner: req.userId,
        });

      if (!habit) {
        return res
          .status(404)
          .json({
            message:
              'Habit not found.',
          });
      }

      if (!habit.active) {
        return res
          .status(400)
          .json({
            message:
              'This habit is inactive.',
          });
      }

      if (
        !isHabitScheduledForDate(
          habit,
          parsedDate
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'This habit is not scheduled for the selected day.',
          });
      }

      let log =
        getHabitLog(
          habit,
          date
        );

      if (!log) {
        habit.logs.push({
          date,
          completed: false,
          quantity: 0,
          note: '',
        });

        log =
          habit.logs[
            habit.logs.length - 1
          ];
      }

      if (
        typeof completed ===
        'boolean'
      ) {
        log.completed =
          completed;
      }

      if (
        quantity !== undefined
      ) {
        const cleanQuantity =
          Math.max(
            0,
            Number(quantity) || 0
          );

        log.quantity =
          cleanQuantity;

        if (
          habit.trackingType ===
          'quantity'
        ) {
          log.completed =
            cleanQuantity >=
            habit.targetQuantity;
        }
      }

      if (
        note !== undefined
      ) {
        log.note =
          String(
            note || ''
          ).trim();
      }

      await habit.save();

      res.json(
        habitResponse(
          habit,
          {
            dayLog:
              getDayLogResponse(
                habit,
                date
              ),
          }
        )
      );
    } catch (err) {
      res.status(500).json({
        message:
          'Could not update habit log',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE ONE DAY LOG
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id/log/:date',
  authMiddleware,
  async (req, res) => {
    try {
      const {
        date,
      } = req.params;

      if (
        !isValidDateKey(date)
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid date format. Use YYYY-MM-DD.',
          });
      }

      const habit =
        await Habit.findOne({
          _id: req.params.id,
          owner: req.userId,
        });

      if (!habit) {
        return res
          .status(404)
          .json({
            message:
              'Habit not found.',
          });
      }

      habit.logs =
        habit.logs.filter(
          (log) =>
            log.date !== date
        );

      await habit.save();

      res.json(
        habitResponse(habit)
      );
    } catch (err) {
      res.status(500).json({
        message:
          'Could not remove habit log',
        error: err.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE HABIT
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const habit =
        await Habit.findOneAndDelete({
          _id: req.params.id,
          owner: req.userId,
        });

      if (!habit) {
        return res
          .status(404)
          .json({
            message:
              'Habit not found.',
          });
      }

      res.json({
        message:
          'Habit deleted successfully.',
      });
    } catch (err) {
      res.status(500).json({
        message:
          'Could not delete habit',
        error: err.message,
      });
    }
  }
);

module.exports = router;