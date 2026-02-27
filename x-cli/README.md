# x-cli

Lightweight command-line helper for searching and posting on X (Twitter) from this workspace. It uses the existing credentials defined in `~/.openclaw/.env` (TWITTER_* vars) and supports two subcommands:

## Setup

```bash
cd ~/workspace/x-cli
npm install  # already done, but run again after pulling updates
```

Ensure the following env vars are available (they already live in `~/.openclaw/.env`):
- `TWITTER_CONSUMER_KEY`
- `TWITTER_CONSUMER_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `TWITTER_BEARER_TOKEN` (optional but recommended for richer search)

## Usage

### Search

```bash
node index.mjs search "falcon launch" --limit 5
node index.mjs search "AI gaming" --from ivanbojer --limit 20
```
This prints each hit with handle, timestamp, metrics, and a direct link.

### Post

```bash
node index.mjs tweet "Shipping a new automation pipeline today."
node index.mjs tweet "Replying to this thread" --reply 1234567890123456789
node index.mjs tweet "Preview only" --dry-run
```

### Notes
- The CLI will exit with a helpful error message if any required credential is missing.
- All network calls go through `twitter-api-v2` so rate limits and elevated access tiers apply.
- Extendable: add more commands (DMs, user lookups, scheduling) in `index.mjs` using the same client helpers.
