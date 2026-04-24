#!/usr/bin/env bash
# deploy.sh — build React app and push to gh-pages branch
#
# Usage:
#   GCP_URL=https://cryptoedge-xxxx-uc.a.run.app npm run deploy   ← GCP Cloud Run
#   RAILWAY_URL=https://thakc-cryptoedge.up.railway.app npm run deploy  ← Railway (legacy)
#
# GCP_URL takes precedence; falls back to RAILWAY_URL; then errors.
set -e

# ── Resolve backend URL ───────────────────────────────────────────────────────
API_URL="${GCP_URL:-$RAILWAY_URL}"
if [ -z "$API_URL" ]; then
  echo "✗ Set GCP_URL or RAILWAY_URL before running deploy."
  echo "  Example: GCP_URL=https://cryptoedge-xxxx-uc.a.run.app npm run deploy"
  exit 1
fi

echo "→ Backend URL : $API_URL"

# ── Build React app with the backend URL baked in ────────────────────────────
DISABLE_ESLINT_PLUGIN=true REACT_APP_API_URL="$API_URL" npm run build

# ── Push build/ to gh-pages ──────────────────────────────────────────────────
REMOTE=$(git remote get-url origin)
echo "→ Deploying to gh-pages on $REMOTE"

DEPLOY_DIR=$(mktemp -d)
cp -r build/. "$DEPLOY_DIR"

cd "$DEPLOY_DIR"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "deploy: update gh-pages ($(date -u '+%Y-%m-%d %H:%M UTC')) → $API_URL"
git remote add origin "$REMOTE"
git push --force origin gh-pages

cd -
rm -rf "$DEPLOY_DIR"

echo "✓ gh-pages updated — site will be live at:"
echo "  https://anandkchandran.github.io/cryptoedge"
