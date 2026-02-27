export type DiscordStatus = {
  ok: boolean;
  username?: string;
  error?: string;
};

export const getDiscordStatus = async (): Promise<DiscordStatus> => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "Missing DISCORD_BOT_TOKEN" };
  }
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${token}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { username: string; discriminator: string };
    const tag = data.discriminator === "0" ? data.username : `${data.username}#${data.discriminator}`;
    return { ok: true, username: tag };
  } catch (error) {
    console.error("Mission Control: Discord status error", error);
    return { ok: false, error: (error as Error).message };
  }
};
