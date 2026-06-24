import { RateLimiterRedis } from 'rate-limiter-flexible';
import { recordViolation } from './ipBlocker.js';
import redisClient from '../config/redis.js';

const ROLE_LIMITS = {
    guest: { points: 50, duration: 3600 },
    basic: { points: 100, duration: 3600 },
    premium: { points: 1000, duration: 3600 },
    admin: { points: 10000, duration: 3600 }
};

const limiterCache = new Map();

// Get or create limiter for specific role
const getLimiter = (role) => {
    const config = ROLE_LIMITS[role] || ROLE_LIMITS.guest;

    if (!limiterCache.has(role)) {
        const limiter = new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: `dynamicRate:${role}`,
            points: config.points,
            duration: config.duration,
            blockDuration: 15 * 60 // 15 minutes block
        });
        limiterCache.set(role, limiter);
    }

    return limiterCache.get(role);
};

export const dynamicRedisLimiter = async (req, res, next) => {
    const userId = req.user?.id || null;
    const role = req.user?.role || 'guest';
    const key = `${role}:${req.ip}`; // Use role:ip as the key

    try {
        const limiter = getLimiter(role);
        const resRateLimiter = await limiter.consume(key);

        const config = ROLE_LIMITS[role] || ROLE_LIMITS.guest;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', config.points);
        res.setHeader('X-RateLimit-Remaining', resRateLimiter.remainingPoints);
        res.setHeader('X-RateLimit-Reset', Math.round(resRateLimiter.msBeforeNext / 1000));
        console.log(config.points)
        console.log(resRateLimiter.remainingPoints)
        console.log(Math.round(resRateLimiter.msBeforeNext / 1000))

        next();

    } catch (resRateLimiter) {
        const retryAfter = Math.round(resRateLimiter.msBeforeNext / 1000) || 900; // 15 mins fallback
        const config = ROLE_LIMITS[role] || ROLE_LIMITS.guest;

        const violationResult = recordViolation(req.ip, userId);
        if (violationResult.blocked) {
            return res.status(403).json({
                error: 'IP blocked',
                message: 'IP blocked due to repeated violations.',
                violations: violationResult.violations,
                blockedUntil: new Date(violationResult.blockedUntil).toISOString()
            });
        }

        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', config.points);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', retryAfter);

        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: `${retryAfter}s`,
            limit: config.points,
            role,
            window: '1 hour'
        });
    }
};

// Memory cleanup for limiter cache (optional)
const cleanupLimiterCache = () => {
    // Keep cache size reasonable - remove unused limiters periodically
    if (limiterCache.size > 10) {
        console.log('Limiter cache size:', limiterCache.size);
    }
};

// Run cleanup every hour
setInterval(cleanupLimiterCache, 60 * 60 * 1000);

export default dynamicRedisLimiter;