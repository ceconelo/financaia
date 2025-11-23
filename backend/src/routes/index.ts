import { Router } from 'express';
import statsRoutes from './stats.routes.js';
import connectionRoutes from './connection.routes.js';
import userRoutes from './user.routes.js';
import transactionRoutes from './transaction.routes.js';
import adminRoutes from './admin.routes.js';
import chatRoutes from './chat.routes.js';

const router = Router();

router.use('/stats', statsRoutes);
router.use('/connection', connectionRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);

export default router;
