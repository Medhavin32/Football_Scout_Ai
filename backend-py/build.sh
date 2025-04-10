#!/usr/bin/env bash

# Install PyTorchVideo using GitHub token from environment variable
pip install git+https://${GITHUB_TOKEN}@github.com/facebookresearch/pytorchvideo.git

# Install your main requirements
pip install -r backend-py/requirements.txt

