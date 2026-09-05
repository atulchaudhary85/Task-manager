const express = require('express');
const router = express.Router();

const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const cleanTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    ),
  ].slice(0, 10);
};

const cleanSubtasks = (subtasks) => {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .filter(
      (subtask) =>
        subtask &&
        String(subtask.title || '').trim()
    )
    .map((subtask) => ({
      title: String(subtask.title).trim(),
      completed: Boolean(subtask.completed),
    }));
};

const buildTaskData = (body) => {
  const data = {};

  if (body.title !== undefined) {
    data.title = String(body.title).trim();
  }

  if (body.description !== undefined) {
    data.description = String(
      body.description || ''
    ).trim();
  }

  if (body.status !== undefined) {
    data.status = body.status;
  }

  if (body.priority !== undefined) {
    data.priority = body.priority;
  }

  if (body.category !== undefined) {
    data.category =
      String(body.category || '').trim() ||
      'General';
  }

  if (body.tags !== undefined) {
    data.tags = cleanTags(body.tags);
  }

  if (body.taskDate !== undefined) {
    data.taskDate =
      body.taskDate || null;
  }

  if (body.deadline !== undefined) {
    data.deadline =
      body.deadline || null;
  }

  if (body.estimatedMinutes !== undefined) {
    data.estimatedMinutes =
      Math.max(
        0,
        Number(body.estimatedMinutes) || 0
      );
  }

  if (body.actualMinutes !== undefined) {
    data.actualMinutes =
      Math.max(
        0,
        Number(body.actualMinutes) || 0
      );
  }

  if (body.progress !== undefined) {
    data.progress =
      Math.min(
        100,
        Math.max(
          0,
          Number(body.progress) || 0
        )
      );
  }

  if (body.subtasks !== undefined) {
    data.subtasks =
      cleanSubtasks(body.subtasks);
  }

  if (body.notes !== undefined) {
    data.notes =
      String(body.notes || '').trim();
  }

  if (body.archived !== undefined) {
    data.archived =
      Boolean(body.archived);
  }

  if (body.recurring !== undefined) {
    const recurring =
      body.recurring || {};

    data.recurring = {
      enabled:
        Boolean(recurring.enabled),

      frequency:
        recurring.enabled
          ? recurring.frequency || 'daily'
          : 'none',

      interval:
        Math.max(
          1,
          Number(recurring.interval) || 1
        ),

      daysOfWeek:
        Array.isArray(
          recurring.daysOfWeek
        )
          ? recurring.daysOfWeek
              .map(Number)
              .filter(
                (day) =>
                  Number.isInteger(day) &&
                  day >= 0 &&
                  day <= 6
              )
          : [],

      endDate:
        recurring.endDate || null,
    };
  }

  if (body.reminder !== undefined) {
    const reminder =
      body.reminder || {};

    data.reminder = {
      enabled:
        Boolean(reminder.enabled),

      remindAt:
        reminder.enabled
          ? reminder.remindAt || null
          : null,

      notifiedAt: null,
      snoozedUntil: null,
    };
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const startOfLocalDay = (value) => {
  const date = new Date(value);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const dateKey = (value) => {
  if (!value) {
    return '';
  }

  const date =
    startOfLocalDay(value);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (
  value,
  amount
) => {
  const date =
    startOfLocalDay(value);

  date.setDate(
    date.getDate() + amount
  );

  return date;
};

const addMonths = (
  value,
  amount
) => {
  const source =
    startOfLocalDay(value);

  const originalDay =
    source.getDate();

  const target =
    new Date(
      source.getFullYear(),
      source.getMonth() + amount,
      1
    );

  const lastDay =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();

  target.setDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return target;
};

const shiftDateKeepingTime = (
  value,
  dayDifference
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  date.setDate(
    date.getDate() +
      dayDifference
  );

  return date;
};

/*
|--------------------------------------------------------------------------
| RECURRING SCHEDULE CHECK
|--------------------------------------------------------------------------
*/

const isScheduledOccurrence = (
  source,
  candidate
) => {
  const recurring =
    source.recurring || {};

  if (
    !recurring.enabled ||
    !source.taskDate ||
    !recurring.frequency ||
    recurring.frequency === 'none'
  ) {
    return false;
  }

  const start =
    startOfLocalDay(
      source.taskDate
    );

  const current =
    startOfLocalDay(
      candidate
    );

  if (current <= start) {
    return false;
  }

  if (
    recurring.endDate &&
    current >
      startOfLocalDay(
        recurring.endDate
      )
  ) {
    return false;
  }

  const interval =
    Math.max(
      1,
      Number(
        recurring.interval
      ) || 1
    );

  const diffDays =
    Math.round(
      (current - start) /
        86400000
    );

  if (
    recurring.frequency ===
    'daily'
  ) {
    return (
      diffDays % interval === 0
    );
  }

  if (
    recurring.frequency ===
    'weekdays'
  ) {
    const day =
      current.getDay();

    if (
      day === 0 ||
      day === 6
    ) {
      return false;
    }

    if (interval === 1) {
      return true;
    }

    const startWeek =
      addDays(
        start,
        -start.getDay()
      );

    const currentWeek =
      addDays(
        current,
        -current.getDay()
      );

    const diffWeeks =
      Math.round(
        (
          currentWeek -
          startWeek
        ) /
          (
            7 *
            86400000
          )
      );

    return (
      diffWeeks %
        interval ===
      0
    );
  }

  if (
    recurring.frequency ===
      'weekly' ||
    recurring.frequency ===
      'custom'
  ) {
    const selectedDays =
      Array.isArray(
        recurring.daysOfWeek
      ) &&
      recurring.daysOfWeek.length > 0
        ? recurring.daysOfWeek
        : [
            start.getDay(),
          ];

    if (
      !selectedDays.includes(
        current.getDay()
      )
    ) {
      return false;
    }

    const startWeek =
      addDays(
        start,
        -start.getDay()
      );

    const currentWeek =
      addDays(
        current,
        -current.getDay()
      );

    const diffWeeks =
      Math.round(
        (
          currentWeek -
          startWeek
        ) /
          (
            7 *
            86400000
          )
      );

    return (
      diffWeeks %
        interval ===
      0
    );
  }

  if (
    recurring.frequency ===
    'monthly'
  ) {
    const monthsApart =
      (
        current.getFullYear() -
        start.getFullYear()
      ) *
        12 +
      (
        current.getMonth() -
        start.getMonth()
      );

    if (
      monthsApart <= 0 ||
      monthsApart %
        interval !==
        0
    ) {
      return false;
    }

    const expected =
      addMonths(
        start,
        monthsApart
      );

    return (
      dateKey(expected) ===
      dateKey(current)
    );
  }

  return false;
};

/*
|--------------------------------------------------------------------------
| BUILD GENERATED RECURRING OCCURRENCE
|--------------------------------------------------------------------------
*/

const createOccurrenceData = (
  source,
  occurrenceDate
) => {
  const sourceDate =
    startOfLocalDay(
      source.taskDate
    );

  const targetDate =
    startOfLocalDay(
      occurrenceDate
    );

  const dayDifference =
    Math.round(
      (
        targetDate -
        sourceDate
      ) /
        86400000
    );

  return {
    title:
      source.title,

    description:
      source.description || '',

    owner:
      source.owner,

    status:
      'todo',

    priority:
      source.priority ||
      'medium',

    category:
      source.category ||
      'General',

    tags: [
      ...(source.tags || []),
    ],

    taskDate:
      targetDate,

    deadline:
      shiftDateKeepingTime(
        source.deadline,
        dayDifference
      ),

    completedAt:
      null,

    estimatedMinutes:
      source.estimatedMinutes ||
      0,

    actualMinutes:
      0,

    progress:
      0,

    subtasks:
      (
        source.subtasks ||
        []
      ).map(
        (subtask) => ({
          title:
            subtask.title,

          completed:
            false,
        })
      ),

    recurring: {
      enabled: false,
      frequency: 'none',
      interval: 1,
      daysOfWeek: [],
      endDate: null,
    },

    recurrenceSource:
      source._id,

    recurrenceKey:
      `${String(
        source._id
      )}:${dateKey(
        targetDate
      )}`,

    generatedOccurrence:
      true,

    reminder: {
      enabled:
        Boolean(
          source.reminder?.enabled &&
          source.reminder?.remindAt
        ),

      remindAt:
        source.reminder?.enabled &&
        source.reminder?.remindAt
          ? shiftDateKeepingTime(
              source.reminder.remindAt,
              dayDifference
            )
          : null,

      notifiedAt: null,
      snoozedUntil: null,
    },

    focus: {
      sessions: 0,
      totalMinutes: 0,
      lastFocusedAt: null,
    },

    notes:
      source.notes || '',

    archived:
      false,
  };
};

/*
|--------------------------------------------------------------------------
| GENERATE RECURRING TASKS
|--------------------------------------------------------------------------
*/

const generateRecurringTasks =
  async (
    ownerId,
    throughDate =
      new Date()
  ) => {
    const sources =
      await Task.find({
        owner:
          ownerId,

        archived: {
          $ne: true,
        },

        generatedOccurrence: {
          $ne: true,
        },

        'recurring.enabled':
          true,

        'recurring.frequency': {
          $ne: 'none',
        },

        taskDate: {
          $ne: null,
        },
      });

    const end =
      startOfLocalDay(
        throughDate
      );

    for (
      const source
      of sources
    ) {
      const start =
        startOfLocalDay(
          source.taskDate
        );

      if (end <= start) {
        continue;
      }

      let candidate =
        addDays(
          start,
          1
        );

      while (
        candidate <= end
      ) {
        if (
          isScheduledOccurrence(
            source,
            candidate
          )
        ) {
          const occurrence =
            createOccurrenceData(
              source,
              candidate
            );

          try {
            await Task.updateOne(
              {
                owner:
                  ownerId,

                recurrenceKey:
                  occurrence
                    .recurrenceKey,
              },

              {
                $setOnInsert:
                  occurrence,
              },

              {
                upsert:
                  true,
              }
            );
          } catch (err) {
            if (
              err?.code !==
              11000
            ) {
              throw err;
            }
          }
        }

        candidate =
          addDays(
            candidate,
            1
          );
      }
    }
  };

/*
|--------------------------------------------------------------------------
| MARK OLD INCOMPLETE TASKS AS MISSED
|--------------------------------------------------------------------------
*/

const markPastIncompleteTasksAsMissed =
  async (ownerId) => {
    const today =
      startOfLocalDay(
        new Date()
      );

    await Task.updateMany(
      {
        owner:
          ownerId,

        archived: {
          $ne: true,
        },

        taskDate: {
          $ne: null,
          $lt: today,
        },

        status: {
          $in: [
            'todo',
            'in-progress',
          ],
        },
      },

      {
        $set: {
          status:
            'missed',

          completedAt:
            null,
        },
      }
    );
  };

const prepareTaskWorkspace =
  async (
    ownerId,
    throughDate =
      new Date()
  ) => {
    await generateRecurringTasks(
      ownerId,
      throughDate
    );

    await markPastIncompleteTasksAsMissed(
      ownerId
    );
  };

/*
|--------------------------------------------------------------------------
| ANALYTICS
|--------------------------------------------------------------------------
*/

const buildAnalytics = (
  tasks,
  rangeDays = 30
) => {
  const now =
    new Date();

  const start =
    startOfLocalDay(now);

  const days =
    Math.min(
      90,
      Math.max(
        1,
        Number(rangeDays) || 30
      )
    );

  start.setDate(
    start.getDate() -
      days +
      1
  );

  const activeTasks =
    tasks.filter(
      (task) =>
        !task.archived
    );

  const rangeTasks =
    activeTasks.filter(
      (task) => {
        const value =
          task.taskDate ||
          task.createdAt;

        if (!value) {
          return false;
        }

        const date =
          new Date(value);

        return (
          date >= start &&
          date <= now
        );
      }
    );

  const completed =
    rangeTasks.filter(
      (task) =>
        task.status === 'done'
    ).length;

  const missed =
    rangeTasks.filter(
      (task) =>
        task.status === 'missed'
    ).length;

  const overdue =
    rangeTasks.filter(
      (task) =>
        task.deadline &&
        task.status !== 'done' &&
        dateKey(
          task.deadline
        ) <
          dateKey(now)
    ).length;

  const completionRate =
    rangeTasks.length === 0
      ? 0
      : Math.round(
          (
            completed /
            rangeTasks.length
          ) *
            100
        );

  const byStatus = {
    todo: 0,
    inProgress: 0,
    done: 0,
    missed: 0,
  };

  const byPriority = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  const byCategory = {};

  rangeTasks.forEach(
    (task) => {
      if (
        task.status === 'todo'
      ) {
        byStatus.todo += 1;
      }

      if (
        task.status ===
        'in-progress'
      ) {
        byStatus.inProgress += 1;
      }

      if (
        task.status === 'done'
      ) {
        byStatus.done += 1;
      }

      if (
        task.status ===
        'missed'
      ) {
        byStatus.missed += 1;
      }

      if (
        Object.prototype
          .hasOwnProperty.call(
            byPriority,
            task.priority
          )
      ) {
        byPriority[
          task.priority
        ] += 1;
      }

      const category =
        task.category ||
        'General';

      byCategory[category] =
        (
          byCategory[
            category
          ] || 0
        ) + 1;
    }
  );

  const daily = [];

  for (
    let i =
      days - 1;
    i >= 0;
    i -= 1
  ) {
    const day =
      addDays(
        now,
        -i
      );

    const key =
      dateKey(day);

    const dayTasks =
      rangeTasks.filter(
        (task) =>
          task.taskDate &&
          dateKey(
            task.taskDate
          ) === key
      );

    daily.push({
      date:
        key,

      total:
        dayTasks.length,

      completed:
        dayTasks.filter(
          (task) =>
            task.status ===
            'done'
        ).length,

      missed:
        dayTasks.filter(
          (task) =>
            task.status ===
            'missed'
        ).length,
    });
  }

  const focusMinutes =
    activeTasks.reduce(
      (sum, task) =>
        sum +
        Number(
          task.focus
            ?.totalMinutes ||
          task.actualMinutes ||
          0
        ),
      0
    );

  const focusSessions =
    activeTasks.reduce(
      (sum, task) =>
        sum +
        Number(
          task.focus
            ?.sessions ||
          0
        ),
      0
    );

  return {
    rangeDays:
      days,

    total:
      rangeTasks.length,

    completed,

    missed,

    overdue,

    completionRate,

    byStatus,

    byPriority,

    byCategory,

    daily,

    focus: {
      minutes:
        focusMinutes,

      sessions:
        focusSessions,
    },
  };
};

/*
|--------------------------------------------------------------------------
| GET ALL TASKS
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const futureHorizon =
        addDays(
          new Date(),
          30
        );

      await prepareTaskWorkspace(
        req.userId,
        futureHorizon
      );

      const filter = {
        owner:
          req.userId,
      };

      if (
        req.query.archived !==
        'true'
      ) {
        filter.archived = {
          $ne: true,
        };
      }

      if (
        req.query.status
      ) {
        filter.status =
          req.query.status;
      }

      if (
        req.query.priority
      ) {
        filter.priority =
          req.query.priority;
      }

      if (
        req.query.category
      ) {
        filter.category =
          req.query.category;
      }

      const tasks =
        await Task.find(
          filter
        ).sort({
          taskDate: 1,
          deadline: 1,
          createdAt: -1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch tasks',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET TODAY'S TASKS
|--------------------------------------------------------------------------
*/

router.get(
  '/today',
  authMiddleware,
  async (req, res) => {
    try {
      const now =
        new Date();

      await prepareTaskWorkspace(
        req.userId,
        now
      );

      const startOfDay =
        startOfLocalDay(
          now
        );

      const endOfDay =
        addDays(
          startOfDay,
          1
        );

      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived: {
            $ne: true,
          },

          $or: [
            {
              taskDate: {
                $gte:
                  startOfDay,

                $lt:
                  endOfDay,
              },
            },

            {
              deadline: {
                $gte:
                  startOfDay,

                $lt:
                  endOfDay,
              },
            },
          ],
        }).sort({
          priority: -1,
          deadline: 1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            "Could not fetch today's tasks",

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET TASKS FOR SPECIFIC DAY
|--------------------------------------------------------------------------
*/

router.get(
  '/day/:date',
  authMiddleware,
  async (req, res) => {
    try {
      const date =
        new Date(
          `${req.params.date}T00:00:00`
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid date format',
          });
      }

      await prepareTaskWorkspace(
        req.userId,
        date
      );

      const nextDay =
        addDays(
          date,
          1
        );

      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived: {
            $ne: true,
          },

          taskDate: {
            $gte:
              date,

            $lt:
              nextDay,
          },
        }).sort({
          deadline: 1,
          createdAt: -1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch tasks for this day',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DASHBOARD STATS
|--------------------------------------------------------------------------
*/

router.get(
  '/stats',
  authMiddleware,
  async (req, res) => {
    try {
      const now =
        new Date();

      await prepareTaskWorkspace(
        req.userId,
        now
      );

      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived: {
            $ne: true,
          },
        });

      const startOfToday =
        startOfLocalDay(
          now
        );

      const startOfTomorrow =
        addDays(
          startOfToday,
          1
        );

      const total =
        tasks.length;

      const completed =
        tasks.filter(
          (task) =>
            task.status ===
            'done'
        ).length;

      const inProgress =
        tasks.filter(
          (task) =>
            task.status ===
            'in-progress'
        ).length;

      const todo =
        tasks.filter(
          (task) =>
            task.status ===
            'todo'
        ).length;

      const missed =
        tasks.filter(
          (task) =>
            task.status ===
            'missed'
        ).length;

      const overdue =
        tasks.filter(
          (task) => {
            if (
              !task.deadline ||
              task.status ===
                'done'
            ) {
              return false;
            }

            return (
              dateKey(
                task.deadline
              ) <
              dateKey(now)
            );
          }
        ).length;

      const todayTasks =
        tasks.filter(
          (task) => {
            if (
              !task.taskDate
            ) {
              return false;
            }

            const taskDate =
              new Date(
                task.taskDate
              );

            return (
              taskDate >=
                startOfToday &&
              taskDate <
                startOfTomorrow
            );
          }
        );

      const todayCompleted =
        todayTasks.filter(
          (task) =>
            task.status ===
            'done'
        ).length;

      const completionRate =
        total === 0
          ? 0
          : Math.round(
              (
                completed /
                total
              ) *
                100
            );

      const todayCompletionRate =
        todayTasks.length === 0
          ? 0
          : Math.round(
              (
                todayCompleted /
                todayTasks.length
              ) *
                100
            );

      res.json({
        total,
        completed,
        inProgress,
        todo,
        missed,
        overdue,

        completionRate,

        today: {
          total:
            todayTasks.length,

          completed:
            todayCompleted,

          completionRate:
            todayCompletionRate,
        },
      });
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch dashboard stats',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ARCHIVED TASKS
|--------------------------------------------------------------------------
*/

router.get(
  '/archived',
  authMiddleware,
  async (req, res) => {
    try {
      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived:
            true,
        }).sort({
          updatedAt:
            -1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch archived tasks',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPCOMING TASKS
|--------------------------------------------------------------------------
*/

router.get(
  '/upcoming',
  authMiddleware,
  async (req, res) => {
    try {
      const days =
        Math.min(
          90,
          Math.max(
            1,
            Number(
              req.query.days
            ) || 30
          )
        );

      const now =
        startOfLocalDay(
          new Date()
        );

      const end =
        addDays(
          now,
          days
        );

      await prepareTaskWorkspace(
        req.userId,
        end
      );

      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived: {
            $ne: true,
          },

          status: {
            $ne: 'done',
          },

          $or: [
            {
              taskDate: {
                $gt: now,
                $lte: end,
              },
            },

            {
              deadline: {
                $gt: now,
                $lte: end,
              },
            },
          ],
        }).sort({
          taskDate: 1,
          deadline: 1,
          priority: -1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch upcoming tasks',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ANALYTICS
|--------------------------------------------------------------------------
*/

router.get(
  '/analytics',
  authMiddleware,
  async (req, res) => {
    try {
      await prepareTaskWorkspace(
        req.userId,
        new Date()
      );

      const rangeDays =
        Math.min(
          90,
          Math.max(
            1,
            Number(
              req.query.range
            ) || 30
          )
        );

      const tasks =
        await Task.find({
          owner:
            req.userId,
        });

      res.json(
        buildAnalytics(
          tasks,
          rangeDays
        )
      );
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch task analytics',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DUE REMINDERS
|--------------------------------------------------------------------------
*/

router.get(
  '/reminders/due',
  authMiddleware,
  async (req, res) => {
    try {
      const now =
        new Date();

      const tasks =
        await Task.find({
          owner:
            req.userId,

          archived: {
            $ne: true,
          },

          status: {
            $ne: 'done',
          },

          'reminder.enabled':
            true,

          'reminder.remindAt': {
            $ne: null,
            $lte: now,
          },

          'reminder.notifiedAt':
            null,

          $or: [
            {
              'reminder.snoozedUntil':
                null,
            },

            {
              'reminder.snoozedUntil': {
                $lte: now,
              },
            },
          ],
        }).sort({
          'reminder.remindAt':
            1,
        });

      res.json(tasks);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not fetch reminders',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const data =
        buildTaskData(
          req.body
        );

      if (!data.title) {
        return res
          .status(400)
          .json({
            message:
              'Task title is required',
          });
      }

      const task =
        new Task({
          ...data,

          owner:
            req.userId,
        });

      await task.save();

      res
        .status(201)
        .json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not create task',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE TASK
|--------------------------------------------------------------------------
*/

router.put(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      const data =
        buildTaskData(
          req.body
        );

      if (
        data.title !==
          undefined &&
        !data.title
      ) {
        return res
          .status(400)
          .json({
            message:
              'Task title is required',
          });
      }

      Object.keys(
        data
      ).forEach(
        (key) => {
          task[key] =
            data[key];
        }
      );

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not update task',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| QUICK STATUS UPDATE
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/status',
  authMiddleware,
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      if (
        ![
          'todo',
          'in-progress',
          'done',
          'missed',
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            message:
              'Invalid task status',
          });
      }

      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      task.status =
        status;

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not update task status',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| TOGGLE SUBTASK
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/subtasks/:subtaskId',
  authMiddleware,
  async (req, res) => {
    try {
      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      const subtask =
        task.subtasks.id(
          req.params.subtaskId
        );

      if (!subtask) {
        return res
          .status(404)
          .json({
            message:
              'Subtask not found',
          });
      }

      if (
        typeof req.body
          .completed ===
        'boolean'
      ) {
        subtask.completed =
          req.body.completed;
      } else {
        subtask.completed =
          !subtask.completed;
      }

      if (
        task.subtasks.length > 0
      ) {
        const completedCount =
          task.subtasks.filter(
            (item) =>
              item.completed
          ).length;

        task.progress =
          Math.round(
            (
              completedCount /
              task.subtasks.length
            ) *
              100
          );

        if (
          task.progress ===
          100
        ) {
          task.status =
            'done';
        } else if (
          task.status ===
          'done'
        ) {
          task.status =
            'in-progress';
        }
      }

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not update subtask',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MARK REMINDER AS NOTIFIED
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/reminder/notified',
  authMiddleware,
  async (req, res) => {
    try {
      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      task.reminder.notifiedAt =
        new Date();

      task.reminder.snoozedUntil =
        null;

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not update reminder',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| SNOOZE REMINDER
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/reminder/snooze',
  authMiddleware,
  async (req, res) => {
    try {
      const minutes =
        Math.min(
          1440,
          Math.max(
            1,
            Number(
              req.body.minutes
            ) || 10
          )
        );

      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      task.reminder.enabled =
        true;

      task.reminder.notifiedAt =
        null;

      task.reminder.snoozedUntil =
        new Date(
          Date.now() +
            minutes *
              60 *
              1000
        );

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not snooze reminder',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| SAVE FOCUS SESSION
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/focus',
  authMiddleware,
  async (req, res) => {
    try {
      const rawMinutes =
        Number(
          req.body.minutes
        );

      if (
        !Number.isFinite(
          rawMinutes
        ) ||
        rawMinutes <= 0
      ) {
        return res
          .status(400)
          .json({
            message:
              'Focus minutes are required',
          });
      }

      const minutes =
        Math.min(
          480,
          Math.round(
            rawMinutes
          )
        );

      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      task.actualMinutes =
        Number(
          task.actualMinutes ||
          0
        ) +
        minutes;

      task.focus.sessions =
        Number(
          task.focus?.sessions ||
          0
        ) +
        1;

      task.focus.totalMinutes =
        Number(
          task.focus
            ?.totalMinutes ||
          0
        ) +
        minutes;

      task.focus.lastFocusedAt =
        new Date();

      if (
        task.status === 'todo'
      ) {
        task.status =
          'in-progress';
      }

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not save focus session',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ARCHIVE / RESTORE TASK
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/archive',
  authMiddleware,
  async (req, res) => {
    try {
      const task =
        await Task.findOne({
          _id:
            req.params.id,

          owner:
            req.userId,
        });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      if (
        typeof req.body
          .archived ===
        'boolean'
      ) {
        task.archived =
          req.body.archived;
      } else {
        task.archived =
          !task.archived;
      }

      await task.save();

      res.json(task);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not archive task',

          error:
            err.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  authMiddleware,
  async (req, res) => {
    try {
      const task =
        await Task
          .findOneAndDelete({
            _id:
              req.params.id,

            owner:
              req.userId,
          });

      if (!task) {
        return res
          .status(404)
          .json({
            message:
              'Task not found',
          });
      }

      res.json({
        message:
          'Task deleted successfully',
      });
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            'Could not delete task',

          error:
            err.message,
        });
    }
  }
);

module.exports = router;