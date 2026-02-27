#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/djloky/.openclaw/workspace/mission-control
/opt/homebrew/bin/npm run start >> /tmp/mission-control.log 2>&1
