#!/usr/bin/env bash
# exit on error
set -o errexit

# Install python dependencies
pip install -r backend/requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..
