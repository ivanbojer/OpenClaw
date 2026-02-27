import { AppleNote } from "@/types";
import { runCommand } from "./run-command";

const DEFAULT_FOLDER = process.env.APPLE_NOTES_FOLDER ?? "Notes";

const parseNoteTitle = (raw: string) => {
  const cleaned = raw.replace(/^Notes\s*-\s*/i, "").trim();
  return cleaned.length ? cleaned : raw.trim();
};

const extractPreview = (content: string) => {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
};

export const getAppleNotes = (): AppleNote[] => {
  try {
    const listOutput = runCommand(
      `cd ${process.cwd()} && memo notes --folder "${DEFAULT_FOLDER}"`
    );

    const noteLines = listOutput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line));

    const notes: AppleNote[] = [];

    for (const line of noteLines) {
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      if (!match) continue;
      const index = Number(match[1]);
      const rawTitle = match[2];
      const title = parseNoteTitle(rawTitle);

      const content = runCommand(
        `cd ${process.cwd()} && memo notes --folder "${DEFAULT_FOLDER}" --view ${index}`
      ).trim();

      notes.push({
        id: `${DEFAULT_FOLDER}-${index}`,
        title,
        folder: DEFAULT_FOLDER,
        content,
        preview: extractPreview(content)
      });
    }

    return notes;
  } catch (error) {
    console.error("Failed to load Apple Notes", error);
    return [];
  }
};
