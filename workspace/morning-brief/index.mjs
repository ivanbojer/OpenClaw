#!/usr/bin/env node

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";

const BRAVE_API_KEY = [REDACTED]
const TELEGRAM_BOT_TOKEN = [REDACTED]
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "@MyNewsChannelWithGru";
const DISCORD_BOT_TOKEN = [REDACTED]
const DISCORD_NEWS_CHANNEL_ID = process.env.DISCORD_NEWS_CHANNEL_ID || "1474262106386731144";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_MONITORING_CHANNEL_ID = process.env.DISCORD_MONITORING_CHANNEL_ID || "1474872383579099257";
const TIMEZONE = "America/Los_Angeles";
const TELEGRAM_CHUNK_LIMIT = 3500; // keep margin under Telegram's 4096 limit
const DISCORD_CHUNK_LIMIT = 1800;
const HISTORY_FILE = new URL("./news-history.json", import.meta.url);
const HISTORY_MAX_PER_TOPIC = 200;

if (!BRAVE_API_KEY) {
  console.error("Missing OPENCLAW_BRAVE_API_KEY in environment.");
  process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN in environment.");
  process.exit(1);
}

const topics = [
  { key: "ai", label: "AI & Frontier Tech", query: "artificial intelligence breakthroughs 2026", limit: 3 },
  { key: "market", label: "Market Sentiment", query: "stock market sentiment VIX today", limit: 2 },
  { key: "croatia", label: "Croatia", query: "Croatia news", limit: 2 },
  { key: "world", label: "Global Pulse", query: "most important world news now", limit: 3 },
  { key: "gamestop", label: "GameStop Watch", query: "GameStop company news Ryan Cohen", limit: 2 }
];

const specialChannels = {
  ideas: "morning-content-ideas",
  tasks: "morning-todays-tasks",
  assistant: "morning-what-to-knock"
};

const MORNING_NEWS_CHANNEL_NAME = "morning-news";

const ensureHistoryFile = async () => {
  try {
    await fs.access(HISTORY_FILE);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(HISTORY_FILE, "{}\n", "utf8");
      console.warn("Initialized missing news history file.");
    } else {
      throw error;
    }
  }
};

const loadHistory = async () => {
  try {
    await ensureHistoryFile();
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    console.warn("News history file was not an object. Starting with empty history.");
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn("News history file was corrupt. Resetting history.");
    } else if (error.code !== "ENOENT") {
      console.warn("Failed to load news history. Resetting history:", error.message);
    }
  }
  await fs.writeFile(HISTORY_FILE, "{}\n", "utf8");
  return {};
};

const saveHistory = async (history) => {
  const json = JSON.stringify(history, null, 2);
  await fs.writeFile(HISTORY_FILE, `${json}\n`, "utf8");
};

const getArticleIdentifier = (article) => article?.url?.trim() || article?.title?.trim() || null;

const updateHistory = async (history, newsByTopic) => {
  let dirty = false;
  for (const topic of newsByTopic) {
    const reportedIds = topic.reportedIds || [];
    if (!reportedIds.length) {
      continue;
    }
    const existing = Array.isArray(history[topic.key]) ? [...history[topic.key]] : [];
    let changed = false;
    for (const id of reportedIds) {
      if (!id || existing.includes(id)) {
        continue;
      }
      existing.push(id);
      changed = true;
    }
    if (changed) {
      if (existing.length > HISTORY_MAX_PER_TOPIC) {
        const excess = existing.length - HISTORY_MAX_PER_TOPIC;
        existing.splice(0, excess);
      }
      history[topic.key] = existing;
      dirty = true;
    }
  }
  if (dirty) {
    await saveHistory(history);
    console.log("Updated news history file.");
  } else {
    console.log("No news history updates needed today.");
  }
};

const fetchNews = async (query, limit = 3) => {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/news/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
        "User-Agent": "morning-brief/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API error (${response.status})`);
    }

    const data = await response.json();
    return (data.results || [])
      .slice(0, limit)
      .map((item) => ({
        title: item.title?.trim() ?? "Untitled",
        url: item.url,
        description: item.description?.trim() ?? "",
        source: item.meta_url?.hostname?.replace(/^www\./, "") ?? "",
        age: item.page_age ?? item.age ?? ""
      }));
  } catch (error) {
    console.error(`Failed to fetch news for query '${query}':`, error.message);
    return [];
  }
};

