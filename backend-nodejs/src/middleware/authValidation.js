import { body, validationResult } from 'express-validator';

export const validateSignup = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('role').isIn(['PLAYER', 'SCOUT']).withMessage('Invalid user role'),
  // Optional profile fields validation with enhanced rules
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\d{7,15}$/)
    .withMessage('Phone number must be 7-15 digits'),
  body('countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format (e.g., +1, +91)'),
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty if provided')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty if provided')
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty if provided')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('pincode')
    .optional()
    .trim()
    .isPostalCode('any')
    .withMessage('Invalid pincode format')
    .isLength({ min: 4, max: 10 })
    .withMessage('Pincode must be between 4 and 10 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateLogin = [
  body('email').trim().isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['PLAYER', 'SCOUT', 'ADMIN']).withMessage('Invalid user role'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];