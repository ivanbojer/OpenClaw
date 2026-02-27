#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/djloky/.openclaw/workspace/openclaw-billing-dashboard
/opt/homebrew/bin/npm run start >> /tmp/billing-dashboard.log 2>&1
