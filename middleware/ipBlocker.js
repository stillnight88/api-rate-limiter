const blockedIPs = new Map();     // { ip: unblockTime }
const blockedUsers = new Map();   // { userId: unblockTime }
const ipViolations = new Map();   // { ip: { count, firstViolationTime } }
const userViolations = new Map();  // { userId: { count, firstViolationTime } }

const MAX_VIOLATIONS = 5;           // Allowed # of 429s before block
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const VIOLATION_WINDOW_MS = 30 * 60 * 1000; // Track violations within 30 mins

const cleanupExpiredData = () => {
    const now = Date.now();
    
    // Clean blocked IPs
    for (const [ip, unblockTime] of blockedIPs) {
        if (now >= unblockTime) {
            blockedIPs.delete(ip);
        }
    }
    
    // Clean blocked users
    for (const [userId, unblockTime] of blockedUsers) {
        if (now >= unblockTime) {
            blockedUsers.delete(userId);
        }
    }
    
    // Clean IP violations
    for (const [ip, record] of ipViolations) {
        if (now - record.firstViolationTime > VIOLATION_WINDOW_MS) {
            ipViolations.delete(ip);
        }
    }
    
    // Clean user violations
    for (const [userId, record] of userViolations) {
        if (now - record.firstViolationTime > VIOLATION_WINDOW_MS) {
            userViolations.delete(userId);
        }
    }
};

setInterval(cleanupExpiredData, 5 * 60 * 1000);

export const ipBlocker = (req, res, next) => {
    const ip = req.ip;
    const userId = req.user?.id; // Get user ID if authenticated
    const now = Date.now();

    // Check if IP is blocked (for unauthenticated requests)
    const ipUnblockTime = blockedIPs.get(ip);
    if (!userId && ipUnblockTime && now < ipUnblockTime) {
        const retryAfter = Math.ceil((ipUnblockTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(403).json({
            error: 'IP blocked',
            message: 'Your IP has been temporarily blocked due to repeated violations.',
            retryAfter: `${retryAfter}s`,
            blockedUntil: new Date(ipUnblockTime).toISOString()
        });
    }

    // Check if user is blocked (for authenticated requests)
    if (userId) {
        const userUnblockTime = blockedUsers.get(userId);
        if (userUnblockTime && now < userUnblockTime) {
            const retryAfter = Math.ceil((userUnblockTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            return res.status(403).json({
                error: 'User blocked',
                message: 'Your account has been temporarily blocked due to repeated violations.',
                retryAfter: `${retryAfter}s`,
                blockedUntil: new Date(userUnblockTime).toISOString()
            });
        }
    }

    // Clean up expired blocks
    if (ipUnblockTime && now >= ipUnblockTime) {
        blockedIPs.delete(ip);
    }
    if (userId) {
        const userUnblockTime = blockedUsers.get(userId);
        if (userUnblockTime && now >= userUnblockTime) {
            blockedUsers.delete(userId);
        }
    }

    next();
};

export const recordViolation = (ip, userId = null) => {
    const now = Date.now();
    
    if (userId) {
        // Record violation for authenticated user
        let record = userViolations.get(userId);
        
        if (!record || now - record.firstViolationTime > VIOLATION_WINDOW_MS) {
            record = {
                count: 1,
                firstViolationTime: now
            };
        } else {
            record.count++;
        }
        
        userViolations.set(userId, record);
        
        if (record.count >= MAX_VIOLATIONS) {
            blockedUsers.set(userId, now + BLOCK_DURATION_MS);
            userViolations.delete(userId);
            
            return {
                blocked: true,
                violations: record.count,
                blockedUntil: now + BLOCK_DURATION_MS,
                blockType: 'user'
            };
        }
        
        return {
            blocked: false,
            violations: record.count,
            remaining: MAX_VIOLATIONS - record.count,
            blockType: 'user'
        };
    } else {
        // Record violation for IP (unauthenticated requests)
        let record = ipViolations.get(ip);
        
        if (!record || now - record.firstViolationTime > VIOLATION_WINDOW_MS) {
            record = {
                count: 1,
                firstViolationTime: now
            };
        } else {
            record.count++;
        }
        
        ipViolations.set(ip, record);
        
        if (record.count >= MAX_VIOLATIONS) {
            blockedIPs.set(ip, now + BLOCK_DURATION_MS);
            ipViolations.delete(ip);
            
            return {
                blocked: true,
                violations: record.count,
                blockedUntil: now + BLOCK_DURATION_MS,
                blockType: 'ip'
            };
        }
        
        return {
            blocked: false,
            violations: record.count,
            remaining: MAX_VIOLATIONS - record.count,
            blockType: 'ip'
        };
    }
};