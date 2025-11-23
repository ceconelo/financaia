import { Router } from 'express';
import {
    getRecentTransactions,
    getChartData,
    resetTransactions,
    getTransactions,
    updateTransaction,
    deleteTransaction
} from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/recent', authenticate, getRecentTransactions);
router.get('/chart', authenticate, getChartData);
router.delete('/reset', authenticate, resetTransactions);
router.get('/', authenticate, getTransactions);
router.put('/:id', authenticate, updateTransaction);
router.delete('/:id', authenticate, deleteTransaction);

export default router;
