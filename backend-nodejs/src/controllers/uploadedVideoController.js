import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const uploadVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }
    // Most basic possible upload - no playerProfileId at all
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId }
    });
    if (!playerProfile) {
      return res.status(400).json({ error: "Player profile does not exist." });
    }
    const uploadedVideo = await prisma.uploadedVideo.create({
      data: {
        userId: req.user.uid,
        videoUrl,
        status: 'PENDING',
        // No playerProfileId field at all
      }
    });

    res.status(201).json(uploadedVideo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video', details: error.message });
  }
};