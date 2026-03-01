import dotenv from "dotenv";

dotenv.config({ path: "/Users/djloky/.openclaw/.env" });

type RequiredEnv = {
  OPENCLAW_BRAVE_API_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
  DISCORD_MONITORING_CHANNEL_ID: string;
  TWITTER_CONSUMER_KEY: string;
  TWITTER_CONSUMER_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_SECRET: string;
  TWITTER_BEARER_TOKEN: string;
};

export type AppEnv = RequiredEnv & {
  DISCORD_NEWS_GAMESTOP_CHANNEL_ID?: string;
};

const requiredVars: (keyof RequiredEnv)[] = [
  "OPENCLAW_BRAVE_API_KEY",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_MONITORING_CHANNEL_ID",
  "TWITTER_CONSUMER_KEY",
  "TWITTER_CONSUMER_SECRET",
  "TWITTER_ACCESS_TOKEN",
  "TWITTER_ACCESS_SECRET",
  "TWITTER_BEARER_TOKEN",
  "OPENAI_API_KEY"
];

export function loadEnv(): AppEnv {
  const missing = requiredVars.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    OPENCLAW_BRAVE_API_KEY: process.env.OPENCLAW_BRAVE_API_KEY as string,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN as string,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID as string,
    DISCORD_NEWS_GAMESTOP_CHANNEL_ID: process.env.DISCORD_NEWS_GAMESTOP_CHANNEL_ID,
    DISCORD_MONITORING_CHANNEL_ID: process.env.DISCORD_MONITORING_CHANNEL_ID as string,
    TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY as string,
    TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET as string,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN as string,
    TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET as string,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN as string
  };
}
