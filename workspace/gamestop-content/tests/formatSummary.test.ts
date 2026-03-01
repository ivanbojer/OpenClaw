import { describe, expect, test } from "vitest";
import { formatSummary, buildTweetText } from "../src/formatSummary.js";

describe("formatSummary", () => {
  test("keeps plain style, source mention, and url", () => {
    const url = "https://example.com/story";
    const summary = formatSummary("Bloomberg", "GameStop reports earnings this week", url);

    expect(summary.startsWith("Bloomberg says ")).toBe(true);
    expect(summary.endsWith(url)).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(260);
  });

  test("removes banned hype words", () => {
    const summary = formatSummary(
      "Newsroom",
      "A revolutionary breakthrough for GameStop",
      "https://example.com"
    );

    expect(summary.toLowerCase()).not.toContain("revolutionary");
    expect(summary.toLowerCase()).not.toContain("breakthrough");
  });
});

describe("buildTweetText", () => {
  test("adds hashtags when they fit", () => {
    const out = buildTweetText("Twitter says GameStop rises. https://example.com");
    expect(out).toContain("#GME");
    expect(out).toContain("#GameStop");
    expect(out.length).toBeLessThanOrEqual(280);
  });
});
