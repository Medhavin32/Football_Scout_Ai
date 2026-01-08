from ultralytics import YOLO
import os

# Set working directory
os.chdir(r"C:\Users\Abhit sahu\football_scout_ai\backend-py")

print("="*60)
print("Quick Test Training (10 epochs)")
print("="*60)
print("This is a quick test to verify everything works correctly.")
print("For full training, use train_ball_model.py\n")

# Initialize model
model = YOLO("yolov8n.pt")

# Quick test training
results = model.train(
    data="football-ball-detection-4/data.yaml",
    epochs=10,  # Quick test
    imgsz=640,
    batch=8,    # Smaller batch for testing
    device=0,   # GPU if available
    project="runs/detect",
    name="football_ball_test",
    verbose=True,
)

print("\n" + "="*60)
print("Quick test completed!")
print("="*60)
print("If this worked, you can now run the full training with:")
print("  python train_ball_model.py")

