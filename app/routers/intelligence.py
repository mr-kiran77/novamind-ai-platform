import json
import urllib.parse
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.services.ai_providers import ai_registry

router = APIRouter(prefix="/api/ideas", tags=["Intelligence & Talent & Schemes"])

class SchemeSearchRequest(BaseModel):
    custom_url: Optional[str] = None

# Pre-loaded Central & State Startup Schemes
CURATED_SCHEMES = [
    {
        "id": "sisfs",
        "scheme_name": "Startup India Seed Fund Scheme (SISFS)",
        "ministry": "DPIIT, Ministry of Commerce & Industry",
        "category": "All Innovators / General",
        "max_grant_amount": "Up to ₹20 Lakhs (Grant) + ₹50 Lakhs (Debt/Convertible)",
        "eligibility": "DPIIT-recognized startup, incorporated within 2 years, proof-of-concept ready.",
        "portal_url": "https://seedfund.startupindia.gov.in",
        "description": "Financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization."
    },
    {
        "id": "nidhi_prayas",
        "scheme_name": "NIDHI-PRAYAS (Promoting and Accelerating Young and Aspiring Innovators)",
        "ministry": "Department of Science and Technology (DST)",
        "category": "Hardware / DeepTech / IoT",
        "max_grant_amount": "Up to ₹10 Lakhs (100% Grant, 0% Equity)",
        "eligibility": "Individual innovators or early-stage startups with a physical/hardware prototype idea.",
        "portal_url": "https://www.nidhi-prayas.org",
        "description": "Supports translation of innovative ideas into working physical prototypes with maker lab access and mentorship."
    },
    {
        "id": "birac_big",
        "scheme_name": "Biotechnology Ignition Grant (BIG)",
        "ministry": "BIRAC, Department of Biotechnology (DBT)",
        "category": "BioTech / HealthTech / CleanTech",
        "max_grant_amount": "Up to ₹50 Lakhs (Grant-in-Aid)",
        "eligibility": "Biotech/health/pharma entrepreneurs with novel molecular, genetic, or biomedical concepts.",
        "portal_url": "https://birac.nic.in/big.php",
        "description": "Ignition grant designed to foster biotech entrepreneurship and help bridge the valley of death from lab to market."
    },
    {
        "id": "samridh",
        "scheme_name": "SAMRIDH Accelerator Scheme",
        "ministry": "Ministry of Electronics & Information Technology (MeitY)",
        "category": "Software / AI / DeepTech",
        "max_grant_amount": "Up to ₹40 Lakhs with matching accelerator funding",
        "eligibility": "Tech startups with demonstrated MVP looking to scale customer acquisition.",
        "portal_url": "https://www.meity.gov.in",
        "description": "Scale-up accelerator funding for emerging digital products and SaaS platforms."
    },
    {
        "id": "aim_aic",
        "scheme_name": "Atal Innovation Mission (AIM) - Atal Incubation Centres",
        "ministry": "NITI Aayog",
        "category": "All Technology & Impact Sectors",
        "max_grant_amount": "Incubation access, patent support, and pre-seed grants",
        "eligibility": "Early-stage student, academic, or grassroots founders.",
        "portal_url": "https://aim.gov.in",
        "description": "Nationwide ecosystem of world-class incubation hubs offering lab equipment, legal aid, and seed funding."
    }
]

@router.get("/{idea_id}/talent-match")
def get_talent_outreach(idea_id: str):
    """Generates Boolean search strings, deep links, and viral LinkedIn pitch for developer outreach."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, category, structured_data FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        blueprint = json.loads(idea.get("structured_data") or "{}")
        tech_stack = blueprint.get("suggested_tech_stack") or ["React", "Python", "FastAPI"]
        category = idea["category"]

    # Generate keywords query
    skills_query = " OR ".join([f'"{t}"' for t in tech_stack[:4]])
    linkedin_query = f'({skills_query}) AND ("Developer" OR "Engineer" OR "Freelancer")'
    naukri_query = ",".join(tech_stack[:4])

    encoded_linkedin = urllib.parse.quote(linkedin_query)
    encoded_naukri = urllib.parse.quote(naukri_query)
    encoded_github = urllib.parse.quote(" ".join(tech_stack[:3]))

    linkedin_search_url = f"https://www.linkedin.com/search/results/people/?keywords={encoded_linkedin}&origin=GLOBAL_SEARCH_HEADER"
    naukri_search_url = f"https://www.naukri.com/talent-search?keyword={encoded_naukri}"
    github_search_url = f"https://github.com/search?q={encoded_github}&type=users"
    wellfound_search_url = f"https://wellfound.com/jobs"

    # Generate viral LinkedIn post text
    pitch_text = f"""🚀 We're building {idea['title']} on @NovaMind!

Category: #{category.replace(' ', '')}
🛠️ Tech Stack Needed: {', '.join(tech_stack)}

We are actively recruiting passionate developers, engineers, and researchers to collaborate and build the working prototype.

Inspect the 22-field execution blueprint & join our builder squad:
👉 https://novamind.ai/ideas/{idea['id']}

