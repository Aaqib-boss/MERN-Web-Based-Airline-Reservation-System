const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'skywaveaccesskey789!@#');
      
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({ message: 'User associated with this token no longer exists' });
      }

      // Block inactive accounts
      if (req.user.status !== 'active') {
        return res.status(403).json({ message: `Access denied. Your account is currently ${req.user.status}.` });
      }

      // Force logout validation
      if (req.user.activeSessions && req.user.activeSessions.length > 0) {
        const isSessionValid = req.user.activeSessions.some(s => s.token === token);
        if (!isSessionValid) {
          return res.status(401).json({ message: 'Session has been invalidated. Please log in again.' });
        }
      }

      req.user.passwordHash = undefined;
      
      next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token validation failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, access token missing' });
  }
};

module.exports = { protect };
