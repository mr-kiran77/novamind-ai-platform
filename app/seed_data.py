import uuid
import json
import logging
from datetime import datetime, timedelta, timezone
from app.database import get_db, init_db
from app.services.auth_service import auth_service
from app.services.agent_orchestrator import orchestrator
from app.services.ai_providers import ai_registry

logger = logging.getLogger("novamind.seed")

async def seed_all():
    """Seeds rich, realistic demonstration data for hackathon evaluation."""
    init_db()
    orchestrator.ensure_registry_initialized()

    provider = ai_registry.get_provider()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM users")
        if cursor.fetchone()["c"] > 0:
            logger.info("Database already seeded. Skipping seed.")
            return

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    t_minus_1d = (now - timedelta(days=1)).isoformat()
    t_minus_2d = (now - timedelta(days=2)).isoformat()
    t_minus_3d = (now - timedelta(days=3)).isoformat()

    # 1. Seed Demo Accounts
    users = [
        {
            "id": "usr_maya_lin",
            "mobile": "+19876543210",
            "username": "mayalin",
            "display_name": "Dr. Maya Lin",
            "role": "user",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "bio": "Clean Energy Researcher & Renewable Hardware Architect. Focused on microgrid kinetic harvesting.",
            "interests": ["Energy & Sustainability", "Materials Science", "IoT", "Smart Cities"],
            "skills": ["Piezoelectrics", "Power Conditioning", "Firmware", "CAD Prototyping"],
            "location": "Boston, MA",
            "education": "Ph.D. Applied Physics, MIT",
            "occupation": "Principal Energy Fellow",
            "reputation_score": 380,
            "current_streak": 8,
            "longest_streak": 14,
            "badges": [
                {"name": "Pioneer Spark", "icon": "⚡", "awarded_at": t_minus_3d},
                {"name": "Master Architect", "icon": "🏛️", "awarded_at": t_minus_2d},
                {"name": "7-Day Builder Streak", "icon": "🔥", "awarded_at": t_minus_1d}
            ]
        },
        {
            "id": "usr_alex_vance",
            "mobile": "+19876543211",
            "username": "alexvance",
            "display_name": "Alex Vance",
            "role": "moderator",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "bio": "Community Standards Lead & Constructive Dialogue Advocate. Ensuring every idea gets fair review.",
            "interests": ["AI Safety", "Ethics", "Open Science", "Community Governance"],
            "skills": ["Policy Review", "NLP Moderation", "Mediation"],
            "location": "San Francisco, CA",
            "education": "M.S. Symbolic Systems, Stanford",
            "occupation": "Ethics & Community Director",
            "reputation_score": 520,
            "current_streak": 12,
            "longest_streak": 22,
            "badges": [
                {"name": "Guardian of Ideas", "icon": "🛡️", "awarded_at": t_minus_3d},
                {"name": "Constructive Voice", "icon": "✨", "awarded_at": t_minus_2d}
            ]
        },
        {
            "id": "usr_sysadmin",
            "mobile": "+19876543212",
            "username": "sysadmin",
            "display_name": "System Administrator",
            "role": "admin",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "bio": "Novamind Core Infrastructure & Autonomous Multi-Agent Orchestration Administrator.",
            "interests": ["Distributed Systems", "Multi-Agent Swarms", "Vector Search", "Cybersecurity"],
            "skills": ["FastAPI", "Kubernetes", "Agentic Pipelines", "SQLite Architecture"],
            "location": "Zurich, Switzerland",
            "education": "M.Sc. Computer Science, ETH Zurich",
            "occupation": "Principal Platform Architect",
            "reputation_score": 850,
            "current_streak": 25,
            "longest_streak": 45,
            "badges": [
                {"name": "Platform Overseer", "icon": "👑", "awarded_at": t_minus_3d},
                {"name": "30-Day Innovation Streak", "icon": "🌟", "awarded_at": t_minus_1d}
            ]
        },
        {
            "id": "usr_raj_robotics",
            "mobile": "+19876543213",
            "username": "rajpatel",
            "display_name": "Raj Patel",
            "role": "user",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "bio": "Robotics & Haptics Engineer. Building tactile feedback gloves for remote surgical precision.",
            "interests": ["Robotics & Hardware", "Biomedical Devices", "Haptics", "VR"],
            "skills": ["Actuator Design", "C++ Embedded", "Kinematics", "BLE"],
            "location": "Austin, TX",
            "education": "B.S. Robotics, Carnegie Mellon",
            "occupation": "Hardware Co-founder",
            "reputation_score": 240,
            "current_streak": 5,
            "longest_streak": 9,
            "badges": [{"name": "Hardware Pioneer", "icon": "🤖", "awarded_at": t_minus_2d}]
        }
    ]

    pw_hash = auth_service.hash_password("Password123!")

    with get_db() as conn:
        cursor = conn.cursor()
        for u in users:
            cursor.execute("""
            INSERT INTO users (
                id, mobile, username, display_name, password_hash, role,
                avatar_url, bio, interests, skills, location, education,
                occupation, links, reputation_score, current_streak,
                longest_streak, last_active_date, badges, is_verified,
                is_suspended, is_banned, is_private, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, ?)
            """, (
                u["id"], u["mobile"], u["username"], u["display_name"], pw_hash, u["role"],
                u["avatar_url"], u["bio"], json.dumps(u["interests"]), json.dumps(u["skills"]),
                u["location"], u["education"], u["occupation"], json.dumps([]),
                u["reputation_score"], u["current_streak"], u["longest_streak"],
                now_iso[:10], json.dumps(u["badges"]), t_minus_3d
            ))

    # 2. Seed Rich Ideas across different media formats
    ideas_data = [
        {
            "id": "idea_piezo_roads",
            "user_id": "usr_maya_lin",
            "title": "Piezoelectric Roadways for Decentralized Highway Energy Harvesting",
            "raw_content": "I think busy highways and expressway ramps could generate substantial clean electricity from passing heavy freight vehicles using modular piezoelectric ceramic sections embedded beneath wear-resistant asphalt. The mechanical compression generates DC current that feeds into roadside battery storage banks to power LED highway illumination, emergency beacons, and automated ice-melting heating coils.",
            "raw_format": "voice",
            "category": "Energy & Sustainability",
            "stage": "improved",
            "media_urls": ["https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80"],
            "created_at": t_minus_2d
        },
        {
            "id": "idea_tactile_glove",
            "user_id": "usr_raj_robotics",
            "title": "Sub-Millimeter Tactile Haptic Glove for VR Telesurgery Training",
            "raw_content": "Surgical residents need realistic haptic texture feedback when training in virtual environments. We can build an ultra-thin silicone exoskeleton glove using microfluidic pneumatic bladder arrays that selectively pressurize to replicate the exact compliance, resistance, and elasticity of human organ tissue in real-time.",
            "raw_format": "image",
            "category": "Robotics & Hardware",
            "stage": "prototype",
            "media_urls": ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80"],
            "created_at": t_minus_1d
        },
        {
            "id": "idea_swarm_pollination",
            "user_id": "usr_maya_lin",
            "title": "Autonomous Drone Swarm for Precision Micro-Pollination in Greenhouses",
            "raw_content": "With pollinator populations declining, we designed bio-mimetic micro quadcopters equipped with soft ionic polymer bristles that pick up and deposit pollen grains with sub-millimeter precision using computer vision flower identification models.",
            "raw_format": "video",
            "category": "Agriculture & Food",
            "stage": "discussion",
            "media_urls": ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80"],
            "created_at": t_minus_3d
        },
        {
            "id": "idea_early_diagnostic_patch",
            "user_id": "usr_raj_robotics",
            "title": "Microfluidic Colorimetric Sweat Patch for Continuous Biomarker Triage",
            "raw_content": "A disposable adhesive dermal patch that extracts micro-liters of interstitial sweat through capillary micro-channels. Reagents change optical color based on cortisol, lactate, and glucose levels, readable by any smartphone camera with zero battery required.",
            "raw_format": "document",
            "category": "Healthcare & Biotech",
            "stage": "opportunity",
            "media_urls": ["https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80"],
            "created_at": t_minus_1d
        }
    ]

    for item in ideas_data:
        # Structure each idea with smart local AI
        structured = await provider.structure_idea(item["raw_content"], item["raw_format"])
        embedding = await provider.get_embedding(f"{item['title']} {item['raw_content']} {item['category']}")
        tags = structured.get("relevant_tags", [item["category"], "Innovation"])

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO ideas (
                id, user_id, title, raw_content, raw_format, media_urls,
                structured_data, category, tags, status, stage, view_count,
                save_count, share_count, embedding, safety_score, moderation_notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 42, 12, 5, ?, 98.0, '[]', ?, ?)
            """, (
                item["id"], item["user_id"], item["title"], item["raw_content"], item["raw_format"],
                json.dumps(item["media_urls"]), json.dumps(structured), item["category"],
                json.dumps(tags), item["stage"], json.dumps(embedding),
                item["created_at"], item["created_at"]
            ))

            # Add Version 1 and Version 2
            cursor.execute("""
            INSERT INTO idea_versions (id, idea_id, version_number, title, content, structured_data, change_summary, created_by, created_at)
            VALUES (?, ?, 1, ?, ?, ?, 'Initial Capture', ?, ?)
            """, (str(uuid.uuid4()), item["id"], item["title"], item["raw_content"], json.dumps(structured), item["user_id"], item["created_at"]))

            cursor.execute("""
            INSERT INTO idea_versions (id, idea_id, version_number, title, content, structured_data, change_summary, created_by, created_at)
            VALUES (?, ?, 2, ?, ?, ?, 'AI Structuring & Feasibility Review', ?, ?)
            """, (str(uuid.uuid4()), item["id"], item["title"], item["raw_content"], json.dumps(structured), item["user_id"], item["created_at"]))

    # 3. Seed Meaningful Positive Reactions
    with get_db() as conn:
        cursor = conn.cursor()
        reactions = [
            ("idea_piezo_roads", "usr_alex_vance", "insightful"),
            ("idea_piezo_roads", "usr_raj_robotics", "potential"),
            ("idea_piezo_roads", "usr_sysadmin", "solves_problem"),
            ("idea_tactile_glove", "usr_maya_lin", "creative"),
            ("idea_tactile_glove", "usr_alex_vance", "useful"),
            ("idea_swarm_pollination", "usr_raj_robotics", "inspiring"),
            ("idea_early_diagnostic_patch", "usr_maya_lin", "collaborate")
        ]
        for idea_id, user_id, r_type in reactions:
            cursor.execute("""
            INSERT OR IGNORE INTO reactions (id, idea_id, user_id, reaction_type, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), idea_id, user_id, r_type, t_minus_1d))

    # 4. Seed Threaded Constructive Comments
    with get_db() as conn:
        cursor = conn.cursor()
        c1_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO comments (id, idea_id, user_id, parent_id, content, discussion_type, comment_type, safety_status, created_at)
        VALUES (?, 'idea_piezo_roads', 'usr_raj_robotics', NULL,
                'Have you evaluated the mechanical shear stresses during freeze-thaw cycles? In cold regions, water seepage between the ceramic casing and asphalt could degrade transducer lifespan.',
                'public', 'constructive_suggestion', 'approved', ?)
        """, (c1_id, t_minus_1d))

        cursor.execute("""
        INSERT INTO comments (id, idea_id, user_id, parent_id, content, discussion_type, comment_type, safety_status, created_at)
        VALUES (?, 'idea_piezo_roads', 'usr_maya_lin', ?,
                'Excellent question Raj! We are testing an elastomer vulcanized seal around each module that allows 15% thermal expansion while maintaining IP68 hermetic water protection.',
                'public', 'comment', 'approved', ?)
        """, (str(uuid.uuid4()), c1_id, now_iso))

    # 5. Seed Collaboration Request
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO collaborations (id, idea_id, requester_id, role_type, pitch_message, status, created_at)
        VALUES (?, 'idea_piezo_roads', 'usr_raj_robotics', 'technical',
                'I can help prototype the power conditioning circuit and buck-boost converters for your piezoelectric array. I have hardware lab access.',
                'accepted', ?)
        """, (str(uuid.uuid4()), t_minus_1d))

    # 6. Seed Conversations & Realtime Messages
    with get_db() as conn:
        cursor = conn.cursor()
        conv_id = "conv_energy_team"
        cursor.execute("""
        INSERT INTO conversations (id, type, title, created_by, created_at)
        VALUES (?, 'direct', 'Piezoelectric Highway Collaboration', 'usr_maya_lin', ?)
        """, (conv_id, t_minus_1d))

        cursor.execute("INSERT INTO conversation_members (id, conversation_id, user_id, joined_at) VALUES (?, ?, 'usr_maya_lin', ?)", (str(uuid.uuid4()), conv_id, t_minus_1d))
        cursor.execute("INSERT INTO conversation_members (id, conversation_id, user_id, joined_at) VALUES (?, ?, 'usr_raj_robotics', ?)", (str(uuid.uuid4()), conv_id, t_minus_1d))

        cursor.execute("""
        INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
        VALUES (?, ?, 'usr_raj_robotics', 'Hey Maya! Glad to collaborate on the power conditioning modules.', ?)
        """, (str(uuid.uuid4()), conv_id, t_minus_1d))

        cursor.execute("""
        INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
        VALUES (?, ?, 'usr_maya_lin', 'Thanks Raj! I just updated the idea journey to Stage 4 (Improved Concept). Let us review the CAD schematics!', ?)
        """, (str(uuid.uuid4()), conv_id, now_iso))

    logger.info("Seed data creation complete!")
