import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// Leaderboard is public (no auth required) or can be protected
router.get('/', getLeaderboard);

export default router;

