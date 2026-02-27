import { Memory } from "@/types";

export const memories: Memory[] = [
  {
    id: "2026-02-19-onboarding",
    title: "Identity reboot + style sync",
    date: "2026-02-19T19:05:00-08:00",
    summary:
      "Booted into the DJLoky persona, locked in the ✌️ emoji, and captured the user's vibe (cybersecurity pro, Fallout wanderer, DJ/guitarist).",
    tags: ["onboarding", "identity", "context"],
    importance: 4,
    sentiment: "positive",
    relatedDocs: ["SOUL.md", "IDENTITY.md", "USER.md"],
    followUp: "Make sure future automations respect the user's technical chops + creative outlets."
  },
  {
    id: "2026-02-19-reminders",
    title: "Reminder stack",
    date: "2026-02-19T19:30:00-08:00",
    summary:
      "Queued Apple Reminders for 'It is Friday' (12:00 PM) and 'Have a beer' (5:00 PM) so tomorrow doesn't slip away.",
    tags: ["reminders", "ritual", "wellness"],
    importance: 3,
    sentiment: "positive",
    relatedDocs: ["Reminders.app"],
    followUp: "Surface due reminders automatically in the dashboard."
  },
  {
    id: "2026-02-19-notes",
    title: "Moscow Mule recipe drop",
    date: "2026-02-19T19:40:00-08:00",
    summary:
      "Captured a detailed Moscow Mule recipe in Apple Notes (Notes folder) complete with garnish tips and customization ideas.",
    tags: ["notes", "recipes", "lifestyle"],
    importance: 2,
    sentiment: "positive",
    relatedDocs: ["Apple Notes"],
    followUp: "Tag recipes vs. rituals for faster retrieval."
  },
  {
    id: "2026-02-19-second-brain",
    title: "Second brain blueprint request",
    date: "2026-02-19T19:45:00-08:00",
    summary:
      "User asked for a Next.js-based control room to review memories, documents, and tasks in one place.",
    tags: ["product", "second-brain", "planning"],
    importance: 5,
    sentiment: "action",
    relatedDocs: ["/second-brain"],
    followUp: "Deliver the dashboard and hook data sources next."
  }
];
