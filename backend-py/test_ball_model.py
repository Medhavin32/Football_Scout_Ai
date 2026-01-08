from ultralytics import YOLO
import os

# Set working directory
os.chdir(r"C:\Users\Abhit sahu\football_scout_ai\backend-py")

print("="*60)
print("Model Evaluation")
print("="*60)

# Check if model exists
model_path = "runs/detect/football_ball_detection/weights/best.pt"
if not os.path.exists(model_path):
    print(f"\n❌ Model not found at: {model_path}")
    print("Please train the model first using: python train_ball_model.py")
    exit(1)

print(f"\nLoading trained model from: {model_path}")
model = YOLO(model_path)

print("\nEvaluating on validation set...")
# Test on validation set
results = model.val(
    data="football-ball-detection-4/data.yaml",
    imgsz=640,
    conf=0.25,  # Confidence threshold
    iou=0.45,   # IoU threshold for NMS
)

print("\n" + "="*60)
print("Validation Results:")
print("="*60)
print(f"mAP50: {results.box.map50:.4f}")  # Mean Average Precision at IoU=0.5
print(f"mAP50-95: {results.box.map:.4f}")  # Mean Average Precision at IoU=0.5:0.95
print(f"Precision: {results.box.mp:.4f}")
print(f"Recall: {results.box.mr:.4f}")

print("\n" + "="*60)
print("Interpretation:")
print("="*60)
print("mAP50: Mean Average Precision at IoU=0.5 (higher is better, 0-1 scale)")
print("  - >0.9: Excellent")
print("  - 0.8-0.9: Very Good")
print("  - 0.7-0.8: Good")
print("  - <0.7: Needs improvement")
print("\nIf mAP50 is low, consider:")
print("  - Training for more epochs")
print("  - Using a larger model (yolov8m.pt or yolov8l.pt)")
print("  - Increasing image size (if GPU memory allows)")

