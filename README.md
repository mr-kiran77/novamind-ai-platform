# 🚀 NOVAMIND — Full-Stack AI Innovation, Idea Structuring & Collaboration Platform
### Hackathon: "SHIP TO BUILD WITH AI"

> *"Capture ideas before they disappear. Decompose raw thoughts into 22-field structured execution blueprints, filter collaboration spam with AI screening, and assemble teams to ship with an autonomous 50-agent swarm."*

---

## 🏗️ Dual-Engine Microservices Architecture

NovaMind operates on a high-throughput dual-engine microservices topology to separate fast static/reverse-proxy routing from deep AI orchestration:

```
[ Client Browser / Mobile Devices ]
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Layer 1 & 2: Node.js Express API Gateway (Port 5000)  │
│  - Serves Compiled React 19 + TypeScript + Vite SPA    │
│  - Reverse Proxies /api/* & /ws/* to Python AI Engine  │
│  - Telemetry & Health Dashboard at /api/gateway/status │
└────────────────────────┬───────────────────────────────┘
                         │ (Proxy Dispatch)
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 3: Python 3.12 + FastAPI AI Engine (Port 8000)  │
│  - 50-Agent Autonomous Innovation Swarm (/api/swarm)   │
│  - 22-Field Structured Blueprint Decomposition         │
│  - AI Collaborator Screening (Genuine vs. Time-Pass)   │
│  - Local SQLite WAL Database + Supabase pgvector       │
└────────────────────────┬───────────────────────────────┘
                         │ (Multi-Agent Neural Mesh)
                         ▼
┌────────────────────────────────────────────────────────┐
│  Layer 4: Google Gemini 3.8 Flash AI Orchestrator      │
│  - Parallel Structured Output & Feasibility Modeling   │
│  - High-Fidelity Local Offline Fallback Engine         │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Feature Modules

### 1. 🛡️ Privacy-First Pseudonymous Authentication
- Instagram/Telegram style: Login strictly with Unique `@handle` or mobile number + password.
- Zero personal emails collected; zero real names required.
- Demo role switcher on navbar (`Dr. Maya Lin (User)`, `Alex Vance (Moderator)`, `SysAdmin (Admin)`).

### 2. 📝 Raw Idea Capture & 22-Field Structured AI Blueprint
- Multimodal capture: Quick text notes and voice thoughts (live Web Speech API and simulated transcription).
- Gemini decomposes raw thoughts into a **22-Field Execution Blueprint**:
  1. Title
  2. One-Line Summary
  3. Critical Problem Statement
  4. Proposed Solution
  5. How It Works (Step-by-step)
  6. Target Beneficiaries (Who it helps)
  7. Why It Matters
  8. Tangible Benefits (Array)
  9. Failure Risks & Blindspots (Array)
  10. Required Equipment & Resources (Array)
  11. Suggested Tech Stack (Array)
  12. Practical Use Cases (Array)
  13. Market Feasibility Score (0–100%)
  14. Related Fields & Disciplines
  15. Semantic Taxonomy Tags
  16. Engineering Improvements
  17. Open Research Questions
  18. Suggested Next Steps
  19. Potential Collaborators
  20. Prior Art & Related Ideas
  21. Business & Commercialization Model
  22. Prototype Plan & Benchtop Suggestion

### 3. 📈 Interactive 7-Stage Idea Journey Pipeline
Visual stepper on every idea card and modal:
$$\text{Raw Thought} \longrightarrow \text{Structured Blueprint} \longrightarrow \text{Community Review} \longrightarrow \text{Improved Version} \longrightarrow \text{Working Prototype} \longrightarrow \text{Project Launch} \longrightarrow \text{Opportunity \& Grant}$$

### 4. ❤️ Full Social Interactions Suite (Instagram/LinkedIn Inspired)
- ❤️ **Like Option**: Heart icon toggle, real-time increment/decrement, animated pulse.
- 💬 **Comment Option**: Threaded comment drawer to post constructive feedback and technical advice.
- ↗️ **Multi-Channel Share Option**:
  - 1-Click Copy Direct Link
  - 1-Click Share to LinkedIn (pre-fills pitch)
  - 1-Click Share to WhatsApp
  - 1-Click Share to Twitter / X
  - Native Device Share Sheet (`navigator.share`) for phones.
- 🔖 **Save Option**: Bookmark idea into personal vault; feed includes a **"Saved Vault"** filter pill.
- 👤 **Follow Option**: Follow creators; displays follower counts and mutual connection badges.

### 5. 📊 Instagram-Style Community Polls
- Attach a poll to any idea with a question and 2 to 4 options.
- Visitors tap an option to vote or dynamically change their choice.
- Animated gradient progress bars display real-time percentage breakdowns and total vote tallies.

### 6. 🤝 AI Collaborator Screening Engine (Filter Time-Pass vs. Serious)
- Solves the problem of idea hosts being overwhelmed by hundreds of low-effort collaboration offers.
- Gemini evaluates each proposal's `pitch_message`, deliverables, and tech proof:
  - **Seriousness Score (0–100%)**
  - **Classification Badges**: `✨ High Priority (Genuine)`, `⚡ Moderate Interest`, or `⚠️ Flagged as Low Effort (Time-Pass)`
  - **AI Rationale**: Explains why the proposal is genuine (e.g. offers specific PyTorch code or lab hardware) or spam (e.g. "hi, cool idea, let's collab").
- Collaborator Queue includes filter pills: `All`, `✨ High Priority Only`, and `⚠️ Flagged Low Effort`.

### 7. 🎯 Talent Matchmaker & Outreach (LinkedIn & Naukri)
- **Automated Boolean Talent Search Engine**: Generates 1-click deep search URLs matching the idea's tech stack:
  - LinkedIn People Boolean Search
  - Naukri Talent Search
  - GitHub Open-Source Developers Search
  - Wellfound Startup Talent Search
- **1-Click Viral LinkedIn Post Generator**: Auto-generates an engaging LinkedIn recruitment post with hashtags (`#BuildInPublic`, `#ShipToBuildWithAI`) and a direct link to the blueprint, complete with a 1-click **"Share on LinkedIn"** button.

