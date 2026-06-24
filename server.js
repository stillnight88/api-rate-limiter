import app from './app.js';
import mongoose from "mongoose";

const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  maxIdleTimeMS: 30000,
  retryWrites: true,
};

let server;
let isShuttingDown = false;

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is required');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('✅ MongoDB Connected Successfully');

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB Connection Error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB Reconnected');
    });

  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    throw error;
  }
};


const startServer = async () => {
  await connectDatabase();

  const PORT = process.env.PORT || 5000;

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
  });
};

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️  Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimer = setTimeout(() => {
    console.error('❌ Graceful shutdown timeout. Forcing exit...');
    process.exit(1);
  }, 10000);

  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('✅ Server closed');
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
    clearTimeout(shutdownTimer);
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimer);
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
