import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all players with full details (Scout only)
 * Supports pagination and filtering by verification status
 */
export const getAllPlayers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      verificationStatus,
      search 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause - Scouts can only see VERIFIED players
    const where = {
      role: 'PLAYER',
      verificationStatus: 'VERIFIED' // Only show verified players to scouts
    };

    // Note: Scouts cannot filter by verification status since they only see verified players
    // If verificationStatus is provided, ignore it (scouts only see verified)

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get players with all related data
    const [players, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          playerProfile: {
            include: {
              performanceMetrics: {
                orderBy: { createdAt: 'desc' },
                take: 1 // Latest metrics
              },
              uploadedVideos: {
                take: 5, // Recent videos
                orderBy: { createdAt: 'desc' }
              },
              scoutReports: {
                take: 5, // Recent reports
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      players,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all players error:', error);
    res.status(500).json({ error: 'Failed to get players', details: error.message });
  }
};

/**
 * Get single player details by ID (Scout only)
 * Scouts can only view VERIFIED players
 */
export const getPlayerById = async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.user.findFirst({
      where: {
        id: playerId,
        role: 'PLAYER',
        verificationStatus: 'VERIFIED' // Scouts can only view verified players
      },
      include: {
        playerProfile: {
          include: {
            performanceMetrics: {
              orderBy: { createdAt: 'desc' }
            },
            uploadedVideos: {
              orderBy: { createdAt: 'desc' },
              include: {
                performanceMetrics: {
                  orderBy: { createdAt: 'desc' },
                  take: 1 // Latest metrics per video
                }
              }
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

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.status(200).json(player);
  } catch (error) {
    console.error('Get player by ID error:', error);
    res.status(500).json({ error: 'Failed to get player details', details: error.message });
  }
};

// Note: Player verification has been moved to adminController.js
// Scouts can only view players and select videos, not verify accounts

