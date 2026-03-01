export type ParsedCommand =
  | { type: "approve"; draftId: string }
  | { type: "revise"; draftId: string; newText: string }
  | { type: "reject"; draftId: string; reason: string }
  | { type: "reject-all"; reason: string };

export function parseCommand(message: string): ParsedCommand | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const rejectAllMatch = /^reject\s+all(?:\s+([\s\S]+))?$/i.exec(trimmed);
  if (rejectAllMatch) {
    return {
      type: "reject-all",
      reason: rejectAllMatch[1]?.trim() || "Bulk rejection"
    };
  }

  const approveMatch = /^approve\s+(\S+)\s*$/i.exec(trimmed);
  if (approveMatch) {
    return { type: "approve", draftId: approveMatch[1] };
  }

  const reviseMatch = /^revise\s+(\S+)\s+([\s\S]+)$/i.exec(trimmed);
  if (reviseMatch) {
    return {
      type: "revise",
      draftId: reviseMatch[1],
      newText: reviseMatch[2].trim()
    };
  }

  const rejectMatch = /^reject\s+(\S+)\s+([\s\S]+)$/i.exec(trimmed);
  if (rejectMatch) {
    return {
      type: "reject",
      draftId: rejectMatch[1],
      reason: rejectMatch[2].trim()
    };
  }

  return null;
}
