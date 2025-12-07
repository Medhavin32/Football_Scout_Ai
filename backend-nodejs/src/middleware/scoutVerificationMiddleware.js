import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if scout is verified
 * Only verified scouts can view players and videos
 */
export const requireVerifiedScout = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { 
        role: true,
        verificationStatus: true,
        verificationRemarks: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is a scout
    if (user.role !== 'SCOUT') {
      return res.status(403).json({ error: 'Access denied. Scout role required.' });
    }

    // Check if scout is verified
    if (user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ 
        error: 'Scout not verified',
        message: 'You are not verified by admin. Please wait for admin verification to access player data.',
        verificationStatus: user.verificationStatus,
        verificationRemarks: user.verificationRemarks
      });
    }

    next();
  } catch (error) {
    console.error('Scout verification check error:', error);
    res.status(500).json({ error: 'Failed to verify scout status', details: error.message });
  }
};

