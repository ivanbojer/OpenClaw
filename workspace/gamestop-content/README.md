# Gamestop Content Bot

A specialized CLI tool that monitors Twitter and Brave Search for GameStop (GME) and Ryan Cohen news, drafts human-readable summaries, and manages a human-in-the-loop publishing workflow via Discord.

## 🚀 Quick Start

### 1. Fetch New Content (Manual Only)
To save API costs, the bot **does not** fetch new stories automatically. You must trigger a fetch manually when you want to ingest new news.

```bash
cd ~/.openclaw/workspace/gamestop-content
npx tsx src/index.ts --fetch
```

### 2. Process Commands (Automatic)
A cron job runs every 10 minutes to process your Discord commands and post approved tweets. You don't need to do anything here unless you want to force an immediate check:

```bash
# Force immediate processing of approvals/rejections (no fetching)
cd ~/.openclaw/workspace/gamestop-content
npx tsx src/index.ts
```

---

## 🎮 Discord Workflow

Go to the **`#gamestop-news-twitter`** channel in your Discord. The bot posts drafts there.

### Commands
Reply to the bot or type in the channel:

| Command | Description |
| :--- | :--- |
| **`Approve <id>`** | Immediately posts the draft to Twitter and marks it as posted. <br>_Example: `Approve 4c3b1ffa60`_ |
| **`Revise <id> <text>`** | Updates the draft summary with your new text. Keeps it pending for approval. <br>_Example: `Revise 4c3b1ffa60 New summary here.`_ |
| **`Reject <id> <reason>`** | Discards a specific draft. <br>_Example: `Reject 4c3b1ffa60 Duplicate`_ |
| **`Reject all <reason>`** | **Bulk Action:** Rejects ALL currently pending drafts. Useful for clearing the queue. <br>_Example: `Reject all Old news`_ |

---

## ⚙️ Configuration & status

- **Logs:** `/tmp/gamestop-content.log` (rotating log of cron runs)
- **State:** `state/drafts.json` (tracks what is pending/posted/rejected)
- **History:** `history/news.json` (deduplication database)
- **Env:** Credentials loaded from `~/.openclaw/.env`.

### Monitoring
The bot sends a status report to your **`#monitoring`** channel after every run:
- `✅ gamestop-content run ...` means healthy.
- `❌ gamestop-content run ...` means an error occurred (check logs).

### Troubleshooting
If a tweet fails (e.g. 403 Forbidden), check:
1. **Twitter Permissions:** Ensure your App credentials in the Developer Portal are "Read and Write".
2. **Mentions:** The bot automatically strips `@` symbols to prevent "unauthorized mention" errors on the Free tier.
3. **Logs:** Run `cat logs/latest.log` for detailed error traces.
