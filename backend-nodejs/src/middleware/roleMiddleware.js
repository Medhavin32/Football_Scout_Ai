import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if user is a SCOUT
 */
export const isScout = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'SCOUT') {
      return res.status(403).json({ error: 'Access denied. Scout role required.' });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({ error: 'Failed to verify role', details: error.message });
  }
};

/**
 * Middleware to check if user is a PLAYER
 */
export const isPlayer = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'PLAYER') {
      return res.status(403).json({ error: 'Access denied. Player role required.' });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({ error: 'Failed to verify role', details: error.message });
  }
};

