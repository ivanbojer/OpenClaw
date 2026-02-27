import type { AutomationJob } from "@/types";
import { runCommand } from "./run-command";

export type Reminder = {
  id: string;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
  listName: string;
};

export const getReminders = (): Reminder[] => {
  try {
    const raw = runCommand(`cd ${process.cwd()} && remindctl all --json`);
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? "Untitled"),
      listName: String(item.listName ?? "Reminders"),
      dueDate: typeof item.dueDate === "string" ? item.dueDate : undefined,
      isCompleted: Boolean(item.isCompleted)
    }));
  } catch (error) {
    console.error("Mission Control: Reminders fetch failed", error);
    return [];
  }
};

export const buildReminderJob = (reminders: Reminder[]): AutomationJob => ({
  id: "auto-reminder-sync",
  title: "Reminders ingest",
  cadence: "Every 15 min",
  nextRun: "Live",
  status: reminders.length ? "healthy" : "error",
  notes: reminders.length ? `${reminders.filter((r) => !r.isCompleted).length} pending reminders` : "No reminders detected"
});
