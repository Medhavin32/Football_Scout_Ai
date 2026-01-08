import shutil
import os

# Set working directory
os.chdir(r"C:\Users\Abhit sahu\football_scout_ai\backend-py")

print("="*60)
print("Copy Trained Model")
print("="*60)

# Source path
source = "runs/detect/football_ball_detection/weights/best.pt"
destination = "football_ball.pt"

# Check if source exists
if not os.path.exists(source):
    print(f"\n❌ Trained model not found at: {source}")
    print("Please train the model first using: python train_ball_model.py")
    exit(1)

# Copy the model
try:
    shutil.copy(source, destination)
    print(f"\n✓ Model copied successfully!")
    print(f"  From: {source}")
    print(f"  To: {destination}")
    print(f"\nNext step: Update main.py to use 'football_ball.pt'")
except Exception as e:
    print(f"\n❌ Error copying model: {e}")

