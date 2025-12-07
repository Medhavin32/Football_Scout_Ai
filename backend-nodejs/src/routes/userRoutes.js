import express from 'express';
import multer from 'multer';
import { 
  getProfileCompletion, 
  updateUserProfile, 
  getUserProfile 
} from '../controllers/userController.js';
import { verifyToken } from '../controllers/authController.js';
import { validateUserProfileUpdate } from '../middleware/userProfileValidation.js';
import { uploadProfilePicture } from '../config/multerConfig.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get profile completion percentage
router.get('/profile-completion', getProfileCompletion);

// Get current user profile
router.get('/profile', getUserProfile);

// Separate endpoint for profile picture upload only
router.post('/profile/picture', 
  uploadProfilePicture.single('profilePicture'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { getFileUrl } = await import('../config/multerConfig.js');
      const profilePictureUrl = getFileUrl(req.file.filename, 'profile-pictures');

      // Update user profile with new picture URL
      const prisma = (await import('@prisma/client')).PrismaClient;
      const prismaClient = new prisma();
      
      const user = await prismaClient.user.update({
        where: { id: req.user.uid },
        data: { profilePicture: profilePictureUrl },
        select: {
          id: true,
          profilePicture: true
        }
      });

      res.status(200).json({
        message: 'Profile picture uploaded successfully',
        profilePictureUrl: user.profilePicture,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      
      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to upload profile picture', details: error.message });
    }
  }
);

// Update user profile (with optional file upload)
// Use multer middleware only if file is being uploaded
router.put('/profile', 
  (req, res, next) => {
    // Check if request has multipart/form-data content type
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Apply multer middleware for file upload
      uploadProfilePicture.single('profilePicture')(req, res, (err) => {
        if (err) {
          // Handle multer errors
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ error: err.message });
          }
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    } else {
      // No file upload, skip multer
      next();
    }
  },
  validateUserProfileUpdate, 
  updateUserProfile
);

export default router;

