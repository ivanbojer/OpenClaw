#!/usr/bin/env python3
import os
import sys

def load_env_from_path(path):
    if not os.path.exists(path):
        return {}
    data = {}
    with open(path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k,v = line.split('=',1)
                data[k.strip()] = v.strip()
    return data

def main():
    env = {}
    # Try global first, then local, then user root
    paths = [
        os.path.expanduser('~/.openclaw/.env'),
        os.path.expanduser('~/.openclaw/workspace/.env'),
        os.path.join(os.path.dirname(__file__), '..', '.env')
    ]
    for path in paths:
        if os.path.exists(path):
            env.update(load_env_from_path(path))
            if env: break

    # Pull required vars
    client_id = env.get('LINKEDIN_CLIENT_ID')
    client_secret = env.get('LINKEDIN_CLIENT_SECRET')
    access_token = env.get('LINKEDIN_ACCESS_TOKEN')

    print(f"Token present? {bool(access_token)}")
    print(f"Client ID present? {bool(client_id)}")
    print(f"Client Secret present? {bool(client_secret)}")

    if not access_token or not client_id or not client_secret:
        sys.exit(1)

if __name__ == '__main__':
    main()
