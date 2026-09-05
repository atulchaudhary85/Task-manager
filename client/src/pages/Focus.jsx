import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useTheme,
} from '../ThemeContext';

import API_URL from '../config';

const PRESETS = [
  {
    label: '25 min',
    value: 25,
  },
  {
    label: '45 min',
    value: 45,
  },
  {
    label: '60 min',
    value: 60,
  },
];

const pad = (value) =>
  String(value).padStart(
    2,
    '0'
  );

function Focus() {
  const navigate =
    useNavigate();

  const {
    colors,
    resolvedTheme,
  } = useTheme();

  const intervalRef =
    useRef(null);

  const token =
    localStorage.getItem(
      'token'
    );

  const [tasks, setTasks] =
    useState([]);

  const [
    selectedTaskId,
    setSelectedTaskId,
  ] = useState('');

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(25);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(
    25 * 60
  );

  const [running, setRunning] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [
    completedSessions,
    setCompletedSessions,
  ] = useState(0);

  const apiRequest =
    useCallback(
      async (
        path,
        options = {}
      ) => {
        const response =
          await fetch(
            `${API_URL}${path}`,
            {
              ...options,

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,

                ...(options.headers ||
                  {}),
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              'Something went wrong'
          );
        }

        return data;
      },
      [token]
    );

  const loadTasks =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');

          const data =
            await apiRequest(
              '/tasks'
            );

          const active =
            data.filter(
              (task) =>
                !task.archived &&
                task.status !==
                  'done' &&
                task.status !==
                  'missed'
            );

          setTasks(active);

          setSelectedTaskId(
            (current) => {
              if (
                current &&
                active.some(
                  (task) =>
                    task._id ===
                    current
                )
              ) {
                return current;
              }

              return (
                active[0]?._id ||
                ''
              );
            }
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
    if (!token) {
      navigate(
        '/login',
        {
          replace: true,
        }
      );

      return;
    }

    loadTasks();
  }, [
    token,
    navigate,
    loadTasks,
  ]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    intervalRef.current =
      window.setInterval(
        () => {
          setSecondsLeft(
            (current) =>
              Math.max(
                0,
                current - 1
              )
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        intervalRef.current
      );
    };
  }, [running]);

  const selectedTask =
    useMemo(
      () =>
        tasks.find(
          (task) =>
            task._id ===
            selectedTaskId
        ) || null,
      [
        tasks,
        selectedTaskId,
      ]
    );

  const totalSeconds =
    durationMinutes * 60;

  const progress =
    totalSeconds <= 0
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            (
              (
                totalSeconds -
                secondsLeft
              ) /
              totalSeconds
            ) *
              100
          )
        );

  const minutes =
    Math.floor(
      secondsLeft / 60
    );

  const seconds =
    secondsLeft % 60;

  const saveSession =
    useCallback(
      async () => {
        if (
          !selectedTaskId ||
          saving
        ) {
          return;
        }

        try {
          setSaving(true);
          setError('');

          const updated =
            await apiRequest(
              `/tasks/${selectedTaskId}/focus`,
              {
                method:
                  'PATCH',

                body:
                  JSON.stringify({
                    minutes:
                      durationMinutes,
                  }),
              }
            );

          setTasks(
            (current) =>
              current.map(
                (task) =>
                  task._id ===
                  updated._id
                    ? updated
                    : task
              )
          );

          setCompletedSessions(
            (current) =>
              current + 1
          );

          setMessage(
            `${durationMinutes} minute focus session saved.`
          );
        } catch (err) {
          setError(
            err.message
          );
        } finally {
          setSaving(false);
        }
      },
      [
        selectedTaskId,
        saving,
        apiRequest,
        durationMinutes,
      ]
    );

  useEffect(() => {
    if (
      secondsLeft !== 0 ||
      !running
    ) {
      return;
    }

    setRunning(false);

    saveSession();

    if (
      typeof Notification !==
        'undefined' &&
      Notification.permission ===
        'granted'
    ) {
      new Notification(
        'Focus session complete',
        {
          body:
            selectedTask
              ? `${selectedTask.title} focus session finished.`
              : 'Your focus session finished.',
        }
      );
    }
  }, [
    secondsLeft,
    running,
    saveSession,
    selectedTask,
  ]);

  const setPreset =
    (value) => {
      if (running) {
        return;
      }

      setDurationMinutes(
        value
      );

      setSecondsLeft(
        value * 60
      );

      setMessage('');
      setError('');
    };

  const handleCustomDuration =
    (event) => {
      if (running) {
        return;
      }

      const value =
        Math.min(
          180,
          Math.max(
            1,
            Number(
              event.target.value
            ) || 1
          )
        );

      setDurationMinutes(
        value
      );

      setSecondsLeft(
        value * 60
      );
    };

  const toggleTimer = () => {
    if (!selectedTaskId) {
      setError(
        'Select a task before starting Focus Mode.'
      );

      return;
    }

    if (
      secondsLeft <= 0
    ) {
      setSecondsLeft(
        durationMinutes *
          60
      );
    }

    setError('');
    setMessage('');

    setRunning(
      (current) =>
        !current
    );
  };

  const resetTimer = () => {
    setRunning(false);

    setSecondsLeft(
      durationMinutes *
        60
    );

    setMessage('');
    setError('');
  };

  const saveElapsed =
    async () => {
      if (!selectedTaskId) {
        setError(
          'Select a task first.'
        );

        return;
      }

      const elapsedSeconds =
        totalSeconds -
        secondsLeft;

      const elapsedMinutes =
        Math.floor(
          elapsedSeconds /
            60
        );

      if (
        elapsedMinutes < 1
      ) {
        setError(
          'Complete at least 1 minute before saving.'
        );

        return;
      }

      try {
        setSaving(true);
        setRunning(false);
        setError('');

        const updated =
          await apiRequest(
            `/tasks/${selectedTaskId}/focus`,
            {
              method:
                'PATCH',

              body:
                JSON.stringify({
                  minutes:
                    elapsedMinutes,
                }),
            }
          );

        setTasks(
          (current) =>
            current.map(
              (task) =>
                task._id ===
                updated._id
                  ? updated
                  : task
            )
        );

        setCompletedSessions(
          (current) =>
            current + 1
        );

        setMessage(
          `${elapsedMinutes} focused minute${
            elapsedMinutes ===
            1
              ? ''
              : 's'
          } saved.`
        );

        setSecondsLeft(
          durationMinutes *
            60
        );
      } catch (err) {
        setError(
          err.message
        );
      } finally {
        setSaving(false);
      }
    };

  const styles = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      background:
        colors.background,
      color: colors.text,
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition:
        'background .2s ease, color .2s ease',
    },

    sidebar: {
      width: '240px',
      minWidth: '240px',
      minHeight: '100vh',
      padding: '26px 18px',
      boxSizing:
        'border-box',
      borderRight:
        `1px solid ${colors.border}`,
      background:
        resolvedTheme ===
        'dark'
          ? colors.backgroundSecondary
          : colors.surface,
      display: 'flex',
      flexDirection:
        'column',
      justifyContent:
        'space-between',
      boxShadow:
        resolvedTheme ===
        'light'
          ? '4px 0 24px rgba(37,99,235,.04)'
          : 'none',
    },

    brand: {
      width: '100%',
      border: 0,
      background:
        'transparent',
      color: colors.text,
      padding: 0,
      display: 'flex',
      alignItems:
        'center',
      gap: '12px',
      cursor: 'pointer',
      textAlign: 'left',
      marginBottom:
        '34px',
    },

    brandIcon: {
      width: '38px',
      height: '38px',
      display: 'grid',
      placeItems:
        'center',
      borderRadius:
        '12px',
      background:
        resolvedTheme ===
        'dark'
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : 'linear-gradient(135deg,#2563eb,#3b82f6)',
      color: '#ffffff',
      boxShadow:
        resolvedTheme ===
        'dark'
          ? '0 10px 28px rgba(99,102,241,.25)'
          : '0 10px 28px rgba(37,99,235,.20)',
      fontWeight: 900,
    },

    brandTitle: {
      display: 'block',
      fontSize: '15px',
    },

    brandSubtitle: {
      display: 'block',
      marginTop: '3px',
      color:
        colors.textMuted,
      fontSize: '10px',
      letterSpacing:
        '.12em',
      textTransform:
        'uppercase',
    },

    nav: {
      display: 'grid',
      gap: '7px',
    },

    navButton: {
      width: '100%',
      border:
        '1px solid transparent',
      borderRadius:
        '11px',
      background:
        'transparent',
      color:
        colors.textSecondary,
      padding:
        '11px 13px',
      display: 'flex',
      alignItems:
        'center',
      gap: '12px',
      fontSize: '13px',
      cursor: 'pointer',
      textAlign: 'left',
    },

    activeNav: {
      color:
        colors.primary,
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primaryBorder}`,
      fontWeight: 700,
    },

    sideInfo: {
      padding: '16px',
      borderRadius:
        '15px',
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primaryBorder}`,
    },

    sideInfoLabel: {
      display: 'block',
      color:
        colors.primary,
      fontSize: '9px',
      letterSpacing:
        '.12em',
      fontWeight: 900,
    },

    sideInfoValue: {
      display: 'block',
      margin:
        '8px 0 2px',
      color: colors.text,
      fontSize: '27px',
    },

    sideInfoText: {
      color:
        colors.textSecondary,
      fontSize: '11px',
    },

    main: {
      flex: 1,
      minWidth: 0,
      padding:
        '34px 38px 60px',
      boxSizing:
        'border-box',
    },

    header: {
      display: 'flex',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap: '20px',
      flexWrap: 'wrap',
      marginBottom:
        '28px',
    },

    eyebrow: {
      display: 'block',
      color:
        colors.primary,
      fontSize: '10px',
      fontWeight: 900,
      letterSpacing:
        '.16em',
      marginBottom:
        '8px',
    },

    title: {
      margin: 0,
      color: colors.text,
      fontSize:
        'clamp(30px,4vw,44px)',
      letterSpacing:
        '-.04em',
    },

    subtitle: {
      margin:
        '9px 0 0',
      color:
        colors.textSecondary,
      fontSize: '14px',
      maxWidth: '520px',
      lineHeight: 1.6,
    },

    workspace: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit,minmax(320px,1fr))',
      gap: '18px',
    },

    timerPanel: {
      minWidth: 0,
      padding: '24px',
      borderRadius:
        '20px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      boxShadow:
        colors.shadow,
    },

    timerTop: {
      display: 'flex',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap: '15px',
    },

    panelLabel: {
      display: 'block',
      color:
        colors.primary,
      fontSize: '9px',
      fontWeight: 900,
      letterSpacing:
        '.14em',
      marginBottom:
        '6px',
    },

    panelTitle: {
      margin: 0,
      color: colors.text,
      fontSize: '19px',
    },

    statusBadge: {
      padding:
        '7px 10px',
      borderRadius:
        '999px',
      background:
        colors.surfaceHover,
      color:
        colors.textSecondary,
      fontSize: '9px',
      fontWeight: 900,
      letterSpacing:
        '.1em',
    },

    statusRunning: {
      color:
        colors.primary,
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primaryBorder}`,
    },

    timerArea: {
      display: 'grid',
      placeItems:
        'center',
      padding:
        '42px 0 34px',
    },

    timerRing: {
      width:
        'min(310px,75vw)',
      aspectRatio: '1',
      borderRadius:
        '50%',
      padding: '10px',
      boxSizing:
        'border-box',
      background:
        colors.surfaceSecondary,
      boxShadow:
        colors.shadowLarge,
    },

    timerProgress: {
      width: '100%',
      height: '100%',
      borderRadius:
        '50%',
      display: 'grid',
      placeItems:
        'center',
      padding: '9px',
      boxSizing:
        'border-box',
    },

    timerInner: {
      width: '100%',
      height: '100%',
      borderRadius:
        '50%',
      background:
        colors.surface,
      display: 'grid',
      placeContent:
        'center',
      textAlign: 'center',
      boxShadow:
        resolvedTheme ===
        'dark'
          ? 'inset 0 0 40px rgba(0,0,0,.25)'
          : 'inset 0 0 35px rgba(37,99,235,.04)',
    },

    timerText: {
      color: colors.text,
      fontSize:
        'clamp(48px,7vw,76px)',
      fontWeight: 800,
      letterSpacing:
        '-.06em',
      fontVariantNumeric:
        'tabular-nums',
    },

    timerCaption: {
      marginTop: '6px',
      color:
        colors.textSecondary,
      fontSize: '11px',
    },

    presetRow: {
      display: 'flex',
      justifyContent:
        'center',
      gap: '8px',
      flexWrap: 'wrap',
    },

    presetButton: {
      padding:
        '9px 13px',
      borderRadius:
        '10px',
      border:
        `1px solid ${colors.border}`,
      background:
        colors.surfaceSecondary,
      color:
        colors.textSecondary,
      cursor: 'pointer',
      fontWeight: 700,
    },

    presetActive: {
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primary}`,
      color:
        colors.primary,
    },

    customBox: {
      display: 'flex',
      alignItems:
        'center',
      gap: '6px',
      padding:
        '7px 10px',
      borderRadius:
        '10px',
      background:
        colors.surfaceSecondary,
      border:
        `1px solid ${colors.border}`,
      color:
        colors.textSecondary,
      fontSize: '11px',
    },

    customInput: {
      width: '48px',
      border: 0,
      outline: 0,
      background:
        'transparent',
      color: colors.text,
      fontWeight: 800,
    },

    controls: {
      display: 'flex',
      justifyContent:
        'center',
      gap: '9px',
      flexWrap: 'wrap',
      marginTop: '24px',
    },

    primaryButton: {
      border: 0,
      borderRadius:
        '11px',
      padding:
        '11px 18px',
      background:
        colors.primary,
      color: '#ffffff',
      fontWeight: 800,
      cursor: 'pointer',
      boxShadow:
        resolvedTheme ===
        'light'
          ? '0 8px 20px rgba(37,99,235,.18)'
          : 'none',
    },

    secondaryButton: {
      border:
        `1px solid ${colors.border}`,
      borderRadius:
        '11px',
      padding:
        '10px 15px',
      background:
        colors.surface,
      color: colors.text,
      fontWeight: 700,
      cursor: 'pointer',
    },

    error: {
      marginTop: '18px',
      padding: '11px',
      borderRadius:
        '10px',
      background:
        colors.dangerSoft,
      border:
        `1px solid ${colors.danger}`,
      color:
        colors.danger,
      fontSize: '12px',
      textAlign: 'center',
    },

    success: {
      marginTop: '18px',
      padding: '11px',
      borderRadius:
        '10px',
      background:
        colors.successSoft,
      border:
        `1px solid ${colors.success}`,
      color:
        colors.success,
      fontSize: '12px',
      textAlign: 'center',
    },

    taskPanel: {
      minWidth: 0,
      padding: '20px',
      borderRadius:
        '20px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      boxShadow:
        colors.shadow,
    },

    taskPanelHeader: {
      display: 'flex',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap: '12px',
      marginBottom:
        '18px',
    },

    countBadge: {
      minWidth: '28px',
      height: '28px',
      borderRadius:
        '9px',
      display: 'grid',
      placeItems:
        'center',
      background:
        colors.primarySoft,
      color:
        colors.primary,
      fontSize: '11px',
      fontWeight: 800,
    },

    taskList: {
      display: 'grid',
      gap: '8px',
      maxHeight:
        '390px',
      overflowY: 'auto',
    },

    taskItem: {
      width: '100%',
      display: 'flex',
      alignItems:
        'center',
      gap: '10px',
      padding: '12px',
      borderRadius:
        '12px',
      border:
        `1px solid ${colors.border}`,
      background:
        colors.surfaceSecondary,
      color: colors.text,
      cursor: 'pointer',
      textAlign: 'left',
    },

    taskItemActive: {
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primary}`,
    },

    taskDot: {
      width: '8px',
      height: '8px',
      borderRadius:
        '50%',
      background:
        colors.primary,
      flexShrink: 0,
    },

    taskContent: {
      flex: 1,
      minWidth: 0,
    },

    taskTitle: {
      display: 'block',
      overflow: 'hidden',
      textOverflow:
        'ellipsis',
      whiteSpace:
        'nowrap',
      color: colors.text,
      fontSize: '12px',
    },

    taskMeta: {
      display: 'block',
      marginTop: '4px',
      color:
        colors.textSecondary,
      fontSize: '10px',
      textTransform:
        'capitalize',
    },

    selectedMark: {
      color:
        colors.primary,
      fontWeight: 900,
    },

    selectedDetails: {
      marginTop: '18px',
      padding: '16px',
      borderRadius:
        '14px',
      background:
        colors.surfaceSecondary,
      border:
        `1px solid ${colors.border}`,
    },

    selectedTitle: {
      display: 'block',
      marginBottom:
        '14px',
      color: colors.text,
      fontSize: '14px',
    },

    detailGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(3,1fr)',
      gap: '8px',
    },

    detailLabel: {
      display: 'block',
      color:
        colors.textSecondary,
      fontSize: '9px',
      marginBottom:
        '5px',
    },

    empty: {
      minHeight:
        '180px',
      display: 'grid',
      placeContent:
        'center',
      gap: '6px',
      textAlign: 'center',
      color:
        colors.textSecondary,
      fontSize: '12px',
    },
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <button
            type="button"
            style={styles.brand}
            onClick={() =>
              navigate(
                '/dashboard'
              )
            }
          >
            <span
              style={
                styles.brandIcon
              }
            >
              ✓
            </span>

            <span>
              <strong
                style={
                  styles.brandTitle
                }
              >
                Task Manager
              </strong>

              <small
                style={
                  styles.brandSubtitle
                }
              >
                Productivity OS
              </small>
            </span>
          </button>

          <nav style={styles.nav}>
            <button
              type="button"
              style={
                styles.navButton
              }
              onClick={() =>
                navigate(
                  '/dashboard'
                )
              }
            >
              <span>⌂</span>
              Dashboard
            </button>

            <button
              type="button"
              style={
                styles.navButton
              }
              onClick={() =>
                navigate(
                  '/analytics'
                )
              }
            >
              <span>↗</span>
              Analytics
            </button>

            <button
              type="button"
              style={{
                ...styles.navButton,
                ...styles.activeNav,
              }}
            >
              <span>◎</span>
              Focus
            </button>

            <button
              type="button"
              style={
                styles.navButton
              }
              onClick={() =>
                navigate(
                  '/habits'
                )
              }
            >
              <span>◉</span>
              Habits
            </button>

            <button
              type="button"
              style={
                styles.navButton
              }
              onClick={() =>
                navigate(
                  '/settings'
                )
              }
            >
              <span>⚙</span>
              Settings
            </button>
          </nav>
        </div>

        <div
          style={
            styles.sideInfo
          }
        >
          <span
            style={
              styles.sideInfoLabel
            }
          >
            THIS SESSION
          </span>

          <strong
            style={
              styles.sideInfoValue
            }
          >
            {completedSessions}
          </strong>

          <span
            style={
              styles.sideInfoText
            }
          >
            focus sessions
            completed
          </span>
        </div>
      </aside>

      <main style={styles.main}>
        <header
          style={styles.header}
        >
          <div>
            <span
              style={
                styles.eyebrow
              }
            >
              DEEP WORK
            </span>

            <h1
              style={styles.title}
            >
              Focus Mode
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Choose one task,
              start the timer and
              work without
              switching context.
            </p>
          </div>

          <button
            type="button"
            style={
              styles.secondaryButton
            }
            onClick={() =>
              navigate(
                '/dashboard'
              )
            }
          >
            ← Dashboard
          </button>
        </header>

        <section
          style={
            styles.workspace
          }
        >
          <article
            style={
              styles.timerPanel
            }
          >
            <div
              style={
                styles.timerTop
              }
            >
              <div>
                <span
                  style={
                    styles.panelLabel
                  }
                >
                  CURRENT FOCUS
                </span>

                <h2
                  style={
                    styles.panelTitle
                  }
                >
                  {selectedTask
                    ?.title ||
                    'Choose a task'}
                </h2>
              </div>

              <span
                style={{
                  ...styles.statusBadge,

                  ...(running
                    ? styles.statusRunning
                    : {}),
                }}
              >
                {running
                  ? 'FOCUSING'
                  : 'READY'}
              </span>
            </div>

            <div
              style={
                styles.timerArea
              }
            >
              <div
                style={
                  styles.timerRing
                }
              >
                <div
                  style={{
                    ...styles.timerProgress,

                    background:
                      `conic-gradient(${colors.primary} ${progress}%, ${colors.surfaceHover} ${progress}% 100%)`,
                  }}
                >
                  <div
                    style={
                      styles.timerInner
                    }
                  >
                    <span
                      style={
                        styles.timerText
                      }
                    >
                      {pad(
                        minutes
                      )}
                      :
                      {pad(
                        seconds
                      )}
                    </span>

                    <span
                      style={
                        styles.timerCaption
                      }
                    >
                      {running
                        ? 'Stay focused'
                        : 'Ready when you are'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={
                styles.presetRow
              }
            >
              {PRESETS.map(
                (preset) => (
                  <button
                    key={
                      preset.value
                    }
                    type="button"
                    disabled={
                      running
                    }
                    style={{
                      ...styles.presetButton,

                      ...(durationMinutes ===
                      preset.value
                        ? styles.presetActive
                        : {}),
                    }}
                    onClick={() =>
                      setPreset(
                        preset.value
                      )
                    }
                  >
                    {
                      preset.label
                    }
                  </button>
                )
              )}

              <label
                style={
                  styles.customBox
                }
              >
                <span>
                  Custom
                </span>

                <input
                  type="number"
                  min="1"
                  max="180"
                  disabled={
                    running
                  }
                  value={
                    durationMinutes
                  }
                  onChange={
                    handleCustomDuration
                  }
                  style={
                    styles.customInput
                  }
                />

                <span>
                  min
                </span>
              </label>
            </div>

            <div
              style={
                styles.controls
              }
            >
              <button
                type="button"
                style={
                  styles.primaryButton
                }
                onClick={
                  toggleTimer
                }
                disabled={
                  loading ||
                  saving
                }
              >
                {running
                  ? 'Pause'
                  : secondsLeft <
                      totalSeconds
                    ? 'Resume'
                    : 'Start Focus'}
              </button>

              <button
                type="button"
                style={
                  styles.secondaryButton
                }
                onClick={
                  resetTimer
                }
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="button"
                style={
                  styles.secondaryButton
                }
                onClick={
                  saveElapsed
                }
                disabled={saving}
              >
                Save elapsed
              </button>
            </div>

            {error && (
              <div
                style={
                  styles.error
                }
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={
                  styles.success
                }
              >
                ✓ {message}
              </div>
            )}
          </article>

          <aside
            style={
              styles.taskPanel
            }
          >
            <div
              style={
                styles.taskPanelHeader
              }
            >
              <div>
                <span
                  style={
                    styles.panelLabel
                  }
                >
                  TASK QUEUE
                </span>

                <h2
                  style={
                    styles.panelTitle
                  }
                >
                  Pick one task
                </h2>
              </div>

              <span
                style={
                  styles.countBadge
                }
              >
                {tasks.length}
              </span>
            </div>

            {loading ? (
              <div
                style={
                  styles.empty
                }
              >
                Loading tasks...
              </div>
            ) : tasks.length ===
              0 ? (
              <div
                style={
                  styles.empty
                }
              >
                <strong>
                  No active tasks
                </strong>

                <span>
                  Create a task
                  from Dashboard
                  first.
                </span>
              </div>
            ) : (
              <div
                style={
                  styles.taskList
                }
              >
                {tasks.map(
                  (task) => {
                    const active =
                      task._id ===
                      selectedTaskId;

                    return (
                      <button
                        key={
                          task._id
                        }
                        type="button"
                        disabled={
                          running
                        }
                        style={{
                          ...styles.taskItem,

                          ...(active
                            ? styles.taskItemActive
                            : {}),
                        }}
                        onClick={() => {
                          if (
                            running
                          ) {
                            return;
                          }

                          setSelectedTaskId(
                            task._id
                          );

                          setError('');
                        }}
                      >
                        <span
                          style={
                            styles.taskDot
                          }
                        />

                        <span
                          style={
                            styles.taskContent
                          }
                        >
                          <strong
                            style={
                              styles.taskTitle
                            }
                          >
                            {task.title}
                          </strong>

                          <span
                            style={
                              styles.taskMeta
                            }
                          >
                            {task.category ||
                              'General'}{' '}
                            ·{' '}
                            {task.priority ||
                              'medium'}
                          </span>
                        </span>

                        {active && (
                          <span
                            style={
                              styles.selectedMark
                            }
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {selectedTask && (
              <div
                style={
                  styles.selectedDetails
                }
              >
                <span
                  style={
                    styles.panelLabel
                  }
                >
                  SELECTED
                </span>

                <strong
                  style={
                    styles.selectedTitle
                  }
                >
                  {
                    selectedTask.title
                  }
                </strong>

                <div
                  style={
                    styles.detailGrid
                  }
                >
                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
                    >
                      Progress
                    </span>

                    <strong>
                      {selectedTask.progress ||
                        0}
                      %
                    </strong>
                  </div>

                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
                    >
                      Focus
                    </span>

                    <strong>
                      {selectedTask
                        .focus
                        ?.totalMinutes ||
                        selectedTask
                          .actualMinutes ||
                        0}
                      m
                    </strong>
                  </div>

                  <div>
                    <span
                      style={
                        styles.detailLabel
                      }
                    >
                      Sessions
                    </span>

                    <strong>
                      {selectedTask
                        .focus
                        ?.sessions ||
                        0}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default Focus;