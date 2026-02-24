import type { Idea, Initiative, Integration, Signal, InitiativeStatus } from "@/types";
import { getReminders, buildReminderJob } from "./reminders";
import { getAppleNotesSummary } from "./apple-notes";
import { getGoldQuote } from "./market";
import { getDiscordStatus } from "./discord";
import { runCommand } from "./run-command";

const getMorningBriefStatus = (): { active: boolean; status: InitiativeStatus; notes: string } => {
  try {
    const output = runCommand(
      "launchctl list | grep com.djloky.morningbrief || true"
    ).trim();
    const active = output.includes("com.djloky.morningbrief");
    return {
      active,
      status: active ? "shipping" : "blocked",
      notes: active
        ? "LaunchAgent com.djloky.morningbrief loaded"
        : "LaunchAgent missing — run launchctl bootstrap"
    };
  } catch (error) {
    return {
      active: false,
      status: "blocked" as const,
      notes: (error as Error).message
    };
  }
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

  const initiatives: Initiative[] = [
    {
      id: "init-morning-brief",
      title: "Telegram Morning Brief",
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
      title: "Telegram Morning Brief",
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

  return { initiatives, automationQueue, integrations, signals, ideas };
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
