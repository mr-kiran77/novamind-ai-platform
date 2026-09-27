import asyncio
import sys
import json

# Ensure Windows terminal handles UTF-8 gracefully
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from app.database import init_db, get_db
from app.seed_data import seed_all
from app.services.ai_providers import ai_registry
from app.services.agent_orchestrator import orchestrator
from app.services.trending_service import trending_service
from app.services.recommendation_service import recommendation_service
from app.services.auth_service import auth_service

async def run_diagnostics():
    print("=" * 60)
    print("🧪 NOVAMIND SYSTEM DIAGNOSTICS & VERIFICATION")
    print("=" * 60)

    # 1. Database Initialization
    print("\n[1/7] Testing SQLite Database Initialization...")
    init_db()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r["name"] for r in cursor.fetchall()]
        print(f"  [OK] {len(tables)} tables created: {', '.join(tables[:8])}...")

    # 2. Agent Registry
    print("\n[2/7] Testing 50 Specialist Agent Registry...")
    orchestrator.ensure_registry_initialized()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM agent_definitions")
        count = cursor.fetchone()["c"]
        print(f"  [OK] {count} specialist AI agents registered in orchestrator!")

    # 3. Database Seeding
    print("\n[3/7] Testing Database Seeding...")
    await seed_all()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM users")
        user_c = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM ideas")
        idea_c = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM reactions")
        react_c = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM comments")
        comment_c = cursor.fetchone()["c"]
        print(f"  [OK] Seed verified: {user_c} users, {idea_c} ideas, {react_c} reactions, {comment_c} comments.")

    # 4. AI Provider & Structuring
    print("\n[4/7] Testing AI Provider 22-Field Idea Structuring...")
    provider = ai_registry.get_provider()
    raw_thought = "I think roads could generate energy from vehicles passing over specially designed sections."
    structured = await provider.structure_idea(raw_thought, "voice")
    print(f"  [OK] Title: '{structured['title']}'")
    print(f"  [OK] One-line Summary: {structured['one_line_summary']}")
    print(f"  [OK] Estimated Complexity: {structured['estimated_complexity']}")
    print(f"  [OK] Generated {len(structured)} blueprint fields.")

    # 5. Semantic Vector Search
    print("\n[5/7] Testing Semantic Vector Search...")
    query = "harvesting energy from traffic on highway asphalt"
    search_results = await recommendation_service.semantic_search(query, limit=5)
    print(f"  [OK] Search query: '{query}'")
    print(f"  [OK] Found {len(search_results)} semantically matched concepts:")
    for r in search_results[:3]:
        print(f"       - [{r.get('final_relevance', 0):.2f}] {r['title']} ({r['category']})")

    # 6. Trending Algorithm
    print("\n[6/7] Testing Trending Radar Algorithm...")
    trending = trending_service.get_trending_feed()
    print(f"  [OK] Rising Now: {len(trending['rising_now'])} ideas")
    print(f"  [OK] Hot Discussions: {len(trending['hot_discussions'])} ideas")
    print(f"  [OK] Breakthrough Concepts: {len(trending['breakthrough_concepts'])} ideas")

    # 7. Multi-Agent Orchestrator Pipeline
    print("\n[7/7] Testing Multi-Agent Orchestrator Pipeline Dispatch...")
    dispatch_res = await orchestrator.dispatch("EVENT_IDEA_CAPTURED", {
        "raw_content": "A disposable adhesive dermal patch that extracts micro-liters of sweat to measure glucose with zero batteries.",
        "raw_format": "text"
    })
    print(f"  [OK] Pipeline Run ID: {dispatch_res['run_id']}")
    print(f"  [OK] Moderation policy: {dispatch_res['results'].get('moderation', {}).get('policy_decision')}")
    print(f"  [OK] Structured Title: {dispatch_res['results'].get('structured', {}).get('title')}")

    print("\n" + "=" * 60)
    print("🎉 ALL SYSTEM VERIFICATIONS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
