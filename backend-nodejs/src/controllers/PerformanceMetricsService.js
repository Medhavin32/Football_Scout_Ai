import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

class PerformanceMetricsService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async processVideoAndSaveMetrics(playerProfileId, jerseyNumber, videoPath) {
    let fileStream = null;
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('jersey_number', jerseyNumber.toString());
      fileStream = fs.createReadStream(videoPath);
      formData.append('video', fileStream, {
        filename: 'football.mp4',
        contentType: 'video/mp4'
      });

      // Make API call to Python backend
      const response = await axios.post(
        'http://127.0.0.1:5003/process_video', 
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Extract performance metrics
      const stats = response.data.player_stats;

      // Only save performance metrics if playerProfileId is provided
      if (playerProfileId) {
        // Parse numeric values
        const topSpeed = parseFloat(stats.top_speed.replace(' km/h', ''));
        // Python backend now returns distance_covered in meters, e.g. "905.35 m"
        const distanceCovered = parseFloat(stats.distance_covered.replace(' m', ''));

        // Save to database
        const performanceMetrics = await this.prisma.performanceMetrics.create({
          data: {
            playerProfileId,
            speed: topSpeed,
            dribbling: stats.dribble_success,
            passing: stats.pass_accuracy,
            shooting: stats.shot_conversion,
            // Additional fields can be mapped or calculated
            agility: calculateAgility(stats),
            stamina: calculateStamina(distanceCovered),
            intelligence: calculateIntelligence(stats),
          }
        });

        console.log('Performance metrics saved successfully', performanceMetrics);
        return { stats, performanceMetrics };
      } else {
        console.log('No playerProfileId provided, skipping performance metrics save');
        return { stats, performanceMetrics: null };
      }
    } catch (error) {
      console.error('Error processing video and saving metrics:', error);
      throw error;
    } finally {
      if (fileStream) {
        fileStream.destroy();
      }
      // Clean up the uploaded file
      try {
        await fs.promises.unlink(videoPath);
      } catch (err) {
        console.error('Error cleaning up video file:', err);
      }
    }
  }

  // Example usage method
  async exampleUsage() {
    try {
      const result = await this.processVideoAndSaveMetrics(
        'player-profile-uuid', // Replace with actual player profile ID
        7, // Jersey number
        '/path/to/football.mp4' // Path to video file
      );
      return result;
    } catch (error) {
      console.error('Failed to process video:', error);
    }
  }
}

// Utility functions for calculating additional metrics
function calculateAgility(stats) {
  // Example calculation - adjust based on your specific requirements
  return (stats.dribble_success + stats.pass_accuracy) / 2;
}

function calculateStamina(distanceCovered) {
  // distanceCovered is in meters; normalize so ~1000m ≈ 100 stamina, capped 0–100
  const referenceDistance = 1000; // 1 km as full stamina
  if (!distanceCovered || distanceCovered <= 0) return 0;
  const stamina = (distanceCovered / referenceDistance) * 100;
  return Math.max(0, Math.min(stamina, 100));
}

function calculateIntelligence(stats) {
  // Example calculation - combine different performance indicators
  return (
    stats.dribble_success * 0.3 + 
    stats.pass_accuracy * 0.4 + 
    stats.shot_conversion * 0.3
  );
}

// Express Route Handler
function performanceVideoUploadHandler(req, res) {
  const performanceMetricsService = new PerformanceMetricsService();

  return async (req, res) => {
    try {
      // Multer middleware adds file to req.file
      const { playerProfileId, jerseyNumber } = req.body;
      const videoFile = req.file;

      if (!videoFile) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      const metrics = await performanceMetricsService.processVideoAndSaveMetrics(
        playerProfileId, 
        parseInt(jerseyNumber), 
        videoFile.path
      );

      res.status(200).json({ 
        message: 'Performance metrics processed and saved',
        metrics 
      });
    } catch (error) {
      console.error('Video processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process performance metrics',
        details: error.message 
      });
    }
  };
}

// Example Express Route Setup
// Note: This route should also use requireVerifiedProfile middleware
// Import it in server.js and apply it here if needed
function setupRoutes(app) {
  const upload = multer({ 
    dest: 'uploads/', 
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit
  });

  app.post(
    '/upload-performance-video', 
    upload.single('video'), 
    performanceVideoUploadHandler()
  );
}

export {
  PerformanceMetricsService,
  performanceVideoUploadHandler,
  setupRoutes
};