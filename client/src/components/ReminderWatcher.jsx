import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTheme } from '../ThemeContext';

import API_URL from '../config';

const CHECK_INTERVAL =
  60 * 1000;

const TOAST_DURATION =
  10 * 1000;

function ReminderWatcher() {
  const { colors } =
    useTheme();

  const token =
    localStorage.getItem(
      'token'
    );

  const [
    queue,
    setQueue,
  ] = useState([]);

  const queuedIdsRef =
    useRef(new Set());

  const checkingRef =
    useRef(false);

  const currentReminder =
    queue[0] || null;

  const removeCurrent =
    useCallback(() => {
      setQueue((previous) => {
        if (
          previous.length === 0
        ) {
          return previous;
        }

        const current =
          previous[0];

        if (current?._id) {
          queuedIdsRef.current.delete(
            current._id
          );
        }

        return previous.slice(1);
      });
    }, []);

  const markNotified =
    useCallback(
      async (taskId) => {
        if (!token || !taskId) {
          return;
        }

        try {
          await fetch(
            `${API_URL}/tasks/${taskId}/reminder/notified`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );
        } catch (error) {
          console.error(
            'Could not mark reminder as notified:',
            error
          );
        }
      },
      [token]
    );

  const showBrowserNotification =
    useCallback(
      (task) => {
        if (
          typeof window ===
            'undefined' ||
          !(
            'Notification' in
            window
          ) ||
          Notification.permission !==
            'granted'
        ) {
          return;
        }

        try {
          new Notification(
            task.title ||
              'Task reminder',
            {
              body:
                task.description ||
                'You have a task reminder.',
            }
          );
        } catch (error) {
          console.error(
            'Browser notification failed:',
            error
          );
        }
      },
      []
    );

  const checkReminders =
    useCallback(
      async () => {
        if (
          !token ||
          checkingRef.current
        ) {
          return;
        }

        checkingRef.current =
          true;

        try {
          const response =
            await fetch(
              `${API_URL}/tasks/reminders/due`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
            return;
          }

          const data =
            await response.json();

          const reminders =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data?.tasks
                  )
                ? data.tasks
                : Array.isArray(
                      data?.reminders
                    )
                  ? data.reminders
                  : [];

          const newReminders =
            reminders.filter(
              (task) => {
                if (
                  !task?._id ||
                  queuedIdsRef.current.has(
                    task._id
                  )
                ) {
                  return false;
                }

                queuedIdsRef.current.add(
                  task._id
                );

                return true;
              }
            );

          if (
            newReminders.length ===
            0
          ) {
            return;
          }

          setQueue(
            (previous) => [
              ...previous,
              ...newReminders,
            ]
          );

          newReminders.forEach(
            (task) => {
              showBrowserNotification(
                task
              );

              markNotified(
                task._id
              );
            }
          );
        } catch (error) {
          console.error(
            'Reminder check failed:',
            error
          );
        } finally {
          checkingRef.current =
            false;
        }
      },
      [
        token,
        markNotified,
        showBrowserNotification,
      ]
    );

  const snoozeCurrent =
    useCallback(
      async () => {
        if (
          !token ||
          !currentReminder?._id
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/tasks/${currentReminder._id}/reminder/snooze`,
              {
                method: 'PATCH',

                headers: {
                  'Content-Type':
                    'application/json',

                  Authorization:
                    `Bearer ${token}`,
                },

                body:
                  JSON.stringify({
                    minutes: 10,
                  }),
              }
            );

          if (!response.ok) {
            const data =
              await response
                .json()
                .catch(
                  () => null
                );

            throw new Error(
              data?.message ||
                'Could not snooze reminder.'
            );
          }

          removeCurrent();
        } catch (error) {
          console.error(
            'Reminder snooze failed:',
            error
          );
        }
      },
      [
        token,
        currentReminder,
        removeCurrent,
      ]
    );

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    checkReminders();

    const interval =
      window.setInterval(
        checkReminders,
        CHECK_INTERVAL
      );

    const handleFocus = () => {
      checkReminders();
    };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          checkReminders();
        }
      };

    window.addEventListener(
      'focus',
      handleFocus
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [
    token,
    checkReminders,
  ]);

  useEffect(() => {
    if (!currentReminder) {
      return undefined;
    }

    const timeout =
      window.setTimeout(
        removeCurrent,
        TOAST_DURATION
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    currentReminder,
    removeCurrent,
  ]);

  if (!currentReminder) {
    return null;
  }

  const reminderTime =
    currentReminder
      ?.reminder
      ?.snoozedUntil ||
    currentReminder
      ?.reminder
      ?.remindAt;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',

        right: 20,
        bottom: 20,

        zIndex: 99999,

        width:
          'min(390px, calc(100vw - 28px))',

        background:
          colors.surface,

        color:
          colors.text,

        border:
          `1px solid ${colors.border}`,

        borderRadius: 18,

        boxShadow:
          colors.shadowLarge,

        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',

          alignItems:
            'flex-start',

          justifyContent:
            'space-between',

          gap: 16,
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              display:
                'inline-flex',

              alignItems:
                'center',

              gap: 7,

              padding:
                '5px 9px',

              marginBottom: 10,

              borderRadius:
                999,

              background:
                colors.primarySoft,

              color:
                colors.primary,

              fontSize: 11,

              fontWeight: 800,

              letterSpacing:
                '0.08em',
            }}
          >
            REMINDER
          </div>

          <h3
            style={{
              margin:
                '0 0 6px',

              fontSize: 17,

              lineHeight: 1.35,

              color:
                colors.text,

              overflowWrap:
                'anywhere',
            }}
          >
            {currentReminder.title ||
              'Task reminder'}
          </h3>

          {currentReminder.description && (
            <p
              style={{
                margin:
                  '0 0 8px',

                color:
                  colors.textSecondary,

                fontSize: 13,

                lineHeight: 1.55,
              }}
            >
              {
                currentReminder.description
              }
            </p>
          )}

          {reminderTime && (
            <p
              style={{
                margin: 0,

                color:
                  colors.textMuted,

                fontSize: 12,
              }}
            >
              {new Date(
                reminderTime
              ).toLocaleString(
                'en-IN',
                {
                  dateStyle:
                    'medium',

                  timeStyle:
                    'short',
                }
              )}
            </p>
          )}

          {queue.length > 1 && (
            <p
              style={{
                margin:
                  '8px 0 0',

                color:
                  colors.primary,

                fontSize: 12,

                fontWeight: 700,
              }}
            >
              +
              {queue.length -
                1}{' '}
              more reminder
              {queue.length - 1 >
              1
                ? 's'
                : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-label="Dismiss reminder"
          onClick={
            removeCurrent
          }
          style={{
            width: 34,
            height: 34,

            flex: '0 0 auto',

            borderRadius: 10,

            border:
              `1px solid ${colors.border}`,

            background:
              colors.surfaceSecondary,

            color:
              colors.textSecondary,

            cursor: 'pointer',

            fontSize: 20,

            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',

          gap: 9,

          marginTop: 16,

          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={
            snoozeCurrent
          }
          style={{
            border:
              `1px solid ${colors.primaryBorder}`,

            background:
              colors.primarySoft,

            color:
              colors.primary,

            borderRadius: 10,

            padding:
              '9px 13px',

            fontWeight: 700,

            cursor: 'pointer',
          }}
        >
          Snooze 10 min
        </button>

        <button
          type="button"
          onClick={
            removeCurrent
          }
          style={{
            border:
              `1px solid ${colors.border}`,

            background:
              colors.surfaceSecondary,

            color:
              colors.text,

            borderRadius: 10,

            padding:
              '9px 13px',

            fontWeight: 700,

            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default ReminderWatcher;