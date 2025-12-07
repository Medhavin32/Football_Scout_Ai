# Middleware Documentation

## Role-Based Middleware

### `isScout`
- **Location**: `roleMiddleware.js`
- **Purpose**: Ensures only users with SCOUT role can access the route
- **Usage**: Applied to all scout routes in `scoutRoutes.js`
- **Returns**: 403 if user is not a scout

### `isPlayer`
- **Location**: `roleMiddleware.js`
- **Purpose**: Ensures only users with PLAYER role can access the route
- **Usage**: Can be applied to player-specific routes
- **Returns**: 403 if user is not a player

## Profile Completion Middleware

### `requireCompleteProfile`
- **Location**: `profileCompletionMiddleware.js`
- **Purpose**: Ensures user profile is 100% complete before accessing protected routes
- **Usage**: Apply to routes that require complete profile (except profile edit routes)
- **Returns**: 403 with completion percentage if profile is incomplete
- **Note**: Only checks PLAYER role users, scouts bypass this check

### `requireVerifiedProfile`
- **Location**: `profileCompletionMiddleware.js`
- **Purpose**: Ensures user profile is 100% complete AND verified by a scout
- **Usage**: Applied to video upload routes
- **Returns**: 403 if profile is incomplete or not verified
- **Note**: Only checks PLAYER role users, scouts bypass this check

## Validation Middleware

### `validateSignup`
- **Location**: `authValidation.js`
- **Purpose**: Validates signup form data including optional profile fields
- **Validates**:
  - Name, email, password, role (required)
  - Phone number, country code, address fields (optional)
  - Enhanced validation for all fields

### `validateUserProfileUpdate`
- **Location**: `userProfileValidation.js`
- **Purpose**: Validates user profile update data
- **Validates**:
  - Phone number with country code (mutual dependency)
  - Address fields (city, state, country, pincode)
  - Profile picture URL (image URL validation)
  - Document fields

### `validateVerificationUpdate`
- **Location**: `scoutValidation.js`
- **Purpose**: Validates scout verification status update
- **Validates**:
  - Status (VERIFIED, PENDING, REJECTED)
  - Remarks (optional, max 1000 characters)

## Usage Examples

### Applying Middleware to Routes

```javascript
import { verifyToken } from '../controllers/authController.js';
import { isScout } from '../middleware/roleMiddleware.js';
import { requireVerifiedProfile } from '../middleware/profileCompletionMiddleware.js';

// Route with authentication and role check
router.get('/players', verifyToken, isScout, getAllPlayers);

// Route with authentication and profile verification
router.post('/upload', verifyToken, requireVerifiedProfile, uploadVideo);
```

### Excluding Routes from Middleware

Profile edit routes should NOT use completion middleware:
- `/api/user/profile` (PUT) - Users need to edit to complete profile
- `/api/user/profile-completion` (GET) - Needed to check status
- `/api/user/profile` (GET) - Needed to view current profile

