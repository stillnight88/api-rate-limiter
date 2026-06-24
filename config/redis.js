import Redis from "ioredis";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const redisClient = new Redis({
    host: process.env.REDIS_HOST ,
    port: process.env.REDIS_PORT ,
    password: process.env.REDIS_PASSWORD,
    enableOfflineQueue: false,
    lazyConnect: true, // Don't connect immediately
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000
})

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('ready', () => {
  console.log('Redis ready');
});

export default redisClient;