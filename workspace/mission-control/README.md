# Mission Control

Custom Next.js dashboard that acts as our internal tool forge—one place to track builds, automations, integrations, and new experiments.

## Features

- **Initiative board** – pulls live signals (Discord auth, Apple Notes count) to reflect true status.
- **Automation queue** – tracks cron/agent jobs (Discord factory, reminder sync) wired to actual dependency checks.
- **Integration health** – pings remindctl, memo, and Discord API each render.
- **Signal board** – shows real reminder counts, Apple Notes inventory, Discord bot heartbeat, and live gold quote via Stooq.
- **Idea backlog** – parking lot for the next tools to greenlight.

## Environment

Create `.env.local` in this folder (already added) with:

```
DISCORD_BOT_TOKEN=...
APPLE_NOTES_FOLDER=Notes  # optional override
```

Reminders + Notes require `remindctl` and `memo` CLIs with Automation permission.

## Local dev

```bash
cd mission-control
npm install          # already done, rerun if node_modules is cleared
npm run dev          # http://localhost:3000 (server components fetch live telemetry)
npm run lint         # ESLint (clean)
```

React Compiler is disabled via `next.config.ts` for non-interactive startup.

## Next steps

1. Persist telemetry snapshots (so we can show deltas, trends, and uptime history).
2. Add action buttons (e.g., trigger Discord agent dry run, toggle reminder sync) via server actions.
3. Surface cron/log output directly inside the Automation panel.
