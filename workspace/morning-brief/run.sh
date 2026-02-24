#!/bin/bash
set -a
source /Users/djloky/.openclaw/.env
set +a
cd /Users/djloky/.openclaw/workspace/morning-brief || exit 1
/opt/homebrew/bin/node index.mjs
