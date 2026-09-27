from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Authentication & Onboarding
class OTPRequest(BaseModel):
    mobile: str = Field(..., description="Mobile number with country code, e.g. +19876543210")

class OTPVerify(BaseModel):
    mobile: str
    code: str

class UserRegister(BaseModel):
    mobile: str
    otp_code: str
    username: Optional[str] = ""
    password: str
    display_name: Optional[str] = ""
    avatar_url: Optional[str] = ""
    bio: Optional[str] = ""
    interests: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    location: Optional[str] = ""
    education: Optional[str] = ""
    occupation: Optional[str] = ""
    links: Optional[List[str]] = []

class UserLogin(BaseModel):
    login_identifier: Optional[str] = Field(None, description="Unique ID / Username OR Mobile Number")
    mobile: Optional[str] = None
    password: str

class PasswordResetRequest(BaseModel):
    mobile: str

class PasswordResetConfirm(BaseModel):
    mobile: str
    otp_code: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# User Profile
class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    links: Optional[List[str]] = None
    is_private: Optional[bool] = None

# Structured Idea Model (22 Comprehensive Fields from Specification)
class StructuredIdeaData(BaseModel):
    title: str = ""
    one_line_summary: str = ""
    problem_statement: str = ""
    proposed_solution: str = ""
    how_it_works: str = ""
    who_it_helps: str = ""
    why_it_matters: str = ""
    possible_benefits: List[str] = []
    possible_challenges: List[str] = []
    required_resources: List[str] = []
    technology_required: List[str] = []
    estimated_complexity: str = "Medium"  # Low, Medium, High, Moonshot
    potential_applications: List[str] = []
    related_fields: List[str] = []
    relevant_tags: List[str] = []
    possible_improvements: List[str] = []
    open_questions: List[str] = []
    suggested_next_steps: List[str] = []
    potential_collaborators: List[str] = []
    related_ideas: List[str] = []
    possible_business_opportunity: str = ""
    research_direction: str = ""
    prototype_suggestion: str = ""

# Idea Creation & Edit
class IdeaCreateRequest(BaseModel):
    raw_content: str
    raw_format: str = "text"  # 'text', 'voice', 'audio', 'video', 'image', 'poster', 'document', 'quick_capture'
    title: Optional[str] = None
    category: Optional[str] = "General"
    tags: Optional[List[str]] = []
    media_urls: Optional[List[str]] = []
    structure_with_ai: bool = True

class IdeaUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    structured_data: Optional[Dict[str, Any]] = None
    change_summary: Optional[str] = "Updated idea details"

class IdeaStageUpdateRequest(BaseModel):
    stage: str  # 'raw_thought', 'structured', 'discussion', 'improved', 'prototype', 'project', 'opportunity'

# Reactions
class ReactionToggleRequest(BaseModel):
    reaction_type: str  # 'insightful', 'interesting', 'creative', 'useful', 'inspiring', 'potential', 'collaborate', 'learned', 'solves_problem'

# Comments & Discussions
class CommentCreateRequest(BaseModel):
    content: str
    parent_id: Optional[str] = None
    discussion_type: str = "public"  # 'public', 'private', 'direct'
    comment_type: str = "comment"  # 'comment', 'constructive_suggestion', 'question', 'collaboration_proposal'

# Collaborations
class CollaborationCreateRequest(BaseModel):
    role_type: str  # 'technical', 'design', 'business', 'research', 'mentorship', 'general'
    pitch_message: str

class CollaborationStatusUpdate(BaseModel):
    status: str  # 'accepted', 'declined'

# Messaging
class MessageCreateRequest(BaseModel):
    content: str
    media_url: Optional[str] = ""

class ConversationCreateRequest(BaseModel):
    participant_ids: List[str]
    type: str = "direct"  # 'direct', 'group'
    title: Optional[str] = ""

# Moderation & Safety
class ReportCreateRequest(BaseModel):
    target_type: str  # 'idea', 'comment', 'user', 'conversation'
    target_id: str
    reason: str
    details: Optional[str] = ""

class StrikeCreateRequest(BaseModel):
    user_id: str
    reason: str
    severity: str  # 'warning', 'restricted', 'suspended', 'banned'

class AppealCreateRequest(BaseModel):
    strike_id: Optional[str] = None
    appeal_text: str

class AppealReviewRequest(BaseModel):
    status: str  # 'approved', 'rejected'
    review_notes: str

# Assistant
class AssistantChatRequest(BaseModel):
    message: str
    context_idea_id: Optional[str] = None
    audio_response_requested: bool = False

# Search & Explore
class SemanticSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    stage: Optional[str] = None
    limit: int = 20
