import { BrainTask } from "@/types";

export const tasks: BrainTask[] = [
  {
    id: "tasks-second-brain-ui",
    title: "Ship the Next.js second brain dashboard",
    status: "in-progress",
    owner: "DJLoky",
    relatedTo: ["2026-02-19-second-brain"],
    notes: "MVP: memory timeline, document shelf, task cockpit, quick insights."
  },
  {
    id: "tasks-reminder-sync",
    title: "Ingest Apple Reminders due within 48h",
    status: "todo",
    due: "2026-02-21",
    owner: "Automation",
    relatedTo: ["2026-02-19-reminders"],
    notes: "Expose reminders inside the dashboard with completion toggles."
  },
  {
    id: "tasks-notes-ingest",
    title: "Index Apple Notes (recipes + field notes)",
    status: "todo",
    owner: "DJLoky",
    notes: "Use memo CLI export → parse markdown → surface searchable summaries."
  },
  {
    id: "tasks-weekly-retro",
    title: "Draft weekly memory review ritual",
    status: "blocked",
    owner: "Human",
    relatedTo: ["2026-02-19-onboarding"],
    notes: "Need clarity on preferred cadence + format before automating."
  },
  {
    id: "tasks-audio-playlist",
    title: "Tag DJ + guitar practice sets",
    status: "done",
    owner: "Human",
    notes: "Filed in private notion—not yet synced here."
  }
];
