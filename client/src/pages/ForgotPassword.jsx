import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import API_URL from '../config';

function ForgotPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [step, setStep] = useState('email');

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

    const email = formData.email
      .trim()
      .toLowerCase();

    if (!email) {
      setError(
        'Enter your registered email.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(
        `${API_URL}/auth/forgot-password/send-otp`,
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
  // VERIFY EMAIL OTP
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
      setMessage('');

      const response = await fetch(
        `${API_URL}/auth/forgot-password/verify-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
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

      setStep('reset');

      setMessage(
        'Email verified successfully.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // RESET PASSWORD
  // ======================================================

  const resetPassword = async (e) => {
    e.preventDefault();

    const email = formData.email
      .trim()
      .toLowerCase();

    const otp = formData.otp.trim();

    if (!formData.newPassword) {
      setError(
        'Enter your new password.'
      );
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/auth/forgot-password/reset`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
            otp,
            newPassword:
              formData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to reset password.'
        );
      }

      navigate('/login', {
        replace: true,

        state: {
          message:
            'Password changed successfully. Sign in with your new password.',
        },
      });
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
            SECURE ACCOUNT RECOVERY
          </span>

          <h1>
            Recover access.
            <br />
            Get back to work.
          </h1>

          <p>
            Verify your email and create a
            new password without losing your
            workspace or tasks.
          </p>
        </div>

        <div className="brand-footer">
          <span>
            Protected recovery
          </span>

          <span className="footer-dot"></span>

          <span>
            Secure email verification
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

          {step === 'email' && (
            <>
              <div className="form-heading">
                <span className="step-number">
                  ACCOUNT RECOVERY
                </span>

                <h2>
                  Forgot password?
                </h2>

                <p>
                  Enter your registered email
                  address to receive a
                  verification code.
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
                  <label htmlFor="forgot-email">
                    Registered email
                  </label>

                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
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
                      ? 'Sending code...'
                      : 'Send verification code'}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="form-heading">
                <span className="step-number">
                  VERIFY EMAIL
                </span>

                <h2>
                  Enter the code.
                </h2>

                <p>
                  Enter the six-digit
                  verification code sent to
                  your email.
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
                  <label htmlFor="forgot-otp">
                    Verification code
                  </label>

                  <input
                    id="forgot-otp"
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
                      : 'Verify code'}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>

                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setStep('email');
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
                  ← Change email
                </button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="form-heading">
                <span className="step-number">
                  NEW PASSWORD
                </span>

                <h2>
                  Create password.
                </h2>

                <p>
                  Choose a new password for
                  your account.
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
                onSubmit={resetPassword}
              >
                <div className="field-group">
                  <label htmlFor="new-password">
                    New password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="new-password"
                      name="newPassword"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Enter new password"
                      value={
                        formData.newPassword
                      }
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
                  <label htmlFor="confirm-password">
                    Confirm password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm new password"
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
                      ? 'Changing password...'
                      : 'Change password'}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>
              </form>
            </>
          )}

          <div className="auth-bottom">
            Remember your password?{' '}

            <Link to="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;