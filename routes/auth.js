const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const Otp = require('../models/Otp');
const sendOtpEmail = require('../utils/mailer');

// ======================================================
// HELPERS
// ======================================================

const generateOtp = () =>
  crypto.randomInt(100000, 1000000).toString();

const normalizeEmail = (email = '') =>
  email.trim().toLowerCase();

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || '',
});

// ======================================================
// SIGNUP - SEND EMAIL OTP
// ======================================================

router.post('/signup/send-otp', async (req, res) => {
  try {
    const { email, contact } = req.body;

    const cleanEmail = normalizeEmail(email || contact);

    if (!cleanEmail) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    }

    if (!cleanEmail.includes('@')) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered.',
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({
      contact: cleanEmail,
      purpose: 'signup',
    });

    await Otp.create({
      contact: cleanEmail,
      purpose: 'signup',
      otpHash,
      attempts: 0,
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000
      ),
    });

    await sendOtpEmail(cleanEmail, otp);

    return res.json({
      message: 'OTP sent successfully.',
    });
  } catch (err) {
    console.error('Signup OTP error:', err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
});

// ======================================================
// SIGNUP - VERIFY OTP + CREATE ACCOUNT
// ======================================================

router.post('/signup/verify-otp', async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      password,
      otp,
    } = req.body;

    const cleanEmail = normalizeEmail(email || contact);

    if (
      !name ||
      !cleanEmail ||
      !password ||
      !otp
    ) {
      return res.status(400).json({
        message: 'Required fields are missing.',
      });
    }

    if (!cleanEmail.includes('@')) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const otpRecord = await Otp.findOne({
      contact: cleanEmail,
      purpose: 'signup',
    });

    if (!otpRecord) {
      return res.status(400).json({
        message:
          'OTP expired or not found. Request a new one.',
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        message: 'OTP expired. Request a new one.',
      });
    }

    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        message:
          'Too many attempts. Request a new OTP.',
      });
    }

    const isOtpValid = await bcrypt.compare(
      otp,
      otpRecord.otpHash
    );

    if (!isOtpValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        message: 'Invalid OTP.',
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        message: 'Email already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      isVerified: true,
    });

    await user.save();

    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    const token = createToken(user);

    return res.status(201).json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    console.error('Signup verify error:', err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
});

// ======================================================
// NORMAL LOGIN - EMAIL + PASSWORD - NO OTP
// ======================================================

router.post('/login', async (req, res) => {
  try {
    const {
      email,
      contact,
      password,
    } = req.body;

    const cleanEmail = normalizeEmail(email || contact);

    if (!cleanEmail || !password) {
      return res.status(400).json({
        message: 'Enter your email and password.',
      });
    }

    if (!cleanEmail.includes('@')) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: 'Email not registered.',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: 'Incorrect password.',
      });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      message: 'Server error',
    });
  }
});

// ======================================================
// FORGOT PASSWORD - SEND EMAIL OTP
// ======================================================

router.post(
  '/forgot-password/send-otp',
  async (req, res) => {
    try {
      const { email, contact } = req.body;

      const cleanEmail = normalizeEmail(
        email || contact
      );

      if (!cleanEmail) {
        return res.status(400).json({
          message: 'Email is required.',
        });
      }

      if (!cleanEmail.includes('@')) {
        return res.status(400).json({
          message: 'Enter a valid email address.',
        });
      }

      const user = await User.findOne({
        email: cleanEmail,
      });

      if (!user) {
        return res.status(404).json({
          message: 'Email not registered.',
        });
      }

      const otp = generateOtp();
      const otpHash = await bcrypt.hash(
        otp,
        10
      );

      await Otp.deleteMany({
        contact: cleanEmail,
        purpose: 'forgot-password',
      });

      await Otp.create({
        contact: cleanEmail,
        purpose: 'forgot-password',
        otpHash,
        attempts: 0,
        expiresAt: new Date(
          Date.now() + 5 * 60 * 1000
        ),
      });

      await sendOtpEmail(
        cleanEmail,
        otp
      );

      return res.json({
        message: 'OTP sent successfully.',
      });
    } catch (err) {
      console.error(
        'Forgot password OTP error:',
        err
      );

      return res.status(500).json({
        message: 'Server error',
      });
    }
  }
);

// ======================================================
// FORGOT PASSWORD - VERIFY EMAIL OTP
// ======================================================

router.post(
  '/forgot-password/verify-otp',
  async (req, res) => {
    try {
      const {
        email,
        contact,
        otp,
      } = req.body;

      const cleanEmail = normalizeEmail(
        email || contact
      );

      if (!cleanEmail || !otp) {
        return res.status(400).json({
          message: 'Email and OTP are required.',
        });
      }

      const otpRecord = await Otp.findOne({
        contact: cleanEmail,
        purpose: 'forgot-password',
      });

      if (!otpRecord) {
        return res.status(400).json({
          message:
            'OTP expired or not found. Request a new one.',
        });
      }

      if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteOne({
          _id: otpRecord._id,
        });

        return res.status(400).json({
          message:
            'OTP expired. Request a new one.',
        });
      }

      if (otpRecord.attempts >= 5) {
        await Otp.deleteOne({
          _id: otpRecord._id,
        });

        return res.status(400).json({
          message:
            'Too many attempts. Request a new OTP.',
        });
      }

      const isOtpValid = await bcrypt.compare(
        otp,
        otpRecord.otpHash
      );

      if (!isOtpValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        return res.status(400).json({
          message: 'Invalid OTP.',
        });
      }

      return res.json({
        message: 'OTP verified successfully.',
      });
    } catch (err) {
      console.error(
        'Forgot password verify error:',
        err
      );

      return res.status(500).json({
        message: 'Server error',
      });
    }
  }
);

// ======================================================
// FORGOT PASSWORD - RESET PASSWORD
// ======================================================

router.post(
  '/forgot-password/reset',
  async (req, res) => {
    try {
      const {
        email,
        contact,
        otp,
        newPassword,
      } = req.body;

      const cleanEmail = normalizeEmail(
        email || contact
      );

      if (
        !cleanEmail ||
        !otp ||
        !newPassword
      ) {
        return res.status(400).json({
          message: 'Required fields are missing.',
        });
      }

      const user = await User.findOne({
        email: cleanEmail,
      });

      if (!user) {
        return res.status(404).json({
          message: 'Email not registered.',
        });
      }

      const otpRecord = await Otp.findOne({
        contact: cleanEmail,
        purpose: 'forgot-password',
      });

      if (!otpRecord) {
        return res.status(400).json({
          message:
            'OTP expired or not found. Request a new one.',
        });
      }

      if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteOne({
          _id: otpRecord._id,
        });

        return res.status(400).json({
          message:
            'OTP expired. Request a new one.',
        });
      }

      if (otpRecord.attempts >= 5) {
        await Otp.deleteOne({
          _id: otpRecord._id,
        });

        return res.status(400).json({
          message:
            'Too many attempts. Request a new OTP.',
        });
      }

      const isOtpValid = await bcrypt.compare(
        otp,
        otpRecord.otpHash
      );

      if (!isOtpValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        return res.status(400).json({
          message: 'Invalid OTP.',
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      user.password = hashedPassword;

      await user.save();

      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.json({
        message:
          'Password reset successfully.',
      });
    } catch (err) {
      console.error(
        'Reset password error:',
        err
      );

      return res.status(500).json({
        message: 'Server error',
      });
    }
  }
);

module.exports = router;