const formatNewsSections = (newsByTopic) => {
  const lines = ["🗞️ News Radar"];
  for (const topic of newsByTopic) {
    const { label, articles, duplicatesExhausted } = topic;
    lines.push(`\n*${label}*`);
    if (!articles.length) {
      if (duplicatesExhausted) {
        lines.push("- No fresh stories (already covered).");
      } else {
        lines.push("- No fresh stories (API returned empty).");
      }
      continue;
    }
    for (const article of articles) {
      const summary = article.description.length > 220
        ? `${article.description.slice(0, 217)}...`
        : article.description;
      const source = article.source ? ` — ${article.source}` : "";
      lines.push(`- [${article.title}](${article.url})${source}`);
      if (summary) {
        lines.push(`  _${summary}_`);
      }
    }
  }
  return lines.join("\n");
};

const formatNewsForDiscord = (topic) => {
  const lines = [`__**${topic.label}**__`];
  if (!topic.articles.length) {
    if (topic.duplicatesExhausted) {
      lines.push("• No fresh stories (already covered).");
    } else {
      lines.push("• No fresh stories (API returned empty).");
    }
    return lines.join("\n");
  }
  for (const article of topic.articles) {
    const source = article.source ? ` (${article.source})` : "";
    lines.push(`• ${article.title}${source}\n  ${article.url}`);
  }
  return lines.join("\n");
};

const getRemindersDueToday = () => {
  try {
    const raw = execSync("remindctl all --json", { encoding: "utf-8" });
    const reminders = JSON.parse(raw);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    return reminders
      .filter((item) => {
        if (!item.dueDate) return false;
        const due = new Date(item.dueDate);
        return due >= todayStart && due <= todayEnd;
      })
      .map((item) => ({
        title: item.title,
        dueLocal: new Date(item.dueDate).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: TIMEZONE
        })
      }));
  } catch (error) {
    console.error("Failed to read reminders:", error.message);
    return [];
  }
};

const formatReminders = (reminders) => {
  if (!reminders.length) {
    return "✅ *Today's Tasks*\n- No reminders due today. Add something to Reminders and I'll surface it here.";
  }
  const lines = ["✅ *Today's Tasks*\n"];
  for (const reminder of reminders) {
    lines.push(`- ${reminder.title} (${reminder.dueLocal} PT)`);
  }
  return lines.join("\n");
};

const formatRemindersDiscord = (reminders) => {
  if (!reminders.length) {
    return "**Today's Tasks**\n• No reminders due today.";
  }
  const lines = ["**Today's Tasks**"];
  for (const reminder of reminders) {
    lines.push(`• ${reminder.title} (${reminder.dueLocal} PT)`);
  }
  return lines.join("\n");
};

const createContentIdeas = (newsByTopic) => {
  const ideas = [];
  const aiStory = newsByTopic.find((t) => t.key === "ai")?.articles?.[0];
  if (aiStory) {
    ideas.push({
      title: `Script: "AI Washing" Layoffs Explainer`,
      script: `Hook: "Some companies are blaming every layoff on AI. Here's what that actually means."\nScene 1: Summarize ${aiStory.source} report about "${aiStory.title}".\nScene 2: Break down how to spot real automation vs. PR spin.\nScene 3: Share your take on which roles are *actually* exposed right now.\nCTA: Ask viewers if their company has invoked AI to justify cuts.`
    });
  }

  const gmeStory = newsByTopic.find((t) => t.key === "gamestop")?.articles?.[0];
  if (gmeStory) {
    ideas.push({
      title: "Ryan Cohen Morning Ops Brief",
      script: `Hook: "GameStop just made another move—here’s why RC cares."\nBeat 1: Summarize ${gmeStory.source}'s piece "${gmeStory.title}" in 2 sentences.\nBeat 2: Rapid-fire chart of short interest, cash runway, and any insider chatter today.\nBeat 3: Speculate on near-term catalysts (earnings window, product drops, partnerships).\nCTA: Invite your audience to drop their own RC theories; promise to feature the best one at night.`
    });
  }

  const croatiaStory = newsByTopic.find((t) => t.key === "croatia")?.articles?.[0];
  if (ideas.length < 2 && croatiaStory) {
    ideas.push({
      title: "Croatia Spotlight: Policy + Markets",
      script: `Hook: "Zagreb just nudged policy again—here's how it hits investors back home."\nBeat 1: Recap the headline "${croatiaStory.title}" (${croatiaStory.source}).\nBeat 2: Explain what it means for local founders, FX, or defense ties.\nBeat 3: Tie it back to your own origin story or current projects.\nCTA: Ask followers if they want a deeper Croatia-specific series.`
    });
  }

  if (!ideas.length) {
    ideas.push({
      title: "Evergreen: AI vs. Human Edge",
      script: "Hook: 'AI isn't stealing your creativity—yet.'\nOutline a 3-beat comparison between AI tools and hands-on DJ/cyber skills, ending with a CTA for audience experiences."
    });
  }

  return ideas;
};