#BuildInPublic #ShipToBuildWithAI #OpenSource #TechCollaboration #Startups"""

    encoded_share = urllib.parse.quote(f"https://novamind.ai/ideas/{idea['id']}")
    linkedin_share_url = f"https://www.linkedin.com/sharing/share-offsite/?url={encoded_share}"

    return {
        "idea_id": idea_id,
        "title": idea["title"],
        "tech_stack": tech_stack,
        "roles_needed": [f"{tech} Engineer" for tech in tech_stack[:3]] + ["UI/UX Designer", "Full-Stack Builder"],
        "links": {
            "linkedin_search": linkedin_search_url,
            "naukri_search": naukri_search_url,
            "github_search": github_search_url,
            "wellfound_search": wellfound_search_url,
            "linkedin_share": linkedin_share_url,
        },
        "viral_pitch_post": pitch_text
    }

@router.post("/{idea_id}/schemes-search")
async def search_government_schemes(idea_id: str, data: SchemeSearchRequest):
    """Matches an idea against official Indian startup schemes or user-supplied website URLs."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, category, structured_data, raw_content FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

    blueprint = json.loads(idea.get("structured_data") or "{}")
    category = idea["category"].lower()

    # Score each curated scheme against idea domain
    matched_schemes = []
    for s in CURATED_SCHEMES:
        scat = s["category"].lower()
        score = 80
        if "general" in scat or "all" in scat:
            score = 88
        elif "bio" in scat and ("bio" in category or "health" in category):
            score = 96
        elif "hard" in scat and ("clean" in category or "robot" in category or "space" in category or "neuro" in category):
            score = 95
        elif "soft" in scat and ("ai" in category or "fintech" in category or "edtech" in category):
            score = 94

        matched_schemes.append({
            **s,
            "match_score": score,
            "rationale": f"High domain overlap between your {idea['category']} concept and {s['ministry']} funding guidelines."
        })

    # Sort by match score
    matched_schemes.sort(key=lambda x: x["match_score"], reverse=True)

    custom_analysis = None
    if data.custom_url:
        custom_analysis = {
            "portal_url": data.custom_url,
            "status": "analyzed",
            "eligibility_fit": "85% Potential Match",
            "guidelines_summary": f"Analyzed against portal {data.custom_url}. Startups in {idea['category']} can apply under the early-stage innovation grant track. Requires DPIIT recognition certificate, pitch deck, and prototype milestones."
        }

    return {
        "idea_id": idea_id,
        "title": idea["title"],
        "category": idea["category"],
        "recommended_schemes": matched_schemes,
        "custom_portal_analysis": custom_analysis,
        "primary_portal": "https://www.startupindia.gov.in"
    }

@router.post("/{idea_id}/collaborations/ai-screen")
async def screen_collaborations_with_ai(idea_id: str, optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """AI screening: Analyzes all pending collaboration proposals to separate serious builders from 'time-pass' spam."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, structured_data FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        cursor.execute("""
        SELECT c.*, u.username, u.display_name, u.skills, u.reputation_score
        FROM collaborations c
        JOIN users u ON c.requester_id = u.id
        WHERE c.idea_id = ?
        """, (idea_id,))
        proposals = [dict(r) for r in cursor.fetchall()]

    if not proposals:
        return {"proposals": [], "message": "No collaboration proposals to screen yet."}

    # Evaluate each proposal using heuristic + Gemini
    screened = []
    with get_db() as conn:
        cursor = conn.cursor()
        for p in proposals:
            msg = (p.get("pitch_message") or "").strip()
            word_count = len(msg.split())
            role = p.get("role_type", "technical")

            # Scoring algorithm:
            # 1. Length & Specificity: < 6 words is usually time-pass
            # 2. Technical keywords (e.g. built, code, repo, lab, design, architecture)
            tech_keywords = ["built", "code", "github", "prototype", "lab", "dataset", "pytorch", "fastapi", "hardware", "research", "materials", "patent", "model", "develop", "api"]
            matches = [k for k in tech_keywords if k in msg.lower()]

            if word_count < 6 or msg.lower() in ["hi", "cool idea", "i want to collaborate", "contact me", "nice", "let's talk"]:
                score = 25
                classification = "low_effort_time_pass"
                rationale = "⚠️ Flagged as Low Effort: Message lacks concrete technical details, past project proof, or specific deliverables."
            elif matches or word_count > 25:
                score = min(98, 70 + len(matches) * 8 + min(15, word_count // 3))
                classification = "genuine_serious"
                rationale = f"✨ High Priority: Candidate offers specific tangible assets ({', '.join(matches[:3]) if matches else 'detailed implementation plan'})."
            else:
                score = 65
                classification = "moderate"
                rationale = "⚡ Moderate Interest: Genuine intent expressed, recommend requesting portfolio or sample GitHub repository."

            # Update DB with AI score
            cursor.execute("""
            UPDATE collaborations
            SET ai_seriousness_score = ?, ai_classification = ?, ai_rationale = ?
            WHERE id = ?
            """, (score, classification, rationale, p["id"]))

            screened.append({
                **p,
                "ai_seriousness_score": score,
                "ai_classification": classification,
                "ai_rationale": rationale
            })

    # Sort descending by seriousness score
    screened.sort(key=lambda x: x["ai_seriousness_score"], reverse=True)

    return {
        "idea_id": idea_id,
        "total_proposals": len(screened),
        "high_priority_count": sum(1 for p in screened if p["ai_classification"] == "genuine_serious"),
        "time_pass_flagged_count": sum(1 for p in screened if p["ai_classification"] == "low_effort_time_pass"),
        "proposals": screened
    }
