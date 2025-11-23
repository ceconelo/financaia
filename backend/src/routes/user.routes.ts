import { Router } from 'express';
import { getUsers } from '../controllers/user.controller.js';
import { authenticateAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateAdmin, getUsers);

export default router;
