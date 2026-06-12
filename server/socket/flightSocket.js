const { lockSeat, unlockSeat } = require('../services/seatLockService');

const handleFlightSockets = (io, socket) => {
  // Track locks held by this specific socket session
  const sessionLocks = [];

  // Client requests to lock a seat
  socket.on('seat:hold', async ({ flightId, seatNumber, userId }, callback) => {
    try {
      const ownerId = userId || socket.id;
      const success = await lockSeat(flightId, seatNumber, ownerId);
      
      if (success) {
        sessionLocks.push({ flightId, seatNumber });
        // Broadcast lock to all other connected clients
        socket.broadcast.emit('seat:locked', { flightId, seatNumber, userId: ownerId });
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false, message: 'Seat is currently locked by another passenger' });
      }
    } catch (error) {
      console.error('Socket seat:hold error:', error.message);
      if (callback) callback({ success: false, message: 'Server error processing seat lock' });
    }
  });

  // Client releases seat lock
  socket.on('seat:release', async ({ flightId, seatNumber }, callback) => {
    try {
      await unlockSeat(flightId, seatNumber);
      
      // Remove from session tracking
      const index = sessionLocks.findIndex(l => l.flightId === flightId && l.seatNumber === seatNumber);
      if (index !== -1) {
        sessionLocks.splice(index, 1);
      }
      
      // Broadcast unlock to other clients
      socket.broadcast.emit('seat:unlocked', { flightId, seatNumber });
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('Socket seat:release error:', error.message);
      if (callback) callback({ success: false });
    }
  });

  // Clean up session locks on disconnect
  socket.on('disconnect', async () => {
    console.log(`Socket Client Disconnected: ${socket.id}`);
    
    for (const lock of sessionLocks) {
      try {
        await unlockSeat(lock.flightId, lock.seatNumber);
        socket.broadcast.emit('seat:unlocked', { flightId: lock.flightId, seatNumber: lock.seatNumber });
      } catch (err) {
        console.error('Error releasing disconnect locks:', err.message);
      }
    }
  });
};

module.exports = { handleFlightSockets };
