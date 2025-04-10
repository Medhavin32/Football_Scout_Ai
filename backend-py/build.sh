#!/bin/bash
#!/bin/bash
set -e

apt-get update && apt-get install -y tesseract-ocr

pip install --upgrade pip
# Install main dependencies
pip install -r requirements.txt

# Install PyTorchVideo from pre-built wheel (via PyPI, NOT GitHub to avoid OOM)
pip install pytorchvideo==0.1.5

