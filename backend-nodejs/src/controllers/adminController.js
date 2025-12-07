import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify a player account (Admin only)
 */
export const verifyPlayer = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { status, remarks } = req.body;
    const adminId = req.user.uid;

    // Validate status
    const validStatuses = ['VERIFIED', 'PENDING', 'REJECTED'];
    if (!validStatuses.includes(status?.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }

    // Check if player exists
    const player = await prisma.user.findFirst({
      where: {
        id: playerId,
        role: 'PLAYER'
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update verification status
    const updateData = {
      verificationStatus: status.toUpperCase(),
      verificationRemarks: remarks || null,
      verifiedBy: adminId,
      verifiedAt: new Date()
    };

    // If status is PENDING, reset verifiedBy and verifiedAt
    if (status.toUpperCase() === 'PENDING') {
      updateData.verifiedBy = null;
      updateData.verifiedAt = null;
    }

    const updatedPlayer = await prisma.user.update({
      where: { id: playerId },
      data: updateData,
      include: {
        playerProfile: true
      }
    });

    res.status(200).json({
      message: 'Player verification status updated successfully',
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Verify player error:', error);
    res.status(500).json({ error: 'Failed to verify player', details: error.message });
  }
};

/**
 * Verify a scout account (Admin only)
 */
export const verifyScout = async (req, res) => {
  try {
    const { scoutId } = req.params;
    const { status, remarks } = req.body;
    const adminId = req.user.uid;

    // Validate status
    const validStatuses = ['VERIFIED', 'PENDING', 'REJECTED'];
    if (!validStatuses.includes(status?.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }

    // Check if scout exists
    const scout = await prisma.user.findFirst({
      where: {
        id: scoutId,
        role: 'SCOUT'
      }
    });

    if (!scout) {
      return res.status(404).json({ error: 'Scout not found' });
    }

    // Update verification status
    const updateData = {
      verificationStatus: status.toUpperCase(),
      verificationRemarks: remarks || null,
      verifiedBy: adminId,
      verifiedAt: new Date()
    };

    // If status is PENDING, reset verifiedBy and verifiedAt
    if (status.toUpperCase() === 'PENDING') {
      updateData.verifiedBy = null;
      updateData.verifiedAt = null;
    }

    const updatedScout = await prisma.user.update({
      where: { id: scoutId },
      data: updateData
    });

    res.status(200).json({
      message: 'Scout verification status updated successfully',
      scout: updatedScout
    });
  } catch (error) {
    console.error('Verify scout error:', error);
    res.status(500).json({ error: 'Failed to verify scout', details: error.message });
  }
};

/**
 * Get all scouts for admin dashboard
 */
export const getAllScouts = async (req, res) => {
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

    // Build where clause
    const where = {
      role: 'SCOUT'
    };

    if (verificationStatus) {
      where.verificationStatus = verificationStatus.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { clubName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get scouts with related data
    const [scouts, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          countryCode: true,
          city: true,
          state: true,
          country: true,
          profilePicture: true,
          clubName: true,
          verificationStatus: true,
          verificationRemarks: true,
          verifiedBy: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
          videoSelections: {
            select: {
              id: true,
              status: true,
              createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      scouts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all scouts error:', error);
    res.status(500).json({ error: 'Failed to get scouts', details: error.message });
  }
};

/**
 * Get all players for admin dashboard
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

    // Build where clause
    const where = {
      role: 'PLAYER'
    };

    if (verificationStatus) {
      where.verificationStatus = verificationStatus.toUpperCase();
    }

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
 * Get single player details by ID (Admin only)
 */
export const getPlayerById = async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.user.findFirst({
      where: {
        id: playerId,
        role: 'PLAYER'
      },
      include: {
        playerProfile: {
          include: {
            performanceMetrics: {
              orderBy: { createdAt: 'desc' }
            },
            uploadedVideos: {
              orderBy: { createdAt: 'desc' }
            },
            scoutReports: {
              include: {
                scout: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    clubName: true
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

/**
 * Get single scout details by ID (Admin only)
 */
export const getScoutById = async (req, res) => {
  try {
    const { scoutId } = req.params;

    const scout = await prisma.user.findFirst({
      where: {
        id: scoutId,
        role: 'SCOUT'
      },
      include: {
        videoSelections: {
          include: {
            video: {
              include: {
                playerProfile: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Recent selections
        }
      }
    });

    if (!scout) {
      return res.status(404).json({ error: 'Scout not found' });
    }

    res.status(200).json(scout);
  } catch (error) {
    console.error('Get scout by ID error:', error);
    res.status(500).json({ error: 'Failed to get scout details', details: error.message });
  }
};

/**
 * Get unverified users count (Admin dashboard stats)
 */
export const getUnverifiedUsers = async (req, res) => {
  try {
    const [unverifiedPlayers, unverifiedScouts, totalPlayers, totalScouts] = await Promise.all([
      prisma.user.count({
        where: {
          role: 'PLAYER',
          verificationStatus: 'PENDING'
        }
      }),
      prisma.user.count({
        where: {
          role: 'SCOUT',
          verificationStatus: 'PENDING'
        }
      }),
      prisma.user.count({
        where: { role: 'PLAYER' }
      }),
      prisma.user.count({
        where: { role: 'SCOUT' }
      })
    ]);

    res.status(200).json({
      unverifiedPlayers,
      unverifiedScouts,
      totalPlayers,
      totalScouts,
      totalUnverified: unverifiedPlayers + unverifiedScouts
    });
  } catch (error) {
    console.error('Get unverified users error:', error);
    res.status(500).json({ error: 'Failed to get unverified users', details: error.message });
  }
};

