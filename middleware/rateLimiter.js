import rateLimit from 'express-rate-limit';
import { recordViolation } from './ipBlocker.js';

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },

    skip: (req) => {
        return req.user?.role === 'admin';
    },


    handler: (req, res) => {
        const retryAfter = Math.ceil(60); 

        // Only record violations for IP-based requests (anonymous users)
        if (!req.user?.id) {
            const violationResult = recordViolation(req.ip);

            if (violationResult.blocked) {
                return res.status(403).json({
                    error: 'IP blocked',
                    message: 'IP has been blocked due to repeated violations.',
                    violations: violationResult.violations,
                    blockedUntil: new Date(violationResult.blockedUntil).toISOString()
                });
            }
        }

        res.setHeader('Retry-After', retryAfter);

        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please slow down.',
            retryAfter: `${retryAfter}s`,
            limit: 10,
            window: '1 minute'
        });
    },

    // Store in memory (default) - consider Redis for production clusters
    store: undefined
});

export default limiter;
