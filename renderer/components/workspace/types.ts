export type WorkspaceMode = 'full' | 'mini'

export interface PromptConfig {
  id: string
  name: string
  content: string
}

export interface LlmConfig {
  id: string
  name: string
  provider: string
  baseUrl: string
  apiKey: string
  model: string
}

export interface ParserConfig {
  id: string
  name: string
  type: string
  url: string
  apiKey?: string
}

export interface HistoryEntry {
  id: string
  name: string
  time: string
  type: 'pdf' | 'word' | 'image'
  status?: 'processing' | 'done' | 'failed'
  batchId?: string
  extractDir?: string
  fullMdPath?: string
  fullZipUrl?: string
  error?: string
  createdAt?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  createdAt: number
}

export interface ProcessingStep {
  label: string
  percent: number
}

export interface WorkspaceFile {
  id: string
  name: string
  size: number
  source: 'upload' | 'paste' | 'history'
  file?: File
}

export type SettingsTab = 'prompts' | 'llm' | 'parser'
