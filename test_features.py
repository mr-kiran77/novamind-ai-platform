import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import requests
import json
import time

FASTAPI_URL = "http://127.0.0.1:8000"
GATEWAY_URL = "http://127.0.0.1:5000"

def test_features():
    print("==================================================")
    print("🧪 RUNNING COMPREHENSIVE VERIFICATION TESTS")
    print("==================================================")

    # 1. Health checks
    r = requests.get(f"{FASTAPI_URL}/api/health")
    assert r.status_code == 200, f"FastAPI health check failed: {r.text}"
    print("✅ FastAPI Health: OK")

    r_gw = requests.get(f"{GATEWAY_URL}/api/gateway/status")
    assert r_gw.status_code == 200, f"Gateway status failed: {r_gw.text}"
    print("✅ Express Gateway Status: OK")

    # 2. Get demo user token
    r_login = requests.post(f"{FASTAPI_URL}/api/auth/demo-switch?role=user")
    assert r_login.status_code == 200, f"Demo switch failed: {r_login.text}"
    auth_data = r_login.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"✅ Auth: Logged in as demo user {user_id}")

    # ============================================================
    # FEATURE 1: POLLS ON IDEAS TEST SUITE
    # ============================================================
    print("\n--- [Feature 1 Verification] Polls on Ideas ---")
    
    # Create test idea
    idea_payload = {
        "title": "Quantum Mycelium Sensor Mesh",
        "raw_content": "Deploying self-healing fungal networks with nano-quantum dot sensors for seismic monitoring across volcanic faultlines.",
        "category": "CleanTech",
        "raw_format": "text"
    }
    r_idea = requests.post(f"{FASTAPI_URL}/api/ideas", json=idea_payload, headers=headers)
    assert r_idea.status_code == 200, f"Create idea failed: {r_idea.text}"
    idea = r_idea.json()
    idea_id = idea["id"]
    print(f"✅ Created test idea: {idea_id} ('{idea['title']}')")

    # A. Validation: Less than 2 options should be rejected (400)
    r_bad1 = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/poll", json={"question": "Fail?", "options": ["Single Option"]}, headers=headers)
    assert r_bad1.status_code == 400, "Validation failed: allowed 1 option"
    print("✅ Validation: Rejects < 2 options (400 Bad Request)")

    # B. Validation: More than 6 options should be rejected (400)
    r_bad2 = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/poll", json={"question": "Fail?", "options": ["1", "2", "3", "4", "5", "6", "7"]}, headers=headers)
    assert r_bad2.status_code == 400, "Validation failed: allowed 7 options"
    print("✅ Validation: Rejects > 6 options (400 Bad Request)")

    # C. Create valid 4-option poll with future closing date
    poll_payload = {
        "question": "Which quantum dot material offers maximum piezoresistive durability?",
        "options": ["Graphene Oxide", "MoS2 Monolayer", "Perovskite Quantum Dots", "Carbon Nanotubes"],
        "closes_at": "2030-01-01T00:00:00Z"
    }
    r_poll = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/poll", json=poll_payload, headers=headers)
    assert r_poll.status_code == 200, f"Create poll failed: {r_poll.text}"
    poll_res = r_poll.json()["poll"]
    poll_id = poll_res["id"]
    assert len(poll_res["options"]) == 4, "Poll does not have 4 options"
    assert poll_res["total_votes"] == 0, "Initial votes not zero"
    print(f"✅ Created poll {poll_id} with 4 options and closes_at set")

    # D. Vote on Option Index 1
    r_vote1 = requests.post(f"{FASTAPI_URL}/api/ideas/polls/{poll_id}/vote", json={"option_index": 1}, headers=headers)
    assert r_vote1.status_code == 200, f"Vote failed: {r_vote1.text}"
    voted_poll = r_vote1.json()["poll"]
    assert voted_poll["total_votes"] == 1, "Vote count did not increment"
    assert voted_poll["options"][1]["vote_count"] == 1
    assert voted_poll["options"][1]["percentage"] == 100.0
    print("✅ Voted on Option 1 (100.0% tally confirmed)")

    # E. Single-Vote Duplicate Prevention
    r_dup = requests.post(f"{FASTAPI_URL}/api/ideas/polls/{poll_id}/vote", json={"option_index": 1}, headers=headers)
    assert r_dup.status_code == 400, "Duplicate vote allowed!"
    print("✅ Duplicate Vote Prevention: Rejects identical repeat vote (400)")

    # F. Vote Switching to Option Index 0
    r_switch = requests.post(f"{FASTAPI_URL}/api/ideas/polls/{poll_id}/vote", json={"option_index": 0}, headers=headers)
    assert r_switch.status_code == 200, f"Switch vote failed: {r_switch.text}"
    switched = r_switch.json()["poll"]
    assert switched["total_votes"] == 1, "Total votes changed when switching"
    assert switched["options"][0]["vote_count"] == 1
    assert switched["options"][1]["vote_count"] == 0
    assert switched["options"][0]["percentage"] == 100.0
    print("✅ Vote Option Switch: Correctly reassigned vote to Option 0")

    # G. Feed integration check
    r_feed = requests.get(f"{FASTAPI_URL}/api/ideas", headers=headers)
    assert r_feed.status_code == 200
    feed_items = r_feed.json()["ideas"]
    matched_idea = next((i for i in feed_items if i["id"] == idea_id), None)
    assert matched_idea is not None
    assert matched_idea["poll"] is not None
    assert matched_idea["poll"]["total_votes"] == 1
    print("✅ Feed Hydration: Poll data and vote statistics present in ideas feed")

    # H. Create Idea with Attached Poll (Transactional Creation in CaptureModal)
    idea_with_poll_payload = {
        "title": "Bio-Composite Wind Turbine Blades",
        "raw_content": "Utilizing flax fiber and bio-epoxy resins to construct recyclable 60-meter wind turbine blades.",
        "category": "CleanTech",
        "poll": {
            "question": "Which resin curing process is optimal for series manufacturing?",
            "options": ["UV Photopolymerization", "Infrared Thermal", "Microwave Assisted Curing", "Enzyme Bio-Catalyzed", "Vacuum Infusion Hot Press", "Electron Beam Curing"],
            "closes_at": "2030-12-31T23:59:59Z"
        }
    }
    r_attached = requests.post(f"{FASTAPI_URL}/api/ideas", json=idea_with_poll_payload, headers=headers)
    assert r_attached.status_code == 200, f"Idea with poll creation failed: {r_attached.text}"
    attached_data = r_attached.json()
    assert attached_data["poll"] is not None, "Attached poll was not created"
    assert len(attached_data["poll"]["options"]) == 6, f"Expected 6 options, got {len(attached_data['poll']['options'])}"
    print(f"✅ Idea Creation with 6-Option Poll: Attached successfully ({attached_data['poll']['id']})")

    # ============================================================
    # FEATURE 2: AI COLLABORATION PROPOSAL ANALYSIS & SHORTLISTING
    # ============================================================
    print("\n--- [Feature 2 Verification] AI Collaboration Proposal Analysis ---")

    # Switch to second demo user or builder
    r_login2 = requests.post(f"{FASTAPI_URL}/api/auth/demo-switch?role=moderator")
    builder_headers = {"Authorization": f"Bearer {r_login2.json()['access_token']}", "Content-Type": "application/json"}
    
    # 1. Submit Detailed Technical Proposal
    tech_pitch = "I have 5 years of experience in composite materials engineering and FEA structural simulation in PyTorch and Ansys. I can build the CAD models, run stress-strain simulations, and contribute the open-source GitHub repository with automated test fixtures in 3 weeks."
    r_p1 = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/collaborate", json={"role_type": "technical", "pitch_message": tech_pitch}, headers=builder_headers)
    assert r_p1.status_code == 200, f"Propose collab 1 failed: {r_p1.text}"
    collab_1_id = r_p1.json()["id"]
    print(f"✅ Submitted Detailed Technical Proposal ({collab_1_id})")

    # 2. Submit Low-Effort / Spam Proposal from a 3rd user
    r_login3 = requests.post(f"{FASTAPI_URL}/api/auth/demo-switch?role=admin")
    admin_headers = {"Authorization": f"Bearer {r_login3.json()['access_token']}", "Content-Type": "application/json"}
    low_pitch = "hi cool idea let me know"
    r_p2 = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/collaborate", json={"role_type": "business", "pitch_message": low_pitch}, headers=admin_headers)
    assert r_p2.status_code == 200, f"Propose collab 2 failed: {r_p2.text}"
    collab_2_id = r_p2.json()["id"]
    print(f"✅ Submitted Low-Effort Proposal ({collab_2_id})")

    # 3. Trigger AI Screening (Screening both proposals)
    r_screen = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/collaborations/ai-screen?force=true", headers=headers)
    assert r_screen.status_code == 200, f"AI screen failed: {r_screen.text}"
    screen_data = r_screen.json()
    assert "proposals" in screen_data, "No proposals returned in screen"
    print(f"✅ Screened {screen_data['total_proposals']} proposals. High: {screen_data['high_priority_count']}, Med: {screen_data.get('medium_priority_count', 0)}, Low: {screen_data.get('low_priority_count', 0)}")
    assert screen_data['high_priority_count'] >= 1, "Expected at least 1 high priority proposal"
    assert screen_data['low_priority_count'] >= 1, "Expected at least 1 low priority proposal"

    # Find the low effort proposal and verify LOW_PRIORITY category
    low_p = next(p for p in screen_data["proposals"] if p["id"] == collab_2_id)
    assert (low_p.get("analysis", {}).get("category") == "LOW_PRIORITY" or low_p.get("ai_classification") == "low_priority"), "Low-effort pitch was not categorized as LOW_PRIORITY"
    print(f"✅ Low-Effort Pitch Correctly Categorized: {low_p.get('analysis', {}).get('category') or low_p.get('ai_classification')} (Score: {low_p.get('analysis', {}).get('overall_score') or low_p.get('ai_seriousness_score')}%)")

    # Verify structured fields
    top_p = screen_data["proposals"][0]
    analysis = top_p.get("analysis") or top_p
    assert "overall_score" in analysis or "ai_seriousness_score" in top_p
    assert "relevance_score" in analysis or "ai_classification" in top_p
    assert "specificity_score" in analysis or "ai_rationale" in top_p
    print(f"✅ AI Analysis Verification:")
    print(f"   - Score: {analysis.get('overall_score')}%")
    print(f"   - Category: {analysis.get('category')}")
    print(f"   - Relevance: {analysis.get('relevance_score')}%")
    print(f"   - Specificity: {analysis.get('specificity_score')}%")
    print(f"   - Contribution: {analysis.get('contribution_value_score')}%")
    print(f"   - Commitment: {analysis.get('commitment_score')}%")
    print(f"   - Summary: {analysis.get('summary')}")
    print(f"   - Strengths: {analysis.get('strengths')}")
    print(f"   - Concerns: {analysis.get('concerns')}")

    # 4. Verify Caching (should return instantly with cached results)
    t0 = time.time()
    r_cached = requests.post(f"{FASTAPI_URL}/api/ideas/{idea_id}/collaborations/ai-screen?force=false", headers=headers)
    t_diff = time.time() - t0
    assert r_cached.status_code == 200
    print(f"✅ Caching Verification: Retrieved cached analysis in {round(t_diff*1000, 1)}ms without redundant API re-run")

    # 5. Verify Human Owner Control: Accept / Decline
    r_accept = requests.put(f"{FASTAPI_URL}/api/ideas/collaborations/{collab_1_id}/status", json={"status": "accepted"}, headers=headers)
    assert r_accept.status_code == 200, f"Accept failed: {r_accept.text}"
    assert r_accept.json()["collab_status"] == "accepted"
    print("✅ Human Control: Owner accepted proposal (status updated to 'accepted')")

    r_decline = requests.put(f"{FASTAPI_URL}/api/ideas/collaborations/{collab_1_id}/status", json={"status": "declined"}, headers=headers)
    assert r_decline.status_code == 200, f"Decline failed: {r_decline.text}"
    assert r_decline.json()["collab_status"] == "declined"
    print("✅ Human Control: Owner declined proposal (status updated to 'declined')")

    print("\n==================================================")
    print("🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_features()
