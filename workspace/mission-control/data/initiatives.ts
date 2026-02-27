import { Initiative } from "@/types";

export const initiatives: Initiative[] = [
  {
    id: "init-morning-brief",
    title: "Morning Intelligence Brief",
    owner: "DJLoky",
    status: "building",
    eta: "Feb 21, 08:00 PT",
    highlights: [
      "Wire collectors for news, VIX, Croatia, and GameStop/Ryan Cohen signals",
      "Auto-ingest Reminders + co-op suggestions",
      "Deliver via Telegram cron"
    ],
    dependencies: ["remindctl", "news feeds", "Telegram bot"]
  },
  {
    id: "init-second-brain",
    title: "Second Brain v1",
    owner: "DJLoky",
    status: "shipping",
    eta: "Live",
    highlights: [
      "Next.js dashboard with Reminders + Apple Notes",
      "Quick filters across memories/docs/tasks",
      "Ready for additional data sources"
    ]
  }
];
