import { fetch } from "undici";
import { AppEnv } from "./env.js";
import { withRetry } from "./retry.js";

const API_BASE = "https://discord.com/api/v10";
const NEWS_CHANNEL_NAME = "gamestop-news-twitter";

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

type DiscordUser = {
  id: string;
  username: string;
};

export type DiscordMessage = {
  id: string;
  content: string;
  author: {
    id: string;
    bot?: boolean;
  };
};

export class DiscordClient {
  private botUserId: string | null = null;

  constructor(private readonly env: AppEnv) {}

  async ensureNewsChannel(): Promise<string> {
    if (this.env.DISCORD_NEWS_GAMESTOP_CHANNEL_ID) {
      return this.env.DISCORD_NEWS_GAMESTOP_CHANNEL_ID;
    }

    const channels = await this.getGuildChannels();
    const existing = channels.find(
      (channel) => channel.type === 0 && channel.name === NEWS_CHANNEL_NAME
    );

    if (existing) {
      return existing.id;
    }

    const created = await this.postJson<DiscordChannel>(
      `/guilds/${this.env.DISCORD_GUILD_ID}/channels`,
      {
        name: NEWS_CHANNEL_NAME,
        type: 0,
        topic: "Draft GameStop and Ryan Cohen updates for command review"
      }
    );

    return created.id;
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    await this.postJson(`/channels/${channelId}/messages`, { content });
  }

  async sendMonitoringMessage(content: string): Promise<void> {
    try {
      await this.sendMessage(this.env.DISCORD_MONITORING_CHANNEL_ID, content);
    } catch (error) {
      console.warn(`Monitoring update failed: ${String(error)}`);
    }
  }

  async getMessagesSince(channelId: string, afterId?: string): Promise<DiscordMessage[]> {
    const query = new URLSearchParams({ limit: "100" });
    if (afterId) {
      query.set("after", afterId);
    }

    const messages = await this.getJson<DiscordMessage[]>(`/channels/${channelId}/messages?${query}`);
    return messages.sort((a, b) => Number(a.id) - Number(b.id));
  }

  async getBotUserId(): Promise<string> {
    if (this.botUserId) {
      return this.botUserId;
    }
    const user = await this.getJson<DiscordUser>("/users/@me");
    this.botUserId = user.id;
    return user.id;
  }

  private async getGuildChannels(): Promise<DiscordChannel[]> {
    return this.getJson<DiscordChannel[]>(`/guilds/${this.env.DISCORD_GUILD_ID}/channels`);
  }

  private async getJson<T>(path: string): Promise<T> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: this.headers()
      });
      if (!response.ok) {
        throw new Error(`Discord GET ${path} failed: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    });
  }

  private async postJson<T = unknown>(path: string, body: unknown): Promise<T> {
    return withRetry(async () => {
      const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          ...this.headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Discord POST ${path} failed: ${response.status} ${response.statusText}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    });
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bot ${this.env.DISCORD_BOT_TOKEN}`
    };
  }
}
