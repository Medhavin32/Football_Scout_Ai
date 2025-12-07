import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get player dashboard data
 * Shows: videos, performance metrics, scout interactions, selections
 */
export const getPlayerDashboard = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        playerProfile: {
          include: {
            uploadedVideos: {
              include: {
                videoSelections: {
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
                },
                processedData: true
              },
              orderBy: { createdAt: 'desc' }
            },
            performanceMetrics: {
              orderBy: { createdAt: 'desc' },
              take: 5 // Latest 5 metrics
            },
            scoutReports: {
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
            }
          }
        }
      }
    });

    if (!user || !user.playerProfile) {
      return res.status(404).json({ error: 'Player profile not found' });
    }

    // Calculate statistics
    const totalVideos = user.playerProfile.uploadedVideos.length;
    const analyzedVideos = user.playerProfile.uploadedVideos.filter(
      v => v.status === 'ANALYZED'
    ).length;
    const selectedVideos = user.playerProfile.uploadedVideos.filter(
      v => v.videoSelections && v.videoSelections.some(s => s.status === 'SELECTED')
    ).length;
    const totalViews = user.playerProfile.uploadedVideos.reduce(
      (sum, v) => sum + (v.videoSelections ? v.videoSelections.length : 0), 0
    );

    res.status(200).json({
      player: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        verificationStatus: user.verificationStatus
      },
      profile: user.playerProfile,
      statistics: {
        totalVideos,
        analyzedVideos,
        selectedVideos,
        totalViews,
        totalReports: user.playerProfile.scoutReports.length
      },
      videos: user.playerProfile.uploadedVideos.map(video => ({
        id: video.id,
        videoUrl: video.videoUrl,
        status: video.status,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
        selections: (video.videoSelections || []).map(selection => ({
          id: selection.id,
          scout: selection.scout,
          status: selection.status,
          clubName: selection.clubName,
          comments: selection.comments,
          selectedAt: selection.selectedAt,
          createdAt: selection.createdAt
        })),
        hasSelections: video.videoSelections && video.videoSelections.length > 0,
        isSelected: video.videoSelections && video.videoSelections.some(s => s.status === 'SELECTED')
      })),
      latestMetrics: user.playerProfile.performanceMetrics,
      scoutReports: user.playerProfile.scoutReports
    });
  } catch (error) {
    console.error('Get player dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data', details: error.message });
  }
};

