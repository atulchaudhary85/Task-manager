import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import API_URL from '../config';

const getTodayInput = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(
    now.getTime() - offset * 60 * 1000
  )
    .toISOString()
    .split('T')[0];
};

const EMPTY_FORM = {
  title: '',
  description: '',
  taskDate: getTodayInput(),
  deadline: '',
  status: 'todo',
  priority: 'medium',
  category: 'General',
  estimatedMinutes: '',
  progress: 0,
  notes: '',
  tags: '',
  recurringEnabled: false,
  recurringFrequency: 'daily',
  recurringInterval: 1,
  recurringEndDate: '',
  reminderEnabled: false,
  remindAt: '',
  subtasks: [],
};

const COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    icon: '○',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    icon: '◐',
  },
  {
    id: 'done',
    title: 'Completed',
    icon: '✓',
  },
  {
    id: 'missed',
    title: 'Missed',
    icon: '!',
  },
];

const PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
];

const pad = (value) =>
  String(value).padStart(2, '0');

const dateKey = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
};

const formatDate = (value) => {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatShortDate = (value) => {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No deadline';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

function Dashboard() {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const [tasks, setTasks] = useState([]);

  const [formData, setFormData] =
    useState(EMPTY_FORM);

  const [editingTask, setEditingTask] =
    useState(null);

  const [draggedTaskId, setDraggedTaskId] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [activeView, setActiveView] =
    useState('today');

  const [selectedDate, setSelectedDate] =
    useState(getTodayInput());

  const [searchQuery, setSearchQuery] =
    useState('');

  const [priorityFilter, setPriorityFilter] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem('user')
    );
  } catch {
    user = null;
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login', {
      replace: true,
    });
  }, [navigate]);

  const apiRequest = useCallback(
    async (url, options = {}) => {
      const response = await fetch(
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
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.status === 401) {
        logout();

        throw new Error(
          'Session expired. Please login again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Something went wrong.'
        );
      }

      return data;
    },
    [token, logout]
  );

  const fetchTasks = useCallback(
    async () => {
      try {
        setLoading(true);
        setError('');

        const [activeData, archivedData] =
          await Promise.all([
            apiRequest('/tasks'),
            apiRequest('/tasks/archived'),
          ]);

        const activeTasks =
          Array.isArray(activeData)
            ? activeData
            : [];

        const archivedTasks =
          Array.isArray(archivedData)
            ? archivedData
            : [];

        const mergedTasks = [
          ...activeTasks,
          ...archivedTasks,
        ];

        const uniqueTasks =
          Array.from(
            new Map(
              mergedTasks.map((task) => [
                task._id,
                task,
              ])
            ).values()
          );

        setTasks(uniqueTasks);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token, fetchTasks]);

  const todayKey = getTodayInput();

  const stats = useMemo(() => {
    const activeTasks =
      tasks.filter(
        (task) => !task.archived
      );

    const total = activeTasks.length;

    const completed =
      activeTasks.filter(
        (task) =>
          task.status === 'done'
      ).length;

    const inProgress =
      activeTasks.filter(
        (task) =>
          task.status === 'in-progress'
      ).length;

    const missed =
      activeTasks.filter(
        (task) =>
          task.status === 'missed'
      ).length;

    const todayTasks =
      activeTasks.filter(
        (task) =>
          dateKey(task.taskDate) ===
          todayKey
      );

    const todayCompleted =
      todayTasks.filter(
        (task) =>
          task.status === 'done'
      ).length;

    const now = new Date();

    const overdue =
      activeTasks.filter((task) => {
        if (
          !task.deadline ||
          task.status === 'done'
        ) {
          return false;
        }

        return (
          new Date(task.deadline) < now
        );
      }).length;

    const completionRate =
      total === 0
        ? 0
        : Math.round(
            (completed / total) * 100
          );

    const todayRate =
      todayTasks.length === 0
        ? 0
        : Math.round(
            (todayCompleted /
              todayTasks.length) *
              100
          );

    return {
      total,
      completed,
      inProgress,
      missed,
      overdue,
      todayTotal: todayTasks.length,
      todayCompleted,
      completionRate,
      todayRate,
    };
  }, [tasks, todayKey]);

  const weekDays = useMemo(() => {
    const days = [];

    const selected =
      new Date(
        `${selectedDate}T12:00:00`
      );

    for (let i = -3; i <= 3; i += 1) {
      const date =
        new Date(selected);

      date.setDate(
        selected.getDate() + i
      );

      days.push({
        key: dateKey(date),
        day: date.toLocaleDateString(
          'en-IN',
          {
            weekday: 'short',
          }
        ),
        number: date.getDate(),
        month: date.toLocaleDateString(
          'en-IN',
          {
            month: 'short',
          }
        ),
      });
    }

    return days;
  }, [selectedDate]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeView === 'today') {
      result = result.filter(
        (task) =>
          dateKey(task.taskDate) ===
            todayKey ||
          (!task.taskDate &&
            dateKey(task.deadline) ===
              todayKey)
      );
    }

    if (activeView === 'calendar') {
      result = result.filter(
        (task) =>
          dateKey(task.taskDate) ===
            selectedDate ||
          (!task.taskDate &&
            dateKey(task.deadline) ===
              selectedDate)
      );
    }

    if (activeView === 'upcoming') {
      const today =
        new Date(
          `${todayKey}T00:00:00`
        );

      result = result.filter(
        (task) => {
          const value =
            task.taskDate ||
            task.deadline;

          if (!value) {
            return false;
          }

          return (
            new Date(value) > today &&
            task.status !== 'done'
          );
        }
      );
    }

    if (activeView === 'completed') {
      result = result.filter(
        (task) =>
          task.status === 'done'
      );
    }

    if (activeView === 'overdue') {
      result = result.filter(
        (task) =>
          task.deadline &&
          task.status !== 'done' &&
          dateKey(task.deadline) < todayKey
      );
    }

    if (activeView === 'archived') {
      result = result.filter(
        (task) => Boolean(task.archived)
      );
    } else {
      result = result.filter(
        (task) => !task.archived
      );
    }

    if (searchQuery.trim()) {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      result = result.filter(
        (task) =>
          task.title
            ?.toLowerCase()
            .includes(query) ||
          task.description
            ?.toLowerCase()
            .includes(query) ||
          task.category
            ?.toLowerCase()
            .includes(query) ||
          task.tags?.some((tag) =>
            String(tag)
              .toLowerCase()
              .includes(query)
          )
      );
    }

    if (priorityFilter !== 'all') {
      result = result.filter(
        (task) =>
          task.priority ===
          priorityFilter
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(
        (task) =>
          task.status ===
          statusFilter
      );
    }

    return result;
  }, [
    tasks,
    activeView,
    selectedDate,
    todayKey,
    searchQuery,
    priorityFilter,
    statusFilter,
  ]);

  const tasksByStatus =
    useMemo(() => {
      return {
        todo:
          filteredTasks.filter(
            (task) =>
              task.status === 'todo'
          ),

        'in-progress':
          filteredTasks.filter(
            (task) =>
              task.status ===
              'in-progress'
          ),

        done:
          filteredTasks.filter(
            (task) =>
              task.status === 'done'
          ),

        missed:
          filteredTasks.filter(
            (task) =>
              task.status === 'missed'
          ),
      };
    }, [filteredTasks]);

  const todayTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            !task.archived &&
            (dateKey(task.taskDate) ===
              todayKey ||
              (!task.taskDate &&
                dateKey(task.deadline) ===
                  todayKey))
        ),
      [tasks, todayKey]
    );

  const upcomingTasks =
    useMemo(() => {
      const now = new Date();

      return tasks
        .filter((task) => {
          if (
            task.archived ||
            task.status === 'done'
          ) {
            return false;
          }

          const value =
            task.deadline ||
            task.taskDate;

          if (!value) {
            return false;
          }

          return (
            new Date(value) > now
          );
        })
        .sort(
          (a, b) =>
            new Date(
              a.deadline ||
                a.taskDate
            ) -
            new Date(
              b.deadline ||
                b.taskDate
            )
        )
        .slice(0, 5);
    }, [tasks]);

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const openCreateModal = (
    date = selectedDate
  ) => {
    setEditingTask(null);

    setFormData({
      ...EMPTY_FORM,
      taskDate:
        date || getTodayInput(),
    });

    setError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);

    setFormData({
      title: task.title || '',

      description:
        task.description || '',

      taskDate:
        dateKey(task.taskDate) || '',

      deadline:
        dateKey(task.deadline) || '',

      status:
        task.status || 'todo',

      priority:
        task.priority || 'medium',

      category:
        task.category || 'General',

      estimatedMinutes:
        task.estimatedMinutes || '',

      progress:
        task.progress || 0,

      notes:
        task.notes || '',

      tags:
        Array.isArray(task.tags)
          ? task.tags.join(', ')
          : '',

      recurringEnabled:
        Boolean(
          task.recurring?.enabled
        ),

      recurringFrequency:
        task.recurring?.frequency ===
        'none'
          ? 'daily'
          : task.recurring
              ?.frequency || 'daily',

      recurringInterval:
        task.recurring?.interval || 1,

      recurringEndDate:
        dateKey(task.recurring?.endDate) || '',

      reminderEnabled:
        Boolean(task.reminder?.enabled),

      remindAt:
        task.reminder?.remindAt
          ? (() => {
              const value = new Date(
                task.reminder.remindAt
              );

              const offset =
                value.getTimezoneOffset();

              return new Date(
                value.getTime() -
                  offset * 60 * 1000
              )
                .toISOString()
                .slice(0, 16);
            })()
          : '',

      subtasks:
        Array.isArray(task.subtasks)
          ? task.subtasks.map(
              (subtask) => ({
                _id:
                  subtask._id,
                title:
                  subtask.title,
                completed:
                  Boolean(
                    subtask.completed
                  ),
              })
            )
          : [],
    });

    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingTask(null);

    setFormData({
      ...EMPTY_FORM,
      taskDate: getTodayInput(),
    });

    setError('');
  };

  const handleFormChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));
  };

  const addSubtask = () => {
    setFormData((prev) => ({
      ...prev,

      subtasks: [
        ...prev.subtasks,
        {
          title: '',
          completed: false,
        },
      ],
    }));
  };

  const changeSubtask = (
    index,
    value
  ) => {
    setFormData((prev) => ({
      ...prev,

      subtasks:
        prev.subtasks.map(
          (subtask, subtaskIndex) =>
            subtaskIndex === index
              ? {
                  ...subtask,
                  title: value,
                }
              : subtask
        ),
    }));
  };

  const removeSubtask = (index) => {
    setFormData((prev) => ({
      ...prev,

      subtasks:
        prev.subtasks.filter(
          (_, subtaskIndex) =>
            subtaskIndex !== index
        ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title =
      formData.title.trim();

    if (!title) {
      setError(
        'Task title is required.'
      );

      return;
    }

    const payload = {
      title,

      description:
        formData.description.trim(),

      taskDate:
        formData.taskDate || null,

      deadline:
        formData.deadline || null,

      status:
        formData.status,

      priority:
        formData.priority,

      category:
        formData.category.trim() ||
        'General',

      estimatedMinutes:
        Number(
          formData.estimatedMinutes
        ) || 0,

      progress:
        Number(
          formData.progress
        ) || 0,

      notes:
        formData.notes.trim(),

      tags:
        formData.tags
          .split(',')
          .map((tag) =>
            tag.trim()
          )
          .filter(Boolean),

      subtasks:
        formData.subtasks
          .filter((subtask) =>
            subtask.title.trim()
          )
          .map((subtask) => ({
            title:
              subtask.title.trim(),

            completed:
              Boolean(
                subtask.completed
              ),
          })),

      recurring: {
        enabled:
          formData.recurringEnabled,

        frequency:
          formData.recurringEnabled
            ? formData
                .recurringFrequency
            : 'none',

        interval:
          Number(formData.recurringInterval) || 1,

        daysOfWeek: [],

        endDate:
          formData.recurringEndDate || null,
      },

      reminder: {
        enabled: formData.reminderEnabled,
        remindAt:
          formData.reminderEnabled &&
          formData.remindAt
            ? new Date(formData.remindAt).toISOString()
            : null,
      },
    };

    try {
      setSaving(true);
      setError('');

      if (editingTask) {
        const updatedTask =
          await apiRequest(
            `/tasks/${editingTask._id}`,
            {
              method: 'PUT',

              body: JSON.stringify(
                payload
              ),
            }
          );

        setTasks((prev) =>
          prev.map((task) =>
            task._id ===
            updatedTask._id
              ? updatedTask
              : task
          )
        );
      } else {
        const createdTask =
          await apiRequest(
            '/tasks',
            {
              method: 'POST',

              body: JSON.stringify(
                payload
              ),
            }
          );

        setTasks((prev) => [
          createdTask,
          ...prev,
        ]);
      }

      setShowModal(false);
      setEditingTask(null);

      setFormData({
        ...EMPTY_FORM,
        taskDate: getTodayInput(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete =
    async (taskId) => {
      const confirmed =
        window.confirm(
          'Delete this task permanently?'
        );

      if (!confirmed) {
        return;
      }

      try {
        setError('');

        await apiRequest(
          `/tasks/${taskId}`,
          {
            method: 'DELETE',
          }
        );

        setTasks((prev) =>
          prev.filter(
            (task) =>
              task._id !== taskId
          )
        );
      } catch (err) {
        setError(err.message);
      }
    };

  const handleArchive = async (task) => {
    try {
      setError('');

      const updatedTask = await apiRequest(
        `/tasks/${task._id}/archive`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            archived: !task.archived,
          }),
        }
      );

      setTasks((prev) =>
        prev.map((item) =>
          item._id === updatedTask._id
            ? updatedTask
            : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const updateTaskStatus =
    async (task, newStatus) => {
      const previousTasks =
        tasks;

      setTasks((prev) =>
        prev.map((item) =>
          item._id === task._id
            ? {
                ...item,
                status: newStatus,
                progress:
                  newStatus === 'done'
                    ? 100
                    : item.progress,
              }
            : item
        )
      );

      try {
        setError('');

        const updatedTask =
          await apiRequest(
            `/tasks/${task._id}/status`,
            {
              method: 'PATCH',

              body: JSON.stringify({
                status: newStatus,
              }),
            }
          );

        setTasks((prev) =>
          prev.map((item) =>
            item._id ===
            updatedTask._id
              ? updatedTask
              : item
          )
        );
      } catch (err) {
        setTasks(previousTasks);
        setError(err.message);
      }
    };

  const handleDrop =
    async (newStatus) => {
      if (!draggedTaskId) {
        return;
      }

      const task = tasks.find(
        (item) =>
          item._id ===
          draggedTaskId
      );

      setDraggedTaskId(null);

      if (
        !task ||
        task.status === newStatus
      ) {
        return;
      }

      await updateTaskStatus(
        task,
        newStatus
      );
    };

  const quickComplete = (
    task
  ) => {
    updateTaskStatus(
      task,
      task.status === 'done'
        ? 'todo'
        : 'done'
    );
  };

  const selectDay = (key) => {
    setSelectedDate(key);
    setActiveView('calendar');
  };

  const getDeadlineClass = (
    task
  ) => {
    if (!task.deadline) {
      return 'normal';
    }

    if (task.status === 'done') {
      return 'complete';
    }

    const deadline =
      new Date(task.deadline);

    const now = new Date();

    if (deadline < now) {
      return 'overdue';
    }

    if (
      dateKey(deadline) ===
      todayKey
    ) {
      return 'today';
    }

    return 'normal';
  };

  const renderTaskCard = (
    task,
    columnTitle
  ) => {
    const subtaskTotal =
      task.subtasks?.length || 0;

    const subtaskDone =
      task.subtasks?.filter(
        (subtask) =>
          subtask.completed
      ).length || 0;

    return (
      <article
        className={`pro-task-card ${
          draggedTaskId === task._id
            ? 'dragging'
            : ''
        }`}
        key={task._id}
        draggable
        onDragStart={() =>
          setDraggedTaskId(task._id)
        }
        onDragEnd={() =>
          setDraggedTaskId(null)
        }
      >
        <div className="pro-task-top">
          <div className="task-chip-row">
            <span
              className={`priority-chip priority-${task.priority || 'medium'}`}
            >
              {task.priority ||
                'medium'}
            </span>

            {task.category && (
              <span className="category-chip">
                {task.category}
              </span>
            )}
          </div>

          <span className="drag-handle">
            ⋮⋮
          </span>
        </div>

        <div className="task-title-row">
          <button
            type="button"
            className={`task-check ${
              task.status === 'done'
                ? 'checked'
                : ''
            }`}
            onClick={() =>
              quickComplete(task)
            }
            aria-label="Toggle task completion"
          >
            {task.status === 'done'
              ? '✓'
              : ''}
          </button>

          <h3>{task.title}</h3>
        </div>

        {task.description && (
          <p className="task-description">
            {task.description}
          </p>
        )}

        {subtaskTotal > 0 && (
          <div className="subtask-progress">
            <div className="subtask-progress-head">
              <span>
                Checklist
              </span>

              <span>
                {subtaskDone}/
                {subtaskTotal}
              </span>
            </div>

            <div className="mini-progress">
              <span
                style={{
                  width: `${
                    subtaskTotal
                      ? Math.round(
                          (subtaskDone /
                            subtaskTotal) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {Number(task.progress) > 0 &&
          subtaskTotal === 0 && (
            <div className="subtask-progress">
              <div className="subtask-progress-head">
                <span>
                  Progress
                </span>

                <span>
                  {task.progress}%
                </span>
              </div>

              <div className="mini-progress">
                <span
                  style={{
                    width: `${task.progress}%`,
                  }}
                />
              </div>
            </div>
          )}

        <div className="task-info-grid">
          <div>
            <span className="task-info-label">
              Day
            </span>

            <strong>
              {task.taskDate
                ? formatShortDate(
                    task.taskDate
                  )
                : 'Any day'}
            </strong>
          </div>

          <div
            className={`deadline-info ${getDeadlineClass(
              task
            )}`}
          >
            <span className="task-info-label">
              Due
            </span>

            <strong>
              {formatShortDate(
                task.deadline
              )}
            </strong>
          </div>
        </div>

        {task.tags?.length > 0 && (
          <div className="task-tags">
            {task.tags
              .slice(0, 3)
              .map((tag) => (
                <span key={tag}>
                  #{tag}
                </span>
              ))}
          </div>
        )}

        <div className="pro-task-footer">
          <span className="task-status-text">
            {columnTitle}
          </span>

          <div className="task-actions">
            <button
              type="button"
              onClick={() =>
                openEditModal(task)
              }
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() =>
                handleArchive(task)
              }
            >
              {task.archived
                ? 'Restore'
                : 'Archive'}
            </button>

            <button
              className="danger-button"
              type="button"
              onClick={() =>
                handleDelete(task._id)
              }
            >
              Delete
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="productivity-app">
      <aside className="productivity-sidebar">
        <div>
          <div className="productivity-brand">
            <span className="productivity-logo">
              TM
            </span>

            <div>
              <strong>
                Task Manager
              </strong>

              <span>
                Productivity OS
              </span>
            </div>
          </div>

          <nav className="productivity-nav">
            <button
              type="button"
              className={
                activeView === 'today'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView('today')
              }
            >
              <span>◉</span>
              Today
              <b>
                {stats.todayTotal}
              </b>
            </button>

            <button
              type="button"
              className={
                activeView === 'board'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView('board')
              }
            >
              <span>▦</span>
              All Tasks
              <b>{stats.total}</b>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/habits')
              }
            >
              <span>◇</span>
              Habits
            </button>

            <button
              type="button"
              className={
                activeView ===
                'calendar'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView(
                  'calendar'
                )
              }
            >
              <span>□</span>
              Calendar
            </button>

            <button
              type="button"
              className={
                activeView ===
                'upcoming'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView(
                  'upcoming'
                )
              }
            >
              <span>↗</span>
              Upcoming
            </button>

            <button
              type="button"
              className={
                activeView === 'overdue'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView('overdue')
              }
            >
              <span>!</span>
              Overdue
              <b>{stats.overdue}</b>
            </button>

            <button
              type="button"
              className={
                activeView ===
                'completed'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView(
                  'completed'
                )
              }
            >
              <span>✓</span>
              Completed
              <b>
                {stats.completed}
              </b>
            </button>

            <button
              type="button"
              className={
                activeView === 'archived'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveView('archived')
              }
            >
              <span>▣</span>
              Archive
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/analytics')
              }
            >
              <span>↗</span>
              Analytics
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/focus')
              }
            >
              <span>◎</span>
              Focus
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/settings')
              }
            >
              <span>⚙</span>
              Settings
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <div className="sidebar-progress-head">
              <span>
                Overall progress
              </span>

              <strong>
                {stats.completionRate}%
              </strong>
            </div>

            <div className="sidebar-progress-bar">
              <span
                style={{
                  width: `${stats.completionRate}%`,
                }}
              />
            </div>
          </div>

          <div className="sidebar-user">
            <span className="sidebar-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                'U'}
            </span>

            <div>
              <strong>
                {user?.name ||
                  'User'}
              </strong>

              <span>
                Personal workspace
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <section className="productivity-main">
        <header className="productivity-topbar">
          <div>
            <p className="dashboard-date">
              {new Date().toLocaleDateString(
                'en-IN',
                {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }
              )}
            </p>

            <h1>
              {getGreeting()}
              {user?.name
                ? `, ${user.name.split(' ')[0]}`
                : ''}
              .
            </h1>

            <p>
              Keep your day clear and
              finish what matters.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="dashboard-search">
              <span>⌕</span>

              <input
                type="search"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
              />
            </div>

            <button
              className="new-task-button"
              type="button"
              onClick={() =>
                openCreateModal(
                  activeView ===
                    'calendar'
                    ? selectedDate
                    : todayKey
                )
              }
            >
              <span>+</span>
              New Task
            </button>
          </div>
        </header>

        <div className="productivity-content">
          {error &&
            !showModal && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

          <section className="stats-grid">
            <article className="stat-card featured">
              <div className="stat-card-head">
                <span className="stat-icon">
                  ✓
                </span>

                <span>
                  TODAY
                </span>
              </div>

              <strong>
                {stats.todayCompleted}/
                {stats.todayTotal}
              </strong>

              <p>
                tasks completed today
              </p>

              <div className="stat-progress">
                <span
                  style={{
                    width: `${stats.todayRate}%`,
                  }}
                />
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card-head">
                <span className="stat-icon">
                  ◐
                </span>

                <span>
                  IN PROGRESS
                </span>
              </div>

              <strong>
                {stats.inProgress}
              </strong>

              <p>
                currently active
              </p>
            </article>

            <article
              className="stat-card"
              role="button"
              tabIndex="0"
              onClick={() =>
                setActiveView('overdue')
              }
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' ||
                  e.key === ' '
                ) {
                  setActiveView('overdue');
                }
              }}
            >
              <div className="stat-card-head">
                <span className="stat-icon">
                  !
                </span>

                <span>
                  OVERDUE
                </span>
              </div>

              <strong>
                {stats.overdue}
              </strong>

              <p>
                need your attention
              </p>
            </article>

            <article className="stat-card">
              <div className="stat-card-head">
                <span className="stat-icon">
                  ↗
                </span>

                <span>
                  PRODUCTIVITY
                </span>
              </div>

              <strong>
                {stats.completionRate}%
              </strong>

              <p>
                overall completion
              </p>
            </article>
          </section>

          <section className="day-strip-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  DAILY PLANNER
                </p>

                <h2>
                  Your week
                </h2>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSelectedDate(
                    todayKey
                  );

                  setActiveView(
                    'today'
                  );
                }}
              >
                Jump to today
              </button>
            </div>

            <div className="day-strip">
              {weekDays.map((day) => {
                const dayTasks =
                  tasks.filter(
                    (task) =>
                      !task.archived &&
                      dateKey(
                        task.taskDate
                      ) === day.key
                  );

                const completed =
                  dayTasks.filter(
                    (task) =>
                      task.status ===
                      'done'
                  ).length;

                const isToday =
                  day.key === todayKey;

                const isSelected =
                  day.key ===
                  selectedDate;

                return (
                  <button
                    type="button"
                    key={day.key}
                    className={`day-card ${
                      isToday
                        ? 'today'
                        : ''
                    } ${
                      isSelected
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      selectDay(
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
                      {day.month}
                    </small>

                    <div className="day-task-count">
                      {completed}/
                      {dayTasks.length}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="workspace-section">
            <div className="workspace-toolbar">
              <div>
                <p className="section-kicker">
                  {activeView === 'today'
                    ? 'TODAY'
                    : activeView ===
                        'calendar'
                      ? formatDate(
                          selectedDate
                        )
                      : activeView ===
                          'upcoming'
                        ? 'UPCOMING'
                        : activeView ===
                            'completed'
                          ? 'COMPLETED'
                          : activeView ===
                              'overdue'
                            ? 'OVERDUE'
                            : activeView ===
                                'archived'
                              ? 'ARCHIVED'
                              : 'WORKSPACE'}
                </p>

                <h2>
                  {activeView === 'today'
                    ? "Today's plan"
                    : activeView ===
                        'calendar'
                      ? 'Daily plan'
                      : activeView ===
                          'upcoming'
                        ? 'Coming up'
                        : activeView ===
                            'completed'
                          ? 'Finished work'
                          : activeView ===
                              'overdue'
                            ? 'Needs attention'
                            : activeView ===
                                'archived'
                              ? 'Archived tasks'
                              : 'All tasks'}
                </h2>

                <p>
                  {filteredTasks.length}{' '}
                  {filteredTasks.length ===
                  1
                    ? 'task'
                    : 'tasks'}{' '}
                  showing
                </p>
              </div>

              <div className="task-filters">
                <select
                  value={
                    priorityFilter
                  }
                  onChange={(e) =>
                    setPriorityFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="all">
                    All priorities
                  </option>

                  {PRIORITIES.map(
                    (priority) => (
                      <option
                        key={
                          priority
                        }
                        value={
                          priority
                        }
                      >
                        {priority
                          .charAt(0)
                          .toUpperCase() +
                          priority.slice(
                            1
                          )}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="all">
                    All status
                  </option>

                  <option value="todo">
                    To Do
                  </option>

                  <option value="in-progress">
                    In Progress
                  </option>

                  <option value="done">
                    Completed
                  </option>

                  <option value="missed">
                    Missed
                  </option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                Loading your workspace...
              </div>
            ) : filteredTasks.length ===
              0 ? (
              <div className="premium-empty-state">
                <div className="empty-state-icon">
                  +
                </div>

                <h3>
                  Nothing planned here
                  yet
                </h3>

                <p>
                  Add something you want
                  to finish and start
                  building your day.
                </p>

                <button
                  className="new-task-button"
                  type="button"
                  onClick={() =>
                    openCreateModal(
                      activeView ===
                        'calendar'
                        ? selectedDate
                        : todayKey
                    )
                  }
                >
                  + Add first task
                </button>
              </div>
            ) : (
              <div className="advanced-task-board">
                {COLUMNS.map(
                  (column) => (
                    <section
                      className={`advanced-task-column column-${column.id}`}
                      key={column.id}
                      onDragOver={(e) =>
                        e.preventDefault()
                      }
                      onDrop={() =>
                        handleDrop(
                          column.id
                        )
                      }
                    >
                      <div className="advanced-column-header">
                        <div>
                          <span className="column-symbol">
                            {
                              column.icon
                            }
                          </span>

                          <h3>
                            {
                              column.title
                            }
                          </h3>
                        </div>

                        <span className="column-number">
                          {
                            tasksByStatus[
                              column.id
                            ].length
                          }
                        </span>
                      </div>

                      <div className="advanced-column-body">
                        {tasksByStatus[
                          column.id
                        ].length ===
                        0 ? (
                          <div className="column-empty">
                            No tasks
                          </div>
                        ) : (
                          tasksByStatus[
                            column.id
                          ].map(
                            (task) =>
                              renderTaskCard(
                                task,
                                column.title
                              )
                          )
                        )}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}
          </section>

          <section className="dashboard-lower-grid">
            <article className="lower-panel">
              <div className="section-heading compact">
                <div>
                  <p className="section-kicker">
                    TODAY'S FOCUS
                  </p>

                  <h2>
                    Daily checklist
                  </h2>
                </div>

                <span className="panel-count">
                  {
                    todayTasks.length
                  }
                </span>
              </div>

              <div className="daily-checklist">
                {todayTasks.length ===
                0 ? (
                  <p className="panel-empty">
                    No tasks planned for
                    today.
                  </p>
                ) : (
                  todayTasks
                    .slice(0, 6)
                    .map((task) => (
                      <div
                        className="daily-check-item"
                        key={task._id}
                      >
                        <button
                          type="button"
                          className={`task-check ${
                            task.status ===
                            'done'
                              ? 'checked'
                              : ''
                          }`}
                          onClick={() =>
                            quickComplete(
                              task
                            )
                          }
                        >
                          {task.status ===
                          'done'
                            ? '✓'
                            : ''}
                        </button>

                        <div>
                          <strong
                            className={
                              task.status ===
                              'done'
                                ? 'completed-text'
                                : ''
                            }
                          >
                            {task.title}
                          </strong>

                          <span>
                            {
                              task.category
                            }
                            {' • '}
                            {
                              task.priority
                            }
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </article>

            <article className="lower-panel">
              <div className="section-heading compact">
                <div>
                  <p className="section-kicker">
                    NEXT
                  </p>

                  <h2>
                    Upcoming deadlines
                  </h2>
                </div>
              </div>

              <div className="upcoming-list">
                {upcomingTasks.length ===
                0 ? (
                  <p className="panel-empty">
                    No upcoming deadlines.
                  </p>
                ) : (
                  upcomingTasks.map(
                    (task) => (
                      <button
                        type="button"
                        className="upcoming-item"
                        key={task._id}
                        onClick={() =>
                          openEditModal(
                            task
                          )
                        }
                      >
                        <span
                          className={`upcoming-priority priority-${task.priority || 'medium'}`}
                        />

                        <div>
                          <strong>
                            {task.title}
                          </strong>

                          <span>
                            {formatDate(
                              task.deadline ||
                                task.taskDate
                            )}
                          </span>
                        </div>

                        <b>›</b>
                      </button>
                    )
                  )
                )}
              </div>
            </article>
          </section>
        </div>
      </section>

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            className="task-modal advanced-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingTask
                    ? 'EDIT TASK'
                    : 'PLAN SOMETHING'}
                </p>

                <h2>
                  {editingTask
                    ? 'Update task'
                    : 'Create a task'}
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={
                  closeModal
                }
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form
              className="task-form advanced-task-form"
              onSubmit={
                handleSubmit
              }
            >
              <div className="form-field full">
                <label htmlFor="task-title">
                  Task title
                </label>

                <input
                  id="task-title"
                  type="text"
                  name="title"
                  placeholder="What do you want to get done?"
                  value={
                    formData.title
                  }
                  onChange={
                    handleFormChange
                  }
                  maxLength="120"
                  autoFocus
                />
              </div>

              <div className="form-field full">
                <label htmlFor="task-description">
                  Description
                </label>

                <textarea
                  id="task-description"
                  name="description"
                  placeholder="Add useful details..."
                  value={
                    formData.description
                  }
                  onChange={
                    handleFormChange
                  }
                  rows="3"
                />
              </div>

              <div className="advanced-form-grid">
                <div className="form-field">
                  <label htmlFor="task-date">
                    Planned day
                  </label>

                  <input
                    id="task-date"
                    type="date"
                    name="taskDate"
                    value={
                      formData.taskDate
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="task-deadline">
                    Deadline
                  </label>

                  <input
                    id="task-deadline"
                    type="date"
                    name="deadline"
                    value={
                      formData.deadline
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="task-priority">
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    name="priority"
                    value={
                      formData.priority
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>

                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-status">
                    Status
                  </label>

                  <select
                    id="task-status"
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="todo">
                      To Do
                    </option>

                    <option value="in-progress">
                      In Progress
                    </option>

                    <option value="done">
                      Completed
                    </option>

                    <option value="missed">
                      Missed
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="task-category">
                    Category
                  </label>

                  <input
                    id="task-category"
                    type="text"
                    name="category"
                    placeholder="Work, Study, Personal..."
                    value={
                      formData.category
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="task-time">
                    Estimated minutes
                  </label>

                  <input
                    id="task-time"
                    type="number"
                    name="estimatedMinutes"
                    min="0"
                    placeholder="30"
                    value={
                      formData.estimatedMinutes
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>
              </div>

              <div className="form-field full">
                <div className="progress-label">
                  <label htmlFor="task-progress">
                    Progress
                  </label>

                  <span>
                    {formData.progress}%
                  </span>
                </div>

                <input
                  id="task-progress"
                  className="progress-range"
                  type="range"
                  name="progress"
                  min="0"
                  max="100"
                  step="5"
                  value={
                    formData.progress
                  }
                  onChange={
                    handleFormChange
                  }
                />
              </div>

              <div className="form-field full">
                <label htmlFor="task-tags">
                  Tags
                </label>

                <input
                  id="task-tags"
                  type="text"
                  name="tags"
                  placeholder="important, college, project"
                  value={
                    formData.tags
                  }
                  onChange={
                    handleFormChange
                  }
                />
              </div>

              <div className="form-field full">
                <div className="subtask-form-header">
                  <label>
                    Checklist
                  </label>

                  <button
                    type="button"
                    onClick={addSubtask}
                  >
                    + Add item
                  </button>
                </div>

                <div className="subtask-form-list">
                  {formData.subtasks.map(
                    (
                      subtask,
                      index
                    ) => (
                      <div
                        className="subtask-form-row"
                        key={
                          subtask._id ||
                          index
                        }
                      >
                        <input
                          type="text"
                          placeholder={`Checklist item ${
                            index + 1
                          }`}
                          value={
                            subtask.title
                          }
                          onChange={(e) =>
                            changeSubtask(
                              index,
                              e.target
                                .value
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeSubtask(
                              index
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <label className="recurring-toggle">
                <input
                  type="checkbox"
                  name="recurringEnabled"
                  checked={
                    formData.recurringEnabled
                  }
                  onChange={
                    handleFormChange
                  }
                />

                <span>
                  Repeat this task
                </span>
              </label>

              {formData.recurringEnabled && (
                <div className="advanced-form-grid">
                  <div className="form-field">
                    <label htmlFor="recurring-frequency">
                      Repeat
                    </label>

                    <select
                      id="recurring-frequency"
                      name="recurringFrequency"
                      value={
                        formData.recurringFrequency
                      }
                      onChange={
                        handleFormChange
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
                      <option value="monthly">
                        Every month
                      </option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="recurring-interval">
                      Every
                    </label>
                    <input
                      id="recurring-interval"
                      type="number"
                      min="1"
                      name="recurringInterval"
                      value={formData.recurringInterval}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="recurring-end">
                      Repeat until
                    </label>
                    <input
                      id="recurring-end"
                      type="date"
                      name="recurringEndDate"
                      value={formData.recurringEndDate}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              )}

              <label className="recurring-toggle">
                <input
                  type="checkbox"
                  name="reminderEnabled"
                  checked={formData.reminderEnabled}
                  onChange={handleFormChange}
                />
                <span>Remind me</span>
              </label>

              {formData.reminderEnabled && (
                <div className="form-field full">
                  <label htmlFor="task-reminder">
                    Reminder date & time
                  </label>
                  <input
                    id="task-reminder"
                    type="datetime-local"
                    name="remindAt"
                    value={formData.remindAt}
                    onChange={handleFormChange}
                  />
                </div>
              )}

              <div className="form-field full">
                <label htmlFor="task-notes">
                  Notes
                </label>

                <textarea
                  id="task-notes"
                  name="notes"
                  placeholder="Anything else you want to remember..."
                  value={
                    formData.notes
                  }
                  onChange={
                    handleFormChange
                  }
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
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
                  className="primary-button"
                  type="submit"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingTask
                      ? 'Save Changes'
                      : 'Create Task'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Dashboard;