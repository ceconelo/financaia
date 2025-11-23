import { Router } from 'express';
import {
    getWaitlist,
    approveUser,
    getActiveUsers,
    revokeAccess
} from '../controllers/admin.controller.js';
import { authenticateAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/waitlist', authenticateAdmin, getWaitlist);
router.post('/approve', authenticateAdmin, approveUser);
router.get('/active-users', authenticateAdmin, getActiveUsers);
router.post('/revoke', authenticateAdmin, revokeAccess);

export default router;
