import { z } from 'zod'

export type SummaryMode = 'cheatsheet' | 'deepdive' | 'code_action'

export type AgentStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'

export type ActiveStage = 'curate' | 'radar' | 'focus' | 'vault'

export interface CuratorConfig {
  mode: SummaryMode
  include_timestamps: boolean
  include_pitfalls: boolean
  include_code: boolean
  custom_prompt?: string
}

export interface ProcessVideoRequest {
  video_url: string
  config: CuratorConfig
}

export interface ProcessVideoResponse {
  success: boolean
  video_id: string
  category: string
  video_title: string
  file_name: string
  file_path: string
  markdown_content: string
  execution_time_seconds: number
  message: string
}

export interface SynthesizeVideoResponse {
  success: boolean
  video_id: string
  category: string
  video_title: string
  index_summary?: string
  tags?: string[]
  markdown_content: string
  execution_time_seconds: number
  message: string
}

export interface SaveVaultRequest {
  category: string
  title: string
  content: string
  video_id?: string
  transcript_text?: string
  index_summary?: string
  tags?: string[]
}

export interface SaveVaultResponse {
  success: boolean
  file_name: string
  file_path: string
  category: string
  bytes_written: number
  message: string
}

export interface VaultNoteItem {
  file_name: string
  category: string
  title: string
  file_path: string
  modified_at: string
}

export interface VaultNotesResponse {
  success: boolean
  notes: VaultNoteItem[]
  total: number
}

export interface VideoQARequest {
  video_id: string
  question: string
}

export interface VideoQAResponse {
  success: boolean
  answer: string
  timestamp_reference: string | null
}

export interface QAHistoryItem {
  id: string
  question: string
  answer: string
  timestamp_reference: string | null
  created_at: string
}

// Focus Studio Types (my_focus.md Grounding)
export interface FocusTargetConfig {
  topics: string[]
  depth_preset: string
  anti_goals: string[]
  query_variations?: Record<string, string[]>
}

export interface FocusTargetResponse {
  success: boolean
  topics: string[]
  depth_preset: string
  anti_goals: string[]
  query_variations?: Record<string, string[]>
  raw_markdown: string
  file_path?: string
  is_custom: boolean
}

// Autonomous Learning Radar Types
export type RadarSortOption = 'relevance' | 'latest' | 'most_viewed'

export interface RadarVideoItem {
  video_id: string
  title: string
  channel: string
  duration_str: string
  thumbnail_url: string
  match_score: number
  topic_tag: string
  difficulty: string
  why_you_care: string
  time_roi_hint: string
}

export interface RadarDiscoverRequest {
  query?: string
  sort_by?: RadarSortOption
  search_id?: string
  dismissed_ids?: string[]
}

export interface RadarDiscoverResponse {
  success: boolean
  videos: RadarVideoItem[]
  query_used: string
  total_evaluated: number
  search_id?: string
  has_more?: boolean
  continuation_available?: boolean
}

// Vault-Wide Chat RAG Types
export interface VaultChatRequest {
  question: string
}

export interface VaultChatResponse {
  success: boolean
  answer: string
  cited_files: string[]
  routed_count: number
}

export interface VaultChatItem {
  id: string
  question: string
  answer: string
  cited_files: string[]
  created_at: string
}

// Obsidian Vault Settings
export interface VaultSettings {
  success: boolean
  vault_path: string
  curator_folder_name: string
  curator_vault_path: string
  exists: boolean
  writable: boolean
  total_notes: number
  message?: string
}

export interface UpdateVaultSettingsPayload {
  vault_path: string
  curator_folder_name?: string
}

// Zod schema for URL validation (FR-05)
export const videoFormSchema = z.object({
  video_url: z
    .string()
    .min(1, 'URL YouTube wajib diisi.')
    .regex(
      /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})|^[a-zA-Z0-9_-]{11}$/,
      'Format URL YouTube tidak valid (contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...)'
    ),
})

export type VideoFormValues = z.infer<typeof videoFormSchema>
