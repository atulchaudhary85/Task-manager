import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useTheme,
} from '../ThemeContext';

import API_URL from '../config';

function Settings() {
  const navigate =
    useNavigate();

  const {
    themePreference,
    resolvedTheme,
    colors,
    setThemePreference,
  } = useTheme();

  const token =
    localStorage.getItem(
      'token'
    );

  const [
    profile,
    setProfile,
  ] = useState({
    name: '',
    email: '',
  });

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    savingPassword,
    setSavingPassword,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const apiRequest =
    useCallback(
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

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'user'
          );

          navigate(
            '/login',
            {
              replace: true,
            }
          );

          throw new Error(
            'Session expired.'
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
      [
        token,
        navigate,
      ]
    );

  const loadProfile =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');

          const data =
            await apiRequest(
              '/profile'
            );

          const user =
            data?.user ||
            data;

          setProfile({
            name:
              user?.name || '',
            email:
              user?.email || '',
          });

          localStorage.setItem(
            'user',
            JSON.stringify(
              user
            )
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
      loadProfile();
    }
  }, [
    token,
    loadProfile,
  ]);

  const saveProfile =
    async (event) => {
      event.preventDefault();

      const name =
        profile.name.trim();

      if (!name) {
        setError(
          'Name is required.'
        );

        return;
      }

      try {
        setSavingProfile(
          true
        );

        setError('');
        setMessage('');

        const data =
          await apiRequest(
            '/profile',
            {
              method: 'PATCH',

              body:
                JSON.stringify({
                  name,
                }),
            }
          );

        const updatedUser =
          data?.user;

        if (updatedUser) {
          setProfile({
            name:
              updatedUser.name ||
              '',
            email:
              updatedUser.email ||
              '',
          });

          localStorage.setItem(
            'user',
            JSON.stringify(
              updatedUser
            )
          );
        }

        setMessage(
          'Profile saved successfully.'
        );
      } catch (err) {
        setError(
          err.message
        );
      } finally {
        setSavingProfile(
          false
        );
      }
    };

  const changePassword =
    async (event) => {
      event.preventDefault();

      if (
        !currentPassword ||
        !newPassword
      ) {
        setError(
          'Enter current and new password.'
        );

        return;
      }

      if (
        newPassword.length < 6
      ) {
        setError(
          'New password must be at least 6 characters.'
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setError(
          'New passwords do not match.'
        );

        return;
      }

      try {
        setSavingPassword(
          true
        );

        setError('');
        setMessage('');

        const data =
          await apiRequest(
            '/profile/password',
            {
              method: 'PATCH',

              body:
                JSON.stringify({
                  currentPassword,
                  newPassword,
                }),
            }
          );

        setCurrentPassword(
          ''
        );

        setNewPassword('');

        setConfirmPassword(
          ''
        );

        setMessage(
          data?.message ||
            'Password changed successfully.'
        );
      } catch (err) {
        setError(
          err.message
        );
      } finally {
        setSavingPassword(
          false
        );
      }
    };

  const requestNotifications =
    async () => {
      setError('');
      setMessage('');

      if (
        !(
          'Notification' in
          window
        )
      ) {
        setError(
          'Browser notifications are not supported.'
        );

        return;
      }

      try {
        const result =
          await Notification.requestPermission();

        if (
          result ===
          'granted'
        ) {
          setMessage(
            'Browser notifications enabled.'
          );
        } else {
          setError(
            'Notification permission was not granted.'
          );
        }
      } catch {
        setError(
          'Could not request notification permission.'
        );
      }
    };

  const logout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    navigate(
      '/login',
      {
        replace: true,
      }
    );
  };

  const cardStyle = {
    background:
      colors.surface,

    border:
      `1px solid ${colors.border}`,

    borderRadius: 20,

    padding: 22,

    boxShadow:
      colors.shadow,
  };

  const inputStyle = {
    width: '100%',

    padding:
      '12px 13px',

    borderRadius: 10,

    border:
      `1px solid ${colors.border}`,

    background:
      colors.surfaceSecondary,

    color:
      colors.text,

    outline: 'none',

    boxSizing:
      'border-box',
  };

  const labelStyle = {
    display: 'block',

    marginBottom: 7,

    color:
      colors.textSecondary,

    fontSize: 12,

    fontWeight: 700,
  };

  const primaryButton = {
    border: 0,

    borderRadius: 10,

    padding:
      '11px 15px',

    background:
      colors.primary,

    color: '#ffffff',

    fontWeight: 800,

    cursor: 'pointer',
  };

  const secondaryButton = {
    border:
      `1px solid ${colors.border}`,

    borderRadius: 10,

    padding:
      '11px 15px',

    background:
      colors.surfaceSecondary,

    color:
      colors.text,

    fontWeight: 700,

    cursor: 'pointer',
  };

  return (
    <main
      style={{
        minHeight:
          '100vh',

        background:
          colors.background,

        color:
          colors.text,

        padding:
          '24px',

        boxSizing:
          'border-box',
      }}
    >
      <div
        style={{
          maxWidth:
            1120,

          margin:
            '0 auto',
        }}
      >
        <header
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap: 15,

            marginBottom:
              24,

            flexWrap:
              'wrap',
          }}
        >
          <div>
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/dashboard'
                )
              }
              style={{
                ...secondaryButton,
                marginBottom:
                  15,
              }}
            >
              ← Dashboard
            </button>

            <p
              style={{
                margin:
                  '0 0 7px',

                color:
                  colors.primary,

                fontSize: 12,

                fontWeight: 800,

                letterSpacing:
                  '0.1em',
              }}
            >
              SETTINGS
            </p>

            <h1
              style={{
                margin: 0,

                fontSize:
                  'clamp(28px, 5vw, 42px)',
              }}
            >
              Your workspace
            </h1>

            <p
              style={{
                margin:
                  '8px 0 0',

                color:
                  colors.textSecondary,
              }}
            >
              Profile, appearance,
              security and
              notifications.
            </p>
          </div>

          <div
            style={{
              padding:
                '8px 11px',

              borderRadius:
                999,

              background:
                colors.primarySoft,

              color:
                colors.primary,

              fontSize: 12,

              fontWeight: 800,
            }}
          >
            {resolvedTheme ===
            'dark'
              ? 'Dark mode'
              : 'Light mode'}
          </div>
        </header>

        {error && (
          <div
            style={{
              marginBottom:
                18,

              padding:
                '12px 14px',

              borderRadius:
                10,

              background:
                colors.dangerSoft,

              color:
                colors.danger,

              border:
                `1px solid ${colors.danger}33`,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom:
                18,

              padding:
                '12px 14px',

              borderRadius:
                10,

              background:
                colors.successSoft,

              color:
                colors.success,

              border:
                `1px solid ${colors.success}33`,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',

            gap: 18,
          }}
        >
          <section
            style={
              cardStyle
            }
          >
            <p
              style={{
                margin:
                  '0 0 6px',

                color:
                  colors.primary,

                fontSize: 11,

                fontWeight: 800,

                letterSpacing:
                  '0.08em',
              }}
            >
              PROFILE
            </p>

            <h2
              style={{
                margin:
                  '0 0 18px',
              }}
            >
              Account
            </h2>

            {loading ? (
              <p
                style={{
                  color:
                    colors.textSecondary,
                }}
              >
                Loading profile...
              </p>
            ) : (
              <form
                onSubmit={
                  saveProfile
                }
              >
                <div
                  style={{
                    marginBottom:
                      14,
                  }}
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Name
                  </label>

                  <input
                    style={
                      inputStyle
                    }
                    value={
                      profile.name
                    }
                    onChange={(
                      event
                    ) =>
                      setProfile(
                        (
                          previous
                        ) => ({
                          ...previous,
                          name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </div>

                <div
                  style={{
                    marginBottom:
                      18,
                  }}
                >
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Email
                  </label>

                  <input
                    style={{
                      ...inputStyle,

                      opacity:
                        0.7,

                      cursor:
                        'not-allowed',
                    }}
                    value={
                      profile.email
                    }
                    disabled
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    savingProfile
                  }
                  style={{
                    ...primaryButton,

                    opacity:
                      savingProfile
                        ? 0.65
                        : 1,
                  }}
                >
                  {savingProfile
                    ? 'Saving...'
                    : 'Save Profile'}
                </button>
              </form>
            )}
          </section>

          <section
            style={
              cardStyle
            }
          >
            <p
              style={{
                margin:
                  '0 0 6px',

                color:
                  colors.primary,

                fontSize: 11,

                fontWeight: 800,

                letterSpacing:
                  '0.08em',
              }}
            >
              APPEARANCE
            </p>

            <h2
              style={{
                margin:
                  '0 0 18px',
              }}
            >
              Theme
            </h2>

            <p
              style={{
                margin:
                  '0 0 18px',

                color:
                  colors.textSecondary,

                lineHeight:
                  1.6,
              }}
            >
              White and blue is
              the default. Dark
              mode only activates
              when you choose it.
            </p>

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1fr 1fr',

                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setThemePreference(
                    'light'
                  )
                }
                style={{
                  ...(themePreference ===
                  'light'
                    ? primaryButton
                    : secondaryButton),
                }}
              >
                ☀ Light
              </button>

              <button
                type="button"
                onClick={() =>
                  setThemePreference(
                    'dark'
                  )
                }
                style={{
                  ...(themePreference ===
                  'dark'
                    ? primaryButton
                    : secondaryButton),
                }}
              >
                ◐ Dark
              </button>
            </div>
          </section>

          <section
            style={
              cardStyle
            }
          >
            <p
              style={{
                margin:
                  '0 0 6px',

                color:
                  colors.primary,

                fontSize: 11,

                fontWeight: 800,

                letterSpacing:
                  '0.08em',
              }}
            >
              SECURITY
            </p>

            <h2
              style={{
                margin:
                  '0 0 18px',
              }}
            >
              Change password
            </h2>

            <form
              onSubmit={
                changePassword
              }
            >
              <div
                style={{
                  marginBottom:
                    12,
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Current password
                </label>

                <input
                  type="password"
                  style={
                    inputStyle
                  }
                  value={
                    currentPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentPassword(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="current-password"
                />
              </div>

              <div
                style={{
                  marginBottom:
                    12,
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  New password
                </label>

                <input
                  type="password"
                  style={
                    inputStyle
                  }
                  value={
                    newPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPassword(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="new-password"
                />
              </div>

              <div
                style={{
                  marginBottom:
                    18,
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Confirm new password
                </label>

                <input
                  type="password"
                  style={
                    inputStyle
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmPassword(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={
                  savingPassword
                }
                style={{
                  ...primaryButton,

                  opacity:
                    savingPassword
                      ? 0.65
                      : 1,
                }}
              >
                {savingPassword
                  ? 'Changing...'
                  : 'Change Password'}
              </button>
            </form>
          </section>

          <section
            style={
              cardStyle
            }
          >
            <p
              style={{
                margin:
                  '0 0 6px',

                color:
                  colors.primary,

                fontSize: 11,

                fontWeight: 800,

                letterSpacing:
                  '0.08em',
              }}
            >
              REMINDERS
            </p>

            <h2
              style={{
                margin:
                  '0 0 18px',
              }}
            >
              Notifications
            </h2>

            <p
              style={{
                margin:
                  '0 0 18px',

                color:
                  colors.textSecondary,

                lineHeight:
                  1.6,
              }}
            >
              Allow browser
              notifications for
              task reminders.
            </p>

            <button
              type="button"
              onClick={
                requestNotifications
              }
              style={
                secondaryButton
              }
            >
              Enable Notifications
            </button>
          </section>

          <section
            style={{
              ...cardStyle,

              gridColumn:
                '1 / -1',
            }}
          >
            <p
              style={{
                margin:
                  '0 0 6px',

                color:
                  colors.danger,

                fontSize: 11,

                fontWeight: 800,

                letterSpacing:
                  '0.08em',
              }}
            >
              SESSION
            </p>

            <h2
              style={{
                margin:
                  '0 0 10px',
              }}
            >
              Sign out
            </h2>

            <p
              style={{
                margin:
                  '0 0 18px',

                color:
                  colors.textSecondary,
              }}
            >
              End the current
              session on this
              browser.
            </p>

            <button
              type="button"
              onClick={
                logout
              }
              style={{
                ...secondaryButton,

                color:
                  colors.danger,

                border:
                  `1px solid ${colors.danger}44`,
              }}
            >
              Logout
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Settings;