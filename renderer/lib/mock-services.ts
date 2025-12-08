import { MOCK_TRANSLATION_RESULT } from '@/components/workspace/constants'
import { ChatMessage, HistoryEntry, WorkspaceFile } from '@/components/workspace/types'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(32)}-${Math.random().toString(16).slice(2)}`

export async function mockParseDocument(file: WorkspaceFile) {
  await wait(500)
  return {
    fileName: file.name,
    size: file.size,
    content: `已解析 ${file.name}`
  }
}

export async function mockTranslateContent(_payload: {
  parserId: string
  llmId: string
  promptId: string
  content: string
}) {
  await wait(1200)
  return {
    markdown: MOCK_TRANSLATION_RESULT
  }
}

export async function mockChatResponse(message: string): Promise<ChatMessage> {
  await wait(600)
  return {
    id: `chat-${randomId()}`,
    role: 'ai',
    content: `(Mini 模式) 收到：“${message}”`,
    createdAt: Date.now()
  }
}

export async function mockAgentRewrite(query: string, current: string) {
  await wait(900)
  return `${current}\n\n> **[AI 修订]** 根据指令「${query}」完成润色。`
}

export async function mockHistoryEntries(): Promise<HistoryEntry[]> {
  await wait(200)
  return [
    { id: 'his-1', name: '项目计划书_en.pdf', time: '2 分钟前', type: 'pdf' },
    { id: 'his-2', name: 'Meeting_Notes.docx', time: '昨天', type: 'word' },
    { id: 'his-3', name: 'Screenshot_001.png', time: '3 天前', type: 'image' }
  ]
}

export async function mockScreenshotFile(): Promise<WorkspaceFile> {
  await wait(400)
  const blob = new Blob(['mock screenshot'], { type: 'image/png' })
  const file = new File([blob], `Screenshot_${Date.now()}.png`, {
    type: 'image/png'
  })
  return {
    id: randomId(),
    name: file.name,
    size: file.size,
    source: 'paste',
    file
  }
}
