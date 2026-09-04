const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not set — running without persistent storage. Data APIs will be unavailable.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed', err?.message || err);
    console.warn('Continuing without MongoDB. Set MONGO_URI to enable persistence.');
  }
};

module.exports = { connectDB };