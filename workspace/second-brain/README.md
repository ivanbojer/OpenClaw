# Second Brain Control Room

Next.js 15 + Tailwind dashboard that fuses memories, documents, Apple Reminders, and Apple Notes into a single command center. Built specifically for DJLoky’s workflow.

## Features

- **Memory Timeline** – curated highlights from `/data/memories.ts` with sentiment and follow-ups.
- **Document Shelf** – surfaces workspace docs (`SOUL.md`, `IDENTITY.md`, etc.) plus synced Apple Notes snippets.
- **Task Cockpit** – combines handcrafted tasks (`/data/tasks.ts`) with live Apple Reminders pulled via `remindctl`.
- **Apple Notes Feed** – pulls full content from the default Notes folder using the `memo` CLI.
- **Unified search + filters** – type once to filter memories, docs, tasks, reminders, and notes; toggle hides completed items.

## Requirements

| Dependency | Purpose | Install Hint |
|------------|---------|--------------|
| `remindctl` | Apple Reminders CLI bridge | `brew install steipete/tap/remindctl` |
| `memo` | Apple Notes CLI bridge | `brew tap antoniorodr/memo && brew install antoniorodr/memo/memo` |
| macOS | Needed for Reminders + Notes automation | — |

Both CLIs must have Automation permission to control Reminders and Notes.

### Optional env overrides

- `APPLE_NOTES_FOLDER` – defaults to `Notes`. Set it if you want to sync a different folder.

## Getting Started

```bash
cd second-brain
npm install        # already run, but repeat if you nuke node_modules
npm run dev        # starts Next dev server w/ React Compiler disabled
```

Open <http://localhost:3000> to view the control room. Every render shells out to `remindctl all --json` and `memo notes --folder "$APPLE_NOTES_FOLDER"`, so keep those CLIs fast.

### Linting

```bash
npm run lint
```

The project opts out of the React Compiler by setting `reactCompiler: false` in `next.config.ts` to avoid the interactive prompt.

## Next Steps

1. Replace the static data modules with live parsers for `memory/*.md`, `AGENTS.md`, etc.
2. Add completion toggles for reminders (fire `remindctl complete <id>` from an API route).
3. Persist Apple Notes snapshots and diff changes for review history.
4. Add auth + deployment target once we’re ready to expose this beyond localhost.
