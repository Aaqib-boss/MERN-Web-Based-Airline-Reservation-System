const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skywave';
  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Primary MongoDB Connection failed: ${error.message}`);
    if (primaryUri !== 'mongodb://127.0.0.1:27017/skywave') {
      console.log('Attempting local database fallback...');
      try {
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/skywave');
        console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`Local MongoDB fallback failed: ${fallbackError.message}`);
      }
    }
    process.exit(1);
  }
};

module.exports = connectDB;
