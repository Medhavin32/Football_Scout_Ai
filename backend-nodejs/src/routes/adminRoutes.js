import express from 'express';
import { 
  verifyPlayer,
  verifyScout,
  getAllScouts,
  getAllPlayers,
  getPlayerById,
  getScoutById,
  getUnverifiedUsers
} from '../controllers/adminController.js';
import { verifyToken } from '../controllers/authController.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { validateVerificationUpdate } from '../middleware/scoutValidation.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken);
router.use(isAdmin);

// Get unverified users count (dashboard stats)
router.get('/unverified', getUnverifiedUsers);

// Get all players for admin
router.get('/players', getAllPlayers);

// Get all scouts for admin
router.get('/scouts', getAllScouts);

// Get single player details by ID
router.get('/players/:playerId', getPlayerById);

// Get single scout details by ID
router.get('/scouts/:scoutId', getScoutById);

// Verify player account
router.put('/players/:playerId/verify', validateVerificationUpdate, verifyPlayer);

// Verify scout account
router.put('/scouts/:scoutId/verify', validateVerificationUpdate, verifyScout);

export default router;

