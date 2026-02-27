
* [Task]: A daily backup job is scheduled via cron to run at 4:30 AM PST. It backs up critical agent configuration files (workspace, skills, configs) to the private GitHub repository 'git@github.com:ivanbojer/OpenClaw.git' after redacting secrets. A notification is sent to the #monitoring Discord channel on completion.
* [Directive]: NEVER overwrite `~/.openclaw/openclaw.json`. Only suggest changes or offer to make precise edits.
* [Task]: Morning-brief runs daily at 8:00 AM PST via system cron (`/Users/djloky/.openclaw/workspace/morning-brief/run.sh` → `/tmp/morning-brief.log`).
* [Note]: Existing launchd jobs share the `com.djloky.*` prefix (e.g., missioncontrol, billingdashboard); treat them as previously created automations to preserve.
* [Directive]: Always record new scheduled jobs (cron or launchd) in memory when created.