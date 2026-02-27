import type {
  Idea,
  Initiative,
  Integration,
  Signal,
  InitiativeStatus,
  OpsConsole,
  OpsConsoleLaunchdJob,
  HealthStatus
} from "@/types";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { getReminders, buildReminderJob } from "./reminders";
import { getAppleNotesSummary } from "./apple-notes";
import { getGoldQuote } from "./market";
import { getDiscordStatus } from "./discord";
import { runCommand } from "./run-command";

const MORNING_BRIEF_CRON_TARGET = "/Users/djloky/.openclaw/workspace/morning-brief/run.sh";
const OPS_ALERT_STATE_FILE = "/tmp/ops-console-alert.json";
const DISCORD_SCRIPT = "/Users/djloky/.openclaw/workspace/send_discord_notification.sh";

const safeCommand = (cmd: string) => {
  try {
    return runCommand(cmd).trim();
  } catch (error) {
    return (error as Error).message;
  }
};

const readLogTail = (path: string) =>
  safeCommand(`[ -f ${path} ] && tail -n 40 ${path} || echo "No log available"`);

const logHasIssue = (log: string) => /error|failed|exception|traceback/i.test(log);

const escapeForSingleQuotes = (value: string) => value.replace(/'/g, `'"'"'`);

const sendDiscordAlert = (message: string) => {
  if (!existsSync(DISCORD_SCRIPT)) {
    return;
  }

  try {
    runCommand(`${DISCORD_SCRIPT} '${escapeForSingleQuotes(message)}'`);
  } catch (error) {
    console.error("Mission Control: failed to send Discord alert", error);
  }
};

const readLastAlertSignature = () => {
  try {
    if (!existsSync(OPS_ALERT_STATE_FILE)) {
      return "";
    }
    const data = JSON.parse(readFileSync(OPS_ALERT_STATE_FILE, "utf-8"));
    return typeof data.signature === "string" ? data.signature : "";
  } catch (error) {
    console.error("Mission Control: unable to read ops alert state", error);
    return "";
  }
};

const writeAlertSignature = (signature: string) => {
  try {
    writeFileSync(OPS_ALERT_STATE_FILE, JSON.stringify({ signature }), "utf-8");
  } catch (error) {
    console.error("Mission Control: unable to write ops alert state", error);
  }
};

const maybeSendOpsAlerts = (alerts: string[]) => {
  const signature = alerts.join(" | ");
  if (!alerts.length) {
    if (readLastAlertSignature()) {
      writeAlertSignature("");
    }
    return;
  }

  const previous = readLastAlertSignature();
  if (previous === signature) {
    return;
  }

  sendDiscordAlert(`⚠️ Ops Console: ${alerts.join(" | ")}`);
  writeAlertSignature(signature);
};

const normalizeCronLines = (output: string) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      Boolean(line) &&
      !line.startsWith("#") &&
      !line.startsWith("SHELL=") &&
      !line.startsWith("PATH=") &&
      !line.startsWith("MAILTO=")
    );

const assessCronHealth = (output: string) => {
  const lines = normalizeCronLines(output);
  const displayLines = lines.length
    ? lines
    : output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

  let status: HealthStatus = "healthy";
  let summary = `${lines.length} scheduled entr${lines.length === 1 ? "y" : "ies"}`;

  if (!output || /no crontab/i.test(output)) {
    status = "error";
    summary = "crontab missing";
  } else if (!lines.length) {
    status = "warn";
    summary = "no runnable cron entries";
  } else if (!lines.some((line) => line.includes(MORNING_BRIEF_CRON_TARGET))) {
    status = "warn";
    summary = "morning-brief job missing";
  }

  if (/command not found|error/i.test(output)) {
    status = "error";
    summary = "crontab command failed";
  }

  return { lines: displayLines, status, summary };
};

