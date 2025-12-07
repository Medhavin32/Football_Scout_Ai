import pytesseract  # Optical Character Recognition (OCR)

# Set the correct path to Tesseract
<<<<<<< Updated upstream
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
<<<<<<< HEAD
=======
pytesseract.pytesseract.tesseract_cmd = r"C:\Users\Abhit sahu\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
>>>>>>> Stashed changes

from flask import Flask, request, jsonify
import torch
import torchvision.transforms as transforms
import cv2
from collections import deque
from deep_sort_realtime.deepsort_tracker import DeepSort
from ultralytics import YOLO
from PIL import Image
import json
import os
import pytesseract  # Optical Character Recognition (OCR)

app = Flask(__name__)

=======
from flask import Flask, request, jsonify
import torch
import torchvision.transforms as transforms
import cv2
from collections import deque
from deep_sort_realtime.deepsort_tracker import DeepSort
from ultralytics import YOLO
from PIL import Image
import json
import os
import pytesseract  # Optical Character Recognition (OCR)

app = Flask(__name__)

>>>>>>> 067e5ceffa1c17e6b3e0d60e340c0aa8a1336a18
# Load models
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# SlowFast model is heavy and currently unused in this script.
# Commented out to reduce startup time and memory usage.
# slowfast_model = torch.hub.load('facebookresearch/pytorchvideo', 'slowfast_r50', pretrained=True)
# slowfast_model = slowfast_model.to(device).eval()

yolo_model = YOLO("yolov8n.pt")  # Load YOLOv8 for player detection
yolo_model.to(device)  # Run YOLO on GPU if available
deep_sort_tracker = DeepSort(max_age=30, n_init=3, nn_budget=100)

# Define transformation for SlowFast input (kept for future use)
transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
])

# Buffer to store past frames for each player
player_stats = {}
MAX_FRAMES = 32  # Number of frames for Fast pathway

def extract_jersey_number(player_clip):
    """Extract jersey number from player clip using OCR."""
    gray = cv2.cvtColor(player_clip, cv2.COLOR_BGR2GRAY)  # Convert to grayscale
    text = pytesseract.image_to_string(gray, config='--psm 6')  # Extract text
    return int(text.strip()) if text.strip().isdigit() else None

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

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return jsonify({"error": "Unable to open video"}), 500

    target_player_stats = None
    chosen_track_id = None
    frame_idx = 0
    frames_with_player = 0  # count how many frames we successfully tracked the chosen player

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

        # Run YOLO on resized frame
        results = yolo_model(frame_small, verbose=False)

        detections = []
        scale_x = original_w / resized_w
        scale_y = original_h / resized_h

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
            player_clip = frame[y1:y2, x1:x2]

            if player_clip is None or player_clip.size == 0:
                continue

            if target_player_stats is None:
                # Use the requested jersey number as a label, but do not depend on OCR
                target_player_stats = {
                    "jersey_number": target_jersey,
                    "pass_accuracy": 0,
                    "dribble_success": 0,
                    "shot_conversion": 0,
                    # Treat this value as meters rather than kilometers
                    "distance_covered": "0 m",
                    "top_speed": "0 km/h",
                    "last_position": (x1, y1)
                }
            
            # Update placeholder stats (replace with real calculations)
            target_player_stats["pass_accuracy"] += 1  # Example increment
            target_player_stats["dribble_success"] += 1  # Placeholder: Detect dribbling movement
            target_player_stats["shot_conversion"] += 1  # Placeholder: Detect shots on goal
            
            # Calculate distance covered (in meters, approximate)
            prev_position = target_player_stats["last_position"]
            distance = ((x1 - prev_position[0]) ** 2 + (y1 - prev_position[1]) ** 2) ** 0.5
            current_distance = float(target_player_stats["distance_covered"].split()[0])
            target_player_stats["distance_covered"] = f"{current_distance + distance:.2f} m"
            target_player_stats["last_position"] = (x1, y1)
            
            # Update top speed (basic speed estimation per frame)
            current_speed = float(target_player_stats["top_speed"].split()[0])
            target_player_stats["top_speed"] = f"{max(current_speed, distance * 0.1):.2f} km/h"

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
