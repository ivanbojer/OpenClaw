
* [Task]: A daily backup job is scheduled via cron to run at 4:30 AM PST. It backs up critical agent configuration files (workspace, skills, configs) to the private GitHub repository 'git@github.com:ivanbojer/OpenClaw.git' after redacting secrets. A notification is sent to the #monitoring Discord channel on completion.
* [Directive]: NEVER overwrite `~/.openclaw/openclaw.json`. Only suggest changes or offer to make precise edits.
* [Task]: Morning-brief runs daily at 8:00 AM PST via system cron (`/Users/djloky/.openclaw/workspace/morning-brief/run.sh` → `/tmp/morning-brief.log`).
* [Note]: Existing launchd jobs share the `com.djloky.*` prefix (e.g., missioncontrol, billingdashboard); treat them as previously created automations to preserve.
* [Directive]: Always record new scheduled jobs (cron or launchd) in memory when created.
* [Preference]: Use GPT-5.1 Codex only for coding tasks; keep Gemini 3.1 Pro (or cheaper) for everything else. (Set by Ivke on 2026-02-28)

* [Project]: Built "gamestop-content" Node/TS CLI to draft GME/Ryan Cohen updates, post drafts to Discord, require manual Approve/Revise/Reject, then tweet on approval with monitoring pings. (2026-02-28)

* [Task]: "gamestop-content" runs every 10 minutes via cron (/Users/djloky/.openclaw/workspace/gamestop-content/run.sh). Checks Twitter/Brave, posts drafts to Discord, and processes Approve/Reject commands. (2026-02-28)

* [Task]: To fetch new gamestop content manually: `cd workspace/gamestop-content && npx tsx src/index.ts --fetch`
