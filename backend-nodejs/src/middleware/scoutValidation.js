import { body, validationResult } from 'express-validator';

export const validateVerificationUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['VERIFIED', 'PENDING', 'REJECTED'])
    .withMessage('Status must be one of: VERIFIED, PENDING, REJECTED'),
  body('remarks').optional().trim().isLength({ max: 1000 }).withMessage('Remarks must be less than 1000 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

