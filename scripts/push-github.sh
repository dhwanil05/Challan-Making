#!/bin/bash
# Create a new GitHub repo and push this project (run after: gh auth login)
set -e
cd "$(dirname "$0")/.."

REPO_NAME="${1:-challan}"

if ! command -v gh &>/dev/null; then
  echo "Install GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Run first: gh auth login"
  exit 1
fi

git remote remove origin 2>/dev/null || true

echo "Creating https://github.com/$(gh api user -q .login)/${REPO_NAME} and pushing..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --push

echo "Done: https://github.com/$(gh api user -q .login)/${REPO_NAME}"
