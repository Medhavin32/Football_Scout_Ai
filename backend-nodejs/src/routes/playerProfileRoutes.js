import express from 'express';
import { 
  createPlayerProfile, 
  getPlayerProfile, 
  updatePlayerProfile, 
  deletePlayerProfile 
} from '../controllers/playerProfileController.js';
import { getPlayerDashboard } from '../controllers/playerDashboardController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Dashboard route (must come before /profile to avoid conflicts)
router.get('/dashboard', verifyToken, getPlayerDashboard);

router.post('/profile', verifyToken, createPlayerProfile);
router.get('/profile', verifyToken, getPlayerProfile);
router.put('/profile', verifyToken, updatePlayerProfile);
router.delete('/profile', verifyToken, deletePlayerProfile);

export default router;