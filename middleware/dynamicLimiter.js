import { recordViolation } from './ipBlocker.js';

const rateStore = new Map(); // { key: { count, resetTime } }

const ROLE_LIMITS = {
    guest: 50,
    basic: 10,
    premium: 1000,
    admin: 10000
};

// Clean up expired records periodically to prevent memory leaks
const cleanupExpiredRecords = () => {
    const now = Date.now();
    for (const [key, record] of rateStore) {
        if (now > record.resetTime) {
            rateStore.delete(key);
        }
    }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredRecords, 10 * 60 * 1000);

export const dynamicLimiter = (req, res, next) => {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000

    const userId = req.user.id || null;
    const role = req.user.role || 'guest';
    const key = userId || req.ip

    const limit = ROLE_LIMITS[role] || ROLE_LIMITS.guest;
    let record = rateStore.get(key);

    if (!record || now > record.resetTime) {
        record = {
            count: 1,
            resetTime: now + windowMs
        };
        rateStore.set(key, record)
    } else {
        record.count++
    };

    const remaining = Math.max(limit - record.count, 0)
    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.floor(record.resetTime / 1000));

    if (record.count > limit) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        recordViolation(req.ip,userId);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: `${retryAfter}s`,
            limit,
            remaining: 0
        });
    }

    next();

};