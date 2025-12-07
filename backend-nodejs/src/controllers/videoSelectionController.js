import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Scout selects/interests in a video
 */
export const selectVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { status, clubName, comments } = req.body;
    const scoutId = req.user.uid;

    // Verify user is a scout
    const scout = await prisma.user.findUnique({
      where: { id: scoutId }
    });

    if (!scout) {
      return res.status(404).json({ error: 'Scout not found' });
    }

    if (scout.role !== 'SCOUT') {
      return res.status(403).json({ error: 'Only scouts can select videos' });
    }

    // Verify video exists
    const video = await prisma.uploadedVideo.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Validate status
    const validStatuses = ['VIEWED', 'INTERESTED', 'SELECTED', 'REJECTED'];
    const selectionStatus = (status || 'INTERESTED').toUpperCase();
    if (!validStatuses.includes(selectionStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }

    // Create or update selection
    const selection = await prisma.videoSelection.upsert({
      where: {
        videoId_scoutId: {
          videoId,
          scoutId
        }
      },
      update: {
        status: selectionStatus,
        clubName: clubName || null,
        comments: comments || null,
        selectedAt: selectionStatus === 'SELECTED' ? new Date() : null,
        updatedAt: new Date()
      },
      create: {
        videoId,
        scoutId,
        status: selectionStatus,
        clubName: clubName || null,
        comments: comments || null,
        selectedAt: selectionStatus === 'SELECTED' ? new Date() : null
      },
      include: {
        scout: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        video: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      message: 'Video selection updated successfully',
      selection
    });
  } catch (error) {
    console.error('Select video error:', error);
    res.status(500).json({ error: 'Failed to select video', details: error.message });
  }
};

/**
 * Get all selections for a video (scout view)
 */
export const getVideoSelections = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const selections = await prisma.videoSelection.findMany({
      where: { videoId },
      include: {
        scout: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(selections);
  } catch (error) {
    console.error('Get video selections error:', error);
    res.status(500).json({ error: 'Failed to get selections', details: error.message });
  }
};

