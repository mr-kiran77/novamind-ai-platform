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
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}