const formatContentIdeas = (ideas) => {
  const lines = ["🎬 *Content Ideas with Draft Scripts*\n"];
  ideas.forEach((idea, idx) => {
    lines.push(`${idx + 1}. *${idea.title}*`);
    lines.push(`   ${idea.script}`);
  });
  return lines.join("\n");
};

const formatContentIdeasDiscord = (ideas) => {
  const lines = ["**Content Ideas**"];
  ideas.forEach((idea, idx) => {
    lines.push(`${idx + 1}. ${idea.title}`);
    lines.push(`   ${idea.script}`);
  });
  return lines.join("\n");
};

const buildAssistantTasks = (newsByTopic) => {
  const tasks = [];
  tasks.push("Monitor Brave feeds for any intraday GameStop rumor spikes and ping you if RC or SEC filings drop.");
  const worldStory = newsByTopic.find((t) => t.key === "world")?.articles?.[0];
  if (worldStory) {
    tasks.push(`Draft a Discord-ready briefing on "${worldStory.title}" for the content factory channels.`);
  } else {
    tasks.push("Prep Discord content factory scaffolding with placeholder research/script formats.");
  }
  return tasks;
};

const formatAssistantTasks = (tasks) => {
  const lines = ["🤖 *What I Can Knock Out Today*\n"];
  tasks.forEach((task) => lines.push(`- ${task}`));
  return lines.join("\n");
};

const formatAssistantTasksDiscord = (tasks) => {
  const lines = ["**What I Can Knock Out Today**"];
  tasks.forEach((task) => lines.push(`• ${task}`));
  return lines.join("\n");
};

const formatNewsDigestDiscord = (newsByTopic) => {
  const sections = newsByTopic.map((topic) => formatNewsForDiscord(topic));
  return sections.join("\n\n---\n\n");
};

const sendTelegramChunk = async (text) => {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram error (${response.status}): ${body}`);
  }
  return response.json();
};

const sendTelegram = async (text) => {
  if (text.length <= TELEGRAM_CHUNK_LIMIT) {
    return sendTelegramChunk(text);
  }

  let buffer = "";
  const chunks = [];
  const sections = text.split("\n\n");

  for (const section of sections) {
    const candidate = buffer ? `${buffer}\n\n${section}` : section;
    if (candidate.length > TELEGRAM_CHUNK_LIMIT && buffer) {
      chunks.push(buffer);
      buffer = section;
    } else if (candidate.length > TELEGRAM_CHUNK_LIMIT) {
      // section itself exceeds limit; hard split
      let remaining = section;
      while (remaining.length > TELEGRAM_CHUNK_LIMIT) {
        chunks.push(remaining.slice(0, TELEGRAM_CHUNK_LIMIT));
        remaining = remaining.slice(TELEGRAM_CHUNK_LIMIT);
      }
      buffer = remaining;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  for (const chunk of chunks) {
    await sendTelegramChunk(chunk);
  }
};

const discordFetch = async (path, options = {}) => {
  if (!DISCORD_BOT_TOKEN) {
    throw new Error("Missing DISCORD_BOT_TOKEN");
  }
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    },
    ...options
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord error (${response.status}): ${body}`);
  }
  return response.json();
};

const fetchDiscordChannels = async () => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return [];
  }
  return discordFetch(`/guilds/${DISCORD_GUILD_ID}/channels`);
};

const ensureSpecialChannels = async (channels) => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    console.log("Skipping Discord channel sync (missing bot token or guild id).");
    return { map: {}, channels: [] };
  }
  const existing = channels?.length ? channels : await fetchDiscordChannels();
  const map = {};
  for (const [key, name] of Object.entries(specialChannels)) {
    let found = existing.find((ch) => ch.name === name && ch.type === 0);
    if (!found) {
      found = await discordFetch(`/guilds/${DISCORD_GUILD_ID}/channels`, {
        method: "POST",
        body: JSON.stringify({ name, type: 0 })
      });
      existing.push(found);
    }
    map[key] = found.id;
  }
  return { map, channels: existing };
};

const ensureMorningNewsChannel = async (channels) => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
    return null;
  }
  if (process.env.DISCORD_NEWS_CHANNEL_ID) {
    return process.env.DISCORD_NEWS_CHANNEL_ID;
  }
  const existingList = channels?.length ? channels : await fetchDiscordChannels();
  let channel = existingList.find(
    (ch) => ch.name === MORNING_NEWS_CHANNEL_NAME && ch.type === 0
  );
  if (!channel) {
    channel = await discordFetch(`/guilds/${DISCORD_GUILD_ID}/channels`, {
      method: "POST",
      body: JSON.stringify({ name: MORNING_NEWS_CHANNEL_NAME, type: 0 })
    });
  }
  return channel.id;
};

