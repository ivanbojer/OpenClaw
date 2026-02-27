import { AutomationJob } from "@/types";

export const automationQueue: AutomationJob[] = [
  {
    id: "auto-telegram-am",
    title: "Telegram AM Brief",
    cadence: "Daily 08:00 PT",
    nextRun: "Tomorrow",
    status: "queued",
    notes: "Waiting on collectors to finish"
  },
  {
    id: "auto-reminder-sync",
    title: "Reminders ingest",
    cadence: "Every 15 min",
    nextRun: "Live",
    status: "healthy",
    notes: "Feeding Mission Control + Second Brain"
  }
];
