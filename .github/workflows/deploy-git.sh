#!/bin/bash
set -e

# Script to handle git repository setup and updates
# Usage: ./deploy-git.sh <APP_NAME> <APP_DIR> <REPO_URL>

APP_NAME="$1"
APP_DIR="$2"
REPO_URL="$3"

if [ -z "$APP_NAME" ] || [ -z "$APP_DIR" ] || [ -z "$REPO_URL" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <APP_NAME> <APP_DIR> <REPO_URL>"
  exit 1
fi

# Ensure directory exists
mkdir -p "$APP_DIR"
cd "$APP_DIR"

CLONE_FRESH=false

if [ -d .git ]; then
  echo "Updating existing git repository..."
  # Check if git repo is valid
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Git repository is corrupted. Will clone fresh..."
    CLONE_FRESH=true
  else
    # Remove broken origin if it exists but is invalid
    if ! git remote get-url origin >/dev/null 2>&1; then
      git remote remove origin 2>/dev/null || true
      if ! git remote add origin "$REPO_URL" 2>/dev/null; then
        echo "Failed to add origin remote. Will clone fresh..."
        CLONE_FRESH=true
      fi
    else
      git remote set-url origin "$REPO_URL"
    fi
    
    if [ "$CLONE_FRESH" = false ]; then
      if ! git fetch origin 2>/dev/null; then
        echo "ERROR: Failed to fetch from origin. Will clone fresh..."
        CLONE_FRESH=true
      fi
    fi
    
    if [ "$CLONE_FRESH" = false ]; then
      # Check if origin/prod exists
      if git show-ref --verify --quiet refs/remotes/origin/prod 2>/dev/null; then
        git reset --hard origin/prod
        git clean -fd
        echo "Git repository updated successfully"
      else
        echo "origin/prod branch does not exist. Checking out local prod or creating it..."
        git checkout prod 2>/dev/null || git checkout -b prod
      fi
    fi
  fi
elif [ "$(ls -A . 2>/dev/null)" ]; then
  echo "Directory exists but is not a git repository. Will clone fresh..."
  CLONE_FRESH=true
else
  echo "Cloning repository for first time..."
  CLONE_FRESH=true
fi

if [ "$CLONE_FRESH" = true ]; then
  echo "Cloning fresh repository..."
  cd ..
  # Try to remove directory (should be owned by user, no sudo needed)
  rm -rf "$APP_NAME" 2>/dev/null || true
  # Ensure directory is completely gone before cloning
  if [ -d "$APP_NAME" ]; then
    echo "Warning: Directory still exists, attempting to remove contents..."
    rm -rf "$APP_NAME"/* "$APP_NAME"/.* 2>/dev/null || true
  fi
  mkdir -p "$APP_NAME"
  cd "$APP_NAME"
  git clone "$REPO_URL" .
  # Check if prod branch exists after clone
  if git show-ref --verify --quiet refs/remotes/origin/prod 2>/dev/null; then
    git checkout prod
  else
    echo "prod branch does not exist on remote. Creating local prod branch..."
    git checkout -b prod
  fi
fi

echo "Verifying we have the latest code..."
git log -1 --oneline || echo "No commits found"

