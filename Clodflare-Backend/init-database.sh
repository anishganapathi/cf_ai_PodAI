#!/bin/bash

# Initialize D1 Database Script
# This script creates and initializes the D1 database for the podcast application

echo "🎙️  Initializing Podcast D1 Database..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ wrangler.toml not found. Please run this script from the backend directory."
    exit 1
fi

echo "📋 Creating D1 database..."

# Create the database
wrangler d1 create podcast-database

echo ""
echo "📝 Database created! Please update your wrangler.toml with the database ID:"
echo ""
echo "[[d1_databases]]"
echo "binding = \"PODCAST_DB\""
echo "database_name = \"podcast-database\""
echo "database_id = \"YOUR_DATABASE_ID_HERE\""
echo "preview_database_id = \"YOUR_PREVIEW_DATABASE_ID_HERE\""
echo ""

# Ask if user wants to run the schema
read -p "Do you want to run the database schema now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Running database schema..."
    
    # Get the database ID from wrangler.toml
    DATABASE_ID=$(grep -A 5 "\[\[d1_databases\]\]" wrangler.toml | grep "database_id" | cut -d'"' -f2)
    
    if [ -z "$DATABASE_ID" ] || [ "$DATABASE_ID" = "your-database-id-here" ]; then
        echo "❌ Please update the database_id in wrangler.toml first"
        exit 1
    fi
    
    # Run the schema
    wrangler d1 execute podcast-database --file=./schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema applied successfully!"
    else
        echo "❌ Failed to apply schema"
        exit 1
    fi
fi

echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "Next steps:"
echo "1. Update your wrangler.toml with the correct database IDs"
echo "2. Deploy your worker: wrangler deploy"
echo "3. Test the application"
echo ""
echo "To view your databases: wrangler d1 list"
echo "To execute SQL manually: wrangler d1 execute podcast-database --command='SELECT * FROM podcasts LIMIT 5'"
