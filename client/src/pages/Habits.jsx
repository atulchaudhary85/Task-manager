import './Habits.css';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import API_URL from '../config';

const CATEGORIES = [
  'Health',
  'Study',
  'Work',
  'Fitness',
  'Personal',
  'Other',
];

const WEEK_DAYS = [
  { value: 0, short: 'Sun' },
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'Personal',
  trackingType: 'boolean',
  targetQuantity: 1,
  unit: '',
  frequency: 'daily',
  daysOfWeek: [],
};

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(
    now.getTime() - offset * 60 * 1000
  )
    .toISOString()
    .split('T')[0];
};

const parseDateKey = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T12:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const getDateKey = (date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const date = parseDateKey(value);

  if (!date) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
  );
};

const getLastDays = (count) => {
  const days = [];

  const today = parseDateKey(
    getToday()
  );

  for (
    let i = count - 1;
    i >= 0;
    i -= 1
  ) {
    const date = new Date(today);

    date.setDate(
      today.getDate() - i
    );

    days.push({
      key: getDateKey(date),

      day: date.toLocaleDateString(
        'en-IN',
        {
          weekday: 'short',
        }
      ),

      number: date.getDate(),
    });
  }

  return days;
};

const cleanDays = (days) => {
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

const getHabitCreatedDate = (
  habit
) => {
  if (!habit?.createdAt) {
    return null;
  }

  const date = new Date(
    habit.createdAt
  );

  date.setHours(
    12,
    0,
    0,
    0
  );

  return date;
};

const isHabitScheduled = (
  habit,
  dateKey
) => {
  const date =
    parseDateKey(dateKey);

  if (!date || !habit) {
    return false;
  }

  const createdDate =
    getHabitCreatedDate(habit);

  if (
    createdDate &&
    date < createdDate
  ) {
    return false;
  }

  const day =
    date.getDay();

  switch (habit.frequency) {
    case 'weekdays':
      return (
        day >= 1 &&
        day <= 5
      );

    case 'weekly': {
      const selectedDays =
        cleanDays(
          habit.daysOfWeek
        );

      if (
        selectedDays.length > 0
      ) {
        return selectedDays.includes(
          day
        );
      }

      if (createdDate) {
        return (
          day ===
          createdDate.getDay()
        );
      }

      return false;
    }

    case 'custom': {
      const selectedDays =
        cleanDays(
          habit.daysOfWeek
        );

      return selectedDays.includes(
        day
      );
    }

    case 'daily':
    default:
      return true;
  }
};

const getFrequencyLabel = (
  habit
) => {
  if (!habit) {
    return '';
  }

  if (
    habit.frequency === 'daily'
  ) {
    return 'Every day';
  }

  if (
    habit.frequency ===
    'weekdays'
  ) {
    return 'Weekdays';
  }

  const selectedDays =
    cleanDays(
      habit.daysOfWeek
    );

  if (
    habit.frequency === 'weekly'
  ) {
    if (
      selectedDays.length > 0
    ) {
      const day =
        WEEK_DAYS.find(
          (item) =>
            item.value ===
            selectedDays[0]
        );

      return day
        ? `Every ${day.short}`
        : 'Weekly';
    }

    return 'Weekly';
  }

  if (
    habit.frequency === 'custom'
  ) {
    if (
      selectedDays.length === 0
    ) {
      return 'Custom';
    }

    return selectedDays
      .map(
        (value) =>
          WEEK_DAYS.find(
            (day) =>
              day.value === value
          )?.short
      )
      .filter(Boolean)
      .join(', ');
  }

  return habit.frequency;
};

function Habits() {
  const navigate =
    useNavigate();

  const token =
    localStorage.getItem(
      'token'
    );

  const [habits, setHabits] =
    useState([]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getToday());

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editingHabit,
    setEditingHabit,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState({
    ...EMPTY_FORM,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState('all');

  const [
    quantityInputs,
    setQuantityInputs,
  ] = useState({});

  const days = useMemo(
    () => getLastDays(14),
    []
  );

  const apiRequest = useCallback(
    async (
      url,
      options = {}
    ) => {
      const response =
        await fetch(
          `${API_URL}${url}`,
          {
            ...options,

            headers: {
              ...(options.body
                ? {
                    'Content-Type':
                      'application/json',
                  }
                : {}),

              Authorization:
                `Bearer ${token}`,

              ...options.headers,
            },
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Something went wrong.'
        );
      }

      return data;
    },
    [token]
  );

  const loadHabits =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');

          const data =
            await apiRequest(
              '/habits'
            );

          setHabits(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (err) {
          setError(
            err.message
          );
        } finally {
          setLoading(false);
        }
      },
      [apiRequest]
    );

  useEffect(() => {
    if (token) {
      loadHabits();
    }
  }, [
    token,
    loadHabits,
  ]);

  const getLog = (
    habit,
    date
  ) =>
    habit.logs?.find(
      (log) =>
        log.date === date
    ) || null;

  const filteredHabits =
    useMemo(() => {
      let result =
        habits.filter(
          (habit) =>
            habit.active
        );

      if (
        categoryFilter !== 'all'
      ) {
        result =
          result.filter(
            (habit) =>
              habit.category ===
              categoryFilter
          );
      }

      if (search.trim()) {
        const query =
          search
            .trim()
            .toLowerCase();

        result =
          result.filter(
            (habit) =>
              habit.name
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              habit.description
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              habit.category
                ?.toLowerCase()
                .includes(
                  query
                )
          );
      }

      return result;
    }, [
      habits,
      categoryFilter,
      search,
    ]);

  const activeHabits =
    useMemo(
      () =>
        habits.filter(
          (habit) =>
            habit.active
        ),
      [habits]
    );

  const scheduledHabits =
    useMemo(
      () =>
        filteredHabits.filter(
          (habit) =>
            isHabitScheduled(
              habit,
              selectedDate
            )
        ),
      [
        filteredHabits,
        selectedDate,
      ]
    );

  const getStatsForDate =
    useCallback(
      (date) => {
        const scheduled =
          activeHabits.filter(
            (habit) =>
              isHabitScheduled(
                habit,
                date
              )
          );

        const completed =
          scheduled.filter(
            (habit) =>
              getLog(
                habit,
                date
              )?.completed
          ).length;

        const total =
          scheduled.length;

        return {
          total,

          completed,

          remaining:
            total -
            completed,

          percentage:
            total === 0
              ? 0
              : Math.round(
                  (completed /
                    total) *
                    100
                ),
        };
      },
      [activeHabits]
    );

  const todayStats =
    useMemo(
      () =>
        getStatsForDate(
          getToday()
        ),
      [getStatsForDate]
    );

  const selectedStats =
    useMemo(
      () =>
        getStatsForDate(
          selectedDate
        ),
      [
        getStatsForDate,
        selectedDate,
      ]
    );

  const totalStreak =
    useMemo(
      () =>
        activeHabits.reduce(
          (
            sum,
            habit
          ) =>
            sum +
            Number(
              habit.currentStreak ||
                0
            ),
          0
        ),
      [activeHabits]
    );

  const longestStreak =
    useMemo(
      () =>
        activeHabits.reduce(
          (
            highest,
            habit
          ) =>
            Math.max(
              highest,
              Number(
                habit.longestStreak ||
                  0
              )
            ),
          0
        ),
      [activeHabits]
    );

  const consistencyScore =
    useMemo(() => {
      let possible = 0;
      let completed = 0;

      activeHabits.forEach(
        (habit) => {
          days.forEach(
            (day) => {
              if (
                !isHabitScheduled(
                  habit,
                  day.key
                )
              ) {
                return;
              }

              possible += 1;

              if (
                getLog(
                  habit,
                  day.key
                )?.completed
              ) {
                completed += 1;
              }
            }
          );
        }
      );

      if (
        possible === 0
      ) {
        return 0;
      }

      return Math.round(
        (completed /
          possible) *
          100
      );
    }, [
      activeHabits,
      days,
    ]);

  const openCreate = () => {
    setEditingHabit(null);

    setFormData({
      ...EMPTY_FORM,
      daysOfWeek: [],
    });

    setError('');
    setShowModal(true);
  };

  const openEdit = (
    habit
  ) => {
    setEditingHabit(habit);

    setFormData({
      name:
        habit.name || '',

      description:
        habit.description ||
        '',

      category:
        habit.category ||
        'Personal',

      trackingType:
        habit.trackingType ||
        'boolean',

      targetQuantity:
        habit.targetQuantity ||
        1,

      unit:
        habit.unit || '',

      frequency:
        habit.frequency ||
        'daily',

      daysOfWeek:
        cleanDays(
          habit.daysOfWeek
        ),
    });

    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingHabit(null);

    setFormData({
      ...EMPTY_FORM,
      daysOfWeek: [],
    });

    setError('');
  };

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    if (
      name === 'frequency'
    ) {
      setFormData(
        (previous) => {
          if (
            value ===
            'weekly'
          ) {
            const currentDay =
              new Date().getDay();

            return {
              ...previous,
              frequency:
                value,
              daysOfWeek: [
                previous
                  .daysOfWeek?.[0] ??
                  currentDay,
              ],
            };
          }

          if (
            value ===
            'custom'
          ) {
            return {
              ...previous,
              frequency:
                value,
              daysOfWeek:
                previous
                  .daysOfWeek
                  ?.length
                  ? previous.daysOfWeek
                  : [
                      new Date().getDay(),
                    ],
            };
          }

          return {
            ...previous,
            frequency:
              value,
            daysOfWeek: [],
          };
        }
      );

      return;
    }

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  const toggleScheduleDay = (
    value
  ) => {
    setFormData(
      (previous) => {
        const current =
          cleanDays(
            previous.daysOfWeek
          );

        if (
          previous.frequency ===
          'weekly'
        ) {
          return {
            ...previous,
            daysOfWeek: [
              value,
            ],
          };
        }

        if (
          current.includes(
            value
          )
        ) {
          return {
            ...previous,
            daysOfWeek:
              current.filter(
                (day) =>
                  day !== value
              ),
          };
        }

        return {
          ...previous,
          daysOfWeek:
            cleanDays([
              ...current,
              value,
            ]),
        };
      }
    );
  };

  const saveHabit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.name.trim()
    ) {
      setError(
        'Habit name is required.'
      );

      return;
    }

    if (
      formData.frequency ===
        'custom' &&
      formData.daysOfWeek
        .length === 0
    ) {
      setError(
        'Custom schedule ke liye kam se kam ek day select karo.'
      );

      return;
    }

    if (
      formData.frequency ===
        'weekly' &&
      formData.daysOfWeek
        .length === 0
    ) {
      setError(
        'Weekly habit ke liye ek day select karo.'
      );

      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name:
          formData.name.trim(),

        description:
          formData.description.trim(),

        category:
          formData.category,

        trackingType:
          formData.trackingType,

        targetQuantity:
          Number(
            formData.targetQuantity
          ) || 1,

        unit:
          formData.unit.trim(),

        frequency:
          formData.frequency,

        daysOfWeek:
          cleanDays(
            formData.daysOfWeek
          ),
      };

      if (editingHabit) {
        const updated =
          await apiRequest(
            `/habits/${editingHabit._id}`,
            {
              method: 'PUT',

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        setHabits(
          (previous) =>
            previous.map(
              (habit) =>
                habit._id ===
                updated._id
                  ? updated
                  : habit
            )
        );
      } else {
        const created =
          await apiRequest(
            '/habits',
            {
              method: 'POST',

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        setHabits(
          (previous) => [
            ...previous,
            created,
          ]
        );
      }

      setShowModal(false);
      setEditingHabit(null);

      setFormData({
        ...EMPTY_FORM,
        daysOfWeek: [],
      });
    } catch (err) {
      setError(
        err.message
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleHabit = async (
    habit,
    date = selectedDate
  ) => {
    if (
      !isHabitScheduled(
        habit,
        date
      )
    ) {
      setError(
        'Ye habit is din scheduled nahi hai.'
      );

      return;
    }

    const existingLog =
      getLog(
        habit,
        date
      );

    const completed =
      !existingLog?.completed;

    try {
      setError('');

      const updated =
        await apiRequest(
          `/habits/${habit._id}/log`,
          {
            method:
              'PATCH',

            body:
              JSON.stringify({
                date,
                completed,

                quantity:
                  existingLog
                    ?.quantity ||
                  0,
              }),
          }
        );

      setHabits(
        (previous) =>
          previous.map(
            (item) =>
              item._id ===
              updated._id
                ? updated
                : item
          )
      );
    } catch (err) {
      setError(
        err.message
      );
    }
  };

  const updateQuantity =
    async (
      habit,
      date,
      quantity
    ) => {
      if (
        !isHabitScheduled(
          habit,
          date
        )
      ) {
        setError(
          'Ye habit is din scheduled nahi hai.'
        );

        return;
      }

      const numeric =
        Math.max(
          0,
          Number(
            quantity
          ) || 0
        );

      try {
        setError('');

        const updated =
          await apiRequest(
            `/habits/${habit._id}/log`,
            {
              method:
                'PATCH',

              body:
                JSON.stringify({
                  date,
                  quantity:
                    numeric,
                }),
            }
          );

        setHabits(
          (previous) =>
            previous.map(
              (item) =>
                item._id ===
                updated._id
                  ? updated
                  : item
            )
        );

        const key =
          `${habit._id}-${date}`;

        setQuantityInputs(
          (previous) => ({
            ...previous,
            [key]:
              numeric,
          })
        );
      } catch (err) {
        setError(
          err.message
        );
      }
    };

  const deleteHabit = async (
    habit
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${habit.name}" permanently?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      await apiRequest(
        `/habits/${habit._id}`,
        {
          method:
            'DELETE',
        }
      );

      setHabits(
        (previous) =>
          previous.filter(
            (item) =>
              item._id !==
              habit._id
          )
      );
    } catch (err) {
      setError(
        err.message
      );
    }
  };

  const getHabitPercentage = (
    habit
  ) => {
    const log =
      getLog(
        habit,
        selectedDate
      );

    if (
      habit.trackingType ===
      'quantity'
    ) {
      const quantity =
        Number(
          log?.quantity ||
            0
        );

      return Math.min(
        100,
        Math.round(
          (quantity /
            Math.max(
              1,
              Number(
                habit.targetQuantity ||
                  1
              )
            )) *
            100
        )
      );
    }

    return log?.completed
      ? 100
      : 0;
  };

  return (
    <main className="habits-page">
      <header className="habits-header">
        <div>
          <button
            type="button"
            className="habit-secondary-button"
            onClick={() =>
              navigate(
                '/dashboard'
              )
            }
            style={{
              marginBottom:
                '18px',
            }}
          >
            ← Dashboard
          </button>

          <p className="habits-kicker">
            DAILY SYSTEM
          </p>

          <h1>
            Build better days.
          </h1>

          <p className="habits-subtitle">
            Track the small actions
            that compound into big
            results.
          </p>
        </div>

        <button
          className="habits-primary-button"
          type="button"
          onClick={openCreate}
        >
          <span>+</span>
          New Habit
        </button>
      </header>

      {error && (
        <div className="habits-alert">
          {error}
        </div>
      )}

      <section className="habit-stat-grid">
        <article className="habit-stat-card featured">
          <span>
            TODAY&apos;S SCORE
          </span>

          <strong>
            {todayStats.percentage}%
          </strong>

          <p>
            {todayStats.completed} of{' '}
            {todayStats.total}{' '}
            scheduled habits completed
          </p>

          <div className="habit-stat-bar">
            <span
              style={{
                width: `${todayStats.percentage}%`,
              }}
            />
          </div>
        </article>

        <article className="habit-stat-card">
          <span>
            ACTIVE HABITS
          </span>

          <strong>
            {activeHabits.length}
          </strong>

          <p>
            routines in your system
          </p>
        </article>

        <article className="habit-stat-card">
          <span>
            TOTAL STREAK
          </span>

          <strong>
            {totalStreak}
          </strong>

          <p>
            combined active streak
          </p>
        </article>

        <article className="habit-stat-card">
          <span>
            14-DAY CONSISTENCY
          </span>

          <strong>
            {consistencyScore}%
          </strong>

          <p>
            scheduled completion rate
          </p>
        </article>
      </section>

      <section className="habit-calendar">
        <div className="habit-section-title">
          <div>
            <p className="habits-kicker">
              HISTORY
            </p>

            <h2>
              Your rhythm
            </h2>
          </div>

          <span>
            Last 14 days
          </span>
        </div>

        <div className="habit-day-strip">
          {days.map(
            (day) => {
              const stats =
                getStatsForDate(
                  day.key
                );

              const isToday =
                day.key ===
                getToday();

              const isSelected =
                day.key ===
                selectedDate;

              return (
                <button
                  type="button"
                  key={day.key}
                  className={`habit-day ${
                    isToday
                      ? 'today'
                      : ''
                  } ${
                    isSelected
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setSelectedDate(
                      day.key
                    )
                  }
                >
                  <span>
                    {day.day}
                  </span>

                  <strong>
                    {day.number}
                  </strong>

                  <small>
                    {stats.completed}/
                    {stats.total}
                  </small>
                </button>
              );
            }
          )}
        </div>
      </section>

      <section className="habits-workspace">
        <div className="habits-toolbar">
          <div>
            <p className="habits-kicker">
              {selectedDate ===
              getToday()
                ? 'TODAY'
                : formatDate(
                    selectedDate
                  )}
            </p>

            <h2>
              Scheduled habits
            </h2>
          </div>

          <div className="habits-controls">
            <div className="habits-search">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Search habits..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target
                      .value
                  )
                }
              />
            </div>

            <select
              value={
                categoryFilter
              }
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value
                )
              }
            >
              <option value="all">
                All categories
              </option>

              {CATEGORIES.map(
                (category) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="habits-empty">
            Loading habits...
          </div>
        ) : scheduledHabits.length ===
          0 ? (
          <div className="habits-empty">
            <div className="habits-empty-icon">
              +
            </div>

            <h3>
              No habits scheduled
            </h3>

            <p>
              No active routines are
              scheduled for this day.
            </p>

            <button
              className="habits-primary-button"
              type="button"
              onClick={openCreate}
            >
              + Create Habit
            </button>
          </div>
        ) : (
          <div className="habits-list">
            {scheduledHabits.map(
              (habit) => {
                const log =
                  getLog(
                    habit,
                    selectedDate
                  );

                const percentage =
                  getHabitPercentage(
                    habit
                  );

                const frequencyLabel =
                  getFrequencyLabel(
                    habit
                  );

                return (
                  <article
                    className={`habit-row ${
                      log?.completed
                        ? 'completed'
                        : ''
                    }`}
                    key={
                      habit._id
                    }
                  >
                    <div className="habit-main">
                      <button
                        type="button"
                        className={`habit-check ${
                          log?.completed
                            ? 'checked'
                            : ''
                        }`}
                        onClick={() =>
                          habit.trackingType ===
                          'boolean'
                            ? toggleHabit(
                                habit
                              )
                            : updateQuantity(
                                habit,
                                selectedDate,
                                habit.targetQuantity
                              )
                        }
                      >
                        {log?.completed
                          ? '✓'
                          : ''}
                      </button>

                      <div className="habit-name-area">
                        <div className="habit-name-line">
                          <h3>
                            {habit.name}
                          </h3>

                          <span className="habit-category">
                            {
                              habit.category
                            }
                          </span>
                        </div>

                        <p>
                          {habit.description ||
                            frequencyLabel}
                        </p>
                      </div>
                    </div>

                    <div className="habit-middle">
                      {habit.trackingType ===
                      'quantity' ? (
                        <div className="quantity-control">
                          <input
                            type="number"
                            min="0"
                            value={
                              quantityInputs[
                                `${habit._id}-${selectedDate}`
                              ] ??
                              log?.quantity ??
                              0
                            }
                            onChange={(e) =>
                              setQuantityInputs(
                                (
                                  previous
                                ) => ({
                                  ...previous,

                                  [`${habit._id}-${selectedDate}`]:
                                    e.target
                                      .value,
                                })
                              )
                            }
                            onBlur={() => {
                              const key =
                                `${habit._id}-${selectedDate}`;

                              updateQuantity(
                                habit,
                                selectedDate,
                                quantityInputs[
                                  key
                                ] ??
                                  log?.quantity ??
                                  0
                              );
                            }}
                          />

                          <span>
                            /{' '}
                            {
                              habit.targetQuantity
                            }{' '}
                            {
                              habit.unit
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="habit-progress-wrap">
                          <div className="habit-progress-label">
                            <span>
                              {
                                percentage
                              }
                              %
                            </span>

                            <span>
                              {
                                frequencyLabel
                              }
                            </span>
                          </div>

                          <div className="habit-progress">
                            <span
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="habit-streak">
                      <strong>
                        🔥{' '}
                        {habit.currentStreak ||
                          0}
                      </strong>

                      <span>
                        current streak
                      </span>
                    </div>

                    <div className="habit-actions">
                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            habit
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="habit-delete"
                        onClick={() =>
                          deleteHabit(
                            habit
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="habit-insight-grid">
        <article className="habit-insight">
          <div>
            <p className="habits-kicker">
              CONSISTENCY
            </p>

            <h2>
              Keep the chain alive.
            </h2>

            <p>
              Best current record is{' '}
              <strong>
                {longestStreak}
              </strong>{' '}
              scheduled completions in
              a row.
            </p>
          </div>

          <div className="insight-ring">
            <span>
              {todayStats.percentage}%
            </span>
          </div>
        </article>

        <article className="habit-insight">
          <div>
            <p className="habits-kicker">
              SELECTED DAY
            </p>

            <h2>
              {formatDate(
                selectedDate
              )}
            </h2>

            <p>
              {selectedStats.total ===
              0
                ? 'No habits are scheduled for this day.'
                : `${selectedStats.completed} of ${selectedStats.total} scheduled habits completed.`}
            </p>
          </div>

          <button
            type="button"
            className="habit-secondary-button"
            onClick={() =>
              setSelectedDate(
                getToday()
              )
            }
          >
            Today
          </button>
        </article>
      </section>

      {showModal && (
        <div
          className="habit-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section className="habit-modal">
            <div className="habit-modal-header">
              <div>
                <p className="habits-kicker">
                  {editingHabit
                    ? 'EDIT ROUTINE'
                    : 'NEW ROUTINE'}
                </p>

                <h2>
                  {editingHabit
                    ? 'Update habit'
                    : 'Create a habit'}
                </h2>
              </div>

              <button
                type="button"
                className="habit-close"
                onClick={
                  closeModal
                }
              >
                ×
              </button>
            </div>

            {error && (
              <div className="habits-alert">
                {error}
              </div>
            )}

            <form
              className="habit-form"
              onSubmit={
                saveHabit
              }
            >
              <label>
                Habit name

                <input
                  name="name"
                  type="text"
                  placeholder="Study JavaScript"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  autoFocus
                  maxLength="80"
                />
              </label>

              <label>
                Description

                <textarea
                  name="description"
                  placeholder="What does this habit mean to you?"
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                  rows="3"
                />
              </label>

              <div className="habit-form-grid">
                <label>
                  Category

                  <select
                    name="category"
                    value={
                      formData.category
                    }
                    onChange={
                      handleChange
                    }
                  >
                    {CATEGORIES.map(
                      (
                        category
                      ) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Frequency

                  <select
                    name="frequency"
                    value={
                      formData.frequency
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="daily">
                      Every day
                    </option>

                    <option value="weekdays">
                      Weekdays
                    </option>

                    <option value="weekly">
                      Every week
                    </option>

                    <option value="custom">
                      Custom days
                    </option>
                  </select>
                </label>
              </div>

              {(formData.frequency ===
                'weekly' ||
                formData.frequency ===
                  'custom') && (
                <div
                  style={{
                    display:
                      'grid',
                    gap: '10px',
                  }}
                >
                  <span>
                    {formData.frequency ===
                    'weekly'
                      ? 'Choose weekly day'
                      : 'Choose days'}
                  </span>

                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        'repeat(7, minmax(0, 1fr))',

                      gap: '8px',
                    }}
                  >
                    {WEEK_DAYS.map(
                      (day) => {
                        const selected =
                          formData.daysOfWeek.includes(
                            day.value
                          );

                        return (
                          <button
                            key={
                              day.value
                            }
                            type="button"
                            className={`habit-secondary-button ${
                              selected
                                ? 'selected'
                                : ''
                            }`}
                            onClick={() =>
                              toggleScheduleDay(
                                day.value
                              )
                            }
                            style={{
                              padding:
                                '10px 5px',

                              opacity:
                                selected
                                  ? 1
                                  : 0.65,

                              borderColor:
                                selected
                                  ? 'currentColor'
                                  : undefined,
                            }}
                          >
                            {
                              day.short
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="habit-tracking-choice">
                <button
                  type="button"
                  className={
                    formData.trackingType ===
                    'boolean'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setFormData(
                      (
                        previous
                      ) => ({
                        ...previous,

                        trackingType:
                          'boolean',
                      })
                    )
                  }
                >
                  <strong>
                    ✓
                  </strong>

                  <span>
                    Yes / No
                  </span>

                  <small>
                    Simple check
                  </small>
                </button>

                <button
                  type="button"
                  className={
                    formData.trackingType ===
                    'quantity'
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setFormData(
                      (
                        previous
                      ) => ({
                        ...previous,

                        trackingType:
                          'quantity',
                      })
                    )
                  }
                >
                  <strong>
                    #
                  </strong>

                  <span>
                    Quantity
                  </span>

                  <small>
                    Track a number
                  </small>
                </button>
              </div>

              {formData.trackingType ===
                'quantity' && (
                <div className="habit-form-grid">
                  <label>
                    Target

                    <input
                      name="targetQuantity"
                      type="number"
                      min="1"
                      value={
                        formData.targetQuantity
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </label>

                  <label>
                    Unit

                    <input
                      name="unit"
                      type="text"
                      placeholder="pages, glasses, minutes..."
                      value={
                        formData.unit
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </label>
                </div>
              )}

              <div className="habit-modal-actions">
                <button
                  type="button"
                  className="habit-secondary-button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="habits-primary-button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingHabit
                      ? 'Save Changes'
                      : 'Create Habit'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Habits;