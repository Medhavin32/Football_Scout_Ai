import { body, validationResult } from 'express-validator';

/**
 * Custom validator for phone number with country code
 */
const validatePhoneWithCountryCode = (value, { req }) => {
  const phoneNumber = req.body.phoneNumber;
  const countryCode = req.body.countryCode;

  // If phone number is provided, country code is required
  if (phoneNumber && !countryCode) {
    throw new Error('Country code is required when phone number is provided');
  }

  // If country code is provided, phone number is required
  if (countryCode && !phoneNumber) {
    throw new Error('Phone number is required when country code is provided');
  }

  // Validate phone number format (digits only, 7-15 digits)
  if (phoneNumber && !/^\d{7,15}$/.test(phoneNumber.replace(/\s+/g, ''))) {
    throw new Error('Phone number must be 7-15 digits');
  }

  return true;
};

/**
 * Custom validator for profile picture URL
 * Validates URL format and checks if it's an image URL
 */
const validateProfilePictureURL = (value) => {
  if (!value) return true; // Optional field

  // Check if it's a valid URL
  try {
    const url = new URL(value);
    
    // Check if it's an image URL (common image extensions)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const pathname = url.pathname.toLowerCase();
    const isImageURL = imageExtensions.some(ext => pathname.endsWith(ext));
    
    if (!isImageURL && !url.hostname.includes('storage') && !url.hostname.includes('cdn')) {
      throw new Error('Profile picture must be a valid image URL');
    }
    
    return true;
  } catch (error) {
    throw new Error('Profile picture must be a valid URL');
  }
};

export const validateUserProfileUpdate = [
  // Phone number validation with country code dependency
  body('phoneNumber')
    .optional()
    .trim()
    .custom(validatePhoneWithCountryCode),
  body('countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format (e.g., +1, +91)'),
  
  // Address field validations
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
    .withMessage('Country must be between 2 and 100 characters')
    .matches(/^[A-Za-z\s]+$/)
    .withMessage('Country must contain only letters and spaces'),
  body('pincode')
    .optional()
    .trim()
    .isPostalCode('any')
    .withMessage('Invalid pincode format')
    .isLength({ min: 4, max: 10 })
    .withMessage('Pincode must be between 4 and 10 characters'),
  
  // Profile picture validation
  // Allow profilePicture to be a URL string (when sent as JSON) or file (when sent as multipart)
  body('profilePicture')
    .optional()
    .custom((value, { req }) => {
      // If it's a multipart request with a file, skip URL validation
      if (req.file) {
        return true;
      }
      // If it's a string/URL, validate it
      if (typeof value === 'string' && value.trim()) {
        return validateProfilePictureURL(value);
      }
      // Allow empty/null values
      return true;
    }),
  
  // Document validations
  body('documentNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Document number cannot be empty if provided')
    .isLength({ min: 3, max: 50 })
    .withMessage('Document number must be between 3 and 50 characters'),
  body('documentPhotos')
    .optional()
    .isArray()
    .withMessage('Document photos must be an array')
    .custom((value) => {
      if (Array.isArray(value) && value.length > 10) {
        throw new Error('Maximum 10 document photos allowed');
      }
      return true;
    }),
  body('documentPhotos.*')
    .optional()
    .trim()
    .isURL()
    .withMessage('Each document photo must be a valid URL'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

