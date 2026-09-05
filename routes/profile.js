const express = require('express');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const authMiddleware = require(
  '../middleware/authMiddleware'
);

const router = express.Router();

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/*
|--------------------------------------------------------------------------
| GET CURRENT PROFILE
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.userId
        ).select('-password');

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User not found.',
          });
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified:
            user.isVerified,
          createdAt:
            user.createdAt,
          updatedAt:
            user.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        message:
          'Could not fetch profile.',
        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE PROFILE
|--------------------------------------------------------------------------
*/

router.patch(
  '/',
  authMiddleware,
  async (req, res) => {
    try {
      const name = String(
        req.body.name || ''
      ).trim();

      if (!name) {
        return res
          .status(400)
          .json({
            message:
              'Name is required.',
          });
      }

      if (name.length > 80) {
        return res
          .status(400)
          .json({
            message:
              'Name is too long.',
          });
      }

      const user =
        await User.findById(
          req.userId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User not found.',
          });
      }

      user.name = name;

      await user.save();

      res.json({
        message:
          'Profile updated successfully.',
        user:
          userResponse(user),
      });
    } catch (error) {
      res.status(500).json({
        message:
          'Could not update profile.',
        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CHANGE PASSWORD
|--------------------------------------------------------------------------
*/

router.patch(
  '/password',
  authMiddleware,
  async (req, res) => {
    try {
      const currentPassword =
        String(
          req.body.currentPassword ||
            ''
        );

      const newPassword =
        String(
          req.body.newPassword ||
            ''
        );

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res
          .status(400)
          .json({
            message:
              'Current password and new password are required.',
          });
      }

      if (
        newPassword.length < 6
      ) {
        return res
          .status(400)
          .json({
            message:
              'New password must be at least 6 characters.',
          });
      }

      if (
        currentPassword ===
        newPassword
      ) {
        return res
          .status(400)
          .json({
            message:
              'New password must be different from current password.',
          });
      }

      const user =
        await User.findById(
          req.userId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User not found.',
          });
      }

      const validPassword =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!validPassword) {
        return res
          .status(400)
          .json({
            message:
              'Current password is incorrect.',
          });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          10
        );

      await user.save();

      res.json({
        message:
          'Password changed successfully.',
      });
    } catch (error) {
      res.status(500).json({
        message:
          'Could not change password.',
        error: error.message,
      });
    }
  }
);

module.exports = router;