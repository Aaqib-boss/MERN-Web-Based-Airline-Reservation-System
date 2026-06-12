const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Helper to generate access tokens
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'skywaveaccesskey789!@#', {
    expiresIn: '15m'
  });
};

// Helper to generate refresh tokens
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'skywaverefreshkey456$%^', {
    expiresIn: '7d'
  });
};

// Set refresh token cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, passportNumber, nationality, dateOfBirth, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Name, email, and password are required');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email address');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const assignedStatus = assignedRole === 'admin' ? 'pending' : 'active';

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      passportNumber: passportNumber || '',
      nationality: nationality || '',
      dateOfBirth: dateOfBirth || '',
      role: assignedRole,
      status: assignedStatus,
      loyaltyPoints: 0,
      loyaltyTier: 'Bronze'
    });

    if (user) {
      // Log the registration
      await ActivityLog.create({
        userId: user._id,
        action: 'register',
        description: `New user registration request submitted with role: ${assignedRole}`,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });

      if (assignedStatus === 'pending') {
        return res.status(201).json({
          message: 'Your registration request has been submitted successfully and is pending approval by the Super Admin.',
          status: 'pending',
          role: assignedRole
        });
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      user.activeSessions = [{
        token: accessToken,
        ip: req.ip || '',
        device: req.headers['user-agent'] || ''
      }];
      await user.save();

      // Set cookie
      res.cookie('refreshToken', refreshToken, cookieOptions);

      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyTier: user.loyaltyTier,
        loyaltyPoints: user.loyaltyPoints,
        passportNumber: user.passportNumber,
        nationality: user.nationality,
        dateOfBirth: user.dateOfBirth,
        accessToken
      });
    } else {
      res.status(400);
      throw new Error('Invalid user registration data provided');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password credentials');
    }

    // Check status
    if (user.status === 'pending') {
      res.status(403);
      throw new Error('Your account registration request is currently pending Super Admin approval. Access is disabled.');
    }
    if (user.status === 'suspended') {
      res.status(403);
      throw new Error('Your account has been suspended. Please contact system command.');
    }
    if (user.status === 'blocked') {
      res.status(403);
      throw new Error('Your account has been blocked. Access denied.');
    }

    // Check Lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      res.status(403);
      throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${remainingMins} minutes.`);
    }

    // Verify password
    const isMatched = await bcrypt.compare(password, user.passwordHash);
    if (!isMatched) {
      // Increment failed attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
        user.loginAttempts = 0; // reset attempts count after lock
        await user.save();
        
        await ActivityLog.create({
          userId: user._id,
          action: 'account_locked',
          description: `Account locked for 15 minutes due to 5 failed login attempts from IP: ${req.ip}`,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || ''
        });
        
        res.status(403);
        throw new Error('Account locked due to too many failed attempts. Try again in 15 minutes.');
      }
      await user.save();
      res.status(401);
      throw new Error('Invalid email or password credentials');
    }

    // Reset attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save session in database
    user.activeSessions = user.activeSessions || [];
    user.activeSessions.push({
      token: accessToken,
      ip: req.ip || '',
      device: req.headers['user-agent'] || ''
    });

    await user.save();

    // Log the successful login
    await ActivityLog.create({
      userId: user._id,
      action: 'login',
      description: `Successful login from IP: ${req.ip}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // Set cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
      passportNumber: user.passportNumber,
      nationality: user.nationality,
      dateOfBirth: user.dateOfBirth,
      accessToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401);
      throw new Error('Refresh token cookie missing, please re-authenticate');
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'skywaverefreshkey456$%^');
      
      const user = await User.findById(decoded.id);
      if (!user) {
        res.status(401);
        throw new Error('User associated with this token does not exist');
      }

      // Generate new tokens (rotation)
      const newAccessToken = generateAccessToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // Save new session token
      user.activeSessions = user.activeSessions || [];
      user.activeSessions.push({
        token: newAccessToken,
        ip: req.ip || '',
        device: req.headers['user-agent'] || ''
      });
      await user.save();

      // Overwrite cookie
      res.cookie('refreshToken', newRefreshToken, cookieOptions);

      res.json({
        accessToken: newAccessToken
      });
    } catch (tokenError) {
      res.status(401);
      throw new Error('Invalid or expired refresh token, authorization failed');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'skywaveaccesskey789!@#');
        const user = await User.findById(decoded.id);
        if (user) {
          user.activeSessions = (user.activeSessions || []).filter(s => s.token !== token);
          await user.save();
          
          await ActivityLog.create({
            userId: user._id,
            action: 'logout',
            description: `User logged out session. IP: ${req.ip}`,
            ipAddress: req.ip || '',
            userAgent: req.headers['user-agent'] || ''
          });
        }
      } catch (err) {
        // Token might have already expired, ignore
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ message: 'Session logged out and cleared successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - request OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Email address is required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('No user account found with this email address');
    }

    // Generate a 6-digit OTP (e.g., 100000 to 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP to store in DB
    const salt = await bcrypt.genSalt(8);
    const hashedOTP = await bcrypt.hash(otp, salt);

    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins validity
    await user.save();

    // Log the request
    await ActivityLog.create({
      userId: user._id,
      action: 'password_reset_request',
      description: `Password reset OTP generated. Sent simulated email to: ${email}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    console.log(`\n=== PASSWORD RESET SIMULATION ===`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expiration: 15 minutes`);
    console.log(`==================================\n`);

    res.json({
      message: 'Simulated password reset OTP sent. Check server console for code.',
      email,
      otpToken: otp // Ret returning for testing convenience
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Reset Password OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      res.status(400);
      throw new Error('No password reset process active for this user');
    }

    if (user.resetPasswordExpires < Date.now()) {
      res.status(400);
      throw new Error('OTP has expired. Please request a new password reset');
    }

    const isMatched = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatched) {
      res.status(400);
      throw new Error('Invalid OTP code. Please check and try again');
    }

    res.json({
      message: 'OTP verified successfully. You may now reset your password.',
      email,
      verified: true
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400);
      throw new Error('Email, OTP, and new password are required');
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      res.status(400);
      throw new Error('No password reset process active for this user');
    }

    if (user.resetPasswordExpires < Date.now()) {
      res.status(400);
      throw new Error('OTP has expired. Please request a new reset');
    }

    const isMatched = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatched) {
      res.status(400);
      throw new Error('Invalid OTP code. Reset rejected.');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    user.loginAttempts = 0;
    user.lockUntil = null;
    
    // Invalidate all active sessions for security!
    user.activeSessions = [];
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'password_reset_success',
      description: `Password reset successfully via OTP verification. All active sessions invalidated.`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Password has been reset successfully. Please log in with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  verifyOTP,
  resetPassword
};
