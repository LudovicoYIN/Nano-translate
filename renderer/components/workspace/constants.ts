import { ChatMessage, HistoryEntry, LlmConfig, ParserConfig, PromptConfig } from './types'

export const MOCK_TRANSLATION_RESULT = `# 项目计划书 (AI 示例)

## 1. 概要
本项目旨在交付一套集 OCR、文档解析与 AI 翻译为一体的桌面助手，针对技术文档提供高质量的双语对照。

## 2. 核心功能
- **多格式导入**：支持 Word (.docx)、PDF 以及常见图片格式。
- **Markdown 导出**：所有内容最终转为 Markdown，便于版本管理与再编辑。
- **Mini 模式**：全局快捷键唤出，随时发起对话或粘贴截图。

## 3. 技术栈
推荐使用 Electron 或 Tauri 获取系统级截屏权限，前端采用 Next.js + TailwindCSS。

> 以上为模拟翻译结果，真实环境中会展示解析后的双语内容。`

export const DEFAULT_PROMPTS: PromptConfig[] = [
  {
    id: 'general',
    name: '通用翻译',
    content: '请将以下内容翻译为中文，保持语义顺畅，风格自然。'
  },
  {
    id: 'it',
    name: 'IT/技术',
    content:
      '请翻译为中文，保留专业术语（如 API、React、Hook），代码片段保持原样。'
  },
  {
    id: 'legal',
    name: '法律/合同',
    content: '请以法律中文翻译，语气严谨、格式规范，确保准确。'
  }
]

export const DEFAULT_LLMS: LlmConfig[] = [
]

export const DEFAULT_PARSERS: ParserConfig[] = [
  {
    id: 'mineru-local',
    name: 'MinerU 本地服务',
    type: 'MinerU',
    url: ''
  }
]

export const DEFAULT_HISTORY: HistoryEntry[] = [
  { id: 'his-1', name: '项目计划书_en.pdf', time: '2分钟前', type: 'pdf' },
  { id: 'his-2', name: 'Meeting_Notes.docx', time: '昨天', type: 'word' },
  { id: 'his-3', name: 'Screenshot_001.png', time: '3天前', type: 'image' }
]

export const DEFAULT_CHAT_HISTORY: ChatMessage[] = [
  {
    id: 'chat-1',
    role: 'ai',
    content: '你好！我是你的翻译助手，Mini 模式可随时发问。',
    createdAt: Date.now()
  }
]
