#!/usr/bin/env python3
import os
import sys
import json
import argparse
import requests

def load_env_from_paths():
    def load_from_path(path):
        if not os.path.exists(path):
            return {}
        data = {}
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    data[k.strip()] = v.strip()
        return data

    paths = [
        os.path.expanduser('~/.openclaw/.env'),
        os.path.expanduser('~/.openclaw/workspace/.env'),
        os.path.join(os.path.dirname(__file__), '..', '.env')
    ]
    env = {}
    for p in paths:
        if os.path.exists(p):
            data = load_from_path(p)
            if data:
                env.update(data)
                break
    return env

env = load_env_from_paths()
ACCESS_TOKEN = env.get('LINKEDIN_ACCESS_TOKEN')
AUTHOR_URN = env.get('LINKEDIN_AUTHOR_URN')

if not ACCESS_TOKEN:
    print("Error: LINKEDIN_ACCESS_TOKEN not found in env", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
    'LinkedIn-Version': '202401'
}

def get_author_urn():
    if AUTHOR_URN:
        return AUTHOR_URN
    url = 'https://api.linkedin.com/v2/me'
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return f'urn:li:person:{response.json().get("id")}'

def register_and_upload_image(author_urn, image_path):
    register_url = 'https://api.linkedin.com/v2/assets?action=registerUpload'
    register_payload = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": author_urn,
            "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]
        }
    }
    
    reg_res = requests.post(register_url, headers=HEADERS, json=register_payload)
    reg_res.raise_for_status()
    reg_data = reg_res.json()
    
    upload_url = reg_data['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl']
    asset_urn = reg_data['value']['asset']
    
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    upload_headers = {'Authorization': f'Bearer {ACCESS_TOKEN}'}
    upload_res = requests.post(upload_url, headers=upload_headers, data=image_data)
    upload_res.raise_for_status()
    
    return asset_urn

def create_post(author_urn, text, link_url=None, image_path=None):
    post_url = 'https://api.linkedin.com/v2/posts'
    
    # The Graph API explicitely expects urn:li:member:1234 rather than urn:li:person:1234
    if author_urn.startswith("urn:li:person:"):
        author_urn = author_urn.replace("urn:li:person:", "urn:li:member:")

    payload = {
        "author": author_urn,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    if link_url:
        payload["content"] = {
            "article": {
                "source": link_url,
                "title": "Shared Link",
                "description": "Shared link"
            }
        }
    elif image_path:
        asset_urn = register_and_upload_image(author_urn, image_path)
        payload["content"] = {
            "media": {
                "id": asset_urn,
                "title": "Uploaded Image"
            }
        }

    response = requests.post(post_url, headers=HEADERS, json=payload)
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError:
        print("Response Body:", response.text, file=sys.stderr)
        raise
    return response.json()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Post an update to LinkedIn")
    parser.add_argument('--text', required=True, help="Text commentary for the post")
    parser.add_argument('--link', help="Optional URL to share")
    parser.add_argument('--image', help="Optional path to an image to upload")
    args = parser.parse_args()
    
    try:
        urn = get_author_urn()
        print(f"Authenticated as: {urn}")
        result = create_post(urn, args.text, args.link, args.image)
        print("Post published successfully!")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Failed to post: {e}", file=sys.stderr)
        sys.exit(1)
