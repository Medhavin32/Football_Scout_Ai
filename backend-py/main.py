import pytesseract  # Optical Character Recognition (OCR)

# Set the correct path to Tesseract
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"
<<<<<<< HEAD

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
slowfast_model = torch.hub.load('facebookresearch/pytorchvideo', 'slowfast_r50', pretrained=True)
slowfast_model = slowfast_model.to(device).eval()

yolo_model = YOLO("yolov8n.pt")  # Load YOLOv8 for player detection
deep_sort_tracker = DeepSort(max_age=30, n_init=3, nn_budget=100)

# Define transformation for SlowFast input
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

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = yolo_model(frame)
        detections = []
        for result in results:
            for bbox in result.boxes.xyxy.cpu().numpy():
                detections.append(((bbox[0], bbox[1], bbox[2], bbox[3]), 1.0, 'player'))

        tracks = deep_sort_tracker.update_tracks(detections, frame=frame)
        for track in tracks:
            if not track.is_confirmed():
                continue

            x1, y1, x2, y2 = map(int, track.to_tlbr())
            track_id = track.track_id
            player_clip = frame[y1:y2, x1:x2]

            if player_clip is None or player_clip.size == 0:
                continue

            detected_jersey = extract_jersey_number(player_clip)
            if detected_jersey != target_jersey:
                continue  # Filter only target jersey number

            if target_player_stats is None:
                target_player_stats = {
                    "jersey_number": detected_jersey,
                    "pass_accuracy": 0,
                    "dribble_success": 0,
                    "shot_conversion": 0,
                    "distance_covered": "0 km",
                    "top_speed": "0 km/h",
                    "last_position": (x1, y1)
                }
            
            # Update placeholder stats (replace with real calculations)
            target_player_stats["pass_accuracy"] += 1  # Example increment
            target_player_stats["dribble_success"] += 1  # Placeholder: Detect dribbling movement
            target_player_stats["shot_conversion"] += 1  # Placeholder: Detect shots on goal
            
            # Calculate distance covered
            prev_position = target_player_stats["last_position"]
            distance = ((x1 - prev_position[0]) ** 2 + (y1 - prev_position[1]) ** 2) ** 0.5
            current_distance = float(target_player_stats["distance_covered"].split()[0])
            target_player_stats["distance_covered"] = f"{current_distance + distance:.2f} km"
            target_player_stats["last_position"] = (x1, y1)
            
            # Update top speed (basic speed estimation per frame)
            current_speed = float(target_player_stats["top_speed"].split()[0])
            target_player_stats["top_speed"] = f"{max(current_speed, distance * 0.1):.2f} km/h"
    
    cap.release()
    os.remove(video_path)  # Clean up temporary video

    return jsonify({"message": "Processing complete", "player_stats": target_player_stats})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5003)