const sendDiscordChunk = async (channelId, text) => {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      },
      body: JSON.stringify({ content: text })
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord error (${response.status}): ${body}`);
  }
};

const sendDiscord = async (channelId, text) => {
  const chunks = [];
  let remaining = text;
  while (remaining.length > DISCORD_CHUNK_LIMIT) {
    chunks.push(remaining.slice(0, DISCORD_CHUNK_LIMIT));
    remaining = remaining.slice(DISCORD_CHUNK_LIMIT);
  }
  if (remaining.length) {
    chunks.push(remaining);
  }
  for (const chunk of chunks) {
    await sendDiscordChunk(channelId, chunk);
  }
};

const formatStatusTimestamp = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const suggestFix = (errorMessage = "") => {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("telegram")) {
    return "Verify TELEGRAM_* env vars and network, then rerun morning-brief.";
  }
  if (lower.includes("discord")) {
    return "Check DISCORD_BOT_TOKEN permissions and channel IDs, then rerun morning-brief.";
  }
  if (lower.includes("brave")) {
    return "Inspect Brave API quota/key and retry.";
  }
  return "Check /tmp/morning-brief.log and rerun /Users/djloky/.openclaw/workspace/morning-brief/run.sh.";
};

const sendMonitoringUpdate = async (text) => {
  if (!DISCORD_MONITORING_CHANNEL_ID || !DISCORD_BOT_TOKEN) {
    return;
  }
  try {
    await sendDiscordChunk(DISCORD_MONITORING_CHANNEL_ID, text.slice(0, 1900));
  } catch (error) {
    console.error("Failed to send monitoring update:", error.message);
  }
};

const formatHeader = () => {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIMEZONE
  });
  return `📅 Morning Brief — ${formatted}`;
};

const main = async () => {
  const history = await loadHistory();
  const newsByTopic = [];
  for (const topic of topics) {
    const articles = await fetchNews(topic.query, topic.limit);
    const historyForTopic = Array.isArray(history[topic.key]) ? history[topic.key] : [];
    const freshArticles = articles.filter((article) => {
      const identifier = getArticleIdentifier(article);
      if (!identifier) {
        return true;
      }
      return !historyForTopic.includes(identifier);
    });
    newsByTopic.push({
      ...topic,
      articles: freshArticles,
      duplicatesExhausted: articles.length > 0 && freshArticles.length === 0,
      apiReturnedResults: articles.length > 0,
      reportedIds: freshArticles.map((article) => getArticleIdentifier(article)).filter(Boolean)
    });
  }

  const remindersToday = getRemindersDueToday();
  const contentIdeas = createContentIdeas(newsByTopic);
  const assistantTasks = buildAssistantTasks(newsByTopic);

  const newsSectionMarkdown = formatNewsSections(newsByTopic);

  const sections = [
    formatHeader(),
    newsSectionMarkdown,
    formatContentIdeas(contentIdeas),
    formatReminders(remindersToday),
    formatAssistantTasks(assistantTasks)
  ];

  const message = sections.join("\n\n");
  console.log("Sending morning brief (length:", message.length, "chars)...");
  await sendTelegram(message);
  console.log("Morning brief delivered to Telegram.");

  try {
    const { map: specialChannelMap, channels } = await ensureSpecialChannels();
    const newsChannelId = DISCORD_BOT_TOKEN
      ? await ensureMorningNewsChannel(channels)
      : DISCORD_NEWS_CHANNEL_ID;

    if (newsChannelId) {
      await sendDiscord(newsChannelId, formatNewsDigestDiscord(newsByTopic));
      console.log(`Posted consolidated news to Discord channel ${newsChannelId}.`);
    }

    if (contentIdeas.length && specialChannelMap.ideas) {
      await sendDiscord(specialChannelMap.ideas, formatContentIdeasDiscord(contentIdeas));
      console.log("Posted content ideas to Discord.");
    }

    if (specialChannelMap.tasks) {
      await sendDiscord(specialChannelMap.tasks, formatRemindersDiscord(remindersToday));
      console.log("Posted today's tasks to Discord.");
    }

    if (specialChannelMap.assistant) {
      await sendDiscord(
        specialChannelMap.assistant,
        formatAssistantTasksDiscord(assistantTasks)
      );
      console.log("Posted assistant action items to Discord.");
    }
  } catch (error) {
    console.error("Discord send failed:", error.message);
  }

  await updateHistory(history, newsByTopic);
  await sendMonitoringUpdate(`✅ ${formatStatusTimestamp()} — morning-brief success`);
};

main().catch(async (error) => {
  console.error("Morning brief failed:", error);
  const stamp = formatStatusTimestamp();
  await sendMonitoringUpdate(`❌ ${stamp} — morning-brief failed: ${error.message}. Fix: ${suggestFix(error.message)}`);
  process.exit(1);
});
