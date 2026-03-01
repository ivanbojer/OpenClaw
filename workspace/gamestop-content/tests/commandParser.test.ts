import { describe, expect, test } from "vitest";
import { parseCommand } from "../src/commandParser.js";

describe("parseCommand", () => {
  test("parses approve", () => {
    expect(parseCommand("Approve abc123")).toEqual({
      type: "approve",
      draftId: "abc123"
    });
  });

  test("parses revise", () => {
    expect(parseCommand("Revise a1b2 New summary text")).toEqual({
      type: "revise",
      draftId: "a1b2",
      newText: "New summary text"
    });
  });

  test("parses reject", () => {
    expect(parseCommand("Reject xyz bad source")).toEqual({
      type: "reject",
      draftId: "xyz",
      reason: "bad source"
    });
  });

  test("parses reject all", () => {
    expect(parseCommand("Reject all too noisy")).toEqual({
      type: "reject-all",
      reason: "too noisy"
    });
  });

  test("parses reject all with default reason", () => {
    expect(parseCommand("Reject all")).toEqual({
      type: "reject-all",
      reason: "Bulk rejection"
    });
  });

  test("returns null for unknown command", () => {
    expect(parseCommand("hello there")).toBeNull();
  });
});
