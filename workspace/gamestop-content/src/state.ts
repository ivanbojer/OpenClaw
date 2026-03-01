import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { HistoryState, DraftState, CursorState, Draft } from "./types.js";

const HISTORY_FILE = "history/news.json";
const DRAFTS_FILE = "state/drafts.json";
const CURSORS_FILE = "state/cursors.json";

const defaultHistory: HistoryState = { seen: [] };
const defaultDrafts: DraftState = { drafts: [] };
const defaultCursors: CursorState = { channels: {} };

function readJson<T>(filePath: string, fallback: T): T {
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function ensureStateDirs(): void {
  mkdirSync("state", { recursive: true });
  mkdirSync("history", { recursive: true });
}

export function loadHistory(): HistoryState {
  return readJson(HISTORY_FILE, defaultHistory);
}

export function saveHistory(state: HistoryState): void {
  writeJson(HISTORY_FILE, state);
}

export function loadDrafts(): DraftState {
  return readJson(DRAFTS_FILE, defaultDrafts);
}

export function saveDrafts(state: DraftState): void {
  writeJson(DRAFTS_FILE, state);
}

export function loadCursors(): CursorState {
  return readJson(CURSORS_FILE, defaultCursors);
}

export function saveCursors(state: CursorState): void {
  writeJson(CURSORS_FILE, state);
}

export function makeStoryKey(externalIdOrUrl: string): string {
  return createHash("sha256").update(externalIdOrUrl).digest("hex").slice(0, 10);
}

export function findDraftById(drafts: Draft[], id: string): Draft | undefined {
  return drafts.find((draft) => draft.id.toLowerCase() === id.toLowerCase());
}
