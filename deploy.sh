#!/bin/bash
echo "Building and deploying to Cloud Run..."
# Ensure you are logged in: gcloud auth login
# Ensure project is set: gcloud config set project YOUR_PROJECT_ID

gcloud run deploy amix-marine-expenses \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated
