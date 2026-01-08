import express from 'express';
import googleDriveService from '../services/googleDriveService.js';
import { signup, login, logout } from '../controllers/authController.js';
import { validateSignup, validateLogin } from '../middleware/authValidation.js';

const router = express.Router();
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

/**
 * Initiate OAuth2 flow - redirects user to Google
 */
router.get('/google', (req, res) => {
  try {
    // Validate environment variables before generating URL
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'GOOGLE_CLIENT_ID is not set in environment variables',
        details: 'Please check your .env file'
      });
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'GOOGLE_CLIENT_SECRET is not set in environment variables',
        details: 'Please check your .env file'
      });
    }
    if (!process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'GOOGLE_REDIRECT_URI is not set in environment variables',
        details: 'Please check your .env file'
      });
    }

    const authUrl = googleDriveService.getAuthUrl();
    console.log('🔗 Redirecting to Google OAuth:', authUrl.substring(0, 100) + '...');
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate auth URL', 
      details: error.message,
      hint: 'Make sure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set in your .env file'
    });
  }
});

/**
 * OAuth2 callback - receives authorization code
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const tokens = await googleDriveService.getTokensFromCode(code);
    
    // Display success message with refresh token
    let refreshTokenInfo = '';
    if (tokens.refresh_token) {
      refreshTokenInfo = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>✅ Refresh Token Obtained!</h3>
          <p><strong>Add this to your .env file:</strong></p>
          <code style="background: #fff; padding: 10px; display: block; border-radius: 3px; word-break: break-all;">
            GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}
          </code>
          <p style="margin-top: 10px; color: #666;">
            After adding it, restart your server for the changes to take effect.
          </p>
        </div>
      `;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #4caf50;
            }
            code {
              font-family: 'Courier New', monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>You can now upload videos to Google Drive.</p>
            ${refreshTokenInfo}
            <p style="margin-top: 20px;">
              <a href="/" style="color: #2196f3;">Go back to home</a>
            </p>
            <script>
              setTimeout(() => {
                console.log('Authentication complete. You can close this window.');
              }, 3000);
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Authentication Failed</h1>
          <p>Error: ${error.message}</p>
          <p><a href="/api/auth/google">Try again</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * Check authentication status
 */
router.get('/status', (req, res) => {
  const isAuthenticated = googleDriveService.hasValidCredentials();
  const hasRefreshToken = !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim() !== '');
  
  res.json({ 
    authenticated: isAuthenticated,
    hasRefreshToken: hasRefreshToken,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    message: isAuthenticated 
      ? 'Google Drive is authenticated and ready' 
      : 'Please authenticate at /api/auth/google'
  });
});

/**
 * Debug endpoint to check environment variables (remove in production)
 */
router.get('/debug', (req, res) => {
  res.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    hasRefreshToken: !!(process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim() !== ''),
    clientIdPreview: process.env.GOOGLE_CLIENT_ID ? 
      process.env.GOOGLE_CLIENT_ID.substring(0, 30) + '...' : 'NOT SET',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT SET',
  });
});

export default router;
