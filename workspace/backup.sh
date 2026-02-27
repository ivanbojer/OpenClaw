#!/bin/bash
set -e
set -o pipefail

# Ensure Homebrew binaries (like gsed) are on PATH when run via cron
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# --- Configuration ---
# Your local OpenClaw workspace directory
WORKSPACE_DIR="/Users/djloky/.openclaw/workspace"
WORKSPACE_DIR_CODING="/Users/djloky/.openclaw/workspace-coding"
# A temporary directory to stage the backup before committing
STAGING_DIR="/tmp/agent_backup_staging"
# The private GitHub repository URL
GIT_REPO_URL="git@github.com:ivanbojer/OpenClaw.git"
# Path to the discord notification script
NOTIFIER_SCRIPT_PATH="${WORKSPACE_DIR}/send_discord_notification.sh"

# --- Helper Functions ---
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

send_discord_notification() {
  local message="$1"
  if [ -f "$NOTIFIER_SCRIPT_PATH" ]; then
    bash "$NOTIFIER_SCRIPT_PATH" "$message"
  else
    log "ERROR: Notifier script not found at $NOTIFIER_SCRIPT_PATH"
  fi
}

# --- Main Backup Logic ---

# 1. Clean and create the staging directory
log "Starting backup process..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
cd "$STAGING_DIR"

# 2. Initialize Git repository
log "Initializing backup repository in staging area..."
git init
git remote add origin "$GIT_REPO_URL"
# Fetch the main branch to get history and check for changes
git pull origin main --rebase || log "Initial backup, repository is empty."

# 3. Copy Critical Files
log "Copying critical configuration files..."
# Workspace files (SOUL, MEMORY, USER, etc.)
rsync -av --exclude=node_modules --exclude=.cache --exclude=__pycache__ --exclude=dev --exclude=.next "$WORKSPACE_DIR" "$STAGING_DIR/"
rsync -av --exclude=node_modules --exclude=.cache --exclude=__pycache__ --exclude=dev --exclude=.next "$WORKSPACE_DIR_CODING" "$STAGING_DIR/"

# Skill configurations from workspace
# Note: This assumes custom skills are in the workspace. Global skills are not backed up.
# Gateway config file (assuming default location)
GATEWAY_CONFIG="$HOME/.openclaw/config.yaml"
if [ -f "$GATEWAY_CONFIG" ]; then
  cp "$GATEWAY_CONFIG" "$STAGING_DIR/gateway-config.yaml"
  log "Copied gateway config to staging as gateway-config.yaml"
else
  log "WARN: Gateway config not found at $GATEWAY_CONFIG"
fi

# OpenClaw runtime config (copy only; do not modify source)
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
if [ -f "$OPENCLAW_CONFIG" ]; then
  cp "$OPENCLAW_CONFIG" "$STAGING_DIR/openclaw-config.json"
  log "Copied OpenClaw config to staging as openclaw-config.json"
else
  log "WARN: OpenClaw config not found at $OPENCLAW_CONFIG (skipping)"
fi

# Cron jobs
crontab -l > "$STAGING_DIR/crontab.txt" 2>/dev/null || touch "$STAGING_DIR/crontab.txt"

# 4. Sanitize Secrets
log "Scanning for and redacting secrets..."
# Use gsed for macOS compatibility (brew install gnu-sed)
# This uses a generic pattern to find common key/token formats.
# It's not foolproof but covers many cases.
find . -type f -not -path "./.git/*" -print0 | while IFS= read -r -d '' file; do
  # Pattern for generic keys/tokens:
  gsed -i -E 's/([A-Z0-9_]+_?(API_KEY|TOKEN|SECRET|PASSWORD))\s*=\s*['"'"'"]?[a-zA-Z0-9_/-]{20,}['"'"'"]?/1=[REDACTED]/gi' "$file"
  # Pattern for GitHub tokens (ghp_, gho_, ghu_, ghs_):
  gsed -i -E 's/(gh[pous]_[a-zA-Z0-9]{36})/\[REDACTED_GITHUB_TOKEN\]/g' "$file"
done
log "Secret scan and redaction complete."

# 5. Commit and Push
log "Committing changes..."
git add .
# Check if there are any changes to commit
if ! git diff --staged --quiet; then
  COMMIT_DATE=$(date +'%Y-%m-%d %H:%M:%S')
  git commit -m "Automated Backup: $COMMIT_DATE"
  
  BRANCH_NAME="backup-$(date +'%Y%m%d-%H%M%S')"
  git checkout -b "$BRANCH_NAME"
  
  log "Pushing to remote repository on branch $BRANCH_NAME..."
  git push -u origin "$BRANCH_NAME"
  
  # 6. Send Confirmation
  log "Backup successful. Sending confirmation..."
  send_discord_notification "✅ Daily OpenClaw agent backup completed and pushed to branch $BRANCH_NAME."
else
  log "No changes detected. Nothing to commit."
  send_discord_notification "ℹ️ Daily OpenClaw agent backup job ran, but no changes were detected."
fi

# 7. Cleanup
log "Cleaning up staging directory..."
rm -rf "$STAGING_DIR"

log "Backup script finished."
