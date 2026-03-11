#!/usr/bin/env bash
# set -euo pipefail

WORKSPACE_SKILLS="$HOME/.openclaw/workspace/skills"
MEMORY_FILE="$HOME/.openclaw/workspace/MEMORY.md"

usage() {
  echo "Usage: $0 [--apply]"
  echo "  --apply   Apply changes: append memory entry for discovered skills"
  exit 1
}

APPLY=false
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    *) usage ;;
  esac
done

if [[ ! -d "$WORKSPACE_SKILLS" ]]; then
  echo "Skills directory not found: $WORKSPACE_SKILLS" >&2
  exit 1
fi
if [[ ! -f "$MEMORY_FILE" ]]; then
  echo "Memory file not found: $MEMORY_FILE" >&2
  exit 1
fi

# Discover skill set: each immediate subdir under skills is a skill directory
SKILLS_LIST=()
while IFS= read -r d; do
  if [[ -d "$d" ]]; then
    base="$(basename "$d")"
    if [[ -n "$base" && "$base" != "." && "$base" != ".." ]]; then
      SKILLS_LIST+=("$base")
    fi
  fi
done < <(find "$WORKSPACE_SKILLS" -mindepth 2 -maxdepth 2 -type d -print 2>/dev/null | sort)

# Read remembered skills from MEMORY.md by collecting lines that look like "- path"
REMEMBERED_FILE="$(mktemp)"
grep -E '^-\s+.*' "$MEMORY_FILE" | sed 's/^- //g' > "$REMEMBERED_FILE"

# Build a simple lookup by path
REMEMBERED_LIST=()
while IFS= read -r line; do
  REMEMBERED_LIST+=("$line")
done <"$REMEMBERED_FILE"

# Determine new skills
NEW_SKILLS=()
for s in "${SKILLS_LIST[@]}"; do
  path="skills/$s/SKILL.md"
  found=0
  for r in "${REMEMBERED_LIST[@]}"; do
    if [[ "$r" == "$path" ]]; then
      found=1; break
    fi
  done
  if (( ! found )); then
    NEW_SKILLS+=("$path")
  fi
done

echo "Discovered skills (potential new):"
if (( ${#NEW_SKILLS[@]} )); then
  for p in "${NEW_SKILLS[@]}"; do
    echo "- $p (new)"
  done
else
  echo "No new skills detected."
fi

if $APPLY; then
  echo
  echo "Applying discovery: appending to MEMORY.md..."
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  if (( ${#NEW_SKILLS[@]} )); then
    printf "- [Heartbeat Summary]: New skills discovered at %s -> %s\n" "$TIMESTAMP" "${NEW_SKILLS[*]}" >> "$MEMORY_FILE"
  else
    printf "- [Heartbeat Summary]: Discovery run at %s with no new skills\n" "$TIMESTAMP" >> "$MEMORY_FILE"
  fi
  echo "Updated MEMORY.md."
  echo "Summary appended: ${NEW_SKILLS[*]}"
else
  echo
  echo "Dry-run complete. Run with --apply to persist this discovery in MEMORY.md."
fi

exit 0

