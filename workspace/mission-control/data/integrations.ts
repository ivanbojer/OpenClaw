import { Integration } from "@/types";

export const integrations: Integration[] = [
  {
    id: "int-telegram",
    name: "Telegram",
    status: "warn",
    description: "Cron not live yet; awaiting morning brief deployment."
  },
  {
    id: "int-reminders",
    name: "Apple Reminders",
    status: "ok",
    description: "remindctl auth granted."
  },
  {
    id: "int-apple-notes",
    name: "Apple Notes",
    status: "ok",
    description: "memo CLI syncing Notes folder."
  },
  {
    id: "int-discord",
    name: "Discord Bot",
    status: "warn",
    description: "Bot joined server; channels + agents in flight."
  }
];