const parseLaunchdOutput = (output: string) => {
  const rows = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const jobs: OpsConsoleLaunchdJob[] = rows.map((raw) => {
    const match = raw.match(/^(\S+)\s+(\S+)\s+(.+)$/);
    const pidRaw = match ? match[1] : "-";
    const statusRaw = match ? match[2] : "";
    const label = match ? match[3] : raw;
    const pid = pidRaw === "-" ? null : Number(pidRaw) || null;
    const statusCode = statusRaw ? Number(statusRaw) || null : null;

    let state: "running" | "idle" | "error" = "running";
    if (!pid) {
      state = statusCode && statusCode > 0 ? "error" : "idle";
    } else if (statusCode && statusCode > 0) {
      state = "error";
    }

    return {
      raw,
      label,
      pid,
      statusCode,
      state
    } satisfies OpsConsoleLaunchdJob;
  });

  if (!jobs.length && output && /error|command not found/i.test(output)) {
    jobs.push({
      raw: output,
      label: "launchctl",
      pid: null,
      statusCode: null,
      state: "error"
    });
  }

  if (!jobs.length) {
    jobs.push({
      raw: "No com.djloky jobs listed",
      label: "com.djloky",
      pid: null,
      statusCode: null,
      state: "error"
    });
  }

  const counts = jobs.reduce(
    (acc, job) => {
      acc[job.state] += 1;
      return acc;
    },
    { running: 0, idle: 0, error: 0 }
  );

  let status: HealthStatus = "healthy";
  if (counts.error > 0) status = "error";
  else if (counts.idle > 0) status = "warn";

  const summaryParts = [];
  if (counts.running) summaryParts.push(`${counts.running} running`);
  if (counts.idle) summaryParts.push(`${counts.idle} idle`);
  if (counts.error) summaryParts.push(`${counts.error} error`);

  const summary = summaryParts.length ? summaryParts.join(" • ") : "No launchd telemetry";

  return {
    jobs,
    status,
    summary
  };
};

const getMorningBriefStatus = (): { active: boolean; status: InitiativeStatus; notes: string } => {
  try {
    const output = runCommand("crontab -l || true");
    const active = output
      .split("\n")
      .some((line) => line.includes(MORNING_BRIEF_CRON_TARGET));
    return {
      active,
      status: active ? "shipping" : "blocked",
      notes: active
        ? "Cron entry found for morning-brief (08:00 PT)."
        : "Cron entry missing — add morning-brief to crontab."
    };
  } catch (error) {
    return {
      active: false,
      status: "blocked" as const,
      notes: (error as Error).message
    };
  }
};

const collectOpsAlerts = (opsConsole: OpsConsole) => {
  const alerts: string[] = [];

  if (opsConsole.cron.status !== "healthy") {
    alerts.push(`[Cron] ${opsConsole.cron.summary}`);
  }

  if (opsConsole.launchd.status !== "healthy") {
    alerts.push(`[Launchd] ${opsConsole.launchd.summary}`);
  }

  if (opsConsole.logs.issues.morningBrief) {
    alerts.push("Morning Brief log contains errors");
  }

  if (opsConsole.logs.issues.backup) {
    alerts.push("Backup log contains errors");
  }

  return alerts;
};

