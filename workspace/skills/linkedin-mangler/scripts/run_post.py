#!/usr/bin/env python3
import argparse
import subprocess
import sys
import os

def check_env():
    print("Checking environment...")
    result = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'check_env.py')], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("Environment check failed. Please ensure .env has required variables.", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="LinkedIn Mangler: Command Line Interface for posting to LinkedIn.")
    parser.add_argument('--text', required=True, help="Text commentary for the post")
    parser.add_argument('--link', help="Optional URL to share")
    parser.add_argument('--image', help="Optional path to an image to upload and share")
    parser.add_argument('--dry-run', action='store_true', help="Dry run: show what would be posted without hitting the API")
    
    args = parser.parse_args()
    
    if not args.dry_run:
        check_env()
    
    print("\nPreparing to post...")
    if args.dry_run:
        print("DRY RUN MODE: The following posting action would be performed:")
        print(f"Text: {args.text}")
        if args.link:
            print(f"Link: {args.link}")
        if args.image:
            print(f"Image: {args.image}")
        print("End DRY RUN. No network requests were made.")
        sys.exit(0)
    
    post_script = os.path.join(os.path.dirname(__file__), 'post_update.py')
    
    cmd = [sys.executable, post_script, '--text', args.text]
    if args.link:
        cmd.extend(['--link', args.link])
    if args.image:
        cmd.extend(['--image', args.image])
        
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\nError occurred while posting. Exit code: {e.returncode}", file=sys.stderr)
        sys.exit(e.returncode)

if __name__ == '__main__':
    main()
