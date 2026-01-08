import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import googleDriveService from '../services/googleDriveService.js';

const prisma = new PrismaClient();

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, AVI, MPEG are allowed.'), false);
    }
  }
});

/**
 * Helper function to calculate profile completion
 */
const calculateProfileCompletion = (user, playerProfile) => {
  const requiredFields = [
    user.name,
    user.email,
    user.phoneNumber,
    user.countryCode,
    user.city,
    user.state,
    user.country,
    user.pincode,
    user.profilePicture,
    playerProfile !== null && playerProfile !== undefined
  ];

  const completedFields = requiredFields.filter(field => {
    if (typeof field === 'boolean') return field === true;
    return field !== null && field !== undefined && field !== '';
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
};

export const uploadVideo = async (req, res) => {
  try {
    // Check Google Drive authentication
    if (!googleDriveService.hasValidCredentials()) {
      // Try to refresh token if available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        try {
          await googleDriveService.refreshAccessToken(process.env.GOOGLE_REFRESH_TOKEN);
        } catch (refreshError) {
          return res.status(401).json({ 
            error: 'Google Drive not authenticated',
            message: 'Please visit /api/auth/google to authenticate',
            authUrl: '/api/auth/google'
          });
        }
      } else {
        return res.status(401).json({ 
          error: 'Google Drive not authenticated',
          message: 'Please visit /api/auth/google to authenticate',
          authUrl: '/api/auth/google'
        });
      }
    }

    const user = await prisma.user.findUnique({ 
      where: { id: req.user.uid },
      include: { playerProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check profile completion
    const completionPercentage = calculateProfileCompletion(user, user.playerProfile);
    if (completionPercentage < 100) {
      return res.status(400).json({ 
        error: 'Profile incomplete', 
        message: 'Your profile must be 100% complete to upload videos. Please complete all required fields.',
        completionPercentage
      });
    }

    // Check verification status
    if (user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ 
        error: 'Profile not verified', 
        message: 'Your profile must be verified by a scout before you can upload videos.',
        verificationStatus: user.verificationStatus
      });
    }

    // If file is uploaded via multer
    if (req.file) {
      try {
        console.log('Uploading video to Google Drive...');
        
        // Upload to Google Drive
        const driveResult = await googleDriveService.uploadVideo(
          req.file.path,
          `${user.name}-${Date.now()}-${req.file.originalname}`,
          req.file.mimetype
        );

        // Clean up temporary file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        // Store Google Drive link and file ID in database
        const uploadedVideo = await prisma.uploadedVideo.create({
          data: {
            userId: user.id,
            videoUrl: driveResult.webViewLink, // Store viewable link
            googleDriveFileId: driveResult.fileId, // Store Google Drive file ID
            playerProfileId: user.playerProfile?.id || null,
            status: 'PENDING'
          }
        });

        console.log('✅ Video uploaded successfully to Google Drive');

        return res.status(201).json({
          ...uploadedVideo,
          embedUrl: googleDriveService.getEmbedUrl(driveResult.fileId)
        });
      } catch (driveError) {
        // Clean up temp file on error
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error('Google Drive upload error:', driveError);
        return res.status(500).json({ 
          error: 'Failed to upload to Google Drive', 
          details: driveError.message 
        });
      }
    } 
    // If videoUrl is provided directly (backward compatibility)
    else if (req.body.videoUrl) {
      const uploadedVideo = await prisma.uploadedVideo.create({
        data: {
          userId: user.id,
          videoUrl: req.body.videoUrl,
          playerProfileId: user.playerProfile?.id || null,
          status: 'PENDING'
        }
      });

      return res.status(201).json(uploadedVideo);
    } else {
      return res.status(400).json({ error: 'No video file or URL provided' });
    }
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Failed to upload video', details: error.message });
  }
};

export const getVideos = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.uid },
      include: { 
        uploadedVideos: {
          include: {
            processedData: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user.uploadedVideos);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to retrieve videos', details: error.message });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { role: true, verificationStatus: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const video = await prisma.uploadedVideo.findUnique({
      where: { id },
      include: { 
        processedData: true,
        user: {
          select: {
            id: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Authorization: owner, admin, or verified scout can see video
    const isOwner = video.userId === req.user.uid;
    const isAdmin = currentUser.role === 'ADMIN';
    const isVerifiedScout = currentUser.role === 'SCOUT' && currentUser.verificationStatus === 'VERIFIED';
    
    // Scouts can only see videos from verified players
    if (isVerifiedScout && video.user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    if (!isOwner && !isAdmin && !isVerifiedScout) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.status(200).json(video);
  } catch (error) {
    console.error('Get video by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve video', details: error.message });
  }
};

/**
 * Get a single video along with its stored analysis/metrics.
 * Used by the player analysis page to show stats for a specific upload.
 * Allows: video owner, admins, and verified scouts
 */
export const getVideoAnalysisById = async (req, res) => {
  try {
    const { id } = req.params;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { role: true, verificationStatus: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const video = await prisma.uploadedVideo.findUnique({
      where: { id },
      include: {
        processedData: true,
        user: { 
          select: { 
            id: true,
            name: true,
            email: true,
            verificationStatus: true
          } 
        },
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Authorization: owner, admin, or verified scout can see analysis
    const isOwner = video.userId === req.user.uid;
    const isAdmin = currentUser.role === 'ADMIN';
    const isVerifiedScout = currentUser.role === 'SCOUT' && currentUser.verificationStatus === 'VERIFIED';
    
    // Scouts can only see videos from verified players
    if (isVerifiedScout && video.user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    if (!isOwner && !isAdmin && !isVerifiedScout) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const metrics = await prisma.performanceMetrics.findFirst({
      where: { videoId: id },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      video,
      metrics
    });
  } catch (error) {
    console.error('Get video analysis error:', error);
    res.status(500).json({ error: 'Failed to retrieve video analysis', details: error.message });
  }
};

/**
 * Get all videos (for admins and verified scouts)
 * Admins can see all videos, scouts can see verified player videos
 */
export const getAllVideosForAdminScout = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let whereClause = {};

    // Scouts can only see videos from verified players
    if (user.role === 'SCOUT') {
      whereClause = {
        user: {
          role: 'PLAYER',
          verificationStatus: 'VERIFIED'
        }
      };
    }
    // Admins can see all videos
    // whereClause remains empty for admins

    const videos = await prisma.uploadedVideo.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        playerProfile: {
          select: {
            id: true,
            position: true,
            age: true,
            club: true
          }
        },
        performanceMetrics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ videos });
  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({ error: 'Failed to retrieve videos', details: error.message });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await prisma.uploadedVideo.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user is authorized to delete
    if (video.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Delete from Google Drive if file ID exists
    if (video.googleDriveFileId) {
      try {
        await googleDriveService.deleteFile(video.googleDriveFileId);
        console.log(`✅ Deleted video from Google Drive: ${video.googleDriveFileId}`);
      } catch (driveError) {
        console.error('Error deleting from Google Drive:', driveError);
        // Continue with database deletion even if Drive deletion fails
      }
    } else if (video.videoUrl) {
      // Fallback: Extract Google Drive file ID from videoUrl if googleDriveFileId is not stored
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const googleDriveFileId = video.videoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (googleDriveFileId) {
        try {
          await googleDriveService.deleteFile(googleDriveFileId);
          console.log(`✅ Deleted video from Google Drive (from URL): ${googleDriveFileId}`);
        } catch (driveError) {
          console.error('Error deleting from Google Drive:', driveError);
        }
      }
    }

    await prisma.uploadedVideo.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video', details: error.message });
  }
};