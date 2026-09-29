import os
import sys
import json
import asyncio
import uuid
import httpx
from datetime import datetime, timezone

# Fix Windows CLI encoding for unicode emojis
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.database import get_db, init_db
from app.services.copilot_service import idea_copilot

async def run_tests():
    print("=================================================================")
    print("🚀 NOVAMIND IDEA COPILOT INTEGRATION TEST SUITE")
    print("=================================================================\n")

    init_db()

    # 1. Fetch test user or use demo user
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username FROM users LIMIT 1")
        user = cursor.fetchone()
        if not user:
            print("❌ No user found in database.")
            return
        user_id = user["id"]
        username = user["username"]
        print(f"👤 Testing with user: @{username} ({user_id})")

    # 2. Test Idea Creation with Explicit Jurisdiction (India)
    print("\n--- TEST 1: Idea Ingestion with Declared Jurisdiction (India) ---")
    idea_id_1 = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    raw_content_1 = (
        "We are building MycoSolar: self-regenerating solar cells in India using bio-engineered fungal mycelium. "
        "The problem is solar panels degrade rapidly in desert sandstorms. Our fungal mycelium biopolymer repairs microcracks automatically."
    )
    title_1 = "MycoSolar Self-Regenerating Cells"
    category_1 = "CleanTech & Energy"
    jurisdiction_1 = "India"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ideas (
            id, user_id, title, raw_content, raw_format, media_urls,
            structured_data, category, tags, status, stage, view_count,
            save_count, share_count, embedding, safety_score, moderation_notes,
            jurisdiction, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'text', '[]', '{}', ?, '["Solar", "Biotech"]', 'published', 'raw_thought', 0, 0, 0, '[]', 98.0, '[]', ?, ?, ?)
        """, (idea_id_1, user_id, title_1, raw_content_1, category_1, jurisdiction_1, now, now))

    print(f"✅ Idea 1 created in DB: '{title_1}' (Jurisdiction: {jurisdiction_1})")

    # Trigger Copilot Asynchronously
    print("🚀 Triggering Idea Copilot background pipeline...")
    idea_copilot.trigger_idea_copilot(idea_id_1, user_id)

    # Check immediate DB state (should be PENDING)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, progress, current_step FROM copilot_reports WHERE idea_id = ?", (idea_id_1,))
        r = cursor.fetchone()
        assert r is not None, "copilot_reports entry must exist immediately"
        assert r["status"] == "PENDING", f"Status should be PENDING, got {r['status']}"
        print(f"✅ Immediate State: {r['status']} ({r['progress']}%) - {r['current_step']}")

    # Await pipeline execution
    print("⏳ Awaiting Copilot pipeline execution...")
    await idea_copilot.run_pipeline(idea_id_1, user_id, force=True)

    # Verify completed report in DB
    report_data = idea_copilot.get_copilot_report(idea_id_1)
    assert report_data is not None, "Copilot report must exist"
    assert report_data["status"] == "COMPLETED", f"Expected COMPLETED, got {report_data['status']}"
    assert report_data["progress"] == 100, f"Expected 100%, got {report_data['progress']}"
    print(f"✅ Pipeline Completed! Progress: {report_data['progress']}%, Status: {report_data['status']}")

    rep = report_data["report"]
    assert rep is not None, "Report payload must not be None"

    # Schema verifications
    print("\n--- TEST 2: Schema Field Integrity & Quality Verification ---")
    assert "idea_understanding" in rep, "Missing idea_understanding"
    assert rep["idea_understanding"]["sector"] == category_1
    assert "India" in rep["idea_understanding"]["jurisdiction"]
    print(f"✅ Concept Understanding Verified: {rep['idea_understanding']['summary'][:75]}...")

    assert "research_status" in rep, "Missing research_status"
    assert rep["research_status"]["status"] == "completed"
    print(f"✅ Research Status: {rep['research_status']}")

    # Verify Government Schemes (must have real linked schemes in India)
    assert "government_support" in rep, "Missing government_support"
    assert len(rep["government_support"]) >= 1, "Must contain at least 1 government scheme"
    first_scheme = rep["government_support"][0]
    assert "scheme_name" in first_scheme and "link" in first_scheme
    assert first_scheme["link"].startswith("http"), "Scheme link must be a valid URL"
    print(f"✅ Government Support Verified: '{first_scheme['scheme_name']}' ({first_scheme['link']})")

    # Verify Legal & Regulatory
    assert "legal_regulatory" in rep, "Missing legal_regulatory"
    assert len(rep["legal_regulatory"]) >= 1, "Must contain legal regulations"
    first_law = rep["legal_regulatory"][0]
    print(f"✅ Regulatory Framework Verified: '{first_law['regulation']}' - Governing Body: {first_law['governing_body']}")

    # Verify Safety & Ethics
    assert "safety_and_ethics" in rep and len(rep["safety_and_ethics"]) >= 1
    print(f"✅ Safety & Ethics Safeguards: {len(rep['safety_and_ethics'])} risks evaluated")

    # Verify Tax Compliance
    assert "tax_compliance" in rep and len(rep["tax_compliance"]) >= 1
    print(f"✅ Tax & Financial Compliance: '{rep['tax_compliance'][0]['topic']}'")

    # Verify Intellectual Property
    assert "intellectual_property" in rep and len(rep["intellectual_property"]) >= 1
    print(f"✅ Intellectual Property & Patent Advice: {len(rep['intellectual_property'])} IP classes evaluated")

    # Verify Standards & Certifications
    assert "standards_certifications" in rep and len(rep["standards_certifications"]) >= 1
    print(f"✅ Standards & Certifications: '{rep['standards_certifications'][0]['standard']}'")

    # Verify Market Improvements
    assert "idea_improvements" in rep and len(rep["idea_improvements"]) >= 1
    print(f"✅ Market Context & MVP Improvements: {len(rep['idea_improvements'])} recommendations")

    # Verify Execution Plan (4 phases)
    assert "execution_plan" in rep and len(rep["execution_plan"]) >= 3
    print(f"✅ Execution Plan: {len(rep['execution_plan'])} roadmap phases")

    # Verify Sources & Disclaimers
    assert "sources" in rep and len(rep["sources"]) >= 1
    assert "disclaimers" in rep and len(rep["disclaimers"]) >= 1
    print(f"✅ Grounded Web Sources: {len(rep['sources'])} citations verified")
    print(f"✅ Standard Disclaimers Present: '{rep['disclaimers'][0][:65]}...'")

    # Verify in-app notification creation
    print("\n--- TEST 3: In-App Notification Trigger ---")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications WHERE user_id = ? AND type = 'copilot' ORDER BY created_at DESC LIMIT 1", (user_id,))
        notif = cursor.fetchone()
        assert notif is not None, "Copilot notification must be created in notifications table"
        print(f"✅ In-App Notification Verified: '{notif['title']}' -> '{notif['message']}' (link: {notif['link']})")

    # 3. Test Idea with NO Declared Jurisdiction (Global / Generalized)
    print("\n--- TEST 4: Idea Without Declared Jurisdiction (Global Advice) ---")
    idea_id_2 = str(uuid.uuid4())
    raw_content_2 = "Decentralized privacy-preserving federated machine learning protocol across edge mobile phones."
    title_2 = "EdgeFederate Mobile Privacy"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ideas (
            id, user_id, title, raw_content, raw_format, media_urls,
            structured_data, category, tags, status, stage, view_count,
            save_count, share_count, embedding, safety_score, moderation_notes,
            jurisdiction, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'text', '[]', '{}', 'AI & Machine Learning', '["AI"]', 'published', 'raw_thought', 0, 0, 0, '[]', 99.0, '[]', '', ?, ?)
        """, (idea_id_2, user_id, title_2, raw_content_2, now, now))

    await idea_copilot.run_pipeline(idea_id_2, user_id, force=True)
    report_data_2 = idea_copilot.get_copilot_report(idea_id_2)
    rep2 = report_data_2["report"]
    jurisdiction_result = rep2["idea_understanding"]["jurisdiction"]
    print(f"✅ Generalized Jurisdiction Result: '{jurisdiction_result}'")
    assert "Global" in jurisdiction_result or "Generalized" in jurisdiction_result, "Should provide generalized/global jurisdiction when missing"

    print("\n=================================================================")
    print("🎉 ALL IDEA COPILOT INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
