import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate profile completion percentage
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

/**
 * Middleware to check if user profile is 100% complete
 * Use on protected routes that require complete profile (except profile edit routes)
 */
export const requireCompleteProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      include: { playerProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only check for PLAYER role
    if (user.role !== 'PLAYER') {
      return next();
    }

    const completionPercentage = calculateProfileCompletion(user, user.playerProfile);

    if (completionPercentage < 100) {
      return res.status(403).json({
        error: 'Profile incomplete',
        message: 'Your profile must be 100% complete to access this resource.',
        completionPercentage,
        redirectTo: '/profile-completion'
      });
    }

    // Attach completion data to request for use in controllers
    req.profileCompletion = {
      percentage: completionPercentage,
      isComplete: true
    };

    next();
  } catch (error) {
    console.error('Profile completion check error:', error);
    res.status(500).json({ error: 'Failed to verify profile completion', details: error.message });
  }
};

/**
 * Middleware to check if user profile is verified
 * Use on routes that require verified profile (e.g., video upload)
 */
export const requireVerifiedProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      include: { playerProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only check for PLAYER role
    if (user.role !== 'PLAYER') {
      return next();
    }

    // First check if profile is complete
    const completionPercentage = calculateProfileCompletion(user, user.playerProfile);
    if (completionPercentage < 100) {
      return res.status(403).json({
        error: 'Profile incomplete',
        message: 'Your profile must be 100% complete before verification.',
        completionPercentage,
        redirectTo: '/profile-completion'
      });
    }

    // Then check verification status
    if (user.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({
        error: 'Profile not verified',
        message: 'Your profile must be verified by a scout to access this resource.',
        verificationStatus: user.verificationStatus,
        redirectTo: '/profile-completion'
      });
    }

    // Attach verification data to request
    req.profileVerification = {
      status: user.verificationStatus,
      isVerified: true
    };

    next();
  } catch (error) {
    console.error('Profile verification check error:', error);
    res.status(500).json({ error: 'Failed to verify profile status', details: error.message });
  }
};

