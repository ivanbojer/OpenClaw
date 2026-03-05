#!/bin/bash

# sample POST to create a simple text-only post via the LinkedIn UGC API
# be sure your access token scopes include w_member_social
# change the "text" value below as desired
# sample POST example below

curl -X POST "https://api.linkedin.com/v2/ugcPosts" \
  -H "Authorization: Bearer $LINKEDIN_ACCESS_TOKEN" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  -H "LinkedIn-Version: 202509" \
  -H "Content-Type: application/json" \
  -d '{
    "author": "'"$LINKEDIN_AUTHOR_URN"'", 
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "Hello World!"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  }'