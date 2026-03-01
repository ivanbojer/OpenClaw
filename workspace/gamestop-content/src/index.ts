import { loadEnv } from "./env.js";
import { Logger } from "./logger.js";
import { BraveClient } from "./braveClient.js";
import { TwitterClient } from "./twitterClient.js";
import { DiscordClient } from "./discordClient.js";
import { ContentEngine } from "./contentEngine.js";
import { parseCommand } from "./commandParser.js";
import { buildTweetText, formatSummary } from "./formatSummary.js";
import {
  ensureStateDirs,
  loadCursors,
  loadDrafts,
  loadHistory,
  makeStoryKey,
  saveCursors,
  saveDrafts,
  saveHistory,
  findDraftById
} from "./state.js";
import { Draft, Story } from "./types.js";

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

// Helper to create a draft from a synthesized group
function createGroupDraft(summary: string, sourceUrls: string[]): Draft {
  const id = makeStoryKey(summary + sourceUrls[0]); // Stable ID based on content
  const timestamp = new Date().toISOString();
  return {
    id,
    storyRef: sourceUrls[0], // Primary ref
    source: "Synthesized",
    url: sourceUrls[0],
    summary: summary, // ContentEngine already formatted it
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function run(): Promise<void> {
  const logger = new Logger();
  let discord: DiscordClient | null = null;

  try {
    ensureStateDirs();
    const env = loadEnv();
    discord = new DiscordClient(env);

    const history = loadHistory();
    const draftState = loadDrafts();
    const cursors = loadCursors();

    const shouldFetch = process.argv.includes("--fetch");

    if (shouldFetch) {
      const twitter = new TwitterClient(env);
      const brave = new BraveClient(env);
      const contentEngine = new ContentEngine(env);

      logger.info("Fetching stories from Twitter");
      const twitterStories = await twitter.searchRecentStories();
      let newStories = twitterStories.filter((story) => {
        const key = makeStoryKey(story.externalId || story.url);
        return !history.seen.includes(key);
      });

      if (newStories.length === 0) {
        logger.info("No new Twitter stories. Falling back to Brave search");
        const braveStories = await brave.searchNews();
        newStories = braveStories.filter((story) => {
          const key = makeStoryKey(story.externalId || story.url);
          return !history.seen.includes(key);
        });
      }

      if (newStories.length > 0) {
        logger.info(`Found ${newStories.length} new stories. Synthesizing...`);
        
        // Mark all raw inputs as seen so we don't process them again
        for (const story of newStories) {
          history.seen.push(makeStoryKey(story.externalId || story.url));
        }

        const groups = await contentEngine.synthesizeStories(newStories);
        
        for (const group of groups) {
          // Check if this specific synthesis was already made (rare but safe)
          const draftId = makeStoryKey(group.summary + group.sourceUrls[0]);
          if (!draftState.drafts.some(d => d.id === draftId)) {
            draftState.drafts.push(createGroupDraft(group.summary, group.sourceUrls));
          }
        }
        logger.info(`Created ${groups.length} synthesized drafts.`);
      } else {
        logger.info("No new content found.");
      }
    } else {
      logger.info("Skipping fetch (no --fetch flag). Processing Discord commands only.");
    }

    const newsChannelId = await discord.ensureNewsChannel();

    const unannouncedPending = draftState.drafts.filter(
      (draft) => draft.status === "pending" && !draft.announcedAt
    );

    for (const draft of unannouncedPending) {
      const content = [
        `Draft ${draft.id}`,
        `> ${draft.summary}`,
        "Commands: `Approve <id>`, `Revise <id> <new text>`, `Reject <id> <reason>`",
        "\n**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**"
      ].join("\n");
      await discord.sendMessage(newsChannelId, content);
      draft.announcedAt = new Date().toISOString();
      draft.updatedAt = new Date().toISOString();
    }

    const cursor = cursors.channels[newsChannelId];
    const messages = await discord.getMessagesSince(newsChannelId, cursor);
    const botUserId = await discord.getBotUserId();

    // We only need the Twitter write client if we actually approve something
    let twitterWriter: TwitterClient | null = null;
    const getTwitterWriter = () => {
      if (!twitterWriter) twitterWriter = new TwitterClient(env);
      return twitterWriter;
    };

    let postedThisRun = 0;

    for (const message of messages) {
      cursors.channels[newsChannelId] = message.id;

      if (message.author.bot || message.author.id === botUserId) {
        continue;
      }

      const command = parseCommand(message.content);
      if (!command) {
        continue;
      }

      if (command.type === "reject-all") {
        let rejectedCount = 0;
        for (const d of draftState.drafts) {
          if (d.status === "pending") {
            d.status = "rejected";
            d.rejectionReason = command.reason;
            d.updatedAt = new Date().toISOString();
            rejectedCount++;
          }
        }
        await discord.sendMessage(newsChannelId, `✅ Processed **Reject All**: Marked ${rejectedCount} pending drafts as rejected. Reason: ${command.reason}`);
        continue;
      }

      // For specific draft commands
      const draft = findDraftById(draftState.drafts, command.draftId);
      if (!draft) {
        await discord.sendMessage(newsChannelId, `Could not find draft ${command.draftId}.`);
        continue;
      }

      if (command.type === "approve") {
        if (draft.status !== "pending") {
          await discord.sendMessage(newsChannelId, `⚠️ **Warning:** Draft \`${draft.id}\` is already marked as **${draft.status}**. Action skipped.`);
          continue;
        }

        const tweetBody = buildTweetText(draft.summary);
        const posted = await getTwitterWriter().postTweet(tweetBody);
        draft.status = "posted";
        draft.tweetUrl = posted.url;
        draft.updatedAt = new Date().toISOString();
        postedThisRun += 1;

        await discord.sendMessage(newsChannelId, `Posted ${draft.id}: ${posted.url}`);
      }

      if (command.type === "revise") {
        draft.summary = formatSummary(draft.source, command.newText, draft.url);
        draft.status = "pending";
        draft.updatedAt = new Date().toISOString();
        await discord.sendMessage(newsChannelId, `Revised ${draft.id}. It is still pending.`);
      }

      if (command.type === "reject") {
        draft.status = "rejected";
        draft.rejectionReason = command.reason;
        draft.updatedAt = new Date().toISOString();
        await discord.sendMessage(newsChannelId, `Rejected ${draft.id}. Reason saved.`);
      }
    }

    saveHistory(history);
    saveDrafts(draftState);
    saveCursors(cursors);

    const pendingCount = draftState.drafts.filter((draft) => draft.status === "pending").length;
    
    // Only send monitoring status if something actually happened (posted > 0) OR if we fetched new content
    // otherwise the 10-minute heartbeat is too spammy if it's just "0 posted, 5 pending" forever.
    // BUT the user asked for status report of EACH run.
    const statusLine = `✅ gamestop-content run ${nowTime()} – posted ${postedThisRun}, pending ${pendingCount} ${shouldFetch ? "(fetched)" : "(no fetch)"}`;
    await discord.sendMonitoringMessage(statusLine);

    logger.info(`Run complete. Posted ${postedThisRun}, pending ${pendingCount}`);
    logger.flush();
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    const logger = new Logger();
    logger.error(err);
    logger.flush();

    if (discord) {
      const statusLine = `❌ gamestop-content run ${nowTime()} – error: ${err}`;
      await discord.sendMonitoringMessage(statusLine);
    }

    process.exitCode = 1;
  }
}

await run();