export const getMissionControlTelemetry = async () => {
  const reminders = getReminders();
  const reminderJob = buildReminderJob(reminders);
  const notes = getAppleNotesSummary();
  const gold = getGoldQuote();
  const discord = await getDiscordStatus();
  const morningBrief = getMorningBriefStatus();
  const telegramConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );

  const cronOutput = safeCommand("crontab -l || true");
  const launchOutput = safeCommand("launchctl list | grep com.djloky || true");
  const cron = assessCronHealth(cronOutput);
  const launchd = parseLaunchdOutput(launchOutput);
  const morningBriefLog = readLogTail("/tmp/morning-brief.log");
  const backupLog = readLogTail("/tmp/backup.log");
  const logs = {
    morningBrief: morningBriefLog,
    backup: backupLog,
    issues: {
      morningBrief: logHasIssue(morningBriefLog),
      backup: logHasIssue(backupLog)
    }
  };

  const opsConsole: OpsConsole = {
    cron,
    launchd,
    logs
  };

  const initiatives: Initiative[] = [
    {
      id: "init-morning-brief",
      title: "Morning Brief",
      owner: "DJLoky",
      status: morningBrief.status,
      eta: "Daily · 08:00 PT",
      highlights: [
        morningBrief.notes,
        telegramConfigured
          ? `Telegram chat ${process.env.TELEGRAM_CHAT_ID}`
          : "Telegram env vars missing",
        process.env.OPENCLAW_BRAVE_API_KEY
          ? "Brave API key present"
          : "Missing Brave API key"
      ]
    },
    {
      id: "init-mission-control",
      title: "Mission Control Ops",
      owner: "DJLoky",
      status: "shipping",
      eta: "Live",
      highlights: [
        "Telemetry wired to Reminders/Notes/Discord",
        "Live gold quote feed",
        `${notes.length} notes synced`
      ]
    }
  ];

  const automationQueue = [
    {
      id: "auto-morning-brief",
      title: "Morning Brief",
      cadence: "08:00 PT daily",
      nextRun: morningBrief.active ? "08:00 PT" : "Requires bootstrap",
      status: morningBrief.active ? "healthy" : "error",
      notes: morningBrief.notes
    },
    reminderJob
  ];

  const integrations: Integration[] = [
    {
      id: "int-telegram",
      name: "Telegram",
      status: telegramConfigured ? "ok" : "warn",
      description: telegramConfigured
        ? `chat ${process.env.TELEGRAM_CHAT_ID}`
        : "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID"
    },
    {
      id: "int-reminders",
      name: "Apple Reminders",
      status: reminders.length ? "ok" : "warn",
      description: reminders.length
        ? `${reminders.filter((r) => !r.isCompleted).length} open items`
        : "remindctl returned empty"
    },
    {
      id: "int-apple-notes",
      name: "Apple Notes",
      status: notes.length ? "ok" : "warn",
      description: notes.length
        ? `${notes.length} notes in ${notes[0]?.folder ?? "Notes"}`
        : "memo CLI returned empty"
    },
    {
      id: "int-discord",
      name: "Discord Bot",
      status: discord.ok ? "ok" : "warn",
      description: discord.ok
        ? `Authenticated as ${discord.username}`
        : discord.error ?? "Unknown error"
    }
  ];

  const signals: Signal[] = [
    remindersSignal(reminders),
    notesSignal(notes.length),
    goldSignal(gold),
    discordSignal(discord),
    telegramSignal(morningBrief, telegramConfigured)
  ];

  const ideas: Idea[] = [
    {
      id: "idea-ops-console",
      title: "Ops Console Embed",
      impact: "quick win",
      pitch: "Stream launchd + cron logs directly inside Mission Control."
    }
  ];

  const opsAlerts = collectOpsAlerts(opsConsole);
  maybeSendOpsAlerts(opsAlerts);

  return { initiatives, automationQueue, integrations, signals, ideas, opsConsole };
};

const remindersSignal = (reminders: ReturnType<typeof getReminders>): Signal => {
  const pending = reminders.filter((r) => !r.isCompleted);
  return {
    id: "sig-reminders",
    label: "Apple Reminders",
    value: `${pending.length} open`,
    trend: pending.length ? "up" : "flat",
    detail:
      pending
        .slice(0, 2)
        .map((r) => r.title)
        .join(" · ") || "Inbox zero"
  };
};

const notesSignal = (count: number): Signal => ({
  id: "sig-notes",
  label: "Apple Notes",
  value: `${count}`,
  trend: count ? "up" : "flat",
  detail: count ? "Synced to Mission Control" : "No notes found"
});

const goldSignal = (quote?: ReturnType<typeof getGoldQuote>): Signal => ({
  id: "sig-gold",
  label: "Gold",
  value: quote ? `$${quote.close?.toFixed(2)}` : "N/A",
  trend: quote ? (quote.close >= quote.open ? "up" : "down") : "flat",
  detail: quote
    ? `High ${quote.high?.toFixed(1)} / Low ${quote.low?.toFixed(1)}`
    : "Quote feed offline"
});

const discordSignal = (
  discord: Awaited<ReturnType<typeof getDiscordStatus>>
): Signal => ({
  id: "sig-discord",
  label: "Discord Bot",
  value: discord.ok ? "Online" : "Offline",
  trend: discord.ok ? "up" : "down",
  detail: discord.ok ? `Logged in as ${discord.username}` : discord.error ?? ""
});

const telegramSignal = (
  morningBrief: ReturnType<typeof getMorningBriefStatus>,
  telegramConfigured: boolean
): Signal => ({
  id: "sig-telegram",
  label: "Telegram Brief",
  value: telegramConfigured ? "Configured" : "Missing env",
  trend: morningBrief.active ? "up" : "down",
  detail: morningBrief.notes
});
