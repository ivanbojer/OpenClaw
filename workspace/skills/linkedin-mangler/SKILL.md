---
name: linkedin-mangler
description: Post text, link, and image updates to a personal LinkedIn profile via API using the w_member_social scope. Requires credentials in .env. Use when you need to schedule, draft, or publish content to LinkedIn on behalf of the user. Focuses on robust interaction via Python scripts.
---

# LinkedIn Mangler

Use this skill when you need a programmatic way to publish updates to a user's LinkedIn profile. It supports single-image uploads, URL link sharing, and plain text updates.

## Getting Started

All interactions with LinkedIn require valid credentials which should be set in the `.env` file at the root.

**Required .env vars:**
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ACCESS_TOKEN` (Must be generated with the `w_member_social` and `r_liteprofile` scopes)

For detailed scripts for posting, refer to the included resources.

## Best Practices

- When sharing links, keep thumbnails in mind.
- For images, always use `assets/` to stage local image files for upload.
- Avoid exceeding rate limits by throttling consecutive API requests.

## References & Scripts

- **`scripts/post_update.py`**: Python script to publish to LinkedIn. Handles text, link sharing, and images.
- **`references/linkedin_api.md`**: Guide covering LinkedIn's UGC posting API schema and image registration flow.
- **`scripts/check_env.py`**: Validates whether the correct variables are present before attempting a post.
- **`scripts/run_post.py`**: CLI wrapper to invoke postings from the command line.
- **`scripts/run_post.py` usage example**: See below.

## Usage (CLI)

Prerequisites:
- Create a .env file at this skill root with LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_ACCESS_TOKEN.
- Ensure you have a test image at assets/ (optional).

Examples:
- Post text only:
  cd ~/.openclaw/workspace/skills/linkedin-mangler
  python3 scripts/run_post.py --text "Hello from OpenClaw!"

- Post with a link:
  python3 scripts/run_post.py --text "Check this out" --link "https://example.com/article"

- Post with an image:
  python3 scripts/run_post.py --text "My latest screenshot" --image "assets/sample.jpg"

- Post with text, link, and image:
  python3 scripts/run_post.py --text "New post" --link "https://example.com" --image "assets/sample.jpg"


## How it works

- The CLI wrapper (run_post.py) loads credentials from .env and calls the posting script (post_update.py).
- It uses the LinkedIn w_member_social scope to publish UGC posts to your profile.
- Images are uploaded via asset registration and attached to the post; links are shared as articles.

## Security & Reliability

- Secrets must never be committed to VCS; use environment files and proper permissions.
- Consider throttling or queuing posts to avoid rate limits.
- Validate responses and log IDs for auditing.
