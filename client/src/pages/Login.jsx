import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import API_URL from '../config';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const token =
    localStorage.getItem('token');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState(
      location.state?.message ||
        ''
    );

  useEffect(() => {
    if (
      location.state?.message
    ) {
      window.history.replaceState(
        {},
        document.title
      );
    }
  }, [location.state]);

  if (token) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          'Enter your email.'
        );
        return;
      }

      if (!password) {
        setError(
          'Enter your password.'
        );
        return;
      }

      try {
        setLoading(true);
        setError('');
        setMessage('');

        const response =
          await fetch(
            `${API_URL}/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                email: cleanEmail,
                contact:
                  cleanEmail,
                password,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              'Login failed.'
          );
        }

        localStorage.setItem(
          'token',
          data.token
        );

        localStorage.setItem(
          'user',
          JSON.stringify(
            data.user || {}
          )
        );

        navigate(
          '/dashboard',
          {
            replace: true,
          }
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="premium-auth">
      <section className="brand-side">
        <div className="brand-top">
          <div className="brand-symbol">
            T
          </div>
          <span>
            Task Manager
          </span>
        </div>

        <div className="brand-copy">
          <span className="micro-label">
            PERSONAL PRODUCTIVITY OS
          </span>

          <h1>
            Plan clearly.
            <br />
            Finish more.
          </h1>

          <p>
            Tasks, habits,
            focus sessions,
            reminders and
            progress in one
            workspace.
          </p>
        </div>

        <div className="brand-footer">
          <span>
            White + Blue
          </span>
          <span className="footer-dot" />
          <span>
            Dark mode optional
          </span>
        </div>
      </section>

      <section className="auth-side">
        <div className="auth-content">
          <div className="mobile-brand">
            <div className="brand-symbol">
              T
            </div>
            <span>
              Task Manager
            </span>
          </div>

          <div className="form-heading">
            <span className="step-number">
              WELCOME BACK
            </span>

            <h2>
              Sign in.
            </h2>

            <p>
              Continue to your
              productivity
              workspace.
            </p>
          </div>

          {error && (
            <div className="minimal-alert error">
              {error}
            </div>
          )}

          {message && (
            <div className="minimal-alert success">
              {message}
            </div>
          )}

          <form
            className="premium-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="field-group">
              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target
                      .value
                  );
                  setError('');
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="password-input-wrap">
                <input
                  id="login-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target
                        .value
                    );
                    setError('');
                  }}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>
              </div>
            </div>

            <div className="auth-inline-row">
              <span />

              <Link
                className="text-link"
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            <button
              className="black-button"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Signing in...'
                  : 'Sign in'}
              </span>
              <span className="button-arrow">
                →
              </span>
            </button>
          </form>

          <p className="auth-switch-copy">
            New here?{' '}
            <Link
              className="text-link"
              to="/signup"
            >
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
