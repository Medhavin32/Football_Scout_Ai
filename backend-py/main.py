import pytesseract  # Optical Character Recognition (OCR)

# Set the correct path to Tesseract (Windows path)
pytesseract.pytesseract.tesseract_cmd = r"C:\Users\Abhit sahu\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"

from flask import Flask, request, jsonify
import torch
import torchvision.transforms as transforms
import cv2
from collections import defaultdict
from deep_sort_realtime.deepsort_tracker import DeepSort
from ultralytics import YOLO
from PIL import Image
import json
import os
import numpy as np
import math

app = Flask(__name__)

# Load models
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# Player & ball detection model (COCO: 0=person, 32=sports ball)
yolo_model = YOLO("yolov8n.pt")  # Load YOLOv8 for player & ball detection
yolo_model.to(device)  # Run YOLO on GPU if available

# Ball detection - If you later train a custom model, you can load it here:
# ball_model = YOLO("football_ball.pt")
# ball_model.to(device)

# Trackers
deep_sort_tracker = DeepSort(max_age=30, n_init=3, nn_budget=100)
ball_tracker = DeepSort(max_age=30, n_init=3, nn_budget=100)  # Separate tracker for ball

# Define transformation for SlowFast input (kept for future use)
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
])

# Buffer to store past frames for each player
player_stats = {}
MAX_FRAMES = 32  # Number of frames for Fast pathway


