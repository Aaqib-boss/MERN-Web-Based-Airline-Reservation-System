const bcrypt = require('bcryptjs');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { getIO } = require('../config/socketConfig');

// Helper to check role restrictions for Operations Admins
const verifyAdminAccessRestrictions = (req, res, targetUser) => {
  if (req.user.role === 'admin') {
    if (targetUser.role === 'superadmin') {
      res.status(403);
      throw new Error('Access denied. Operations Admins cannot modify Super Admin accounts.');
    }
    if (targetUser.role === 'admin') {
      res.status(403);
      throw new Error('Access denied. Operations Admins cannot modify other Admin accounts.');
    }
  }
};

// Helper to generate seat layout for a new flight row
const generateSeatsForClass = (basePrice, startRow, endRow) => {
  const seats = [];
  const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  for (let r = startRow; r <= endRow; r++) {
    seatLetters.forEach(letter => {
      let type = 'middle';
      if (letter === 'A' || letter === 'F') type = 'window';
      else if (letter === 'C' || letter === 'D') type = 'aisle';
      
      let currentPrice = basePrice;
      if (type === 'window') currentPrice = Math.round(currentPrice * 1.20);
      else if (type === 'aisle') currentPrice = Math.round(currentPrice * 1.10);

      seats.push({
        seatNumber: `${r}${letter}`,
        row: r,
        type,
        isAvailable: true,
        lockedBy: null,
        lockedUntil: null,
        currentPrice
      });
    });
  }
  return seats;
};

