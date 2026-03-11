#!/bin/bash

# This script sends a message to a Discord channel using the Bot Token.
# It sources the environment variables from the OpenClaw .env file.

# Load environment variables
if [ -f "/Users/djloky/.openclaw/.env" ]; then
    source "/Users/djloky/.openclaw/.env"
fi

# Check for required variables
if [ -z "$DISCORD_BOT_TOKEN" ] || [ -z "$DISCORD_MONITORING_CHANNEL_ID" ]; then
    echo "Error: DISCORD_BOT_TOKEN or DISCORD_MONITORING_CHANNEL_ID is not set."
    exit 1
fi

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    echo "Usage: $0 \"<message>\""
    exit 1
fi

# Format the message for JSON
JSON_PAYLOAD=$(printf '{"content": "%s"}' "$MESSAGE")

# Send the message via Discord API
curl -s -o /dev/null -w "%{http_code}" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
     -X POST \
     -d "$JSON_PAYLOAD" \
     "https://discord.com/api/v10/channels/$DISCORD_MONITORING_CHANNEL_ID/messages"
