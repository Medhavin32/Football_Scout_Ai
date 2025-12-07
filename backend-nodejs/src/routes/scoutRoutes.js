import express from 'express';
import { 
  getAllPlayers, 
  getPlayerById
} from '../controllers/scoutController.js';
import { selectVideo, getVideoSelections } from '../controllers/videoSelectionController.js';
import { verifyToken } from '../controllers/authController.js';
import { isScout } from '../middleware/roleMiddleware.js';
import { requireVerifiedScout } from '../middleware/scoutVerificationMiddleware.js';

const router = express.Router();

// All routes require authentication and scout role
router.use(verifyToken);
router.use(isScout);

// Routes that require verified scout (player data access)
router.use('/players', requireVerifiedScout);
router.use('/videos', requireVerifiedScout);

// Get all players with pagination and filtering (view only) - requires verified scout
router.get('/players', getAllPlayers);

// Get single player details (view only) - requires verified scout
router.get('/players/:playerId', getPlayerById);

// Video selection routes - scouts can select/reject videos - requires verified scout
router.post('/videos/:videoId/select', selectVideo);
router.get('/videos/:videoId/selections', getVideoSelections);

// Note: Player verification has been moved to /api/admin/* routes
// Scouts can only view players and select videos, not verify accounts

export default router;

