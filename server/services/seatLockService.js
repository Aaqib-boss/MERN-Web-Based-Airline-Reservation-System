const redis = require('redis');

let redisClient = null;
let useRedis = false;

// Attempt Redis connection if configured
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  
  redisClient.on('error', (err) => {
    console.warn('Redis client error, falling back to local memory locking:', err.message);
    useRedis = false;
  });
  
  redisClient.connect()
    .then(() => {
      console.log('Redis connected successfully for seat locking.');
      useRedis = true;
    })
    .catch((err) => {
      console.warn('Redis connection failed, running in-memory lock store fallback:', err.message);
      useRedis = false;
    });
} else {
  console.log('No REDIS_URL provided. Operating with in-memory lock store.');
}

// In-memory locks backup map
const memoryLocks = new Map(); // key: "flightId:seatNumber" -> { userId, expiresAt }

/**
 * Locks a specific seat for 8 minutes
 * @returns {Boolean} - True if lock succeeded, False if already locked
 */
const lockSeat = async (flightId, seatNumber, userId, durationSeconds = 480) => {
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  const lockKey = `lock:${flightId}:${seatNumber}`;
  
  if (useRedis && redisClient) {
    try {
      const result = await redisClient.set(lockKey, userId, { NX: true, EX: durationSeconds });
      return result === 'OK';
    } catch (err) {
      console.error('Redis lock operation failed, calling memory backup:', err.message);
    }
  }
  
  // Memory fallback logic
  const key = `${flightId}:${seatNumber}`;
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > new Date()) {
    return false; // Already locked
  }
  
  memoryLocks.set(key, { userId, expiresAt });
  return true;
};

/**
 * Unlocks a specific seat
 */
const unlockSeat = async (flightId, seatNumber) => {
  const lockKey = `lock:${flightId}:${seatNumber}`;
  
  if (useRedis && redisClient) {
    try {
      await redisClient.del(lockKey);
      return true;
    } catch (err) {
      console.error('Redis unlock operation failed, calling memory backup:', err.message);
    }
  }
  
  // Memory fallback logic
  const key = `${flightId}:${seatNumber}`;
  memoryLocks.delete(key);
  return true;
};

/**
 * Checks who owns the current active seat lock
 * @returns {String|null} - Owner User ID / Socket ID or null
 */
const getSeatLockOwner = async (flightId, seatNumber) => {
  const lockKey = `lock:${flightId}:${seatNumber}`;
  
  if (useRedis && redisClient) {
    try {
      const userId = await redisClient.get(lockKey);
      return userId;
    } catch (err) {
      console.error('Redis check owner operation failed, calling memory backup:', err.message);
    }
  }
  
  // Memory fallback logic
  const key = `${flightId}:${seatNumber}`;
  const existing = memoryLocks.get(key);
  if (existing && existing.expiresAt > new Date()) {
    return existing.userId;
  }
  return null;
};

module.exports = {
  lockSeat,
  unlockSeat,
  getSeatLockOwner
};
