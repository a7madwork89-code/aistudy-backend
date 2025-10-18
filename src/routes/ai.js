import express from 'express';
import { processText, checkAIHealth } from '../controllers/aiController.js';
import { verifyToken, rateLimit } from '../middleware/auth.js';

const router = express.Router();

// Health check (no auth required)
router.get('/health', checkAIHealth);

// Process text (requires authentication)
router.post('/process', verifyToken, rateLimit, processText);

export default router;