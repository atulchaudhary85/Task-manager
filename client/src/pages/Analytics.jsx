import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useTheme,
} from '../ThemeContext';

import API_URL from '../config';

const RANGE_OPTIONS = [
  {
    label: '7 Days',
    value: 7,
  },
  {
    label: '30 Days',
    value: 30,
  },
  {
    label: '90 Days',
    value: 90,
  },
];

const STATUS_LABELS = {
  todo: 'To Do',
  'in-progress':
    'In Progress',
  done: 'Completed',
  missed: 'Missed',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function Analytics() {
  const navigate =
    useNavigate();

  const {
    colors,
    resolvedTheme,
  } = useTheme();

  const token =
    localStorage.getItem(
      'token'
    );

  const [range, setRange] =
    useState(30);

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const apiRequest =
    useCallback(
      async (path) => {
        const response =
          await fetch(
            `${API_URL}${path}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              'Something went wrong'
          );
        }

        return result;
      },
      [token]
    );

  const loadAnalytics =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');

          const result =
            await apiRequest(
              `/tasks/analytics?range=${range}`
            );

          setData(result);
        } catch (err) {
          setError(
            err.message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        apiRequest,
        range,
      ]
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

    loadAnalytics();
  }, [
    token,
    navigate,
    loadAnalytics,
  ]);

  const analytics =
    data || {};

  const total =
    analytics.total || 0;

  const completed =
    analytics.completed || 0;

  const missed =
    analytics.missed || 0;

  const focusMinutes =
    analytics.focusMinutes ||
    0;

  const completionRate =
    analytics.completionRate ||
    0;

  const statusData =
    useMemo(() => {
      const source =
        analytics.byStatus ||
        analytics.statusBreakdown ||
        {};

      if (
        Array.isArray(source)
      ) {
        return source.map(
          (item) => ({
            label:
              STATUS_LABELS[
                item.status ||
                  item._id
              ] ||
              item.status ||
              item._id ||
              'Unknown',

            value:
              item.count ||
              item.value ||
              0,
          })
        );
      }

      return Object.entries(
        source
      ).map(
        ([
          key,
          value,
        ]) => ({
          label:
            STATUS_LABELS[key] ||
            key,
          value:
            Number(value) ||
            0,
        })
      );
    }, [
      analytics.byStatus,
      analytics.statusBreakdown,
    ]);

  const priorityData =
    useMemo(() => {
      const source =
        analytics.byPriority ||
        analytics.priorityBreakdown ||
        {};

      if (
        Array.isArray(source)
      ) {
        return source.map(
          (item) => ({
            label:
              PRIORITY_LABELS[
                item.priority ||
                  item._id
              ] ||
              item.priority ||
              item._id ||
              'Unknown',

            value:
              item.count ||
              item.value ||
              0,
          })
        );
      }

      return Object.entries(
        source
      ).map(
        ([
          key,
          value,
        ]) => ({
          label:
            PRIORITY_LABELS[key] ||
            key,
          value:
            Number(value) ||
            0,
        })
      );
    }, [
      analytics.byPriority,
      analytics.priorityBreakdown,
    ]);

  const categoryData =
    useMemo(() => {
      const source =
        analytics.byCategory ||
        analytics.categoryBreakdown ||
        {};

      if (
        Array.isArray(source)
      ) {
        return source.map(
          (item) => ({
            label:
              item.category ||
              item._id ||
              'General',

            value:
              item.count ||
              item.value ||
              0,
          })
        );
      }

      return Object.entries(
        source
      ).map(
        ([
          key,
          value,
        ]) => ({
          label:
            key ||
            'General',
          value:
            Number(value) ||
            0,
        })
      );
    }, [
      analytics.byCategory,
      analytics.categoryBreakdown,
    ]);

  const dailyData =
    useMemo(() => {
      const source =
        analytics.daily ||
        analytics.dailyActivity ||
        analytics.timeline ||
        [];

      if (
        !Array.isArray(source)
      ) {
        return [];
      }

      return source.map(
        (item) => ({
          date:
            item.date ||
            item._id ||
            '',

          completed:
            item.completed ||
            item.done ||
            0,

          created:
            item.created ||
            item.total ||
            item.tasks ||
            0,
        })
      );
    }, [
      analytics.daily,
      analytics.dailyActivity,
      analytics.timeline,
    ]);

  const maxDailyValue =
    Math.max(
      1,
      ...dailyData.map(
        (item) =>
          Math.max(
            item.completed,
            item.created
          )
      )
    );

  const maxStatus =
    Math.max(
      1,
      ...statusData.map(
        (item) =>
          item.value
      )
    );

  const maxPriority =
    Math.max(
      1,
      ...priorityData.map(
        (item) =>
          item.value
      )
    );

  const maxCategory =
    Math.max(
      1,
      ...categoryData.map(
        (item) =>
          item.value
      )
    );

  const formatFocusTime =
    (minutes) => {
      const hours =
        Math.floor(
          minutes / 60
        );

      const remaining =
        minutes % 60;

      if (hours <= 0) {
        return `${remaining}m`;
      }

      return `${hours}h ${remaining}m`;
    };

  const formatDate =
    (value) => {
      if (!value) {
        return '';
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return date.toLocaleDateString(
        undefined,
        {
          month: 'short',
          day: 'numeric',
        }
      );
    };

  const styles = {
    page: {
      minHeight:
        '100vh',
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
      minWidth:
        '240px',
      minHeight:
        '100vh',
      boxSizing:
        'border-box',
      padding:
        '26px 18px',
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
      padding: 0,
      background:
        'transparent',
      color: colors.text,
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
      padding:
        '11px 13px',
      background:
        'transparent',
      color:
        colors.textSecondary,
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

    sideCard: {
      padding: '16px',
      borderRadius:
        '15px',
      background:
        colors.primarySoft,
      border:
        `1px solid ${colors.primaryBorder}`,
    },

    sideCardLabel: {
      display: 'block',
      color:
        colors.primary,
      fontSize: '9px',
      fontWeight: 900,
      letterSpacing:
        '.12em',
    },

    sideCardValue: {
      display: 'block',
      margin:
        '8px 0 3px',
      color: colors.text,
      fontSize: '26px',
    },

    sideCardText: {
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
      lineHeight: 1.6,
    },

    rangeBox: {
      display: 'flex',
      gap: '5px',
      padding: '5px',
      borderRadius:
        '12px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      boxShadow:
        colors.shadow,
    },

    rangeButton: {
      border: 0,
      borderRadius:
        '8px',
      padding:
        '9px 12px',
      background:
        'transparent',
      color:
        colors.textSecondary,
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: 700,
    },

    activeRange: {
      background:
        colors.primary,
      color: '#ffffff',
    },

    statGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit,minmax(170px,1fr))',
      gap: '13px',
      marginBottom:
        '18px',
    },

    statCard: {
      padding: '18px',
      borderRadius:
        '16px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      boxShadow:
        colors.shadow,
    },

    statTop: {
      display: 'flex',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      gap: '10px',
    },

    statLabel: {
      color:
        colors.textSecondary,
      fontSize: '10px',
      fontWeight: 800,
      letterSpacing:
        '.08em',
      textTransform:
        'uppercase',
    },

    statIcon: {
      width: '31px',
      height: '31px',
      borderRadius:
        '9px',
      display: 'grid',
      placeItems:
        'center',
      background:
        colors.primarySoft,
      color:
        colors.primary,
      fontWeight: 900,
    },

    statValue: {
      display: 'block',
      marginTop:
        '15px',
      color: colors.text,
      fontSize: '27px',
      letterSpacing:
        '-.03em',
    },

    statHint: {
      display: 'block',
      marginTop: '5px',
      color:
        colors.textMuted,
      fontSize: '10px',
    },

    sectionGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit,minmax(330px,1fr))',
      gap: '18px',
      marginBottom:
        '18px',
    },

    wideCard: {
      gridColumn:
        '1 / -1',
    },

    card: {
      minWidth: 0,
      padding: '20px',
      borderRadius:
        '18px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      boxShadow:
        colors.shadow,
    },

    cardHeader: {
      display: 'flex',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap: '12px',
      marginBottom:
        '20px',
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
        '5px',
    },

    panelTitle: {
      margin: 0,
      color: colors.text,
      fontSize: '17px',
    },

    cardBadge: {
      padding:
        '6px 9px',
      borderRadius:
        '999px',
      background:
        colors.primarySoft,
      color:
        colors.primary,
      fontSize: '9px',
      fontWeight: 900,
    },

    chart: {
      minHeight:
        '220px',
      display: 'flex',
      alignItems:
        'flex-end',
      gap: '8px',
      padding:
        '15px 0 0',
      overflowX: 'auto',
    },

    chartColumn: {
      flex: '1 0 35px',
      minWidth: '35px',
      height: '190px',
      display: 'flex',
      flexDirection:
        'column',
      justifyContent:
        'flex-end',
      alignItems:
        'center',
      gap: '6px',
    },

    bars: {
      width: '100%',
      height: '150px',
      display: 'flex',
      alignItems:
        'flex-end',
      justifyContent:
        'center',
      gap: '3px',
    },

    createdBar: {
      width: '38%',
      minHeight: '3px',
      borderRadius:
        '6px 6px 2px 2px',
      background:
        resolvedTheme ===
        'dark'
          ? '#334155'
          : '#bfdbfe',
    },

    completedBar: {
      width: '38%',
      minHeight: '3px',
      borderRadius:
        '6px 6px 2px 2px',
      background:
        colors.primary,
    },

    chartDate: {
      color:
        colors.textMuted,
      fontSize: '8px',
      whiteSpace:
        'nowrap',
    },

    legend: {
      display: 'flex',
      gap: '14px',
      flexWrap: 'wrap',
      marginTop: '13px',
      color:
        colors.textSecondary,
      fontSize: '10px',
    },

    legendItem: {
      display: 'flex',
      alignItems:
        'center',
      gap: '6px',
    },

    legendBlue: {
      width: '8px',
      height: '8px',
      borderRadius:
        '3px',
      background:
        colors.primary,
    },

    legendSoft: {
      width: '8px',
      height: '8px',
      borderRadius:
        '3px',
      background:
        resolvedTheme ===
        'dark'
          ? '#334155'
          : '#bfdbfe',
    },

    barList: {
      display: 'grid',
      gap: '15px',
    },

    barItem: {
      display: 'grid',
      gap: '7px',
    },

    barHeader: {
      display: 'flex',
      justifyContent:
        'space-between',
      gap: '12px',
      color:
        colors.textSecondary,
      fontSize: '11px',
    },

    barValue: {
      color: colors.text,
      fontWeight: 800,
    },

    barTrack: {
      height: '8px',
      overflow: 'hidden',
      borderRadius:
        '999px',
      background:
        colors.surfaceHover,
    },

    barFill: {
      height: '100%',
      borderRadius:
        '999px',
      background:
        colors.primary,
    },

    empty: {
      minHeight:
        '170px',
      display: 'grid',
      placeItems:
        'center',
      color:
        colors.textMuted,
      fontSize: '12px',
      textAlign: 'center',
    },

    summaryGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit,minmax(170px,1fr))',
      gap: '12px',
    },

    summaryItem: {
      padding: '15px',
      borderRadius:
        '13px',
      background:
        colors.surfaceSecondary,
      border:
        `1px solid ${colors.borderSoft}`,
    },

    summaryLabel: {
      display: 'block',
      color:
        colors.textSecondary,
      fontSize: '10px',
      marginBottom:
        '7px',
    },

    summaryValue: {
      color: colors.text,
      fontSize: '18px',
    },

    loadingBox: {
      minHeight:
        '420px',
      display: 'grid',
      placeItems:
        'center',
      borderRadius:
        '18px',
      background:
        colors.surface,
      border:
        `1px solid ${colors.border}`,
      color:
        colors.textSecondary,
      boxShadow:
        colors.shadow,
    },

    errorBox: {
      padding: '16px',
      borderRadius:
        '13px',
      background:
        colors.dangerSoft,
      border:
        `1px solid ${colors.danger}`,
      color:
        colors.danger,
    },

    retryButton: {
      marginLeft:
        '12px',
      border: 0,
      borderRadius:
        '8px',
      padding:
        '7px 10px',
      background:
        colors.danger,
      color: '#ffffff',
      cursor: 'pointer',
      fontWeight: 800,
    },
  };

  return (
    <div style={styles.page}>
      <aside
        style={
          styles.sidebar
        }
      >
        <div>
          <button
            type="button"
            style={
              styles.brand
            }
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

          <nav
            style={styles.nav}
          >
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
              style={{
                ...styles.navButton,
                ...styles.activeNav,
              }}
            >
              <span>↗</span>
              Analytics
            </button>

            <button
              type="button"
              style={
                styles.navButton
              }
              onClick={() =>
                navigate(
                  '/focus'
                )
              }
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
            styles.sideCard
          }
        >
          <span
            style={
              styles.sideCardLabel
            }
          >
            COMPLETION
          </span>

          <strong
            style={
              styles.sideCardValue
            }
          >
            {completionRate}%
          </strong>

          <span
            style={
              styles.sideCardText
            }
          >
            Last {range} days
          </span>
        </div>
      </aside>

      <main
        style={styles.main}
      >
        <header
          style={
            styles.header
          }
        >
          <div>
            <span
              style={
                styles.eyebrow
              }
            >
              INSIGHTS
            </span>

            <h1
              style={
                styles.title
              }
            >
              Analytics
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              See your task
              completion, focus
              time and productivity
              patterns.
            </p>
          </div>

          <div
            style={
              styles.rangeBox
            }
          >
            {RANGE_OPTIONS.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  style={{
                    ...styles.rangeButton,

                    ...(range ===
                    option.value
                      ? styles.activeRange
                      : {}),
                  }}
                  onClick={() =>
                    setRange(
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}
          </div>
        </header>

        {loading ? (
          <div
            style={
              styles.loadingBox
            }
          >
            Loading analytics...
          </div>
        ) : error ? (
          <div
            style={
              styles.errorBox
            }
          >
            {error}

            <button
              type="button"
              style={
                styles.retryButton
              }
              onClick={
                loadAnalytics
              }
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <section
              style={
                styles.statGrid
              }
            >
              <article
                style={
                  styles.statCard
                }
              >
                <div
                  style={
                    styles.statTop
                  }
                >
                  <span
                    style={
                      styles.statLabel
                    }
                  >
                    Total Tasks
                  </span>

                  <span
                    style={
                      styles.statIcon
                    }
                  >
                    #
                  </span>
                </div>

                <strong
                  style={
                    styles.statValue
                  }
                >
                  {total}
                </strong>

                <span
                  style={
                    styles.statHint
                  }
                >
                  In selected range
                </span>
              </article>

              <article
                style={
                  styles.statCard
                }
              >
                <div
                  style={
                    styles.statTop
                  }
                >
                  <span
                    style={
                      styles.statLabel
                    }
                  >
                    Completed
                  </span>

                  <span
                    style={
                      styles.statIcon
                    }
                  >
                    ✓
                  </span>
                </div>

                <strong
                  style={
                    styles.statValue
                  }
                >
                  {completed}
                </strong>

                <span
                  style={
                    styles.statHint
                  }
                >
                  Tasks finished
                </span>
              </article>

              <article
                style={
                  styles.statCard
                }
              >
                <div
                  style={
                    styles.statTop
                  }
                >
                  <span
                    style={
                      styles.statLabel
                    }
                  >
                    Completion
                  </span>

                  <span
                    style={
                      styles.statIcon
                    }
                  >
                    %
                  </span>
                </div>

                <strong
                  style={
                    styles.statValue
                  }
                >
                  {completionRate}%
                </strong>

                <span
                  style={
                    styles.statHint
                  }
                >
                  Completion rate
                </span>
              </article>

              <article
                style={
                  styles.statCard
                }
              >
                <div
                  style={
                    styles.statTop
                  }
                >
                  <span
                    style={
                      styles.statLabel
                    }
                  >
                    Missed
                  </span>

                  <span
                    style={
                      styles.statIcon
                    }
                  >
                    !
                  </span>
                </div>

                <strong
                  style={
                    styles.statValue
                  }
                >
                  {missed}
                </strong>

                <span
                  style={
                    styles.statHint
                  }
                >
                  Past incomplete
                  tasks
                </span>
              </article>

              <article
                style={
                  styles.statCard
                }
              >
                <div
                  style={
                    styles.statTop
                  }
                >
                  <span
                    style={
                      styles.statLabel
                    }
                  >
                    Focus Time
                  </span>

                  <span
                    style={
                      styles.statIcon
                    }
                  >
                    ◎
                  </span>
                </div>

                <strong
                  style={
                    styles.statValue
                  }
                >
                  {formatFocusTime(
                    focusMinutes
                  )}
                </strong>

                <span
                  style={
                    styles.statHint
                  }
                >
                  Deep work logged
                </span>
              </article>
            </section>

            <div
              style={
                styles.sectionGrid
              }
            >
              <section
                style={{
                  ...styles.card,
                  ...styles.wideCard,
                }}
              >
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <div>
                    <span
                      style={
                        styles.panelLabel
                      }
                    >
                      DAILY ACTIVITY
                    </span>

                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Productivity
                      timeline
                    </h2>
                  </div>

                  <span
                    style={
                      styles.cardBadge
                    }
                  >
                    {range} DAYS
                  </span>
                </div>

                {dailyData.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    No daily activity
                    available yet.
                  </div>
                ) : (
                  <>
                    <div
                      style={
                        styles.chart
                      }
                    >
                      {dailyData.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.date}-${index}`}
                            style={
                              styles.chartColumn
                            }
                          >
                            <div
                              style={
                                styles.bars
                              }
                            >
                              <div
                                title={`Created: ${item.created}`}
                                style={{
                                  ...styles.createdBar,
                                  height:
                                    `${
                                      Math.max(
                                        3,
                                        (item.created /
                                          maxDailyValue) *
                                          100
                                      )
                                    }%`,
                                }}
                              />

                              <div
                                title={`Completed: ${item.completed}`}
                                style={{
                                  ...styles.completedBar,
                                  height:
                                    `${
                                      Math.max(
                                        3,
                                        (item.completed /
                                          maxDailyValue) *
                                          100
                                      )
                                    }%`,
                                }}
                              />
                            </div>

                            <span
                              style={
                                styles.chartDate
                              }
                            >
                              {formatDate(
                                item.date
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    <div
                      style={
                        styles.legend
                      }
                    >
                      <span
                        style={
                          styles.legendItem
                        }
                      >
                        <span
                          style={
                            styles.legendBlue
                          }
                        />
                        Completed
                      </span>

                      <span
                        style={
                          styles.legendItem
                        }
                      >
                        <span
                          style={
                            styles.legendSoft
                          }
                        />
                        Created
                      </span>
                    </div>
                  </>
                )}
              </section>

              <section
                style={
                  styles.card
                }
              >
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <div>
                    <span
                      style={
                        styles.panelLabel
                      }
                    >
                      STATUS
                    </span>

                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Status breakdown
                    </h2>
                  </div>
                </div>

                {statusData.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    No status data.
                  </div>
                ) : (
                  <div
                    style={
                      styles.barList
                    }
                  >
                    {statusData.map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          style={
                            styles.barItem
                          }
                        >
                          <div
                            style={
                              styles.barHeader
                            }
                          >
                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong
                              style={
                                styles.barValue
                              }
                            >
                              {
                                item.value
                              }
                            </strong>
                          </div>

                          <div
                            style={
                              styles.barTrack
                            }
                          >
                            <div
                              style={{
                                ...styles.barFill,
                                width:
                                  `${
                                    (item.value /
                                      maxStatus) *
                                    100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              <section
                style={
                  styles.card
                }
              >
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <div>
                    <span
                      style={
                        styles.panelLabel
                      }
                    >
                      PRIORITY
                    </span>

                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Priority load
                    </h2>
                  </div>
                </div>

                {priorityData.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    No priority data.
                  </div>
                ) : (
                  <div
                    style={
                      styles.barList
                    }
                  >
                    {priorityData.map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          style={
                            styles.barItem
                          }
                        >
                          <div
                            style={
                              styles.barHeader
                            }
                          >
                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong
                              style={
                                styles.barValue
                              }
                            >
                              {
                                item.value
                              }
                            </strong>
                          </div>

                          <div
                            style={
                              styles.barTrack
                            }
                          >
                            <div
                              style={{
                                ...styles.barFill,
                                width:
                                  `${
                                    (item.value /
                                      maxPriority) *
                                    100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              <section
                style={{
                  ...styles.card,
                  ...styles.wideCard,
                }}
              >
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <div>
                    <span
                      style={
                        styles.panelLabel
                      }
                    >
                      CATEGORIES
                    </span>

                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Category
                      distribution
                    </h2>
                  </div>
                </div>

                {categoryData.length ===
                0 ? (
                  <div
                    style={
                      styles.empty
                    }
                  >
                    No category data.
                  </div>
                ) : (
                  <div
                    style={
                      styles.barList
                    }
                  >
                    {categoryData.map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          style={
                            styles.barItem
                          }
                        >
                          <div
                            style={
                              styles.barHeader
                            }
                          >
                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong
                              style={
                                styles.barValue
                              }
                            >
                              {
                                item.value
                              }
                            </strong>
                          </div>

                          <div
                            style={
                              styles.barTrack
                            }
                          >
                            <div
                              style={{
                                ...styles.barFill,
                                width:
                                  `${
                                    (item.value /
                                      maxCategory) *
                                    100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              <section
                style={{
                  ...styles.card,
                  ...styles.wideCard,
                }}
              >
                <div
                  style={
                    styles.cardHeader
                  }
                >
                  <div>
                    <span
                      style={
                        styles.panelLabel
                      }
                    >
                      SUMMARY
                    </span>

                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Performance
                      snapshot
                    </h2>
                  </div>
                </div>

                <div
                  style={
                    styles.summaryGrid
                  }
                >
                  <div
                    style={
                      styles.summaryItem
                    }
                  >
                    <span
                      style={
                        styles.summaryLabel
                      }
                    >
                      Completed
                    </span>

                    <strong
                      style={
                        styles.summaryValue
                      }
                    >
                      {completed} /{' '}
                      {total}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.summaryItem
                    }
                  >
                    <span
                      style={
                        styles.summaryLabel
                      }
                    >
                      Completion
                      rate
                    </span>

                    <strong
                      style={
                        styles.summaryValue
                      }
                    >
                      {
                        completionRate
                      }
                      %
                    </strong>
                  </div>

                  <div
                    style={
                      styles.summaryItem
                    }
                  >
                    <span
                      style={
                        styles.summaryLabel
                      }
                    >
                      Missed tasks
                    </span>

                    <strong
                      style={
                        styles.summaryValue
                      }
                    >
                      {missed}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.summaryItem
                    }
                  >
                    <span
                      style={
                        styles.summaryLabel
                      }
                    >
                      Focus time
                    </span>

                    <strong
                      style={
                        styles.summaryValue
                      }
                    >
                      {formatFocusTime(
                        focusMinutes
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Analytics;