### 8. 🏛️ Government Schemes & Startup Grants Intelligence
- **Pre-Loaded Indian & Central Schemes**: Automatically matched to the idea's sector:
  - **Startup India Seed Fund Scheme (SISFS)** — Up to ₹20L grant + ₹50L convertible debt.
  - **NIDHI-PRAYAS (DST)** — Up to ₹10L prototype grant (0% equity).
  - **BIRAC Biotechnology Ignition Grant (BIG)** — Up to ₹50L for BioTech/HealthTech.
  - **SAMRIDH Scheme (MeitY)** — Up to ₹40L tech accelerator funding.
  - **Atal Innovation Mission (AIM)** — Incubation support & prototype grants.
- **Custom Portal URL Analyzer**: Enter **ANY website URL** (e.g. `https://www.startupindia.gov.in`), and Nova AI analyzes the portal for eligible schemes and grant criteria.

### 9. 🐝 Nova AI Innovation Mentor & 50-Agent Autonomous Swarm
- Floating drawer with Web Speech API speech synthesis narration.
- Context-aware: Automatically tracks the active idea being inspected.
- Suggestion prompt chips: *"Review market feasibility"*, *"Find high-risk blindspots"*, *"Write 60-second elevator pitch"*.
- **50-Agent Swarm (`/api/assistant/swarm`)**:
  - **Domain Specialists (15 Agents)**: Quantum, CleanTech, BioTech, NeuroTech, SpaceTech, Robotics, AI/ML, Edge IoT, Materials, Manufacturing, MedTech, AgriTech, Mobility, Security, Distributed Systems.
  - **Risk Auditors (15 Agents)**: Stress Testing, Blindspots, Regulatory Compliance, IP & Patents, Unit Economics, Supply Chain, Scalability, Carbon Footprint, Cybersecurity, Privacy, Biosafety, AI Ethics, UX Friction, Single Points of Failure, Disaster Recovery.
  - **Angel Scouts (20 Agents)**: Y-Combinator Early Signals, DeepTech VC, Climate Capital, Sovereign Tech, Angel Syndicates, M&A Partners, Founder-Market Fit, TAM Sizers, Moats, Viral Loops, Accelerators, SISFS Scout, NIDHI-PRAYAS Scout, BIRAC BIG Scout, SAMRIDH Scout, AIM Scout, Cross-Border, ESG Foundations, Series A Milestones, Moonshot 100x.
- **1-Click Swarm Audit (`POST /api/assistant/swarm/audit`)**: Runs parallel consensus evaluation producing Domain Feasibility (0-100%), Risk Index (0-100%), Angel Attractiveness (0-100%), and identified blindspots.

---

## 🚀 1-Click Launch & Verification

### 1-Click Launcher (Windows)
Double-click `run_all.bat`:
```cmd
run_all.bat
```
Starts:
1. **Python FastAPI AI Engine** on `http://localhost:8000`
2. **Node.js Express API Gateway** on `http://localhost:5000`
3. **React 19 Frontend SPA** at `http://localhost:5000`

### 1-Click System Verification & Diagnostics
Run the automated test suites:
```powershell
# Run Backend Diagnostics
powershell -ExecutionPolicy Bypass -Command "$env:PYTHONPATH='c:\Users\USER\Downloads\antygravity ai\.venv\Lib\site-packages;c:\Users\USER\Downloads\antygravity ai'; & $env:APPDATA\uv\python\cpython-3.12.14-windows-x86_64-none\python.exe test_app.py"

# Run Dual-Engine Integration Test (Port 5000 Gateway)
node test_e2e.js
```

### Publishing to GitHub
Run `push_to_github.bat`:
```cmd
push_to_github.bat
```
Pushes to repository: `https://github.com/mr-kiran77/novamind-ai-platform.git`

---

## 👥 Demo Personas (Pre-Seeded)

Switch personas instantly using the **Quick Switch** menu on the top navbar:

| Persona | Role | Credentials | Focus |
|---|---|---|---|
| **Dr. Maya Lin** | `user` | Handle: `@mayalin` / Mobile: `+19876543210` / PW: `Password123!` | CleanTech & Kinetic Harvesting Researcher |
| **Alex Vance** | `moderator` | Handle: `@alexvance` / Mobile: `+19876543211` / PW: `Password123!` | Community Moderator & Content Safety Lead |
| **SysAdmin** | `admin` | Handle: `@sysadmin` / Mobile: `+19876543212` / PW: `Password123!` | Platform Infrastructure & Multi-Agent Swarm Admin |
