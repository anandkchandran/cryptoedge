#!/usr/bin/env bash
# deploy.sh — push build/ to gh-pages branch without any npm packages
set -e

REMOTE=$(git remote get-url origin)
echo "→ Deploying to gh-pages on $REMOTE"

# Stash any uncommitted changes so we don't lose them
STASH=$(git stash create)

# Create a temp dir with the build output
DEPLOY_DIR=$(mktemp -d)
cp -r build/. "$DEPLOY_DIR"

# Work inside the temp dir
cd "$DEPLOY_DIR"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "deploy: update gh-pages from main ($(date -u '+%Y-%m-%d %H:%M UTC'))"
git remote add origin "$REMOTE"
git push --force origin gh-pages

cd -
rm -rf "$DEPLOY_DIR"

echo "✓ gh-pages updated — site will be live at:"
echo "  https://anandkchandran.github.io/cryptoedge"
