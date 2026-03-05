#!/bin/bash

curl -H "Authorization: Bearer $LINKEDIN_ACCESS_TOKEN" \
     -H "X-Restli-Protocol-Version: 2.0.0" \
     -H "LinkedIn-Version: 202509" \
     "https://api.linkedin.com/v2/userinfo"
