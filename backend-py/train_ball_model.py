from ultralytics import YOLO
import os

# Set working directory to where the dataset is located
os.chdir(r"C:\Users\Abhit sahu\football_scout_ai\backend-py")

print("="*60)
print("Football Ball Detection Model Training")
print("="*60)

# Initialize model - start with pre-trained YOLOv8n (nano) for faster training
# Options: yolov8n.pt (fastest), yolov8s.pt (small), yolov8m.pt (medium - recommended), yolov8l.pt (large)
print("\nLoading pre-trained YOLOv8n model...")
model = YOLO("yolov8n.pt")  # Start with nano for faster training

print("\nStarting training with the following configuration:")
print("  - Dataset: football-ball-detection-4/data.yaml")
print("  - Epochs: 100")
print("  - Image size: 640x640")
print("  - Batch size: 16")
print("  - Device: GPU (if available)")

# Training parameters
results = model.train(
    # Dataset configuration
    data="football-ball-detection-4/data.yaml",  # Path to dataset config
    
    # Training epochs (how many times to go through the dataset)
    epochs=100,  # Start with 100, can increase to 200-300 for better results
    
    # Image size (must match dataset preprocessing)
    imgsz=640,  # Dataset was preprocessed to 640x640
    
    # Batch size (adjust based on GPU memory)
    # For GPU: 16-32, For CPU: 4-8
    batch=16,  # Adjust based on your GPU memory (reduce if you get CUDA out of memory)
    
    # Device (0 = GPU, 'cpu' = CPU)
    device='cpu',  # Auto-detect: use GPU if available, otherwise CPU
    
    # Learning rate (usually auto, but can be set manually)
    lr0=0.01,  # Initial learning rate
    
    # Optimization settings
    optimizer='AdamW',  # Optimizer: SGD, Adam, AdamW
    weight_decay=0.0005,  # Regularization
    
    # Augmentation (helps model generalize better)
    hsv_h=0.015,  # Hue augmentation
    hsv_s=0.7,    # Saturation augmentation
    hsv_v=0.4,    # Value augmentation
    degrees=10,   # Rotation augmentation
    translate=0.1,  # Translation augmentation
    scale=0.5,    # Scale augmentation
    flipud=0.0,   # Vertical flip (usually 0 for football)
    fliplr=0.5,   # Horizontal flip
    mosaic=1.0,   # Mosaic augmentation
    mixup=0.1,    # Mixup augmentation
    
    # Validation settings
    val=True,     # Validate during training
    plots=True,   # Generate training plots
    
    # Save settings
    save=True,    # Save checkpoints
    save_period=10,  # Save checkpoint every N epochs
    
    # Project name (where results will be saved)
    project="runs/detect",  # Results folder
    name="football_ball_detection",  # Experiment name
    
    # Other useful settings
    patience=50,  # Early stopping patience (stop if no improvement for 50 epochs)
    verbose=True, # Print detailed logs
    workers=8,    # Number of data loading workers
)

print("\n" + "="*60)
print("Training completed!")
print("="*60)
print(f"\nModel saved at: runs/detect/football_ball_detection/weights/best.pt")
print(f"\nNext steps:")
print(f"1. Copy the best model: copy runs\\detect\\football_ball_detection\\weights\\best.pt football_ball.pt")
print(f"2. Update main.py to use the custom model")
print(f"\nTo evaluate the model, run: python test_ball_model.py")

