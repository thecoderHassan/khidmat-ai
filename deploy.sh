#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# deploy.sh — One-click deploy KhidmatAI backend to Google Cloud Run
# Usage: chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────────────────────────

set -e

# Load env
if [ -f .env ]; then source .env; fi

PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${GCP_REGION:-"asia-south1"}
SERVICE_NAME="khidmat-ai-backend"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying KhidmatAI to Cloud Run..."
echo "   Project : $PROJECT_ID"
echo "   Region  : $REGION"
echo "   Image   : $IMAGE"

# Build & push Docker image using root Dockerfile
gcloud builds submit --tag $IMAGE .

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

echo "✅ Deployment complete."
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format="value(status.url)"
