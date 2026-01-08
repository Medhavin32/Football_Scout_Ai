from roboflow import Roboflow

# Your Private API Key
rf = Roboflow(api_key="und13bQVtM1PzUkM2S4F")

# Get the project
project = rf.workspace("roboflow-jvuqo").project("football-ball-detection-rejhg")

# Get version 4 (as shown in your interface)
version = project.version(4)

# Download the model in YOLOv8 format
version.download("yolov8")

print("Model downloaded successfully!")
print("Look for the folder: football-ball-detection-rejhg-4")

