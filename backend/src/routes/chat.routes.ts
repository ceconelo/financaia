import { Router } from 'express';
import { handleChat } from '../controllers/chat.controller.js';
import { validateBotRequest } from '../middlewares/auth.js';

const router = Router();

router.post('/', validateBotRequest, handleChat);

export default router;
