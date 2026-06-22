#!/usr/bin/env bash
# Build the app and deploy it to the DigitalOcean VPS (stockito.online).
# Usage: ./deploy/push.sh
set -euo pipefail

VPS=root@178.62.204.145
WEBROOT=/var/www/stockito.online

cd "$(dirname "$0")/.."

echo "→ building…"
npm run build

echo "→ uploading dist/ to $VPS:$WEBROOT …"
rsync -az --delete dist/ "$VPS:$WEBROOT/"
ssh "$VPS" "chown -R www-data:www-data $WEBROOT"

echo "✓ deployed: https://stockito.online"
