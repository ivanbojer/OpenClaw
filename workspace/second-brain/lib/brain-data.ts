import { memories } from "@/data/memories";
import { documents } from "@/data/documents";
import { tasks } from "@/data/tasks";
import { getReminders } from "./reminders";
import { getAppleNotes } from "./apple-notes";
import type {
  AppleNote,
  AppleReminder,
  BrainDocument,
  BrainTask,
  Memory
} from "@/types";

export type SecondBrainData = {
  memories: Memory[];
  documents: BrainDocument[];
  tasks: BrainTask[];
  reminders: AppleReminder[];
  notes: AppleNote[];
};

const mapReminderToTask = (reminder: AppleReminder): BrainTask => ({
  id: `reminder-${reminder.id}`,
  title: reminder.title,
  status: reminder.isCompleted ? "done" : "todo",
  due: reminder.dueDate,
  owner: reminder.listName,
  notes: reminder.priority && reminder.priority !== "none" ? `Priority: ${reminder.priority}` : undefined
});

const mapNoteToDocument = (note: AppleNote): BrainDocument => ({
  id: `apple-note-${note.id}`,
  title: note.title,
  description: note.preview,
  category: "knowledge",
  updatedAt: new Date().toISOString(),
  status: "active"
});

export const getSecondBrainData = (): SecondBrainData => {
  const reminders = getReminders();
  const notes = getAppleNotes();

  const reminderTasks = reminders.map(mapReminderToTask);
  const noteDocuments = notes.map(mapNoteToDocument);

  return {
    memories,
    documents: [...documents, ...noteDocuments],
    tasks: [...tasks, ...reminderTasks],
    reminders,
    notes
  };
};
