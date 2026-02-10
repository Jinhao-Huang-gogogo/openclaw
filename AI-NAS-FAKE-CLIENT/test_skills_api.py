import requests
import json
import os

# Configuration
# By default, use localhost:18789 if not specified by env
BASE_URL = os.getenv("OPENCLAW_API_URL", "http://localhost:18789")
# Token should match what is in your ~/.openclaw/config.json5 for plugins.entries.ainas.config.accessToken
# You can set this via env var or modify it here for local testing
ACCESS_TOKEN = os.getenv("AINAS_ACCESS_TOKEN", "ainas-token")

def test_get_skills():
    """Test getting the list of skills."""
    url = f"{BASE_URL}/assistant/skills"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"Testing GET {url} ...")
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response Data (Truncated):")
            # Only show first 2 skills to keep output clean
            skills = data.get("data", {}).get("skills", [])
            preview_data = {**data, "data": {**data.get("data", {}), "skills": skills[:2]}}
            print(json.dumps(preview_data, indent=2, ensure_ascii=False))
            if len(skills) > 2:
                print(f"... and {len(skills) - 2} more skills")
            return skills
        else:
            print(f"Error: {response.text}")
            return []
    except Exception as e:
        print(f"Request failed: {e}")
        return []

def test_toggle_skill(skill_id, enable=True):
    """Test enabling or disabling a skill."""
    url = f"{BASE_URL}/assistant/skills/{skill_id}"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "enabled": enable
    }
    
    print(f"\nTesting PATCH {url} with payload {payload} ...")
    try:
        response = requests.patch(url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response Data:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("=== Starting Assistant Skills API Test ===\n")
    
    # 1. Get list of skills
    skills = test_get_skills()
    
    if skills:
        # 2. Pick the first skill to test toggling
        target_skill = skills[0]
        skill_id = target_skill.get("id")
        current_status = target_skill.get("enabled")
        
        if skill_id:
            print(f"\nSelected skill for toggle test: {skill_id} (Current enabled: {current_status})")
            
            # Toggle to opposite state
            new_state = not current_status
            test_toggle_skill(skill_id, enable=new_state)
            
            # Toggle back to original state
            test_toggle_skill(skill_id, enable=current_status)
    else:
        print("\nNo skills found or failed to retrieve skills list.")
    
    print("\n=== Test Complete ===")
