# Football Ball Detection Model Training Guide

## 📋 Overview

This guide will help you train a custom football ball detection model using the downloaded dataset from Roboflow.

## 🚀 Quick Start

### ⚠️ Important: Use Virtual Environment Python

Since `python` command is not in your PATH, use one of these methods:

**Method 1: Use Batch Files (Easiest)**
Just double-click the `.bat` files in Windows Explorer, or run them from PowerShell.

**Method 2: Use Full Path**
Use `.\venv\Scripts\python.exe` instead of `python` in all commands.

### Step 1: Check Your System
**Option A (Easiest):** Double-click `run_check_gpu.bat`

**Option B:** Run in PowerShell:
```powershell
.\venv\Scripts\python.exe check_gpu.py
```

This will tell you if you have GPU support (faster training) or need to use CPU (slower).

### Step 2: Quick Test (Recommended First)
**Option A (Easiest):** Double-click `run_training_quick.bat`

**Option B:** Run in PowerShell:
```powershell
.\venv\Scripts\python.exe train_ball_model_quick.py
```

This takes about 10-30 minutes and verifies your setup is correct.

### Step 3: Full Training
Once the quick test works, run the full training:

**Option A (Easiest):** Double-click `run_training_full.bat`

**Option B:** Run in PowerShell:
```powershell
.\venv\Scripts\python.exe train_ball_model.py
```

**Training Time Estimates:**
- With GPU: 2-4 hours
- With CPU: 8-24 hours (depending on your CPU)

### Step 4: Evaluate the Model
After training completes, evaluate the model:

**Option A (Easiest):** Double-click `run_test_model.bat`

**Option B:** Run in PowerShell:
```powershell
.\venv\Scripts\python.exe test_ball_model.py
```

### Step 5: Copy Model to Use
Copy the trained model to the main directory:

**Option A (Easiest):** Double-click `run_copy_model.bat`

**Option B:** Run in PowerShell:
```powershell
.\venv\Scripts\python.exe copy_trained_model.py
```

### Step 6: Update main.py
Update `main.py` to use your custom model (see instructions below).

## 📁 Files Created

### Python Scripts:
1. **train_ball_model.py** - Full training script (100 epochs)
2. **train_ball_model_quick.py** - Quick test (10 epochs)
3. **check_gpu.py** - Check GPU availability
4. **test_ball_model.py** - Evaluate trained model
5. **copy_trained_model.py** - Copy model to main directory
6. **football-ball-detection-4/data.yaml** - Dataset configuration (updated)

### Batch Files (Easy to Run):
1. **run_check_gpu.bat** - Check GPU (double-click to run)
2. **run_training_quick.bat** - Quick test training (double-click to run)
3. **run_training_full.bat** - Full training (double-click to run)
4. **run_test_model.bat** - Test trained model (double-click to run)
5. **run_copy_model.bat** - Copy model (double-click to run)

## ⚙️ Training Configuration

### Current Settings (train_ball_model.py):
- **Model**: YOLOv8n (nano - fastest)
- **Epochs**: 100
- **Image Size**: 640x640
- **Batch Size**: 16 (reduce to 8 or 4 if you get memory errors)
- **Device**: Auto-detect (GPU if available, else CPU)

### For Better Accuracy (Optional):
Edit `train_ball_model.py` and change:
```python
model = YOLO("yolov8m.pt")  # Medium model (better accuracy)
epochs=200  # More epochs
```

### For Faster Training (Optional):
Edit `train_ball_model.py` and change:
```python
model = YOLO("yolov8n.pt")  # Nano (fastest)
epochs=50  # Fewer epochs
batch=8  # Smaller batch
```

## 📊 Monitoring Training

During training, you'll see:
- **Epoch progress**: Current epoch / total epochs
- **Loss values**: Should decrease over time
  - `box_loss`: Bounding box prediction loss
  - `obj_loss`: Object detection loss
  - `cls_loss`: Classification loss
- **Metrics**: Precision, Recall, mAP

**Results are saved in:**
```
runs/detect/football_ball_detection/
├── weights/
│   ├── best.pt      # Best model (use this!)
│   └── last.pt      # Latest checkpoint
├── results.png      # Training curves
└── confusion_matrix.png
```

## 🔧 Troubleshooting

### Problem: CUDA Out of Memory
**Solution**: Reduce batch size in `train_ball_model.py`:
```python
batch=8  # or batch=4
```

### Problem: Training Too Slow
**Solution**: 
- Use smaller model: `YOLO("yolov8n.pt")`
- Reduce epochs: `epochs=50`
- Use GPU if available

### Problem: Low Accuracy After Training
**Solution**:
- Train longer: `epochs=200`
- Use larger model: `YOLO("yolov8m.pt")`
- Increase image size: `imgsz=1280` (if GPU memory allows)

### Problem: Dataset Path Error
**Solution**: The `data.yaml` file uses relative paths. Make sure you run the training script from the `backend-py` directory.

## 📈 Expected Results

After training, you should see:
- **mAP50**: 0.85-0.95 (85-95% accuracy)
- **Training time**: 
  - GPU: 2-6 hours
  - CPU: 8-24 hours
- **Model size**: 5-50 MB (depending on model size)

## 🔄 Using the Trained Model

After training and copying the model:

1. **Update main.py** (around line 30-35):
   
   Find:
   ```python
   # Ball detection - Using COCO class 32 (sports ball)
   # ball_model = YOLO("football_ball.pt")
   # ball_model.to(device)
   ```
   
   Replace with:
   ```python
   # Ball detection - Custom trained model
   ball_model = YOLO("football_ball.pt")
   ball_model.to(device)
   ```

2. **Update ball detection** (around line 350):
   
   Find:
   ```python
   ball_results = yolo_model(frame_small, verbose=False, conf=0.25, classes=[32])
   ```
   
   Replace with:
   ```python
   ball_results = ball_model(frame_small, verbose=False, conf=0.3)
   ```

3. **Restart your Flask server** and test!

## 📝 Training Tips

1. **Start with quick test**: Always run `train_ball_model_quick.py` first
2. **Monitor progress**: Check `runs/detect/football_ball_detection/results.png`
3. **Early stopping**: Training will stop early if no improvement (patience=50)
4. **Checkpoints**: Model is saved every 10 epochs
5. **Best model**: Always use `best.pt`, not `last.pt`

## 🎯 Next Steps

1. **Check GPU**: Double-click `run_check_gpu.bat` or run `.\venv\Scripts\python.exe check_gpu.py`
2. **Quick test**: Double-click `run_training_quick.bat` or run `.\venv\Scripts\python.exe train_ball_model_quick.py`
3. **Full training**: If quick test works, double-click `run_training_full.bat` or run `.\venv\Scripts\python.exe train_ball_model.py`
4. **Evaluate**: Double-click `run_test_model.bat` or run `.\venv\Scripts\python.exe test_ball_model.py`
5. **Copy model**: Double-click `run_copy_model.bat` or run `.\venv\Scripts\python.exe copy_trained_model.py`
6. **Update main.py** to use custom model (see instructions above)
7. **Test with your videos!**

## ❓ Need Help?

- Check training logs in the console output
- Review `runs/detect/football_ball_detection/results.png` for training curves
- Ensure dataset paths are correct in `data.yaml`
- Verify you have enough disk space (training creates large files)

Good luck with your training! 🚀

