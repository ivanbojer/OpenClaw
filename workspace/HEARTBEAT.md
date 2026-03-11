# HEARTBEAT.md

Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
- Skill discovery on heartbeat:
  - Scan /Users/djloky/.openclaw/workspace/skills for new or updated SKILL.md files.
  - If a new skill is detected (not present in MEMORY.md), append (do not overwritte) a minimal memory entry to MEMORY.md describing the skill path and purpose, and create a daily note in memory/YYYY-MM-DD.md documenting the discovery.
  - If an existing skill is updated (mod time newer), log a brief note in MEMORY.md about the update and prompt for review if needed.
- After memory updates, append a short summary to MEMORY.md with the skill path and timestamp.
- Do not overwrite existing MEMORY.md content; only add new entries.
