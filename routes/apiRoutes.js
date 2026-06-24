import express from 'express';
import { publicApi, protectedApi } from '../controllers/apiController.js';
import { dynamicRedisLimiter } from '../middleware/dynamicRedisLimiter.js';
// import { dynamicLimiter } from '../middleware/dynamicLimiter.js';
import { protect } from '../middleware/authMiddleware.js';
import { ipBlocker } from '../middleware/ipBlocker.js';

const router = express.Router();

// Public route - IP-based blocking only
router.get('/public', ipBlocker, publicApi);

// Protected route - Auth first, then user-aware blocking & rate limiting
router.get('/protected', protect, ipBlocker, dynamicRedisLimiter, protectedApi);

export default router;