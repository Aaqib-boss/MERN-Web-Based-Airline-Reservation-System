const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      res.status(404);
      throw new Error('User profile not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & preferences
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User profile not found');
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.passportNumber = req.body.passportNumber || user.passportNumber;
    user.nationality = req.body.nationality || user.nationality;
    user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;
    if (req.body.profilePicture !== undefined) {
      user.profilePicture = req.body.profilePicture;
    }
    if (req.body.twoFactorEnabled !== undefined) {
      user.twoFactorEnabled = req.body.twoFactorEnabled;
    }
    if (req.body.twoFactorSecret !== undefined) {
      user.twoFactorSecret = req.body.twoFactorSecret;
    }

    if (req.body.preferences) {
      user.preferences.seatType = req.body.preferences.seatType || user.preferences.seatType;
      user.preferences.mealType = req.body.preferences.mealType || user.preferences.mealType;
      if (req.body.preferences.notifications !== undefined) {
        user.preferences.notifications = req.body.preferences.notifications;
      }
    }

    const updatedUser = await user.save();
    
    // Return updated user omitting password hash
    const responseUser = updatedUser.toObject();
    delete responseUser.passwordHash;
    
    res.json(responseUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
