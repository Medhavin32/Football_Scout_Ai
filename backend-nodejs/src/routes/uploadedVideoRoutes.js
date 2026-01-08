import express from 'express';
import { 
  uploadVideo, 
  getVideos, 
  getVideoById, 
  deleteVideo,
  getVideoAnalysisById,
  getAllVideosForAdminScout,
  upload // Import multer middleware
} from '../controllers/uploadedVideoController.js';
import { verifyToken } from '../controllers/authController.js';
import { requireVerifiedProfile } from '../middleware/profileCompletionMiddleware.js';
import { canAccessVideos } from '../middleware/videoAccessMiddleware.js';

const router = express.Router();

// Video upload with file handling - multer middleware handles file upload
router.post('/upload', 
  verifyToken, 
  requireVerifiedProfile, 
  upload.single('video'), // Handle file upload
  uploadVideo
);

// Get all videos - for admins and verified scouts
router.get('/all', 
  verifyToken, 
  canAccessVideos, 
  getAllVideosForAdminScout
);

// Player's own videos
router.get('/videos', verifyToken, getVideos);
router.get('/videos/:id', verifyToken, getVideoById);
router.get('/videos/:id/analysis', verifyToken, getVideoAnalysisById);
router.delete('/videos/:id', verifyToken, deleteVideo);

export default router;