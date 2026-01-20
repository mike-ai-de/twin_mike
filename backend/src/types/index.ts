import { z } from 'zod';

// ============================================================================
// EXTRACTION SCHEMAS (LLM Output Structure)
// ============================================================================

export const FactSchema = z.object({
  fact_type: z.string(),
  value: z.record(z.any()),
  confidence: z.number().min(0).max(1).default(1.0),
  source_turn_ids: z.array(z.string()),
});

export const TimelineEntrySchema = z.object({
  start_date: z.string(),
  end_date: z.string().nullable(),
  org: z.string(),
  role: z.string(),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  kpis: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).nullable(),
  reason_for_change: z.string().nullable(),
  confidence: z.number().min(0).max(1).default(1.0),
  source_turn_ids: z.array(z.string()),
});

export const SkillSchema = z.object({
  skill: z.string(),
  level: z.number().int().min(1).max(5).default(3),
  evidence: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(1.0),
  source_turn_ids: z.array(z.string()),
});

export const PreferenceSchema = z.object({
  category: z.string(),
  value: z.record(z.any()),
  confidence: z.number().min(0).max(1).default(1.0),
  source_turn_ids: z.array(z.string()),
});

export const ArtifactSchema = z.object({
  artifact_type: z.enum(['template', 'process', 'checklist', 'playbook', 'link', 'file']),
  title: z.string(),
  summary: z.string().nullable(),
  content_ref: z.string().nullable(),
  tags: z.array(z.string()).default([]),
  source_turn_ids: z.array(z.string()),
});

export const OpenQuestionSchema = z.object({
  module: z.string(),
  question: z.string(),
  priority: z.enum(['H', 'M', 'L']),
  reason: z.string().nullable(),
});

export const RiskOrContradictionSchema = z.object({
  issue: z.string(),
  detail: z.string(),
  suggested_resolution: z.string(),
});

export const ExtractionOutputSchema = z.object({
  module: z.enum(['profile_header', 'timeline', 'skills', 'principles', 'assets', 'stakeholders', 'goals']),
  facts: z.array(FactSchema).default([]),
  timeline_entries: z.array(TimelineEntrySchema).default([]),
  skills: z.array(SkillSchema).default([]),
  preferences: z.array(PreferenceSchema).default([]),
  artifacts: z.array(ArtifactSchema).default([]),
  open_questions: z.array(OpenQuestionSchema).default([]),
  risks_or_contradictions: z.array(RiskOrContradictionSchema).default([]),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type TimelineEntryData = z.infer<typeof TimelineEntrySchema>;
export type SkillData = z.infer<typeof SkillSchema>;
export type PreferenceData = z.infer<typeof PreferenceSchema>;
export type ArtifactData = z.infer<typeof ArtifactSchema>;
export type OpenQuestionData = z.infer<typeof OpenQuestionSchema>;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export const CreateSessionSchema = z.object({
  personId: z.string(),
  module: z.string().optional(),
});

export const AddTurnSchema = z.object({
  speaker: z.enum(['agent', 'user']),
  transcript: z.string(),
  audioUrl: z.string().nullable().optional(),
  meta: z.record(z.any()).optional(),
});

export const GetNextQuestionSchema = z.object({
  lastUserTranscript: z.string().optional(),
});

export const TriggerExtractionSchema = z.object({
  turnIds: z.array(z.string()).optional(), // if empty, extracts last block
});

export const SearchKBSchema = z.object({
  q: z.string().min(1),
  types: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).default(20),
});

export const AuthStartSchema = z.object({
  email: z.string().email(),
});

export const AuthVerifySchema = z.object({
  token: z.string(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type AddTurnInput = z.infer<typeof AddTurnSchema>;
export type GetNextQuestionInput = z.infer<typeof GetNextQuestionSchema>;
export type TriggerExtractionInput = z.infer<typeof TriggerExtractionSchema>;
export type SearchKBInput = z.infer<typeof SearchKBSchema>;
export type AuthStartInput = z.infer<typeof AuthStartSchema>;
export type AuthVerifyInput = z.infer<typeof AuthVerifySchema>;

// ============================================================================
// CONNECTOR INTERFACE
// ============================================================================

export interface ConnectorResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IConnector {
  id: string;
  name: string;
  capabilities: ('read' | 'write' | 'search' | 'webhook')[];

  // CRUD
  create(entity: string, data: any): Promise<ConnectorResult>;
  read(entity: string, id: string): Promise<ConnectorResult>;
  update(entity: string, id: string, data: any): Promise<ConnectorResult>;
  delete(entity: string, id: string): Promise<ConnectorResult>;

  // Search
  search(entity: string, query: string): Promise<ConnectorResult[]>;

  // Health
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// MODULE DEFINITIONS
// ============================================================================

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  estimatedTurns: number;
  promptInstructions: string;
}

export const MODULES: Record<string, ModuleDefinition> = {
  profile_header: {
    id: 'profile_header',
    name: 'Profile Header',
    description: 'Basic facts: current role, location, education, certifications',
    estimatedTurns: 8,
    promptInstructions: `
Focus on extracting:
- Current role and organization
- Location (city/country)
- Highest education level
- Key certifications
- Years of professional experience
Ask concise, direct questions. One question per turn.
Verify facts by repeating them back if confidence < 0.8.
    `.trim(),
  },
  timeline: {
    id: 'timeline',
    name: 'Career Timeline',
    description: 'Professional history: roles, responsibilities, achievements, KPIs',
    estimatedTurns: 12,
    promptInstructions: `
Focus on extracting for each role:
- Organization, role title, dates (start/end)
- Key responsibilities (3-5 bullet points)
- Measurable achievements (KPIs, metrics, impact)
- Reason for leaving (if appropriate)

Use funnel technique: start broad, then dig into specifics.
For each role, ask: "What were your key achievements with measurable impact?"
    `.trim(),
  },
  skills: {
    id: 'skills',
    name: 'Skills & Expertise',
    description: 'Technical and soft skills with proficiency levels and evidence',
    estimatedTurns: 10,
    promptInstructions: `
Focus on extracting:
- Skill name and category (technical, leadership, domain)
- Proficiency level (1-5)
- Evidence (specific projects, years of use, certifications)
- Tags for categorization

Ask: "What tools/technologies have you used extensively?"
Then: "For [skill], can you give an example of where you applied it?"
    `.trim(),
  },
};
