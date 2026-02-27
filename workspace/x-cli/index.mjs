#!/usr/bin/env node
import dotenv from "dotenv";
import os from "os";
import path from "path";
import { TwitterApi } from "twitter-api-v2";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

dotenv.config();
dotenv.config({ path: path.join(os.homedir(), ".openclaw/.env") });

const requireEnv = (vars) => {
  const missing = vars.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
};

const getRwClient = () => {
  requireEnv([
    "TWITTER_CONSUMER_KEY",
    "TWITTER_CONSUMER_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET"
  ]);
  return new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET
  });
};

const getSearchClient = () => {
  if (process.env.TWITTER_BEARER_TOKEN) {
    return new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }
  return getRwClient();
};

const fmtTweet = (tweet, usersMap) => {
  const user = usersMap?.get(tweet.author_id);
  const handle = user ? `@${user.username}` : tweet.author_id;
  const date = tweet.created_at ? new Date(tweet.created_at).toLocaleString() : "";
  const metrics = tweet.public_metrics
    ? ` ❤ ${tweet.public_metrics.like_count} ↻ ${tweet.public_metrics.retweet_count}`
    : "";
  return `${handle} — ${date}\n${tweet.text}\n${metrics}\nhttps://twitter.com/${user?.username ?? "i"}/status/${tweet.id}`;
};

const searchTweets = async ({ query, limit, from }) => {
  const client = getSearchClient();
  const params = {
    query,
    max_results: Math.min(Math.max(limit, 10), 100),
    "tweet.fields": "author_id,created_at,public_metrics",
    expansions: "author_id",
    "user.fields": "username,name"
  };
  if (from) {
    params.query = `${query} (from:${from})`;
  }
  const paginator = await client.v2.search(params.query, params);
  const tweets = [];
  for await (const tweet of paginator) {
    tweets.push(tweet);
    if (tweets.length >= limit) break;
  }
  const usersMap = new Map(
    (paginator?.includes?.users ?? []).map((user) => [user.id, user])
  );
  if (!tweets.length) {
    console.log("No tweets found for query.");
    return;
  }
  tweets.forEach((tweet, idx) => {
    console.log(`\n[${idx + 1}]\n${fmtTweet(tweet, usersMap)}`);
  });
};

const postTweet = async ({ text, reply, dryRun }) => {
  if (dryRun) {
    console.log("Dry run: would post tweet:\n", text);
    if (reply) console.log(`…in reply to ${reply}`);
    return;
  }
  const client = getRwClient();
  const payload = reply ? { text, reply: { in_reply_to_tweet_id: reply } } : { text };
  const result = await client.v2.tweet(payload);
  console.log("Tweet posted:", `https://twitter.com/i/web/status/${result.data.id}`);
};

const argv = yargs(hideBin(process.argv))
  .scriptName("x-cli")
  .command(
    "search <query>",
    "Search public tweets",
    (yargs) =>
      yargs
        .positional("query", { describe: "Search keywords", type: "string" })
        .option("limit", {
          alias: "l",
          type: "number",
          default: 10,
          describe: "Maximum tweets to return"
        })
        .option("from", {
          type: "string",
          describe: "Filter to tweets from a specific handle (without @)"
        }),
    (args) => {
      searchTweets(args).catch((error) => {
        console.error("Search failed:", error.message);
        process.exitCode = 1;
      });
    }
  )
  .command(
    "tweet <text>",
    "Post a tweet from the authenticated account",
    (yargs) =>
      yargs
        .positional("text", { describe: "Tweet body", type: "string" })
        .option("reply", {
          type: "string",
          describe: "Tweet ID to reply to"
        })
        .option("dry-run", {
          type: "boolean",
          default: false,
          describe: "Show payload without sending"
        }),
    (args) => {
      postTweet({ text: args.text, reply: args.reply, dryRun: args["dry-run"] }).catch(
        (error) => {
          console.error("Tweet failed:", error.message);
          process.exitCode = 1;
        }
      );
    }
  )
  .demandCommand(1)
  .help().argv;
