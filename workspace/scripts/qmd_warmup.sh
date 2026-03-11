#  Pick the same state dir OpenClaw uses
STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

# (Optional) force an index refresh + embeddings
qmd update
qmd embed

# Warm up / trigger first-time model downloads
qmd query "test" -c memory-root --json >/dev/null 2>&1