// @desc    Get Admin Dashboard Analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user', isDeleted: false });
    const totalFlights = await Flight.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: 'confirmed' });
    
    // Revenue calculations
    const payments = await Payment.find({ status: 'success' });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Occupancy calculations
    const flights = await Flight.find();
    let totalSeatsPossible = 0;
    let totalSeatsAvailable = 0;
    
    flights.forEach(f => {
      totalSeatsPossible += f.totalSeats || 180;
      totalSeatsAvailable += f.availableSeats || 0;
    });

    const overallOccupancy = totalSeatsPossible > 0 
      ? Math.round(((totalSeatsPossible - totalSeatsAvailable) / totalSeatsPossible) * 100) 
      : 0;

    let economyRevenue = 0;
    let businessRevenue = 0;
    let firstRevenue = 0;

    const confirmedBookings = await Booking.find({ status: 'confirmed' });
    confirmedBookings.forEach(booking => {
      booking.passengers.forEach(p => {
        const ticketVal = Math.round(booking.totalAmount / booking.passengers.length);
        if (p.cabinClass === 'First') firstRevenue += ticketVal;
        else if (p.cabinClass === 'Business') businessRevenue += ticketVal;
        else economyRevenue += ticketVal;
      });
    });

    const salesTimeline = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      revenue: [totalRevenue * 0.12, totalRevenue * 0.15, totalRevenue * 0.18, totalRevenue * 0.14, totalRevenue * 0.16, totalRevenue * 0.25].map(Math.round),
      bookings: [activeBookings * 0.1, activeBookings * 0.15, activeBookings * 0.2, activeBookings * 0.13, activeBookings * 0.17, activeBookings * 0.25].map(Math.round)
    };

    const statusCounts = {
      scheduled: 0,
      boarding: 0,
      delayed: 0,
      departed: 0,
      arrived: 0,
      cancelled: 0
    };

    flights.forEach(f => {
      if (statusCounts[f.status] !== undefined) {
        statusCounts[f.status]++;
      }
    });

    res.json({
      summary: {
        totalUsers,
        totalFlights,
        activeBookings,
        totalRevenue,
        overallOccupancyPercentage: overallOccupancy
      },
      charts: {
        classSplit: {
          labels: ['Economy', 'Business', 'First Class'],
          data: [economyRevenue, businessRevenue, firstRevenue]
        },
        timeline: salesTimeline,
        statuses: statusCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new flight path
// @route   POST /api/admin/flights
// @access  Private (Admin only)
const createFlight = async (req, res, next) => {
  try {
    const { 
      flightNumber, airline, aircraft, 
      origin, destination, 
      departureTime, arrivalTime, duration, 
      economyBasePrice, businessBasePrice, firstBasePrice,
      economyClassSeats, businessClassSeats, firstClassSeats,
      baggageAllowance, amenities, stops = []
    } = req.body;

    if (!flightNumber || !airline || !origin || !destination || !departureTime || !arrivalTime || !economyBasePrice) {
      res.status(400);
      throw new Error('Required flight fields are missing');
    }

    const flightExists = await Flight.findOne({ flightNumber: flightNumber.toUpperCase() });
    if (flightExists) {
      res.status(400);
      throw new Error(`Flight number ${flightNumber} already exists in the system`);
    }

    const firstSeatsCount = typeof firstClassSeats === 'number' ? firstClassSeats : 12;
    const businessSeatsCount = typeof businessClassSeats === 'number' ? businessClassSeats : 24;
    const economySeatsCount = typeof economyClassSeats === 'number' ? economyClassSeats : 144;

    const firstRows = Math.ceil(firstSeatsCount / 6);
    const businessRows = Math.ceil(businessSeatsCount / 6);
    const economyRows = Math.ceil(economySeatsCount / 6);

    let currentRow = 1;
    let firstSeats = [];
    if (firstRows > 0) {
      firstSeats = generateSeatsForClass(firstBasePrice || (economyBasePrice * 4), currentRow, currentRow + firstRows - 1);
      firstSeats = firstSeats.slice(0, firstSeatsCount);
      currentRow += firstRows;
    }

    let businessSeats = [];
    if (businessRows > 0) {
      businessSeats = generateSeatsForClass(businessBasePrice || (economyBasePrice * 2.2), currentRow, currentRow + businessRows - 1);
      businessSeats = businessSeats.slice(0, businessSeatsCount);
      currentRow += businessRows;
    }

    let economySeats = [];
    if (economyRows > 0) {
      economySeats = generateSeatsForClass(economyBasePrice, currentRow, currentRow + economyRows - 1);
      economySeats = economySeats.slice(0, economySeatsCount);
      currentRow += economyRows;
    }

    const cabinClasses = [
      { class: 'First', basePrice: firstBasePrice || (economyBasePrice * 4), seats: firstSeats },
      { class: 'Business', basePrice: businessBasePrice || (economyBasePrice * 2.2), seats: businessSeats },
      { class: 'Economy', basePrice: economyBasePrice, seats: economySeats }
    ];

    const totalSeatsCount = firstSeatsCount + businessSeatsCount + economySeatsCount;

    const flight = await Flight.create({
      flightNumber: flightNumber.toUpperCase(),
      airline,
      aircraft: aircraft || 'Airbus A320 Neo',
      origin,
      destination,
      departureTime,
      arrivalTime,
      duration: duration || '2h 15m',
      stops,
      totalSeats: totalSeatsCount,
      availableSeats: totalSeatsCount,
      cabinClasses,
      status: 'scheduled',
      baggageAllowance: baggageAllowance || { cabin: '7kg', checkin: '15kg' },
      amenities: amenities || ['meal', 'entertainment'],
      demandScore: 50
    });

    res.status(201).json(flight);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel flight and refund passengers
// @route   POST /api/admin/flights/:id/cancel
// @access  Private (Admin only)
const cancelFlightAdmin = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    if (flight.status === 'cancelled') {
      res.status(400);
      throw new Error('Flight is already cancelled');
    }

    flight.status = 'cancelled';
    flight.availableSeats = 0;
    
    flight.cabinClasses.forEach(cc => {
      cc.seats.forEach(s => {
        s.isAvailable = true;
        s.lockedBy = null;
        s.lockedUntil = null;
      });
    });
    
    await flight.save();

    const bookings = await Booking.find({ flightIds: flight._id, status: 'confirmed' });

    for (const booking of bookings) {
      booking.status = 'cancelled';
      booking.paymentStatus = 'refunded';
      booking.refundAmount = booking.totalAmount;
      booking.refundStatus = 'processed';
      booking.cancellationReason = 'Flight cancelled by airline operations';
      await booking.save();

      const payment = await Payment.findById(booking.paymentId);
      if (payment) {
        payment.status = 'refunded';
        payment.refundId = `ref_AD_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        payment.refundAmount = booking.totalAmount;
        payment.refundInitiatedAt = new Date();
        await payment.save();
      }
    }

    const io = getIO();
    io.emit('flight:cancelled', { flightId: flight._id.toString() });

    res.json({
      message: `Flight ${flight.flightNumber} successfully cancelled. ${bookings.length} bookings refunded.`,
      flight
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Uncancel a flight
// @route   POST /api/admin/flights/:id/uncancel
// @access  Private (Admin only)
const uncancelFlightAdmin = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    if (flight.status !== 'cancelled') {
      res.status(400);
      throw new Error('Flight is not cancelled');
    }

    flight.status = 'scheduled';
    let totalAvail = 0;
    flight.cabinClasses.forEach(cc => {
      cc.seats.forEach(s => {
        if (s.isAvailable) totalAvail++;
      });
    });
    flight.availableSeats = totalAvail;

    await flight.save();

    const io = getIO();
    io.emit('flight:updated', { flightId: flight._id.toString(), status: 'scheduled', availableSeats: flight.availableSeats });

    res.json({ message: `Flight ${flight.flightNumber} has been un-cancelled.`, flight });
  } catch (error) {
    next(error);
  }
};

// @desc    Update flight status (delay or schedule)
// @route   POST /api/admin/flights/:id/status
// @access  Private (Admin only)
const updateFlightStatusAdmin = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status option');
    }

    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    flight.status = status;
    await flight.save();

    const io = getIO();
    io.emit('flight:updated', { flightId: flight._id.toString(), status });

    res.json({ message: `Flight status updated to ${status}`, flight });
  } catch (error) {
    next(error);
  }
};

// @desc    Update flight seat counts (Edit seat counts manually)
// @route   POST /api/admin/flights/:id/seats
// @access  Private (Admin only)
const updateFlightSeatsAdmin = async (req, res, next) => {
  try {
    const { availableSeats, totalSeats } = req.body;
    
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    if (totalSeats !== undefined) flight.totalSeats = totalSeats;
    if (availableSeats !== undefined) flight.availableSeats = availableSeats;

    await flight.save();

    const io = getIO();
    io.emit('flight:updated', { flightId: flight._id.toString(), availableSeats: flight.availableSeats, totalSeats: flight.totalSeats });

    res.json({ message: 'Flight seat counts updated successfully', flight });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a flight completely
// @route   DELETE /api/admin/flights/:id
// @access  Private (Admin only)
const deleteFlightAdmin = async (req, res, next) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    const io = getIO();
    io.emit('flight:deleted', { flightId: req.params.id });

    res.json({ message: `Flight ${flight.flightNumber} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('flightIds')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (excluding soft-deleted ones)
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: false }).select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all flights
// @route   GET /api/admin/flights
// @access  Private (Admin only)
const getAllFlights = async (req, res, next) => {
  try {
    const flights = await Flight.find().sort({ departureTime: -1 });
    res.json(flights);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Dashboard stats counts
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin only)
const getDashboardStats = async (req, res, next) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'user', isDeleted: false });
    const totalAdmins = await User.countDocuments({ role: 'admin', isDeleted: false });
    const activeUsers = await User.countDocuments({ status: 'active', isDeleted: false });
    const blockedUsers = await User.countDocuments({ status: 'blocked', isDeleted: false });
    const pendingApprovals = await User.countDocuments({ status: 'pending', isDeleted: false });

    // Recent activities (last 10 logs)
    const recentActivities = await ActivityLog.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      totalMembers,
      totalAdmins,
      activeUsers,
      blockedUsers,
      pendingApprovals,
      recentActivities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Audit Activity Logs
// @route   GET /api/admin/audit-logs
// @access  Private (Superadmin only)
const getAuditLogs = async (req, res, next) => {
  try {
    const showDeleted = req.query.showDeleted === 'true';
    const logs = await ActivityLog.find({ isDeleted: showDeleted })
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 });

    if (req.query.format === 'csv') {
      const headers = ['Timestamp', 'User Name', 'User Email', 'Role', 'Action', 'Description', 'IP Address', 'User Agent'];
      const csvContent = logs.map(l => {
        const timestamp = new Date(l.timestamp).toISOString();
        const userName = l.userId?.name || 'System';
        const userEmail = l.userId?.email || '—';
        const role = l.userId?.role || '—';
        const action = l.action;
        const desc = l.description.replace(/"/g, '""');
        const ip = l.ipAddress || '';
        const ua = (l.userAgent || '').replace(/"/g, '""');

        return `"${timestamp}","${userName}","${userEmail}","${role}","${action}","${desc}","${ip}","${ua}"`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="skywave_audit_logs.csv"');
      return res.send([headers.join(','), ...csvContent].join('\n'));
    }

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a single audit log (soft delete)
// @route   DELETE /api/admin/audit-logs/:id
// @access  Private (Superadmin only)
const deleteAuditLog = async (req, res, next) => {
  try {
    const log = await ActivityLog.findById(req.params.id);
    if (!log) {
      res.status(404);
      throw new Error('Audit log entry not found');
    }
    log.isDeleted = true;
    await log.save();
    res.json({ message: 'Audit log moved to Recycle Bin' });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a soft-deleted audit log
// @route   POST /api/admin/audit-logs/:id/restore
// @access  Private (Superadmin only)
const restoreAuditLog = async (req, res, next) => {
  try {
    const log = await ActivityLog.findById(req.params.id);
    if (!log) {
      res.status(404);
      throw new Error('Audit log entry not found');
    }
    log.isDeleted = false;
    await log.save();
    res.json({ message: 'Audit log entry restored successfully', log });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear active audit logs or purge recycle bin
// @route   DELETE /api/admin/audit-logs
// @access  Private (Superadmin only)
const clearAuditLogs = async (req, res, next) => {
  try {
    const { purge } = req.query;
    if (purge === 'true') {
      await ActivityLog.deleteMany({ isDeleted: true });
      res.json({ message: 'Recycle bin permanently emptied.' });
    } else {
      await ActivityLog.updateMany({ isDeleted: false }, { isDeleted: true });
      res.json({ message: 'All active audit logs moved to Recycle Bin.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a pending Admin/User request
// @route   POST /api/admin/users/:id/approve
// @access  Private (Superadmin only)
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Account request not found');
    }

    if (user.status !== 'pending') {
      res.status(400);
      throw new Error('This account is not in pending status');
    }

    user.status = 'active';

    if (user.role === 'admin') {
      user.employeeId = `SW-ADM-${Math.floor(1000 + Math.random() * 9000)}`;
      user.permissions = ['manage_flights', 'manage_bookings', 'manage_members'];
    } else {
      user.memberId = `SW-MBR-${Math.floor(1000 + Math.random() * 9000)}`;
      user.membershipNumber = `SW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'approve_user',
      description: `Approved request and activated account for ${user.name} (${user.email}). Assigned ID: ${user.employeeId || user.memberId}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'User approved and activated successfully', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a pending account request
// @route   POST /api/admin/users/:id/reject
// @access  Private (Superadmin only)
const rejectUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('Account request not found');
    }

    if (user.status !== 'pending') {
      res.status(400);
      throw new Error('This account is not in pending status');
    }

    user.status = 'suspended'; // Or delete it, setting to suspended retains the audit record
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'reject_user',
      description: `Rejected and suspended account request for ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'Account request rejected successfully', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user status (block, unblock, suspend, reactivate)
// @route   POST /api/admin/users/:id/status
// @access  Private (Admin only)
const changeUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'blocked'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status option');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Role restrictions validation
    verifyAdminAccessRestrictions(req, res, user);

    if (user._id.equals(req.user._id)) {
      res.status(400);
      throw new Error('You cannot modify your own status');
    }

    const oldStatus = user.status;
    user.status = status;

    if (status === 'blocked' || status === 'suspended') {
      // Invalidate sessions immediately on status lock!
      user.activeSessions = [];
    }

    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'change_status',
      description: `Updated status for ${user.name} from '${oldStatus}' to '${status}'`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: `User status changed to ${status}`, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft Delete User
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const softDeleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    verifyAdminAccessRestrictions(req, res, user);

    if (user._id.equals(req.user._id)) {
      res.status(400);
      throw new Error('You cannot delete your own account');
    }

    user.isDeleted = true;
    user.deletedAt = Date.now();
    user.activeSessions = []; // log them out
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'soft_delete_user',
      description: `Soft deleted account: ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'User account soft deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore Soft-Deleted User
// @route   POST /api/admin/users/:id/restore
// @access  Private (Superadmin only)
const restoreUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'restore_user',
      description: `Restored soft-deleted account: ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'User account restored successfully', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Force Logout User
// @route   POST /api/admin/users/:id/force-logout
// @access  Private (Admin only)
const forceLogoutUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    verifyAdminAccessRestrictions(req, res, user);

    user.activeSessions = [];
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'force_logout',
      description: `Forced logout and invalidated active sessions for: ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'All active sessions invalidated. User forced to logout.', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password directly from admin panel
// @route   POST /api/admin/users/:id/reset-password
// @access  Private (Admin only)
const adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      res.status(400);
      throw new Error('New password is required');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    verifyAdminAccessRestrictions(req, res, user);

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.activeSessions = []; // force relogin on password resets
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'admin_reset_password',
      description: `Administratively reset password for ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'User password reset successfully. Sessions terminated.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Role (Promote / Demote)
// @route   POST /api/admin/users/:id/role
// @access  Private (Superadmin only)
const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role specified');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user._id.equals(req.user._id)) {
      res.status(400);
      throw new Error('You cannot modify your own system role');
    }

    const oldRole = user.role;
    user.role = role;

    if (role === 'admin' && !user.employeeId) {
      user.employeeId = `SW-ADM-${Math.floor(1000 + Math.random() * 9000)}`;
      user.permissions = ['manage_flights', 'manage_bookings', 'manage_members'];
    } else if (role === 'user' && !user.memberId) {
      user.memberId = `SW-MBR-${Math.floor(1000 + Math.random() * 9000)}`;
      user.membershipNumber = `SW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    user.activeSessions = []; // require re-login for role changes
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'role_change',
      description: `Shifted role of ${user.name} from '${oldRole}' to '${role}'`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: `Role changed to ${role} successfully`, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change User Permissions
// @route   POST /api/admin/users/:id/permissions
// @access  Private (Superadmin only)
const changeUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      res.status(400);
      throw new Error('Permissions must be an array of strings');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.permissions = permissions;
    await user.save();

    await ActivityLog.create({
      userId: req.user._id,
      action: 'permissions_change',
      description: `Updated permissions list for admin: ${user.name}. New list: ${permissions.join(', ')}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: 'Permissions updated successfully', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Import Members via CSV format text
// @route   POST /api/admin/users/import
// @access  Private (Superadmin only)
const importUsersCSV = async (req, res, next) => {
  try {
    const { csvText } = req.body;
    if (!csvText) {
      res.status(400);
      throw new Error('CSV text is required');
    }

    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      res.status(400);
      throw new Error('CSV contains no data rows');
    }

    const header = lines[0].toLowerCase().split(',');
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const passwordIdx = header.indexOf('password');
    const nationalityIdx = header.indexOf('nationality');
    const passportIdx = header.indexOf('passport');

    if (nameIdx === -1 || emailIdx === -1 || passwordIdx === -1) {
      res.status(400);
      throw new Error('CSV must contain name, email, and password columns');
    }

    let importedCount = 0;
    const salt = await bcrypt.genSalt(10);

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
      
      const name = row[nameIdx];
      const email = row[emailIdx]?.toLowerCase();
      const password = row[passwordIdx];

      if (!name || !email || !password) continue;

      const userExists = await User.findOne({ email });
      if (userExists) continue;

      const passwordHash = await bcrypt.hash(password, salt);
      const nationality = nationalityIdx !== -1 ? row[nationalityIdx] : '';
      const passportNumber = passportIdx !== -1 ? row[passportIdx] : '';

      const memberId = `SW-MBR-${Math.floor(1000 + Math.random() * 9000)}`;
      const membershipNumber = `SW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await User.create({
        name,
        email,
        passwordHash,
        nationality,
        passportNumber,
        role: 'user',
        status: 'active',
        memberId,
        membershipNumber,
        loyaltyTier: 'Bronze',
        loyaltyPoints: 0
      });
      importedCount++;
    }

    await ActivityLog.create({
      userId: req.user._id,
      action: 'bulk_import_users',
      description: `Bulk imported ${importedCount} member accounts from CSV`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ message: `Successfully imported ${importedCount} member accounts.`, count: importedCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Users database as CSV file
// @route   GET /api/admin/users/export
// @access  Private (Superadmin only)
const exportUsersCSV = async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: false }).select('-passwordHash').sort({ createdAt: -1 });
    
    const headers = ['Name', 'Email', 'Role', 'Status', 'Passport Number', 'Nationality', 'Member/Employee ID', 'Loyalty Tier', 'Club Points', 'Joined Date'];
    const csvContent = users.map(u => {
      const id = u.employeeId || u.memberId || '—';
      const passport = u.passportNumber || '—';
      const nat = u.nationality || '—';
      const date = new Date(u.createdAt).toISOString();
      return `"${u.name}","${u.email}","${u.role}","${u.status}","${passport}","${nat}","${id}","${u.loyaltyTier}","${u.loyaltyPoints}","${date}"`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="skywave_users_database.csv"');
    res.send([headers.join(','), ...csvContent].join('\n'));
  } catch (error) {
    next(error);
  }
};

// @desc    Create member account (restricted to Admin/Superadmin)
// @route   POST /api/admin/members
// @access  Private (Admin only)
const createMember = async (req, res, next) => {
  try {
    const { name, email, password, passportNumber, nationality, dateOfBirth } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Name, email, and password are required');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email address');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const memberId = `SW-MBR-${Math.floor(1000 + Math.random() * 9000)}`;
    const membershipNumber = `SW-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const user = await User.create({
      name,
      email,
      passwordHash,
      passportNumber: passportNumber || '',
      nationality: nationality || '',
      dateOfBirth: dateOfBirth || '',
      role: 'user',
      status: 'active',
      memberId,
      membershipNumber,
      loyaltyPoints: 0,
      loyaltyTier: 'Bronze'
    });

    await ActivityLog.create({
      userId: req.user._id,
      action: 'create_member',
      description: `Administratively created member account: ${user.name} (${user.email}). ID: ${memberId}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending user approvals
// @route   GET /api/admin/users/pending
// @access  Private (Superadmin only)
const getPendingUsers = async (req, res, next) => {
  try {
    const users = await User.find({ status: 'pending', isDeleted: false }).select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  createFlight,
  cancelFlightAdmin,
  getAllBookings,
  getAllUsers,
  getAllFlights,
  getDashboardStats,
  getAuditLogs,
  approveUser,
  rejectUser,
  changeUserStatus,
  softDeleteUser,
  restoreUser,
  forceLogoutUser,
  adminResetPassword,
  changeUserRole,
  changeUserPermissions,
  importUsersCSV,
  exportUsersCSV,
  createMember,
  getPendingUsers,
  uncancelFlightAdmin,
  updateFlightStatusAdmin,
  updateFlightSeatsAdmin,
  deleteFlightAdmin,
  deleteAuditLog,
  restoreAuditLog,
  clearAuditLogs
};
