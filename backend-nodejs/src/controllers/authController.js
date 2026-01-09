import { PrismaClient } from '@prisma/client';
import { auth } from '../config/firebaseConfig.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const signup = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role,
      phoneNumber,
      countryCode,
      city,
      state,
      country,
      pincode
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user in Firebase
    const firebaseUser = await auth.createUser({
      email,
      password,
      displayName: name
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Prisma with new fields
    // verificationStatus defaults to PENDING in schema
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phoneNumber: phoneNumber || null,
        countryCode: countryCode || null,
        city: city || null,
        state: state || null,
        country: country || null,
        pincode: pincode || null,
        verificationStatus: 'PENDING' // Explicitly set default
      }
    });

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        verificationStatus: user.verificationStatus,
        firebaseUid: firebaseUser.uid
      } 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user in Prisma
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials'});
    }

    // Verify that the user's role matches the requested login role
    if (user.role.toUpperCase() !== role.toUpperCase()) {
      return res.status(403).json({ 
        error: 'Invalid role', 
        message: `This account is registered as ${user.role}, not ${role}` 
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate Firebase ID token
    const firebaseToken = await auth.createCustomToken(user.id);

    const token = generateToken(user);
    


    res.status(200).json({ 
      message: 'Login successful', 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      },
      firebaseToken,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // On the client-side, you'll need to handle Firebase signOut
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
};

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  try {
    let decodedToken;
    let user;

    // First, try Firebase token verification
    try {
      decodedToken = await auth.verifyIdToken(token);
      
      // Find user by email from Firebase token
      user = await prisma.user.findUnique({
        where: { email: decodedToken.email }
      });
    } catch (firebaseError) {
      // If Firebase verification fails, try custom JWT
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by ID from custom token
        user = await prisma.user.findUnique({
          where: { id: decodedToken.userId }
        });
      } catch (jwtError) {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach user information to the request
    req.user = {
      uid: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Unauthorized' });
  }
};

export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};