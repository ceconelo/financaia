import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, getStats);

export default router;
