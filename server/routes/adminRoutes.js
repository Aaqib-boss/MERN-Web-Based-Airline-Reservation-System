const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Secure all admin routes with protect & authorize('admin', 'superadmin')
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.get('/analytics', getAnalytics);
router.post('/flights', createFlight);
router.get('/flights', getAllFlights);
router.post('/flights/:id/cancel', cancelFlightAdmin);
router.post('/flights/:id/uncancel', uncancelFlightAdmin);
router.post('/flights/:id/status', updateFlightStatusAdmin);
router.post('/flights/:id/seats', updateFlightSeatsAdmin);
router.delete('/flights/:id', deleteFlightAdmin);

router.get('/bookings', getAllBookings);
router.get('/users', authorize('superadmin'), getAllUsers);

// Dashboard stats (both admin and superadmin)
router.get('/dashboard-stats', getDashboardStats);

// Members management (Superadmin only)
router.post('/members', authorize('superadmin'), createMember);
router.post('/users/:id/status', authorize('superadmin'), changeUserStatus);
router.delete('/users/:id', authorize('superadmin'), softDeleteUser);
router.post('/users/:id/force-logout', authorize('superadmin'), forceLogoutUser);
router.post('/users/:id/reset-password', authorize('superadmin'), adminResetPassword);

// Super Admin Only Operations
router.get('/users/pending', authorize('superadmin'), getPendingUsers);
router.post('/users/:id/approve', authorize('superadmin'), approveUser);
router.post('/users/:id/reject', authorize('superadmin'), rejectUser);
router.post('/users/:id/restore', authorize('superadmin'), restoreUser);
router.post('/users/:id/role', authorize('superadmin'), changeUserRole);
router.post('/users/:id/permissions', authorize('superadmin'), changeUserPermissions);
router.post('/users/import', authorize('superadmin'), importUsersCSV);
router.get('/users/export', authorize('superadmin'), exportUsersCSV);
router.get('/audit-logs', authorize('superadmin'), getAuditLogs);
router.delete('/audit-logs/:id', authorize('superadmin'), deleteAuditLog);
router.post('/audit-logs/:id/restore', authorize('superadmin'), restoreAuditLog);
router.delete('/audit-logs', authorize('superadmin'), clearAuditLogs);

module.exports = router;
