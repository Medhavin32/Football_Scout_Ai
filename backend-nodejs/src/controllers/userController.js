import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate profile completion percentage
 * Required fields:
 * - Name, Email (always present after signup)
 * - Phone number + country code
 * - City, State, Country, Pincode
 * - Profile picture
 * - Player profile (age, position, etc.)
 */
export const getProfileCompletion = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      include: { playerProfile: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const requiredFields = [
      { key: 'name', label: 'Name', value: user.name },
      { key: 'email', label: 'Email', value: user.email },
      { key: 'phoneNumber', label: 'Phone Number', value: user.phoneNumber },
      { key: 'countryCode', label: 'Country Code', value: user.countryCode },
      { key: 'city', label: 'City', value: user.city },
      { key: 'state', label: 'State', value: user.state },
      { key: 'country', label: 'Country', value: user.country },
      { key: 'pincode', label: 'Pincode', value: user.pincode },
      { key: 'profilePicture', label: 'Profile Picture', value: user.profilePicture },
      { key: 'playerProfile', label: 'Player Profile', value: user.playerProfile }
    ];

    const completedFields = requiredFields.filter(field => {
      if (field.key === 'playerProfile') {
        return field.value !== null && field.value !== undefined;
      }
      return field.value !== null && field.value !== undefined && field.value !== '';
    });

    const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);
    const missingFields = requiredFields
      .filter(field => {
        if (field.key === 'playerProfile') {
          return field.value === null || field.value === undefined;
        }
        return field.value === null || field.value === undefined || field.value === '';
      })
      .map(field => field.label);

    res.status(200).json({
      completionPercentage,
      missingFields,
      isComplete: completionPercentage === 100,
      verificationStatus: user.verificationStatus
    });
  } catch (error) {
    console.error('Get profile completion error:', error);
    res.status(500).json({ error: 'Failed to get profile completion', details: error.message });
  }
};

/**
 * Update user profile (phone, address, profile picture, documents)
 */
export const updateUserProfile = async (req, res) => {
  try {
    const {
      phoneNumber,
      countryCode,
      city,
      state,
      country,
      pincode,
      documentNumber,
      documentPhotos
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle profile picture upload
    let profilePictureUrl = user.profilePicture; // Keep existing if no new upload
    
    if (req.file) {
      // New file uploaded via multer
      const { getFileUrl } = await import('../config/multerConfig.js');
      profilePictureUrl = getFileUrl(req.file.filename, 'profile-pictures');
      
      // Delete old profile picture if it exists
      if (user.profilePicture) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const { fileURLToPath } = await import('url');
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          const oldFileName = user.profilePicture.split('/').pop();
          const oldFilePath = path.join(__dirname, '../../uploads/profile-pictures', oldFileName);
          
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old profile picture:', deleteError);
          // Continue even if deletion fails
        }
      }
    } else if (req.body.profilePicture !== undefined) {
      // Profile picture URL provided directly (from frontend if already uploaded)
      profilePictureUrl = req.body.profilePicture || null;
    }

    // Build update data object (only include provided fields)
    const updateData = {};
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;
    if (countryCode !== undefined) updateData.countryCode = countryCode || null;
    if (city !== undefined) updateData.city = city || null;
    if (state !== undefined) updateData.state = state || null;
    if (country !== undefined) updateData.country = country || null;
    if (pincode !== undefined) updateData.pincode = pincode || null;
    if (profilePictureUrl !== undefined) updateData.profilePicture = profilePictureUrl;
    if (documentNumber !== undefined) updateData.documentNumber = documentNumber || null;
    if (documentPhotos !== undefined) updateData.documentPhotos = documentPhotos || [];

    const updatedUser = await prisma.user.update({
      where: { id: req.user.uid },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        countryCode: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        profilePicture: true,
        documentNumber: true,
        documentPhotos: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
      profilePictureUrl: profilePictureUrl // Return the URL for frontend
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

/**
 * Get current user profile with all details
 * Note: Using only 'include', not 'select', to avoid Prisma conflict
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      include: {
        playerProfile: {
          include: {
            performanceMetrics: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Get latest metrics
            }
          }
        }
      }
      // No 'select' here - using 'include' only
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only the fields we need (excluding sensitive data like password)
    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      countryCode: user.countryCode,
      city: user.city,
      state: user.state,
      country: user.country,
      pincode: user.pincode,
      profilePicture: user.profilePicture,
      documentNumber: user.documentNumber,
      documentPhotos: user.documentPhotos,
      verificationStatus: user.verificationStatus,
      verificationRemarks: user.verificationRemarks,
      verifiedBy: user.verifiedBy,
      verifiedAt: user.verifiedAt,
      playerProfile: user.playerProfile,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile', details: error.message });
  }
};

