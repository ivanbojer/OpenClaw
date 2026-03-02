#!/bin/bash
# Usage: ./scan.sh "message to check"

MESSAGE="$1"

# Check for common injection patterns
PATTERNS=(
    "ignore previous"
    "disregard instructions"
    "you are now"
    "new persona"
    "system prompt"
    "reveal your"
    "bypass"
    "jailbreak"
)

for pattern in "${PATTERNS[@]}"; do
    if echo "$MESSAGE" | grep -qi "$pattern"; then
        echo "⚠️ DETECTED: $pattern"
        echo "$(date) | HIGH | Pattern: $pattern | Message: $MESSAGE" >> ~/YourWorkspace/logs/prompt-guard.log
        exit 1
    fi
done

echo "✅ Clean"
exit 0

