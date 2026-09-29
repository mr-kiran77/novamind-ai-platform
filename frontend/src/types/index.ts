// NovaMind Core TypeScript Interfaces

export type StageType =
  | 'raw_thought'
  | 'structured'
  | 'discussion'
  | 'improved'
  | 'prototype'
  | 'project'
  | 'opportunity';

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: 'user' | 'moderator' | 'admin';
  bio?: string;
  interests?: string[];
  skills?: string[];
  location?: string;
  education?: string;
  occupation?: string;
  links?: string[];
  reputation_score?: number;
  current_streak?: number;
  longest_streak?: number;
  is_private?: boolean;
  is_verified?: boolean;
  created_at?: string;
  mobile?: string;
}

export interface UserSettings {
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  notify_collaborations: boolean;
  notify_polls: boolean;
  notify_reactions: boolean;
  notify_copilot: boolean;
  auto_run_copilot: boolean;
  default_jurisdiction: string;
  ai_tone: 'creative' | 'balanced' | 'analytical';
  updated_at?: string;
}

export interface UserSession {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_used_at: string;
  is_current?: boolean;
}

export interface FeedbackPayload {
  category: 'general' | 'bug' | 'feature' | 'help';
  message: string;
  rating?: number;
  email?: string;
}

export interface StructuredBlueprint {
  title?: string;
  one_line_summary?: string;
  problem_statement?: string;
  proposed_solution?: string;
  how_it_works?: string;
  who_it_helps?: string;
  why_it_matters?: string;
  possible_benefits?: string[];
  challenges_risks?: string[];
  possible_challenges?: string[];
  required_resources?: string[];
  suggested_tech_stack?: string[];
  technology_required?: string[];
  practical_use_cases?: string[];
  potential_applications?: string[];
  market_feasibility_score?: number;
  [key: string]: any;
}

export interface PollOption {
  index: number;
  text: string;
  vote_count: number;
  percentage: number;
}

export interface Poll {
  id: string;
  idea_id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  user_voted_option?: number | null;
  closes_at?: string | null;
  is_closed?: boolean;
  created_by?: string;
  created_at: string;
}

export interface CollaborationAnalysis {
  id?: string;
  collaboration_id: string;
  idea_id: string;
  overall_score: number;
  relevance_score: number;
  specificity_score: number;
  contribution_value_score: number;
  commitment_score: number;
  category: 'HIGH_PRIORITY' | 'MEDIUM_PRIORITY' | 'LOW_PRIORITY' | 'NEEDS_REVIEW' | string;
  summary: string;
  strengths: string[];
  concerns: string[];
  model_version: string;
  status: string;
  created_at?: string;
}

export interface Idea {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  title: string;
  category: string;
  stage: StageType;
  raw_content: string;
  raw_format: 'text' | 'voice' | 'image' | 'video' | 'document';
  media_urls?: string[];
  structured_data?: StructuredBlueprint | any;
  tags: string[];
  reaction_count: number;
  comment_count: number;
  collab_count: number;
  save_count?: number;
  share_count?: number;
  view_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_following_author?: boolean;
  poll?: Poll | null;
  jurisdiction?: string;
  copilot_status?: CopilotState;
  copilot_progress?: number;
  copilot?: IdeaCopilotData | null;
  created_at: string;
  [key: string]: any;
}

export type CopilotState =
  | 'PENDING'
  | 'ANALYZING_IDEA'
  | 'RESEARCHING'
  | 'SYNTHESIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'NOT_STARTED';

export interface CopilotSource {
  title: string;
  url: string;
  publisher: string;
  relevance: string;
  last_verified: string;
}

export interface CopilotIdeaUnderstanding {
  summary: string;
  sector: string;
  problem: string;
  solution: string;
  target_users: string[];
  jurisdiction: string;
}

export interface CopilotResearchStatus {
  status: string;
  last_verified: string;
  sources_found: number;
}

export interface CopilotReport {
  idea_understanding: CopilotIdeaUnderstanding;
  research_status: CopilotResearchStatus;
  top_actions: Array<{
    title: string;
    description: string;
    priority: string;
    category?: string;
    timeframe?: string;
  }>;
  government_support: Array<{
    scheme_name: string;
    agency: string;
    benefit: string;
    eligibility: string;
    link: string;
    application_tip?: string;
  }>;
  legal_regulatory: Array<{
    regulation: string;
    governing_body: string;
    requirement: string;
    compliance_step: string;
    risk_level?: string;
  }>;
  safety_and_ethics: Array<{
    risk_factor: string;
    category: string;
    mitigation_strategy: string;
    safeguard_recommendation?: string;
  }>;
  tax_compliance: Array<{
    topic: string;
    obligation_or_incentive: string;
    guideline: string;
    disclaimer_note?: string;
  }>;
  intellectual_property: Array<{
    type: string;
    recommendation: string;
    filing_strategy: string;
    potential_prior_art_risk?: string;
  }>;
  standards_certifications: Array<{
    standard: string;
    issuing_organization: string;
    scope: string;
    readiness_stage?: string;
  }>;
  idea_improvements: Array<{
    dimension: string;
    gap_identified: string;
    suggested_enhancement: string;
    mvp_priority?: string;
  }>;
  execution_plan: string[];
  risks_and_unknowns: Array<{
    risk: string;
    impact: string;
    mitigation: string;
  }>;
  sources: CopilotSource[];
  disclaimers?: string[];
}

export interface IdeaCopilotData {
  id?: string;
  idea_id: string;
  status: CopilotState;
  current_step: string;
  progress: number;
  jurisdiction: string;
  report: CopilotReport | null;
  error_message?: string;
  updated_at?: string;
}

export interface CollaborationProposal {
  id: string;
  idea_id: string;
  requester_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role_type: string;
  pitch_message: string;
  status: 'pending' | 'accepted' | 'declined';
  analysis?: CollaborationAnalysis | null;
  ai_seriousness_score?: number; // 0-100%
  ai_classification?: string;
  ai_rationale?: string;
  created_at: string;
}

export interface GovernmentScheme {
  id: string;
  scheme_name: string;
  ministry: string;
  category: string;
  max_grant_amount: string;
  eligibility: string;
  portal_url: string;
  description: string;
  match_score?: number;
  rationale?: string;
}
