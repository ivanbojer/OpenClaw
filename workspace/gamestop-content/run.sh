#!/bin/bash
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
export TERM=xterm-256color

cd /Users/djloky/.openclaw/workspace/gamestop-content
# Run and append to a rotating log or just stdout/stderr capturing
/usr/bin/npx tsx src/index.ts >> /tmp/gamestop-content.log 2>&1
