const MAX_SUMMARY_LENGTH = 260;

const bannedWords = [
  /revolutionary/gi,
  /game[- ]?changer/gi,
  /breakthrough/gi,
  /must[- ]see/gi,
  /groundbreaking/gi,
  /underscore/gi
];

function cleanText(text: string): string {
  let cleaned = text.replace(/\s+/g, " ").trim();
  // Remove @ symbols to prevent "mention" errors on free tier API
  cleaned = cleaned.replace(/@/g, "");
  for (const pattern of bannedWords) {
    cleaned = cleaned.replace(pattern, "");
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

export function formatSummary(source: string, rawText: string, url: string): string {
  const safeSource = cleanText(source) || "A source";
  const safeText = cleanText(rawText)
    .replace(/[!?]{2,}/g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();

  const prefix = `${safeSource} says `;
  const suffix = ` ${url}`;
  const available = MAX_SUMMARY_LENGTH - prefix.length - suffix.length;

  let body = safeText;
  if (body.length > available) {
    body = `${body.slice(0, Math.max(available - 1, 0)).trimEnd()}.`;
  }
  if (!/[.!?]$/.test(body)) {
    body = `${body}.`;
  }

  return `${prefix}${body}${suffix}`.slice(0, MAX_SUMMARY_LENGTH).trim();
}

export function buildTweetText(summary: string): string {
  // Safety: strip @ mentions even if they are already in the summary
  const safeSummary = summary.replace(/@/g, "");

  const tags = ["#GME", "#GameStop", "#RyanCohen"];
  const needsGme = /\bgme\b|gamestop/i.test(safeSummary);
  const needsCohen = /ryan cohen/i.test(safeSummary);

  const candidates: string[] = [];
  if (needsGme) {
    candidates.push(tags[0], tags[1]);
  }
  if (needsCohen) {
    candidates.push(tags[2]);
  }

  const uniqueTags = [...new Set(candidates)].join(" ");
  if (!uniqueTags) {
    return safeSummary;
  }

  const withTags = `${safeSummary} ${uniqueTags}`;
  return withTags.length <= 280 ? withTags : safeSummary;
}
