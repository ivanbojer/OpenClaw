# LinkedIn API Reference

This document summarizes the API usage for the `linkedin-mangler` skill.

## Required Scopes
- `w_member_social`: Required to create, modify, and delete posts, comments, and reactions on behalf of an authenticated member.
- `r_liteprofile` (or `profile`): Required to fetch the user's URN (`urn:li:person:ID`) from the `/v2/me` endpoint.

## Endpoints Used

### 1. Get User Profile (Author URN)
- **URL:** `GET https://api.linkedin.com/v2/me`
- **Purpose:** Retrieves the authenticated user's `id` to construct the `author_urn` (`urn:li:person:{id}`).

### 2. Register Image Upload
- **URL:** `POST https://api.linkedin.com/v2/assets?action=registerUpload`
- **Purpose:** Initializes an upload session for an image. Returns an `uploadUrl` and an `asset` URN.
- **Recipe:** Uses `urn:li:digitalmediaRecipe:feedshare-image`.

### 3. Upload Image Media
- **URL:** `POST {uploadUrl}`
- **Purpose:** Uploads the raw binary image data.

### 4. Create Post (UGC Post)
- **URL:** `POST https://api.linkedin.com/v2/ugcPosts`
- **Purpose:** Publishes the post to the feed.
- **Media Categories Supported:**
  - `NONE`: Text only.
  - `ARTICLE`: Sharing a link/URL.
  - `IMAGE`: Sharing an uploaded image using its asset URN.
- **Visibility:** Defaulted to `PUBLIC`.
