#!/bin/bash
set -e
set -o pipefail

# Ensure Homebrew binaries (like gsed) are on PATH when run via cron
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# --- Configuration ---
# Your local OpenClaw workspace directory
WORKSPACE_DIR="/Users/djloky/.openclaw/workspace"
# A temporary directory to stage the backup before committing
STAGING_DIR="/tmp/agent_backup_staging"
export STAGING_DIR
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
rsync -av --exclude=node_modules --exclude=.cache --exclude=__pycache__ --exclude=dev --exclude=.next --exclude=.git "$WORKSPACE_DIR" "$STAGING_DIR/"

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

python3 <<'PY_RED'
import json
import os
import pathlib
import re

root = pathlib.Path(os.environ["STAGING_DIR"])
pattern_json = re.compile(r'("[^"]*(token|secret|password|api[_-]?key)[^"]*"\s*:\s*)"([^"]+)"', re.IGNORECASE)
pattern_env = re.compile(r"((?:^|\s)(?:[A-Z0-9_]+(?:TOKEN|SECRET|PASSWORD|KEY))[ \t]*=[ \t]*)([\"\']?)[^\s\"\']{12,}\2", re.IGNORECASE | re.MULTILINE)
pattern_gh = re.compile(r'gh[pous]_[a-zA-Z0-9]{36}')

SENSITIVE_KEYS = {
    'token', 'bot_token', 'bottoken', 'bot token', 'discord_token', 'discord bot token',
    'secret', 'password', 'api_key', 'apikey', 'api-key', 'client_secret', 'auth', 'auth_token'
}

def scrub_json(data):
    changed = False
    if isinstance(data, dict):
        new = {}
        for k, v in data.items():
            lower = k.lower()
            if lower in SENSITIVE_KEYS and isinstance(v, str) and len(v) >= 4:
                new[k] = '[REDACTED]'
                changed = True
            else:
                new_v, sub_changed = scrub_json(v)
                new[k] = new_v
                changed = changed or sub_changed
        return new, changed
    if isinstance(data, list):
        new_list = []
        for item in data:
            new_item, sub_changed = scrub_json(item)
            new_list.append(new_item)
            changed = changed or sub_changed
        return new_list, changed
    return data, False

files_scrubbed = 0
for path in root.rglob('*'):
    if path.is_dir() or '.git' in path.parts:
        continue
    try:
        text_content = path.read_text()
    except UnicodeDecodeError:
        continue
    original = text_content
    if path.suffix.lower() == '.json':
        try:
            data = json.loads(text_content)
        except Exception:
            pass
        else:
            new_data, changed = scrub_json(data)
            if changed:
                path.write_text(json.dumps(new_data, indent=2))
                files_scrubbed += 1
                continue
    text_content = pattern_json.sub(lambda m: f"{m.group(1)}\"[REDACTED]\"", text_content)
    text_content = pattern_env.sub(lambda m: f"{m.group(1)}[REDACTED]", text_content)
    text_content = pattern_gh.sub('[REDACTED_GITHUB_TOKEN]', text_content)
    if text_content != original:
        path.write_text(text_content)
        files_scrubbed += 1

print(f"Scrubbed {files_scrubbed} files")
PY_RED

log "Secret scan and redaction complete."

# 4.1 Verify no obvious secrets remain
if git grep -nE '\"[^\"]*(token|secret|password|api(_|-)?key)[^\"]*\"\s*:\s*\"[^\"]{16,}\"' >/tmp/backup_secret_hits 2>&1; then
  log "ERROR: Potential secrets detected after redaction:"
  cat /tmp/backup_secret_hits
  exit 1
fi
rm -f /tmp/backup_secret_hits

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

  # 5.1 Update main branch with backup commit (optional, can be commented out if you want to keep backups in separate branches)
  log "Merging backup branch into main..."
  git checkout main
  git merge --no-ff "$BRANCH_NAME" -m "Merge backup branch $BRANCH_NAME into main"
  git push origin main
  
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
