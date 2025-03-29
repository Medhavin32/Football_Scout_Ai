import express from 'express';
import { 
  uploadVideo, 
} from '../controllers/uploadedVideoController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/upload', verifyToken, uploadVideo);

export default router;