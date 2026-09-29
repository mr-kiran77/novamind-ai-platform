import requests
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GATEWAY_URL = "http://localhost:5000"

def test_e2e():
    print("Testing E2E Idea Copilot via Express Gateway (Port 5000)...")

    # 1. Login
    r_auth = requests.post(f"{GATEWAY_URL}/api/auth/demo-switch?role=user")
    assert r_auth.status_code == 200, "Auth failed"
    token = r_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("✅ Authenticated via Gateway")

    # 2. Capture new Idea with declared jurisdiction
    payload = {
        "title": "BioDegrade Marine Biopolymer Net",
        "category": "CleanTech & Energy",
        "raw_format": "text",
        "jurisdiction": "European Union",
        "raw_content": (
            "We are developing zero-microplastic fishing nets in the European Union that naturally dissolve "
            "into organic marine nutrients within 90 days if lost at sea. Current nylon ghost nets destroy coral reefs and marine life."
        )
    }

    t0 = time.time()
    r_cap = requests.post(f"{GATEWAY_URL}/api/ideas", json=payload, headers=headers)
    duration = time.time() - t0
    assert r_cap.status_code == 200, f"Capture failed: {r_cap.text}"
    data = r_cap.json()
    idea_id = data["id"]
    print(f"✅ Idea captured synchronously in {duration:.2f}s (Non-blocking): ID {idea_id}")
    assert data.get("copilot_status") == "PENDING", f"Expected PENDING copilot status, got {data.get('copilot_status')}"

    # 3. Poll Copilot endpoint for background execution
    print("⏳ Polling /api/ideas/{id}/copilot for background state progress...")
    completed = False
    for attempt in range(15):
        time.sleep(1.5)
        r_cop = requests.get(f"{GATEWAY_URL}/api/ideas/{idea_id}/copilot", headers=headers)
        if r_cop.status_code == 200:
            cop_data = r_cop.json()
            st = cop_data.get("status")
            prog = cop_data.get("progress", 0)
            step = cop_data.get("current_step", "")
            print(f"   [Poll #{attempt+1}] Status: {st} ({prog}%) - {step}")
            if st == "COMPLETED":
                completed = True
                rep = cop_data.get("report", {})
                print(f"🎉 Copilot Report generated successfully!")
                print(f"   - Jurisdiction: {rep.get('idea_understanding', {}).get('jurisdiction')}")
                print(f"   - Sector: {rep.get('idea_understanding', {}).get('sector')}")
                print(f"   - Schemes: {len(rep.get('government_support', []))} programs (e.g. {rep.get('government_support', [{}])[0].get('scheme_name')})")
                print(f"   - Legal: {len(rep.get('legal_regulatory', []))} regulations (e.g. {rep.get('legal_regulatory', [{}])[0].get('regulation')})")
                print(f"   - Top Actions: {len(rep.get('top_actions', []))} actionable sprints")
                print(f"   - Disclaimers: {len(rep.get('disclaimers', []))} warnings")
                break
            elif st == "FAILED":
                print(f"❌ Copilot failed: {cop_data.get('error_message')}")
                break

    assert completed, "Idea Copilot should reach COMPLETED status within timeout"
    print("\n✅ E2E Gateway Verification Succeeded 100%!")

if __name__ == "__main__":
    test_e2e()
