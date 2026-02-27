import { runCommand } from "./run-command";

export type AppleNoteSummary = {
  id: string;
  title: string;
  folder: string;
};

const DEFAULT_FOLDER = process.env.APPLE_NOTES_FOLDER ?? "Notes";

export const getAppleNotesSummary = (): AppleNoteSummary[] => {
  try {
    const output = runCommand(
      `cd ${process.cwd()} && memo notes --folder "${DEFAULT_FOLDER}"`
    );
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line));

    return lines.map((line) => {
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      const id = match ? match[1] : line;
      const title = match ? match[2].replace(/^Notes\s*-\s*/i, "").trim() : line;
      return { id: `${DEFAULT_FOLDER}-${id}`, title, folder: DEFAULT_FOLDER };
    });
  } catch (error) {
    console.error("Mission Control: Apple Notes fetch failed", error);
    return [];
  }
};
