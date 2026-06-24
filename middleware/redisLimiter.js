import { RateLimiterRedis } from 'rate-limiter-flexible';
import { recordViolation } from './ipBlocker.js';
import redisClient from '../config/redis.js';

const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rateLimiter',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds (1 minute window)
    blockDuration: 60 * 5, // Block for 5 minutes when limit exceeded
});

export const redisLimiter = async (req, res, next) => {
  try {
    // Use user ID for authenticated users, IP for anonymous
    const key = req.user?.id || req.ip;
    
    console.log(`Rate limiter check for key: ${key}`);
    
    // Skip admin users
    if (req.user?.role === 'admin') {
      console.log('Admin user detected, skipping rate limit');
      return next();
    }
    
    // Check current status before consuming
    const resCheck = await limiter.get(key);
    if (resCheck) {
      console.log(`Current status for ${key}:`, {
        consumedPoints: resCheck.consumedPoints,
        remainingPoints: resCheck.remainingPoints,
        msBeforeNext: resCheck.msBeforeNext
      });
    }
    
    // Try to consume a point
    const resRateLimiter = await limiter.consume(key);
    
    console.log(`Rate limit consume successful for ${key}:`, {
      consumedPoints: resRateLimiter.consumedPoints,
      remainingPoints: resRateLimiter.remainingPoints,
      msBeforeNext: resRateLimiter.msBeforeNext
    });
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', 10);
    res.setHeader('X-RateLimit-Remaining', resRateLimiter.remainingPoints);
    res.setHeader('X-RateLimit-Reset', Math.round(resRateLimiter.msBeforeNext / 1000));
    
    next();
    
  } catch (resRateLimiter) {
    console.log('Rate limit exceeded:', resRateLimiter);
    
    const key = req.user?.id || req.ip;
    const retryAfter = Math.round(resRateLimiter.msBeforeNext / 1000) || 300;
    
    console.log(`Rate limit exceeded for ${key}:`, {
      consumedPoints: resRateLimiter.consumedPoints,
      remainingPoints: resRateLimiter.remainingPoints,
      msBeforeNext: resRateLimiter.msBeforeNext,
      retryAfter
    });
    
    // Only record violations for IP-based requests (anonymous users)
    if (!req.user?.id) {
      console.log(`Recording violation for IP: ${req.ip}`);
      const violationResult = recordViolation(req.ip);
      
      if (violationResult.blocked) {
        console.log(`IP ${req.ip} is blocked:`, violationResult);
        return res.status(403).json({
          error: 'IP blocked',
          message: 'IP blocked due to repeated violations.',
          violations: violationResult.violations,
          blockedUntil: new Date(violationResult.blockedUntil).toISOString()
        });
      }
    }
    
    // Set rate limit headers
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', 10);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', retryAfter);
    
    console.log('Sending 429 response');
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: `${retryAfter}s`,
      limit: 10,
      window: '60 seconds'
    });
  }
};