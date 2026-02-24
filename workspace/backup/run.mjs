#!/usr/bin/env node

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const WORKSPACE_ROOT = "/Users/djloky/.openclaw/workspace";
const DOT_OPENCLAW = "/Users/djloky/.openclaw";
const BACKUP_BASE = path.join(WORKSPACE_ROOT, "backups");
const DISCORD_MONITORING_CHANNEL_ID = process.env.DISCORD_MONITORING_CHANNEL_ID || "1474872383579099257";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TIMEZONE = "America/Los_Angeles";

if (!DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN for backup notifications.");
  process.exit(1);
}

const timestamp = new Date();
const stamp = timestamp
  .toISOString()
  .replace(/[:T]/g, "-")
  .slice(0, 16);
const DEST_ROOT = path.join(BACKUP_BASE, stamp);

const replacements = new Map();

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
  if (lower.includes("rsync") || lower.includes("permission")) {
    return "Check file permissions and disk space, then rerun node backup/run.mjs.";
  }
  if (lower.includes("git")) {
    return "Verify git status/credentials and rerun the backup.";
  }
  if (lower.includes("discord")) {
    return "Confirm DISCORD_BOT_TOKEN + monitoring channel permissions, then rerun backup.";
  }
  return "Review /tmp/openclaw/*.log and rerun node backup/run.mjs.";
};

const sendMonitoringUpdate = async (message) => {
  if (!DISCORD_BOT_TOKEN || !DISCORD_MONITORING_CHANNEL_ID) {
    return;
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_MONITORING_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      },
      body: JSON.stringify({ content: message.slice(0, 1900) })
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Monitoring notification failed:", text);
      await fs.appendFile("/tmp/backup.log", `[${new Date().toISOString()}] Notification failed: ${text}\n`);
    }
  } catch (error) {
    console.error("Monitoring notification error:", error.message);
    await fs.appendFile("/tmp/backup.log", `[${new Date().toISOString()}] Notification error: ${error.message}\n`);
  }
};

async function main() {
  await fs.mkdir(DEST_ROOT, { recursive: true });
  await copySources();
  await loadSecrets();
  await sanitizeDirectory(DEST_ROOT);
  await createCommit();
  await sendMonitoringUpdate(`✅ ${formatStatusTimestamp()} — backup success`);
}

async function copySources() {
  console.log("Copying critical files...");
  // dot-openclaw (excluding workspace symlink)
  const dotDest = path.join(DEST_ROOT, "dot-openclaw");
  await fs.mkdir(dotDest, { recursive: true });
  rsync(DOT_OPENCLAW, dotDest, ["workspace", "workspace-state.json", "logs", "sessions"]);
  await fs.copyFile(path.join(DOT_OPENCLAW, "openclaw.json"), path.join(dotDest, "openclaw.json"));
  // workspace (exclude git + backups)
  const wsDest = path.join(DEST_ROOT, "workspace");
  await fs.mkdir(wsDest, { recursive: true });
  rsync(WORKSPACE_ROOT, wsDest, [".git", "node_modules", "backups", "memory", "maintenance/"]);

  // workspace-coding
  const wsCodingDest = path.join(DEST_ROOT, "workspace-coding");
  await fs.mkdir(wsCodingDest, { recursive: true });
  rsync(path.join(DOT_OPENCLAW, "workspace-coding"), wsCodingDest, [".git", "node_modules"]);
}

function rsync(src, dest, excludes = []) {
  const excludeArgs = excludes.map((pattern) => `--exclude='${pattern}'`).join(" ");
  const cmd = `rsync -a --delete ${excludeArgs} '${src}/' '${dest}/'`;
  execSync(cmd, { stdio: "inherit" });
}

async function loadSecrets() {
  const addSecret = (label, value) => {
    if (!value) return;
    if (value.length < 4) return;
    replacements.set(value, `[${label}]`);
  };

  // from environment
  const envKeys = [
    "OPENCLAW_BRAVE_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "DISCORD_BOT_TOKEN",
    "DISCORD_NEWS_CHANNEL_ID",
    "DISCORD_GUILD_ID",
    "TWITTER_CONSUMER_KEY",
    "TWITTER_CONSUMER_SECRET",
    "TWITTER_BEARER_TOKEN",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET",
    "OPENAI_API_KEY",
    "GITHUB_TOKEN"
  ];
  envKeys.forEach((key) => addSecret(key, process.env[key]));

  // parse ~/.openclaw/.env if exists
  const envPath = path.join(DOT_OPENCLAW, ".env");
  try {
    const content = await fs.readFile(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      addSecret(key, value);
    });
  } catch (error) {
    // ignore if missing
  }
}

async function sanitizeDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await sanitizeDirectory(full);
    } else if (entry.isFile()) {
      await sanitizeFile(full);
    }
  }
}

async function sanitizeFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.includes(0)) {
      // binary
      return;
    }
    let content = buffer.toString("utf8");
    let replaced = content;
    for (const [secret, placeholder] of replacements.entries()) {
      if (!secret) continue;
      replaced = replaced.split(secret).join(placeholder);
    }
    // generic patterns
    replaced = replaced.replace(/sk-[A-Za-z0-9]{20,}/g, "[OPENAI_API_KEY]");
    replaced = replaced.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [TOKEN]");
    if (replaced !== content) {
      await fs.writeFile(filePath, replaced, "utf8");
    }
  } catch (error) {
    console.warn("Failed to sanitize", filePath, error.message);
  }
}

async function createCommit() {
  // 2. Add all relevant directories/files to the new branch
  execSync(`cd '${WORKSPACE_ROOT}' && git add .`);
  const stagedFiles = execSync(`cd '${WORKSPACE_ROOT}' && git ls-files --stage`).toString();
  console.log("--- Staged Files (for debugging) ---");
  console.log(stagedFiles);
  console.log("--- End Staged Files ---");
  // Return the staged files as part of the result before exiting
  process.stdout.write(stagedFiles); // Write to stdout so it's captured in the sub-agent result
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Backup failed:", error);
  const stampString = formatStatusTimestamp();
  await sendMonitoringUpdate(`❌ ${stampString} — backup failed: ${error.message}. Fix: ${suggestFix(error.message)}`);
  process.exit(1);
});
