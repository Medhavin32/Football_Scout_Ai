import { google } from 'googleapis';
import fs from 'fs';
import { Readable } from 'stream';

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.oauth2Client = null;
    this.initialized = false;
    // Don't initialize immediately - wait until first use
    // This allows dotenv.config() to run first
  }

  // Lazy initialization - only initialize when needed
  ensureInitialized() {
    if (!this.initialized) {
      this.initializeOAuth2();
      this.initialized = true;
    }
  }

  /**
   * Get folder ID (lazy-loaded from environment variables)
   */
  getFolderId() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId || folderId.trim() === '') {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in environment variables');
    }
    return folderId;
  }

  initializeOAuth2() {
    try {
      // Validate environment variables
      if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
      }
      if (!process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('GOOGLE_CLIENT_SECRET is not set in environment variables');
      }
      if (!process.env.GOOGLE_REDIRECT_URI) {
        throw new Error('GOOGLE_REDIRECT_URI is not set in environment variables');
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      console.log('✅ OAuth2 client initialized');
      console.log('   Client ID:', process.env.GOOGLE_CLIENT_ID.substring(0, 30) + '...');
      console.log('   Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
      
      // If refresh token exists, set it up
      if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_REFRESH_TOKEN.trim() !== '') {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        console.log('✅ OAuth2 client initialized with refresh token');
      } else {
        console.log('⚠️ OAuth2 client initialized (no refresh token - authentication required)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize OAuth2:', error.message);
      throw error;
    }
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl() {
    this.ensureInitialized();
    
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized. Check your environment variables.');
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not set in environment variables');
    }

    const scopes = [
      'https://www.googleapis.com/auth/drive',
    ];

    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Get refresh token
        scope: scopes,
        prompt: 'consent', // Force consent to get refresh token
      });
      
      console.log('🔗 Generated OAuth2 auth URL');
      return authUrl;
    } catch (error) {
      console.error('Error generating auth URL:', error);
      throw new Error(`Failed to generate auth URL: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    this.ensureInitialized();
    
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  /**
   * Set credentials (refresh token) to authenticate requests
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Check if we have valid credentials
   */
  hasValidCredentials() {
    this.ensureInitialized();
    return this.oauth2Client && this.oauth2Client.credentials && this.drive;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      return credentials;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Upload video file to Google Drive
   */
  async uploadVideo(filePath, fileName, mimeType = 'video/mp4') {
    try {
      this.ensureInitialized();
      
      // Ensure we have valid credentials
      if (!this.hasValidCredentials()) {
        // Try to refresh if we have a refresh token
        if (process.env.GOOGLE_REFRESH_TOKEN) {
          try {
            await this.refreshAccessToken(process.env.GOOGLE_REFRESH_TOKEN);
          } catch (refreshError) {
            throw new Error('OAuth2 credentials not set. Please authenticate first. Visit /api/auth/google');
          }
        } else {
          throw new Error('OAuth2 credentials not set. Please authenticate first. Visit /api/auth/google');
        }
      }

      // Get folder ID when needed (lazy-loaded from environment)
      const folderId = this.getFolderId();

      let fileStream;
      
      if (typeof filePath === 'string') {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        fileStream = fs.createReadStream(filePath);
      } else if (Buffer.isBuffer(filePath)) {
        fileStream = Readable.from(filePath);
      } else if (filePath instanceof Readable) {
        fileStream = filePath;
      } else {
        throw new Error('Invalid file input type');
      }

      const fileMetadata = {
        name: fileName,
        parents: [folderId], // Use the lazy-loaded folderId
      };

      const media = {
        mimeType,
        body: fileStream,
      };

      console.log('📤 Uploading to Google Drive folder:', folderId);

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, mimeType',
      });

      // Make the file publicly viewable
      await this.makeFilePublic(response.data.id);

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        name: response.data.name,
        mimeType: response.data.mimeType,
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      
      // If token expired, try to refresh
      if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired')) {
        if (process.env.GOOGLE_REFRESH_TOKEN) {
          try {
            await this.refreshAccessToken(process.env.GOOGLE_REFRESH_TOKEN);
            // Retry upload after refresh
            return this.uploadVideo(filePath, fileName, mimeType);
          } catch (refreshError) {
            throw new Error('OAuth2 token expired. Please re-authenticate at /api/auth/google');
          }
        }
      }
      
      throw new Error(`Failed to upload to Google Drive: ${error.message}`);
    }
  }

  /**
   * Make file publicly viewable
   */
  async makeFilePublic(fileId) {
    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`✅ File ${fileId} made publicly viewable`);
    } catch (error) {
      console.error('Error making file public:', error);
    }
  }

  /**
   * Get embed URL for video player
   */
  getEmbedUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }
}

export default new GoogleDriveService();
