export type Memory = {
  id: string;
  title: string;
  date: string; // ISO 8601
  summary: string;
  tags: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  sentiment: "positive" | "neutral" | "action";
  relatedDocs?: string[];
  followUp?: string;
};

export type BrainDocument = {
  id: string;
  title: string;
  description: string;
  category: "identity" | "ops" | "notes" | "tasks" | "knowledge";
  updatedAt: string;
  status: "draft" | "active" | "archived";
  link?: string;
};

export type BrainTask = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  due?: string;
  owner: string;
  relatedTo?: string[];
  notes?: string;
};

export type AppleReminder = {
  id: string;
  title: string;
  listName: string;
  dueDate?: string;
  isCompleted: boolean;
  priority?: string;
};

export type AppleNote = {
  id: string;
  title: string;
  folder: string;
  content: string;
  preview: string;
  updatedAt?: string;
};
