import { Router } from 'express';
import { getConnectionStatus } from '../controllers/connection.controller.js';

const router = Router();

router.get('/status', getConnectionStatus);

export default router;
