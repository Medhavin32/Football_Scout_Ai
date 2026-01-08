@echo off
echo ============================================================
echo Full Training (100 epochs)
echo ============================================================
echo.
echo WARNING: This will take 8-24 hours on CPU!
echo Press Ctrl+C to cancel, or wait 5 seconds to continue...
timeout /t 5 /nobreak >nul
echo.
.\venv\Scripts\python.exe train_ball_model.py
pause