def validate_football_video(video_path, min_confidence: float = 0.2):
    """
    Quick validation to check if the uploaded video looks like a football match.

    Uses the existing YOLO model to:
      - sample a few frames across the video
      - detect players (COCO class 0 = person)
      - detect ball (COCO class 32 = sports ball)

    Returns:
      is_football (bool), confidence (float 0-1), details (dict)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return False, 0.0, {"error": "Cannot open video"}

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count <= 0:
        cap.release()
        return False, 0.0, {"error": "Empty or unreadable video"}

    # Sample 5 frames evenly across the video
    sample_indices = np.linspace(0, frame_count - 1, 5, dtype=int)

    player_detections = 0  # frames where we saw enough players
    ball_detections = 0    # frames where we saw the ball
    frames_analyzed = 0

    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ret, frame = cap.read()
        if not ret:
            continue

        frames_analyzed += 1

        # Resize frame similar to main pipeline for consistent YOLO behavior
        original_h, original_w = frame.shape[:2]
        resized_w, resized_h = 640, 360
        frame_small = cv2.resize(frame, (resized_w, resized_h))

        # Run YOLO detection on this frame
        results = yolo_model(frame_small, verbose=False)
        if not results:
            continue

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            continue

        classes = boxes.cls.cpu().numpy()

        # Count players (COCO class 0 = person)
        player_count = int(np.sum(classes == 0))

        # Count sports balls (COCO class 32 = sports ball)
        ball_count = int(np.sum(classes == 32))

        # Heuristics: consider this frame as “has players/ball” if counts are enough
        if player_count >= 3:  # at least 3 people visible
            player_detections += 1
        if ball_count >= 1:    # at least one ball
            ball_detections += 1

    cap.release()

    if frames_analyzed == 0:
        return False, 0.0, {
            "error": "No frames could be analyzed",
            "frames_analyzed": 0
        }

    player_ratio = player_detections / frames_analyzed
    ball_ratio = ball_detections / frames_analyzed

    # Weighted confidence: players are more important than single-ball sightings
    confidence = (0.6 * player_ratio) + (0.4 * ball_ratio)

    # Looser criteria:
    # - require at least some confidence
    # - require at least 1 sampled frame with players
    # - do NOT require hard ball detection (COCO ball is often missed)
    is_football = (
        confidence >= min_confidence and
        player_detections >= 1
    )

    details = {
        "player_frames": int(player_detections),
        "ball_frames": int(ball_detections),
        "total_frames_analyzed": int(frames_analyzed),
        "player_ratio": float(player_ratio),
        "ball_ratio": float(ball_ratio),
        "confidence": float(confidence)
    }

    return is_football, float(confidence), details

def extract_jersey_number(player_clip):
    """Extract jersey number from player clip using OCR."""
    gray = cv2.cvtColor(player_clip, cv2.COLOR_BGR2GRAY)  # Convert to grayscale
    text = pytesseract.image_to_string(gray, config='--psm 6')  # Extract text
    return int(text.strip()) if text.strip().isdigit() else None

def detect_pass_from_ball(ball_trajectory, player_position, frame_idx, fps, pixels_per_meter):
    """
    Detect pass: Ball moves away from player with moderate-high velocity.
    Real detection based on ball movement, not player movement.
    """
    if len(ball_trajectory) < 5:
        return False
    
    # Get recent ball positions (last 5 frames = ~0.17 seconds at 30fps)
    recent_ball_frames = [b for b in ball_trajectory if b[0] >= frame_idx - 5]
    if len(recent_ball_frames) < 3:
        return False
    
    # Calculate ball velocity (how fast ball is moving in pixels per second)
    ball_speeds = []
    for i in range(1, len(recent_ball_frames)):
        dx = recent_ball_frames[i][1] - recent_ball_frames[i-1][1]
        dy = recent_ball_frames[i][2] - recent_ball_frames[i-1][2]
        pixel_speed = math.sqrt(dx**2 + dy**2) * fps  # pixels per second
        ball_speeds.append(pixel_speed)
    
    if len(ball_speeds) < 2:
        return False
    
    # Pass: Ball moves away from player with significant velocity
    first_ball_pos = (recent_ball_frames[0][1], recent_ball_frames[0][2])
    last_ball_pos = (recent_ball_frames[-1][1], recent_ball_frames[-1][2])
    
    # Distance from player to first ball position
    dist_to_first = math.sqrt(
        (first_ball_pos[0] - player_position[0])**2 + 
        (first_ball_pos[1] - player_position[1])**2
    )
    
    # Distance from player to last ball position
    dist_to_last = math.sqrt(
        (last_ball_pos[0] - player_position[0])**2 + 
        (last_ball_pos[1] - player_position[1])**2
    )
    
    # Ball is moving away from player AND has moderate-high velocity
    # Convert pixel speed to m/s for realistic thresholds
    avg_speed_px_per_sec = sum(ball_speeds) / len(ball_speeds)
    avg_speed_m_per_sec = (avg_speed_px_per_sec / pixels_per_meter)
    
    # Pass: 5-15 m/s (18-54 km/h) is typical for passes
    if dist_to_last > dist_to_first + (20 / pixels_per_meter) and 5 <= avg_speed_m_per_sec <= 15:
        return True
    
    return False

def detect_shot_from_ball(ball_trajectory, player_position, frame_idx, frame_shape, fps, pixels_per_meter):
    """
    Detect shot: Ball moves toward goal area with very high velocity.
    Real detection based on ball trajectory and speed.
    """
    if len(ball_trajectory) < 5:
        return False
    
    frame_h, frame_w = frame_shape[:2]
    
    # Get recent ball positions
    recent_ball_frames = [b for b in ball_trajectory if b[0] >= frame_idx - 5]
    if len(recent_ball_frames) < 3:
        return False
    
    # Calculate ball velocity
    ball_speeds = []
    for i in range(1, len(recent_ball_frames)):
        dx = recent_ball_frames[i][1] - recent_ball_frames[i-1][1]
        dy = recent_ball_frames[i][2] - recent_ball_frames[i-1][2]
        pixel_speed = math.sqrt(dx**2 + dy**2) * fps
        ball_speeds.append(pixel_speed)
    
    if len(ball_speeds) < 2:
        return False
    
    # Shot: Very high velocity + moving toward goal area
    max_speed_px_per_sec = max(ball_speeds)
    avg_speed_px_per_sec = sum(ball_speeds) / len(ball_speeds)
    
    # Convert to m/s
    max_speed_m_per_sec = max_speed_px_per_sec / pixels_per_meter
    avg_speed_m_per_sec = avg_speed_px_per_sec / pixels_per_meter
    
    # Check if moving toward goal (top or bottom 20% of frame)
    first_y = recent_ball_frames[0][2]
    last_y = recent_ball_frames[-1][2]
    
    goal_top_area = frame_h * 0.2
    goal_bottom_area = frame_h * 0.8
    
    # Shot: >15 m/s (54+ km/h) is typical for shots
    if max_speed_m_per_sec > 15 and avg_speed_m_per_sec > 12:
        # Moving toward goal area
        if (last_y < goal_top_area and first_y > last_y) or \
           (last_y > goal_bottom_area and first_y < last_y):
            return True
    
    return False

def detect_dribble_from_ball(ball_trajectory, player_position, frame_idx, fps, pixels_per_meter):
    """
    Detect dribble: Ball stays close to player while both are moving.
    Real detection based on ball-player proximity during movement.
    """
    if len(ball_trajectory) < 10:
        return False
    
    # Get recent ball positions (last 10 frames = ~0.33 seconds at 30fps)
    recent_ball_frames = [b for b in ball_trajectory if b[0] >= frame_idx - 10]
    if len(recent_ball_frames) < 5:
        return False
    
    # Check if ball stays consistently close to player
    # Convert threshold to pixels (ball within 2 meters of player)
    possession_threshold_px = 2.0 * pixels_per_meter
    
    close_frames = 0
    for ball_frame in recent_ball_frames:
        ball_pos = (ball_frame[1], ball_frame[2])
        distance_px = math.sqrt(
            (ball_pos[0] - player_position[0])**2 + 
            (ball_pos[1] - player_position[1])**2
        )
        if distance_px < possession_threshold_px:
            close_frames += 1
    
    # Dribbling: Ball close to player for most of the time (70% threshold)
    if close_frames >= len(recent_ball_frames) * 0.7:
        return True
    
    return False

@app.route('/process_video', methods=['POST'])
def process_video():
    global player_stats
    player_stats = {}  # Reset stats for each request

    print("Received request:", request.files)  # Debugging log

    # Get jersey number from request
    data = request.form
    target_jersey = int(data.get("jersey_number", 7))  # Default to 7 if not provided

    # Get video file from request
    if 'video' not in request.files:
        print("No video received!")
        return jsonify({"error": "No video file provided"}), 400
    
    video_file = request.files['video']
    
    # Save video temporarily
    video_path = "temp_video.mp4"
    video_file.save(video_path)

    if not os.path.exists(video_path):
        return jsonify({"error": "Video file saving failed"}), 500

    # ---- Quick validation: ensure this looks like a football video before heavy processing ----
    is_football, fb_confidence, fb_details = validate_football_video(
        video_path,
        min_confidence=0.2  # looser threshold so real matches pass more easily
    )

    if not is_football:
        # Clean up temp file and return a clear error
        try:
            os.remove(video_path)
        except OSError:
            pass

        return jsonify({
            "error": "Uploaded video does not appear to be a football match.",
            "football_confidence": fb_confidence,
            "validation_details": fb_details
        }), 400

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return jsonify({"error": "Unable to open video"}), 500

    # Get video properties for calculations
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0  # Default to 30 fps if unavailable
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Assume field dimensions (adjust based on your video)
    # Typical football field: 105m x 68m
    pixels_per_meter = min(frame_width / 105, frame_height / 68)

    target_player_stats = None
    chosen_track_id = None
    frame_idx = 0
    frames_with_player = 0
    
    # Ball tracking variables
    ball_trajectory = []  # Store ball positions: [(frame_idx, x, y), ...]
    last_ball_position = None
    ball_possession_frames = 0  # Frames where ball is near player
    
    # Event detection cooldowns (to avoid duplicate detections)
    last_pass_frame = -30  # 1 second cooldown at 30fps
    last_shot_frame = -60  # 2 second cooldown
    last_dribble_frame = -45  # 1.5 second cooldown

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        # OPTIONAL: uncomment to skip every other frame for more speed
        # if frame_idx % 2 != 0:
        #     continue

        # Resize frame to smaller resolution for faster inference
        original_h, original_w = frame.shape[:2]
        resized_w, resized_h = 640, 360
        frame_small = cv2.resize(frame, (resized_w, resized_h))

        scale_x = original_w / resized_w
        scale_y = original_h / resized_h

        # ===== PLAYER DETECTION =====
        # Run YOLO on resized frame for player detection
        results = yolo_model(frame_small, verbose=False)

        detections = []
        for result in results:
            for bbox in result.boxes.xyxy.cpu().numpy():
                x1_s, y1_s, x2_s, y2_s = bbox

                # Scale boxes back to original frame size
                x1 = x1_s * scale_x
                y1 = y1_s * scale_y
                x2 = x2_s * scale_x
                y2 = y2_s * scale_y

                detections.append(((x1, y1, x2, y2), 1.0, 'player'))

        tracks = deep_sort_tracker.update_tracks(detections, frame=frame)
        frame_has_chosen_player = False
        current_speed = 0
        current_position = None
        
        for track in tracks:
            if not track.is_confirmed():
                continue

            # Always focus on a single tracked player (first confirmed track)
            if chosen_track_id is None:
                chosen_track_id = track.track_id

            if track.track_id != chosen_track_id:
                continue

            # Mark that in this frame we successfully saw the chosen player
            frame_has_chosen_player = True

            x1, y1, x2, y2 = map(int, track.to_tlbr())
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            current_position = (center_x, center_y)
            
            player_clip = frame[y1:y2, x1:x2]

            if player_clip is None or player_clip.size == 0:
                continue

            if target_player_stats is None:
                # Initialize stats - all calculated from real video tracking data
                target_player_stats = {
                    "jersey_number": target_jersey,
                    "distance_covered": "0 m",
                    "top_speed": "0 km/h",
                    "last_position": current_position,
                    "pass_accuracy": 0,  # Real: from ball detection
                    "dribble_success": 0,  # Real: from ball detection
                    "shot_conversion": 0,  # Real: from ball detection
                }
            
            # Calculate distance covered (in meters, approximate)
            prev_position = target_player_stats["last_position"]
            pixel_distance = ((center_x - prev_position[0]) ** 2 + (center_y - prev_position[1]) ** 2) ** 0.5
            distance_meters = pixel_distance / pixels_per_meter
            
            current_distance = float(target_player_stats["distance_covered"].split()[0])
            target_player_stats["distance_covered"] = f"{current_distance + distance_meters:.2f} m"
            target_player_stats["last_position"] = current_position
            
            # Calculate speed (km/h) - FIXED: Use frame-to-frame movement for accurate speed
            if pixel_distance > 0:
                time_per_frame = 1.0 / fps
                speed_ms = distance_meters / time_per_frame
                current_speed = speed_ms * 3.6
                current_speed = min(current_speed, 40.0)
            else:
                current_speed = 0
            
            # Update top speed (only if current speed is higher)
            current_top_speed = float(target_player_stats["top_speed"].split()[0])
            target_player_stats["top_speed"] = f"{max(current_top_speed, current_speed):.2f} km/h"

        # ===== BALL DETECTION AND TRACKING =====
        # Run YOLO again for ball detection (class 32 = sports ball in COCO)
        # Use lower confidence threshold for small ball detection
        ball_results = yolo_model(frame_small, verbose=False, conf=0.25, classes=[32])
        
        ball_detections = []
        for result in ball_results:
            for bbox in result.boxes.xyxy.cpu().numpy():
                x1_s, y1_s, x2_s, y2_s = bbox
                confidence = float(result.boxes.conf.cpu().numpy()[0]) if len(result.boxes.conf) > 0 else 0.5
                
                # Scale boxes back to original frame size
                x1_ball = x1_s * scale_x
                y1_ball = y1_s * scale_y
                x2_ball = x2_s * scale_x
                y2_ball = y2_s * scale_y
                
                ball_detections.append(((x1_ball, y1_ball, x2_ball, y2_ball), confidence, 'ball'))
        
        # Track ball across frames
        ball_tracks = ball_tracker.update_tracks(ball_detections, frame=frame)
        
        current_ball_position = None
        
        for ball_track in ball_tracks:
            if not ball_track.is_confirmed():
                continue
            
            x1_ball, y1_ball, x2_ball, y2_ball = map(int, ball_track.to_tlbr())
            ball_center_x = (x1_ball + x2_ball) / 2
            ball_center_y = (y1_ball + y2_ball) / 2
            current_ball_position = (ball_center_x, ball_center_y)
            
            # Store ball position for this frame
            ball_trajectory.append((frame_idx, ball_center_x, ball_center_y))
            
            # Keep trajectory limited to last 100 frames (for memory efficiency)
            if len(ball_trajectory) > 100:
                ball_trajectory.pop(0)
            
            break  # Only track one ball (the first confirmed track)
        
        # ===== CORRELATE BALL WITH PLAYER AND DETECT EVENTS =====
        if frame_has_chosen_player and current_position:
            # Check if ball is near the tracked player (for possession detection)
            if current_ball_position:
                ball_player_distance = math.sqrt(
                    (current_ball_position[0] - current_position[0])**2 + 
                    (current_ball_position[1] - current_position[1])**2
                )
                
                # Consider ball "in possession" if within 2 meters
                possession_threshold_px = 2.0 * pixels_per_meter
                
                if ball_player_distance < possession_threshold_px:
                    ball_possession_frames += 1
            
            # ===== REAL ACTION DETECTION FROM BALL MOVEMENT =====
            if current_ball_position and len(ball_trajectory) >= 5:
                # Detect pass (with cooldown to avoid duplicates)
                if detect_pass_from_ball(ball_trajectory, current_position, frame_idx, fps, pixels_per_meter):
                    if frame_idx - last_pass_frame > 30:  # 1 second cooldown at 30fps
                        target_player_stats["pass_accuracy"] += 1
                        last_pass_frame = frame_idx
                        print(f"[Frame {frame_idx}] PASS detected!")
                
                # Detect shot (with cooldown)
                if detect_shot_from_ball(ball_trajectory, current_position, frame_idx, frame.shape, fps, pixels_per_meter):
                    if frame_idx - last_shot_frame > 60:  # 2 second cooldown
                        target_player_stats["shot_conversion"] += 1
                        last_shot_frame = frame_idx
                        print(f"[Frame {frame_idx}] SHOT detected!")
                
                # Detect dribble (with cooldown)
                if detect_dribble_from_ball(ball_trajectory, current_position, frame_idx, fps, pixels_per_meter):
                    if frame_idx - last_dribble_frame > 45:  # 1.5 second cooldown
                        target_player_stats["dribble_success"] += 1
                        last_dribble_frame = frame_idx
                        print(f"[Frame {frame_idx}] DRIBBLE detected!")

        # After processing all tracks for this frame, update tracking frame counter
        if frame_has_chosen_player:
            frames_with_player += 1
    
    cap.release()
    os.remove(video_path)  # Clean up temporary video

    # Compute overall tracking accuracy as percentage of frames where the player was successfully tracked
    if target_player_stats is not None and frame_idx > 0:
        tracking_accuracy = (frames_with_player / frame_idx) * 100.0
        target_player_stats["overall_accuracy"] = round(tracking_accuracy, 2)

    return jsonify({"message": "Processing complete", "player_stats": target_player_stats})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5003)
