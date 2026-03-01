import { loadEnv } from "./src/env.js";
import { TwitterApi } from "twitter-api-v2";

async function test() {
  try {
    const env = loadEnv();
    console.log("Keys loaded:");
    console.log("- Consumer Key:", env.TWITTER_CONSUMER_KEY ? "Yes" : "No");
    console.log("- Access Token:", env.TWITTER_ACCESS_TOKEN ? "Yes" : "No");

    const client = new TwitterApi({
      appKey: env.TWITTER_CONSUMER_KEY,
      appSecret: env.TWITTER_CONSUMER_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_SECRET
    });

    const text = `Test tweet from content debug ${new Date().getTime()}`;
    console.log(`Attempting to post: "${text}"`);
    
    const result = await client.v2.tweet(text);
    console.log("Success! Tweet ID:", result.data.id);
  } catch (err: any) {
    console.error("Twitter Error:", err);
    if (err.data) {
      console.error("Error Data:", JSON.stringify(err.data, null, 2));
    }
  }
}

test();
