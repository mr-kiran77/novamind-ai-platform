# NOVAMIND - AI Innovation & Idea Structuring Platform

> *"Capture ideas before they disappear. Give every idea structure, context, discussion, and a path toward becoming something real."*

**Novamind** is a production-style, full-stack AI innovation platform developed for rapid ideation, multimodal capture, multi-agent AI blueprint structuring, constructive community collaboration, pre-publication content moderation, and real-time interaction.

---

## 🌟 Key Architecture & Capabilities

### 1. Rapid Multimodal Idea Capture
Record raw thoughts in seconds via:
- ✍️ **Write Note:** Quick textual note or problem observation.
- 🎙️ **Record Voice:** In-browser microphone capture with animated audio waveform and automated transcription.
- 📹 **Record Video:** Web camera concept demonstration and keyframe extraction.
- 📁 **Upload Media:** Support for audio (`.mp3`, `.wav`), video (`.mp4`), diagrams/posters (`.png`, `.jpg`), and research docs (`.pdf`, `.md`).
- ⚡ **30-Second Quick Capture:** Single-sentence input transformed into full concepts.

### 2. 22-Field Innovation Blueprint
Automatically converts raw thoughts into comprehensive engineering records:
1. Idea Title
2. One-Line Summary
3. Problem Statement
4. Proposed Solution
5. How It Works
6. Who It Helps
7. Why It Matters
8. Possible Benefits
9. Possible Challenges
10. Required Resources
11. Technology Required
12. Estimated Complexity (Low / Medium / High / Moonshot)
13. Potential Applications
14. Related Fields & Disciplines
15. Relevant Tags
16. Possible Improvements
17. Open Questions
18. Suggested Next Steps
19. Potential Collaborators (Skillsets)
20. Related Ideas / Prior Art
21. Business / Startup Opportunity
22. Prototype Suggestion & Research Direction

### 3. Signature Feature: Visual "Idea Journey"
Tracks every concept through its 7 lifecycle evolutionary milestones:
$$\text{Raw Thought} \longrightarrow \text{Structured Idea} \longrightarrow \text{Discussion} \longrightarrow \text{Improved Concept} \longrightarrow \text{Prototype} \longrightarrow \text{Project} \longrightarrow \text{Opportunity}$$

### 4. Meaningful Positive Reaction System
Replaces toxic downvote and like-dislike battles with 9 purposeful, spam-protected reaction tokens:
- 💡 **Insightful**
- 🔍 **Interesting**
- 🎨 **Creative**
- 🛠️ **Useful**
- ✨ **Inspiring**
- 🚀 **Potential**
- 🤝 **I Want to Collaborate**
- 📚 **I Learned Something**
- 🎯 **This Solves a Problem**

### 5. Multi-Agent AI Architecture (50 Specialist Agents)
Features an **AI Orchestrator** managing a registry of **50 specialized agents** categorized into:
- **Generation:** Idea Structuring, Summarization, Idea Improvement, Product Improvement, Personal Assistant, Future Feature Research.
- **Analysis:** Categorization, Tagging, Trend Analysis, Research Assistant, Opportunity Detection, Duplicate Idea Detection, Similarity Agent, Knowledge Extraction, Search Query Understanding, Innovation Opportunity Agent.
- **Safety & Moderation:** Content Moderation, Toxicity Detection, Spam Detection, Security Monitoring, Fraud Detection, Abuse Detection, Privacy Guard.
- **Multimodal:** Image Analysis, OCR, Audio Transcription, Video Analysis.
- **Recommendation:** Search Agent, Recommendation Agent, Collaboration Matching, Profile Recommendation, Category Recommendation.
- **Quality & QA:** Data Quality, Accessibility Review, UI Review, Documentation Agent, QA Agent, Test Generation, Release Review.
- **Operations:** Notification Agent, Engagement Agent, Streak Agent, Analytics Agent, API Monitoring, Error Analysis, Performance Analysis.

Every run records execution latency, tokens consumed, confidence score, and input/output telemetry viewable in the **Administrator Portal**.

### 6. Pre-Publication Content Safety & Constructive Criticism
- Multi-step quarantine security pipeline: Virus/script check, extension validation, text extraction, toxicity scoring.
- **Constructive Discussion Guard:** Protects technical disagreement and constructive criticism while filtering abusive harassment.
- Progressive enforcement: 1st offense (warning), 2nd offense (restricted), 3rd offense (suspension) with an integrated **User Appeals System**.

### 7. Realtime WebSockets & Private Messaging
- End-to-end 1-on-1 and group discussions.
- Live typing indicators, message history, read receipts, and online status.

### 8. Floating AI Co-Pilot ("Nova") & Voice Assistant
- Expandable bottom-right assistant providing contextual guidance based on the idea you are viewing.
- Voice input & speech synthesis for spoken interaction.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (or `uv` package manager)

### 1-Click Launch (Windows)
Double-click `run.bat` or run in PowerShell:
```powershell
.\run.ps1
```

### Manual Launch
```bash
# Using uv (fastest)
uv run python run.py

# Or standard python
python run.py
```

The application will start immediately at:
👉 **`http://127.0.0.1:8000`**

Interactive API Docs (Swagger):
👉 **`http://127.0.0.1:8000/docs`**

---

## 👥 Demo Accounts (Pre-Seeded)

For rapid hackathon judging, use the **Quick Switch Demo** dropdown in the top-right header, or log in with:

| Role | Mobile | Default Password | OTP Code (Dev) |
|---|---|---|---|
| **Innovator (User)** | `+19876543210` | `Password123!` | `123456` |
| **Community Moderator** | `+19876543211` | `Password123!` | `123456` |
| **System Administrator** | `+19876543212` | `Password123!` | `123456` |

---

## 🛠️ Technology Stack
- **Backend:** FastAPI, Uvicorn, WebSockets, Pydantic v2
- **Database:** SQLite with WAL mode (`PRAGMA journal_mode=WAL`)
- **Authentication:** Mobile OTP + BCrypt password hashing + JWT tokens
- **Vector Search:** 64-dimensional semantic projection with Cosine Similarity
- **AI Providers:** Dual Provider Architecture:
  1. *Smart Local Engine:* Zero-API-key offline engine with rich domain taxonomies.
  2. *Google Gemini API:* Pluggable Gemini 2.5 Flash / 1.5 Pro via REST.
- **Frontend:** HTML5, Tailwind CSS, Web Audio API, Web Speech API, Vanilla ES6 Modules.
