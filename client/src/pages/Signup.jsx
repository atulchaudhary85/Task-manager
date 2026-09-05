import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import API_URL from '../config';

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });

  const [step, setStep] = useState('form');

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  if (token) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError('');
  };

  // ======================================================
  // SEND EMAIL OTP
  // ======================================================

  const sendOtp = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();

    const email = formData.email
      .trim()
      .toLowerCase();

    if (!name) {
      setError('Enter your name.');
      return;
    }

    if (!email) {
      setError('Enter your email.');
      return;
    }

    if (!formData.password) {
      setError('Enter a password.');
      return;
    }

    if (formData.password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(
        `${API_URL}/auth/signup/send-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to send verification code.'
        );
      }

      setStep('otp');

      setMessage(
        `Verification code sent to ${email}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // VERIFY OTP + CREATE ACCOUNT
  // ======================================================

  const verifyOtp = async (e) => {
    e.preventDefault();

    const email = formData.email
      .trim()
      .toLowerCase();

    const otp = formData.otp.trim();

    if (!otp) {
      setError(
        'Enter the verification code.'
      );
      return;
    }

    if (otp.length !== 6) {
      setError(
        'Enter the 6-digit verification code.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/auth/signup/verify-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            name: formData.name.trim(),
            email,
            password: formData.password,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Verification failed.'
        );
      }

      localStorage.setItem(
        'token',
        data.token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(data.user)
      );

      navigate('/dashboard', {
        replace: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="premium-auth">
      <section className="brand-side signup-brand">
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
            YOUR WORKSPACE. YOUR CONTROL.
          </span>

          <h1>
            Start clear.
            <br />
            Stay focused.
          </h1>

          <p>
            Create your workspace and manage
            tasks, priorities and progress from
            one place.
          </p>
        </div>

        <div className="brand-footer">
          <span>
            Simple setup
          </span>

          <span className="footer-dot"></span>

          <span>
            Secure email verification
          </span>
        </div>
      </section>

      <section className="auth-side">
        <div className="auth-content signup-content">
          <div className="mobile-brand">
            <div className="brand-symbol">
              T
            </div>

            <span>
              Task Manager
            </span>
          </div>

          {step === 'form' ? (
            <>
              <div className="form-heading">
                <span className="step-number">
                  CREATE ACCOUNT
                </span>

                <h2>
                  Get started.
                </h2>

                <p>
                  Create your account using
                  your email address.
                </p>
              </div>

              {error && (
                <div className="minimal-alert error">
                  {error}
                </div>
              )}

              <form
                className="premium-form"
                onSubmit={sendOtp}
              >
                <div className="field-group">
                  <label htmlFor="signup-name">
                    Full name
                  </label>

                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="signup-email">
                    Email address
                  </label>

                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="signup-password">
                    Password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="signup-password"
                      name="password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (prev) => !prev
                        )
                      }
                    >
                      {showPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="signup-confirm-password">
                    Confirm password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your password"
                      value={
                        formData.confirmPassword
                      }
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (prev) => !prev
                        )
                      }
                    >
                      {showConfirmPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  className="black-button"
                  type="submit"
                  disabled={loading}
                >
                  <span>
                    {loading
                      ? 'Sending code...'
                      : 'Continue'}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="form-heading">
                <span className="step-number">
                  VERIFY EMAIL
                </span>

                <h2>
                  Check your email.
                </h2>

                <p>
                  Enter the six-digit
                  verification code sent to your
                  email.
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
                onSubmit={verifyOtp}
              >
                <div className="field-group">
                  <label htmlFor="signup-otp">
                    Verification code
                  </label>

                  <input
                    id="signup-otp"
                    className="otp-input"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="000000"
                    value={formData.otp}
                    onChange={handleChange}
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>

                <button
                  className="black-button"
                  type="submit"
                  disabled={loading}
                >
                  <span>
                    {loading
                      ? 'Verifying...'
                      : 'Verify & create account'}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>

                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setMessage('');

                    setFormData(
                      (prev) => ({
                        ...prev,
                        otp: '',
                      })
                    );
                  }}
                >
                  ← Go back
                </button>
              </form>
            </>
          )}

          <div className="auth-bottom">
            Already have an account?{' '}

            <Link to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Signup;