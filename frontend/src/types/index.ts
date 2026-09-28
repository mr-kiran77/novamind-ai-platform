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
  reputation_score?: number;
  current_streak?: number;
}

export interface StructuredBlueprint {
  title: string;
  one_line_summary: string;
  problem_statement: string;
  proposed_solution: string;
  how_it_works: string;
  who_it_helps: string;
  why_it_matters: string;
  possible_benefits: string[];
  challenges_risks: string[];
  required_resources: string[];
  suggested_tech_stack: string[];
  practical_use_cases: string[];
  market_feasibility_score?: number;
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
  created_at: string;
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
  structured_data: StructuredBlueprint;
  tags: string[];
  reaction_count: number;
  comment_count: number;
  collab_count: number;
  save_count?: number;
  share_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  is_following_author?: boolean;
  poll?: Poll | null;
  created_at: string;
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
  ai_seriousness_score?: number; // 0-100%
  ai_classification?: 'genuine_serious' | 'moderate' | 'low_effort_time_pass' | 'unreviewed';
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
