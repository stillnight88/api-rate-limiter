import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import helmet from "helmet";
import compression from "compression";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from './routes/apiRoutes.js';
// import rateLimiter from './middleware/rateLimiter.js';
import {redisLimiter} from './middleware/redisLimiter.js';

const app = express();


app.use(helmet());
app.use(compression());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter (basic protection)
// app.use('/api', rateLimiter);
app.use('/api', redisLimiter);

// Auth routes (no IP blocking needed here)
app.use("/auth", authRoutes); 

// API routes handle their own IP blocking based on route type
app.use('/api', apiRoutes);

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
};

export default app;