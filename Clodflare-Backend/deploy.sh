#!/bin/bash

# Deployment Script for Podcast Application with D1 Migration
# This script handles the complete deployment process

echo "🚀 Podcast Application Deployment Script"
echo "========================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ wrangler.toml not found. Please run this script from the backend directory."
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

echo "📋 Pre-deployment checks..."

# Check if database ID is set
DATABASE_ID=$(grep -A 5 "\[\[d1_databases\]\]" wrangler.toml | grep "database_id" | cut -d'"' -f2)

if [ -z "$DATABASE_ID" ] || [ "$DATABASE_ID" = "your-database-id-here" ]; then
    echo "❌ Database ID not configured in wrangler.toml"
    echo "Please run: ./init-database.sh first"
    exit 1
fi

echo "✅ Database ID configured: $DATABASE_ID"

# Check if schema exists
if [ ! -f "schema.sql" ]; then
    echo "❌ schema.sql not found"
    exit 1
fi

echo "✅ Schema file found"

# Ask for confirmation
echo ""
read -p "Do you want to proceed with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🔄 Starting deployment process..."

# Step 1: Apply database schema
echo "1️⃣ Applying database schema..."
wrangler d1 execute podcast-database --file=./schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema applied successfully"
else
    echo "❌ Failed to apply database schema"
    exit 1
fi

# Step 2: Deploy worker
echo ""
echo "2️⃣ Deploying Cloudflare Worker..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo "✅ Worker deployed successfully"
else
    echo "❌ Worker deployment failed"
    exit 1
fi

# Step 3: Test deployment
echo ""
echo "3️⃣ Testing deployment..."

# Get the worker URL
WORKER_URL=$(wrangler whoami 2>/dev/null | grep -o 'https://[^/]*' | head -1)
if [ -z "$WORKER_URL" ]; then
    WORKER_URL="https://podcast-worker.your-subdomain.workers.dev"
fi

echo "Testing health endpoint: $WORKER_URL"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed or returned unexpected response"
    echo "Response: $HEALTH_RESPONSE"
fi

# Step 4: Show next steps
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Test your application:"
echo "   curl $WORKER_URL/"
echo ""
echo "2. Generate a test podcast:"
echo "   curl -X POST $WORKER_URL/generate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"url\":\"https://example.com\",\"userId\":\"test-user\"}'"
echo ""
echo "3. Check database:"
echo "   wrangler d1 execute podcast-database --command='SELECT COUNT(*) FROM podcasts'"
echo ""
echo "4. View logs:"
echo "   wrangler tail"
echo ""
echo "🔗 Worker URL: $WORKER_URL"
echo "📊 Database: podcast-database"
echo ""
echo "Happy podcasting! 🎙️"
