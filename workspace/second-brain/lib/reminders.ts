import { AppleReminder } from "@/types";
import { runCommand } from "./run-command";

export const getReminders = (): AppleReminder[] => {
  try {
    const raw = runCommand(`cd ${process.cwd()} && remindctl all --json`);
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? "Untitled"),
      listName: String(item.listName ?? "Reminders"),
      dueDate: typeof item.dueDate === "string" ? item.dueDate : undefined,
      isCompleted: Boolean(item.isCompleted),
      priority: typeof item.priority === "string" ? item.priority : undefined
    }));
  } catch (error) {
    console.error("Failed to load reminders", error);
    return [];
  }
};
