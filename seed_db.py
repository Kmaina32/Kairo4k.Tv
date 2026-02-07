
import os
import re
import requests
import json

# SUPABASE CONFIG (from your .env or provide here)
SUPABASE_URL = "https://tordtbzdbqnrowjsfjgx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcmR0YnpkYnFucm93anNmamd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NDAyMzQsImV4cCI6MjA4NjAxNjIzNH0.rlssgyfSRMMJLuZRvBbVnu2rdamVQcbzm6KupMNV_qs"

def seed_playlists():
    print("--- TRANSITIONING LINKS TO DB ---")
    
    # Read constants.ts to find the DEFAULT_PLAYLISTS array
    with open('constants.ts', 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Extract entries using regex or simple search
    # This is a bit tricky with complex M3U data in the same file, so we'll look for the array specifically
    playlists_match = re.search(r'export const DEFAULT_PLAYLISTS: PlaylistSource\[\] = \[(.*?)\];', content, re.DOTALL)
    if not playlists_match:
        print("Could not find DEFAULT_PLAYLISTS in constants.ts")
        return

    playlists_raw = playlists_match.group(1)
    # Parse the simple JS objects into JSON-like dicts
    # Quick and dirty regex to get name, url, type
    items = re.findall(r'\{\s*name:\s*\'(.*?)\',\s*url:\s*(?:PLUTO_TV_M3U|DISCOVERY_LOCAL_M3U|\'(.*?)\'),\s*type:\s*\'(.*?)\'\s*\}', playlists_raw)
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    count = 0
    for name, remote_url, ptype in items:
        # Resolve variables (simplified)
        url = remote_url if remote_url else "LOCAL_EMBEDDED_RESOURCE"
        
        payload = {
            "name": name,
            "url": url,
            "type": ptype
        }
        
        response = requests.post(f"{SUPABASE_URL}/rest/v1/playlists", headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print(f"[SUCCESS] Seeded: {name}")
            count += 1
        else:
            print(f"[FAIL] {name}: {response.text}")

    print(f"\nMigration complete. {count} sources transitioned to cloud database.")

if __name__ == "__main__":
    seed_playlists()
