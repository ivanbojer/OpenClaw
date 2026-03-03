#!/usr/bin/env python3
import os
import sys
import urllib.parse
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

    # Prioritize ~/.openclaw/.env, then workspace/.env, then a generic local .env
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

def main():
    env = load_env_from_paths()
    client_id = env.get('LINKEDIN_CLIENT_ID')
    client_secret = env.get('LINKEDIN_CLIENT_SECRET')

    if not client_id or not client_secret:
        print("Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set in your .env file.", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"Found LinkedIn credentials in .env file. client_id={client_id}")
        print(f"Found LinkedIn credentials in .env file. client_secret=[REDACTED]")
 
    redirect_uri = 'http://localhost:8000/callback'
    scope = 'w_member_social'
    state = 'random_string_12345'

    print("="*60)
    print("LINKEDIN OAUTH2 TOKEN GENERATOR")
    print("="*60)
    print("STEP 1: Setup Redirect URI")
    print(f"Make sure you have added EXACTLY this URL to your LinkedIn App's 'Authorized redirect URLs for your app':")
    print(f"  {redirect_uri}")
    print("\nSTEP 2: Authorize the App")
    
    params = {
        'response_type': 'code',
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'state': state,
        'scope': scope
    }
    
    auth_url = f"https://www.linkedin.com/oauth/v2/authorization?{urllib.parse.urlencode(params)}"
    
    print("Click this link in your browser to log in and authorize the app:")
    print(f"\n{auth_url}\n")
    print("After authorizing, you will be redirected to a URL that looks like:")
    print("http://localhost:8000/callback?code=AQW...&state=random_string_12345")
    print("(It might show a 'This site can’t be reached' error in the browser; that's fine!)")
    
    redirected_url = input("\nSTEP 3: Paste the full URL you were redirected to here:\n>")
    
    try:
        parsed_url = urllib.parse.urlparse(redirected_url.strip())
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        if 'error' in query_params:
            print(f"\nError from LinkedIn: {query_params['error'][0]}")
            print(f"Description: {query_params.get('error_description', [''])[0]}")
            sys.exit(1)
            
        code = query_params.get('code', [None])[0]
        if not code:
            print("\nError: Could not find 'code' parameter in the URL. Please make sure you copied the entire URL.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\nError parsing URL: {e}")
        sys.exit(1)
        
    print("\nSTEP 4: Exchanging code for access token...")
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    token_data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'client_id': client_id,
        'client_secret': client_secret
    }
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    response = requests.post(token_url, data=token_data, headers=headers)
    
    if response.status_code != 200:
        print(f"\nFailed to get token: {response.status_code}")
        print(response.text)
        sys.exit(1)
        
    token_info = response.json()
    access_token = [REDACTED]'access_token')
    expires_in = token_info.get('expires_in', 0)
    
    print("\n" + "="*60)
    print("SUCCESS! Here is your Access Token:")
    print("="*60 + "\n")
    print(f"LINKEDIN_ACCESS_TOKEN={access_token}")
    print(f"\nThis token is valid for {int(expires_in)/86400:.1f} days.")
    print("\nCopy the LINKEDIN_ACCESS_TOKEN line above and put it in your ~/.openclaw/.env file.")

if __name__ == '__main__':
    main()
