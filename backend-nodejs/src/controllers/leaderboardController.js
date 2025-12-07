import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get leaderboard data with player rankings
 * Rankings by: overall accuracy, speed, dribbling
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { sortBy = 'accuracy', limit = 50 } = req.query;

    // Get all players with their latest performance metrics
    const players = await prisma.user.findMany({
      where: {
        role: 'PLAYER',
        playerProfile: {
          isNot: null
        }
      },
      include: {
        playerProfile: {
          include: {
            performanceMetrics: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Get latest metrics
            },
            uploadedVideos: {
              where: {
                status: 'ANALYZED'
              },
              include: {
                processedData: true
              }
            }
          }
        }
      }
    });

    // Calculate leaderboard data for each player
    const leaderboardData = players
      .filter(player => player.playerProfile && player.playerProfile.performanceMetrics.length > 0)
      .map(player => {
        const latestMetrics = player.playerProfile.performanceMetrics[0];
        const analyzedVideos = player.playerProfile.uploadedVideos;
        
        // Calculate overall accuracy as average of passing, dribbling, and shooting
        const avgPassing = latestMetrics.passing || 0;
        const avgDribbling = latestMetrics.dribbling || 0;
        const avgShooting = latestMetrics.shooting || 0;
        const overallAccuracy = (avgPassing + avgDribbling + avgShooting) / 3;

        return {
          id: player.id,
          name: player.name,
          email: player.email,
          profilePicture: player.profilePicture,
          position: player.playerProfile.position,
          club: player.playerProfile.club,
          age: player.playerProfile.age,
          // Metrics
          overallAccuracy: Math.round(overallAccuracy * 100) / 100, // Round to 2 decimals
          speed: Math.round((latestMetrics.speed || 0) * 100) / 100, // km/h
          dribbling: Math.round((latestMetrics.dribbling || 0) * 100) / 100,
          passing: Math.round((latestMetrics.passing || 0) * 100) / 100,
          shooting: Math.round((latestMetrics.shooting || 0) * 100) / 100,
          stamina: Math.round((latestMetrics.stamina || 0) * 100) / 100,
          agility: Math.round((latestMetrics.agility || 0) * 100) / 100,
          // Additional stats
          totalVideos: analyzedVideos.length,
          lastUpdated: latestMetrics.createdAt
        };
      });

    // Sort by selected metric
    let sortedData = [...leaderboardData];
    switch (sortBy) {
      case 'accuracy':
        sortedData.sort((a, b) => b.overallAccuracy - a.overallAccuracy);
        break;
      case 'speed':
        sortedData.sort((a, b) => b.speed - a.speed);
        break;
      case 'dribbling':
        sortedData.sort((a, b) => b.dribbling - a.dribbling);
        break;
      case 'passing':
        sortedData.sort((a, b) => b.passing - a.passing);
        break;
      case 'shooting':
        sortedData.sort((a, b) => b.shooting - a.shooting);
        break;
      case 'stamina':
        sortedData.sort((a, b) => b.stamina - a.stamina);
        break;
      default:
        sortedData.sort((a, b) => b.overallAccuracy - a.overallAccuracy);
    }

    // Add rank
    const rankedData = sortedData.map((player, index) => ({
      ...player,
      rank: index + 1
    }));

    // Limit results
    const limitedData = rankedData.slice(0, parseInt(limit));

    res.status(200).json({
      leaderboard: limitedData,
      totalPlayers: leaderboardData.length,
      sortBy,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard', details: error.message });
  }
};

