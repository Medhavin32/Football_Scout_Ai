import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if user is ADMIN or VERIFIED SCOUT
 * Only admins and verified scouts can access videos
 */
export const canAccessVideos = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { 
        role: true, 
        verificationStatus: true 
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admin can always access
    if (user.role === 'ADMIN') {
      return next();
    }

    // Scout must be verified
    if (user.role === 'SCOUT' && user.verificationStatus === 'VERIFIED') {
      return next();
    }

    // Player can only access their own videos (handled in controller)
    if (user.role === 'PLAYER') {
      return next(); // Let controller handle player-specific access
    }

    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only admins and verified scouts can access videos' 
    });
  } catch (error) {
    console.error('Video access check error:', error);
    res.status(500).json({ error: 'Failed to verify access', details: error.message });
  }
};

