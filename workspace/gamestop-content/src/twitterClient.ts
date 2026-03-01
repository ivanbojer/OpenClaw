import { TwitterApi } from "twitter-api-v2";
import { AppEnv } from "./env.js";
import { Story } from "./types.js";
import { withRetry } from "./retry.js";

export class TwitterClient {
  private readonly client: TwitterApi;

  constructor(env: AppEnv) {
    console.log("Initializing TwitterClient with keys:");
    console.log("Consumer Key:", env.TWITTER_CONSUMER_KEY?.slice(0, 5) + "...");
    console.log("Access Token:", env.TWITTER_ACCESS_TOKEN?.slice(0, 5) + "...");
    
    this.client = new TwitterApi({
      appKey: env.TWITTER_CONSUMER_KEY,
      appSecret: env.TWITTER_CONSUMER_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_SECRET
    });
  }

  async searchRecentStories(): Promise<Story[]> {
    const query = '(GameStop OR GME OR "Ryan Cohen") lang:en -is:retweet';
    const result = await withRetry(() =>
      this.client.v2.search(query, {
        max_results: 20,
        expansions: ["author_id"],
        "tweet.fields": ["created_at", "author_id", "text"]
      })
    );

    const tweets = await result.fetchLast(20);
    return tweets.tweets.map((tweet) => ({
      kind: "tweet",
      externalId: tweet.id,
      source: "Twitter",
      text: tweet.text,
      url: `https://x.com/i/web/status/${tweet.id}`,
      publishedAt: tweet.created_at ?? new Date().toISOString()
    }));
  }

  async postTweet(text: string): Promise<{ id: string; url: string }> {
    console.log("Attempting to post tweet:", text);
    try {
      const tweet = await withRetry(() => this.client.v2.tweet(text));
      console.log("Tweet success:", tweet.data.id);
      return {
        id: tweet.data.id,
        url: `https://x.com/i/web/status/${tweet.data.id}`
      };
    } catch (e: any) {
      console.error("Twitter post failed:", e);
      if (e.data) {
        console.error("Twitter Error Data:", JSON.stringify(e.data, null, 2));
      }
      throw e;
    }
  }
}
