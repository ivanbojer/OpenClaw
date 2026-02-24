"use client";

import { useMemo, useState } from "react";
import type {
  AppleNote,
  AppleReminder,
  BrainDocument,
  BrainTask,
  Memory
} from "@/types";

const taskStatusStyles: Record<BrainTask["status"], string> = {
  todo: "bg-slate-800/60 text-slate-200 border border-slate-700",
  "in-progress": "bg-amber-500/20 text-amber-200 border border-amber-400/40",
  blocked: "bg-rose-500/20 text-rose-100 border border-rose-400/50",
  done: "bg-emerald-500/15 text-emerald-100 border border-emerald-400/30"
};

const sentimentMap = {
  positive: "text-emerald-300",
  neutral: "text-slate-300",
  action: "text-amber-300"
};

export type DashboardProps = {
  memories: Memory[];
  documents: BrainDocument[];
  tasks: BrainTask[];
  reminders: AppleReminder[];
  notes: AppleNote[];
};

export const Dashboard = ({
  memories,
  documents,
  tasks,
  reminders,
  notes
}: DashboardProps) => {
  const [search, setSearch] = useState("");
  const [showOnlyOpenTasks, setShowOnlyOpenTasks] = useState(true);

  const filteredMemories = useMemo(() => {
    if (!search) return memories;
    const term = search.toLowerCase();
    return memories.filter((memory) => {
      return (
        memory.title.toLowerCase().includes(term) ||
        memory.summary.toLowerCase().includes(term) ||
        memory.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }, [memories, search]);

  const filteredDocuments = useMemo(() => {
    if (!search) return documents;
    const term = search.toLowerCase();
    return documents.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(term) ||
        doc.description.toLowerCase().includes(term)
      );
    });
  }, [documents, search]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = search
        ? task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.notes?.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus = showOnlyOpenTasks ? task.status !== "done" : true;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, showOnlyOpenTasks]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      const matchesSearch = search
        ? reminder.title.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesStatus = showOnlyOpenTasks ? !reminder.isCompleted : true;
      return matchesSearch && matchesStatus;
    });
  }, [reminders, search, showOnlyOpenTasks]);

  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const term = search.toLowerCase();
    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term)
      );
    });
  }, [notes, search]);

  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "done").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const activeDocs = documents.filter((doc) => doc.status === "active").length;
    const urgentMemories = memories.filter(
      (memory) => memory.sentiment === "action"
    ).length;
    const dueReminders = reminders.filter((reminder) => !reminder.isCompleted).length;
    const noteCount = notes.length;

    return {
      totalMemories: memories.length,
      openTasks,
      activeDocs,
      blocked,
      urgentMemories,
      dueReminders,
      noteCount
    };
  }, [tasks, documents, memories, reminders, notes]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                DJLoky · Second Brain Control Room
              </p>
              <h1 className="text-4xl font-semibold text-white md:text-5xl">
                Memory, docs & tasks in one skyline.
              </h1>
            </div>
            <div className="rounded-full border border-slate-800 px-4 py-2 text-sm text-slate-300">
              {new Date().toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </div>
          <p className="text-base text-slate-300 md:text-lg">
            Live snapshot of what we know, what we wrote down, and what still
            needs hands on it. Filter anything in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Quick search memories, docs, tasks..."
              className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={() => setShowOnlyOpenTasks((prev) => !prev)}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 hover:border-emerald-400"
            >
              {showOnlyOpenTasks ? "Showing open items" : "Showing everything"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Memories indexed"
            value={stats.totalMemories}
            footnote="Need weekly review ritual"
          />
          <StatCard
            label="Active documents"
            value={stats.activeDocs}
            footnote={`+${stats.noteCount} Apple Notes`}
          />
          <StatCard
            label="Open tasks"
            value={stats.openTasks}
            footnote={`${stats.blocked} blocked`}
            highlight
          />
          <StatCard
            label="Reminders pending"
            value={stats.dueReminders}
            footnote="From Apple Reminders"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-900 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 shadow-xl shadow-slate-950/40">
            <SectionHeader
              title="Memory timeline"
              subtitle="Recent moments + why they matter"
            />
            <div className="mt-4 space-y-5">
              {filteredMemories.map((memory) => (
                <article
                  key={memory.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                    <span>{new Date(memory.date).toLocaleString()}</span>
                    <span
                      className={`${sentimentMap[memory.sentiment]} text-xs uppercase tracking-wide`}
                    >
                      {memory.sentiment}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {memory.title}
                  </h3>
                  <p className="mt-1 text-slate-300">{memory.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-wide text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {memory.followUp && (
                    <p className="mt-3 text-sm text-amber-200">
                      ↳ Next: {memory.followUp}
                    </p>
                  )}
                </article>
              ))}
              {filteredMemories.length === 0 && (
                <p className="text-sm text-slate-500">
                  No memories match that search query.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-900 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 shadow-xl shadow-slate-950/40">
              <SectionHeader title="Document shelf" subtitle="Source files + living docs" />
              <div className="mt-4 space-y-4">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          {doc.category}
                        </p>
                        <h3 className="text-lg font-semibold text-white">
                          {doc.title}
                        </h3>
                      </div>
                      <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
                        {doc.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {doc.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Updated {new Date(doc.updatedAt).toLocaleString()}
                    </p>
                    {doc.link && (
                      <a
                        href={doc.link}
                        className="mt-3 inline-flex text-sm font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        Open source ↗
                      </a>
                    )}
                  </div>
                ))}
                {filteredDocuments.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No documents found for that search.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-900 bg-gradient-to-b from-emerald-900/40 to-slate-950 p-6 shadow-xl shadow-slate-950/40">
              <SectionHeader
                title="Task cockpit"
                subtitle="Tasks + live Apple Reminders"
              />
              <div className="mt-4 space-y-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl px-4 py-3 text-sm ${taskStatusStyles[task.status]}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{task.title}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-300">
                        {task.owner}
                      </span>
                    </div>
                    {task.notes && (
                      <p className="mt-1 text-slate-200/80">{task.notes}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span>Status: {task.status}</span>
                      {task.due && <span>Due {task.due}</span>}
                      {task.relatedTo && task.relatedTo.length > 0 && (
                        <span>Linked: {task.relatedTo.join(", ")}</span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <p className="text-sm text-slate-300">
                    No tasks match that filter.
                  </p>
                )}
              </div>
              <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-900/10 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  Apple Reminders
                </p>
                <div className="mt-3 space-y-3">
                  {filteredReminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-xl bg-slate-900/70 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{reminder.title}</p>
                        <span className="text-xs text-slate-400">
                          {reminder.listName}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        <span>
                          {reminder.isCompleted ? "Completed" : "Pending"}
                        </span>
                        {reminder.dueDate && (
                          <span className="ml-2">
                            Due {new Date(reminder.dueDate).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredReminders.length === 0 && (
                    <p className="text-xs text-slate-400">
                      Nothing urgent from Reminders right now.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-900 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 shadow-xl shadow-slate-950/40">
          <SectionHeader
            title="Apple Notes feed"
            subtitle="Full-text snippets synced from Notes.app"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {filteredNotes.map((note) => (
              <article key={note.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{note.folder}</span>
                  <span>Synced now</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">{note.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                  {note.content}
                </p>
              </article>
            ))}
            {filteredNotes.length === 0 && (
              <p className="text-sm text-slate-500">No Apple Notes match that search.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  footnote,
  highlight
}: {
  label: string;
  value: number;
  footnote?: string;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-3xl border px-5 py-6 shadow-lg ${
      highlight
        ? "border-emerald-500/40 bg-gradient-to-b from-emerald-900/40 to-slate-950"
        : "border-slate-900 bg-gradient-to-b from-slate-900/60 to-slate-950"
    }`}
  >
    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
    <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
    {footnote && <p className="mt-1 text-xs text-slate-400">{footnote}</p>}
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="space-y-1">
    <h2 className="text-2xl font-semibold text-white">{title}</h2>
    <p className="text-sm text-slate-400">{subtitle}</p>
  </div>
);

export default Dashboard;
