import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to check if user is an ADMIN
 */
export const isAdmin = async (req, res, next) => {
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

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    next();
  } catch (error) {
    console.error('Admin role check error:', error);
    res.status(500).json({ error: 'Failed to verify admin role', details: error.message });
  }
};

