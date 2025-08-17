#!/bin/bash
echo "Setting up the database..."
echo "1. Pushing schema to database..."
./scripts/db-push.sh
echo "2. Initializing admin user..."
./scripts/init-db.sh
echo "Database setup complete!"