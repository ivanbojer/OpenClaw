#!/usr/bin/env node

import { execSync } from "node:child_process";

const DISCORD_CHANNEL_ID = process.env.DISCORD_MONITORING_CHANNEL_ID || "1474872383579099257";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN; cannot send maintenance report.");
  process.exit(1);
}

const run = (cmd, label) => {
  const result = { label };
  try {
    const output = execSync(cmd, { encoding: "utf-8" });
    result.success = true;
    result.output = output.trim();
  } catch (error) {
    result.success = false;
    result.error = (error.stdout && error.stdout.toString().trim()) || error.message;
  }
  return result;
};

const now = new Date();
const lines = [`🛠️ **Daily Maintenance** — ${now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`];

const updateResult = run("openclaw update", "openclaw update");
if (updateResult.success) {
  lines.push("✅ openclaw update succeeded:");
  lines.push("```\n" + updateResult.output.slice(0, 1800) + "\n```");
} else {
  lines.push("❌ openclaw update failed:");
  lines.push("```\n" + updateResult.error.slice(0, 1800) + "\n```");
  lines.push("Suggestion: re-run `openclaw update` manually and review the logs above.");
  await send(lines.join("\n\n"));
  process.exit(1);
}

const versionResult = run("openclaw --version", "openclaw --version");
if (versionResult.success) {
  lines.push("Current OpenClaw version: ``" + versionResult.output + "``");
}

const gatewayStatus = run("openclaw gateway status", "gateway status");
if (gatewayStatus.success) {
  lines.push("Gateway status:\n``\n" + gatewayStatus.output.slice(0, 1800) + "\n``");
} else {
  lines.push("⚠️ gateway status failed:\n``\n" + gatewayStatus.error.slice(0, 1800) + "\n``");
}

await send(lines.join("\n\n"));

async function send(content) {
  const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`
    },
    body: JSON.stringify({ content: content.slice(0, 1900) })
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Failed to post maintenance report to Discord:", body);
  }
}
