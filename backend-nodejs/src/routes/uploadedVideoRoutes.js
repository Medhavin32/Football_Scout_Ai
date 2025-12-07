import express from 'express';
import { 
  uploadVideo, 
  getVideos, 
  getVideoById, 
  deleteVideo 
} from '../controllers/uploadedVideoController.js';
import { verifyToken } from '../controllers/authController.js';
import { requireVerifiedProfile } from '../middleware/profileCompletionMiddleware.js';

const router = express.Router();

// Video upload requires verified profile
router.post('/upload', verifyToken, requireVerifiedProfile, uploadVideo);

// Other video routes only require authentication
router.get('/videos', verifyToken, getVideos);
router.get('/videos/:id', verifyToken, getVideoById);
router.delete('/videos/:id', verifyToken, deleteVideo);

export default router;