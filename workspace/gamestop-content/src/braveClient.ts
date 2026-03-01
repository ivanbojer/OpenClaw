import { fetch } from "undici";
import { AppEnv } from "./env.js";
import { Story } from "./types.js";
import { withRetry } from "./retry.js";

type BraveResponse = {
  web?: {
    results?: Array<{
      title?: string;
      description?: string;
      url?: string;
      age?: string;
      page_age?: string;
      profile?: { name?: string };
    }>;
  };
};

export class BraveClient {
  constructor(private readonly env: AppEnv) {}

  async searchNews(): Promise<Story[]> {
    const query = encodeURIComponent("GameStop OR GME OR Ryan Cohen latest news");
    const url = `https://api.search.brave.com/res/v1/web/search?q=${query}&count=20`;

    const response = await withRetry(() =>
      fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": this.env.OPENCLAW_BRAVE_API_KEY
        }
      })
    );

    if (!response.ok) {
      throw new Error(`Brave search failed: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as BraveResponse;
    const items = json.web?.results ?? [];

    return items
      .filter((item) => item.url)
      .map((item) => ({
        kind: "news",
        externalId: item.url as string,
        source: item.profile?.name ?? "Brave result",
        text: item.description ?? item.title ?? "Update related to GameStop or Ryan Cohen",
        url: item.url as string,
        publishedAt: item.page_age ?? item.age ?? new Date().toISOString()
      }));
  }
}
