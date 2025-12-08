import { LlmConfig } from '@/components/workspace/types'

export type SegmentTask = {
  id: string
  content: string
}

export type TranslateSegmentsOptions = {
  llm: LlmConfig
  prompt: string
  concurrency?: number
  temperature?: number
  onProgress?: (done: number, total: number) => void
}

const DEFAULT_PROMPT = '请将以下内容翻译为中文，保持语义和格式。'

export async function translateSegments(
  segments: SegmentTask[],
  options: TranslateSegmentsOptions
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!segments.length) {
    return map
  }
  const concurrency = Math.max(1, options.concurrency ?? 5)
  let pointer = 0
  let completed = 0

  const worker = async () => {
    while (true) {
      const currentIndex = pointer++
      if (currentIndex >= segments.length) break
      const segment = segments[currentIndex]
      const translated = await callChatCompletion(options.llm, segment.content, options.prompt, options.temperature)
      map.set(segment.id, translated)
      completed += 1
      options.onProgress?.(completed, segments.length)
    }
  }

  const tasks = Array.from({ length: Math.min(concurrency, segments.length) }, () => worker())
  await Promise.all(tasks)
  return map
}

async function callChatCompletion(
  llm: LlmConfig,
  content: string,
  prompt?: string,
  temperature = 0.2
): Promise<string> {
  if (!llm?.baseUrl || !llm?.apiKey || !llm?.model) {
    throw new Error('未配置完整的大模型信息')
  }
  const body = {
    model: llm.model,
    temperature,
    messages: [
      {
        role: 'system',
        content: (prompt && prompt.trim()) || DEFAULT_PROMPT
      },
      {
        role: 'user',
        content
      }
    ]
  }
  const response = await fetch(resolveChatCompletionUrl(llm.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llm.apiKey}`
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`LLM 请求失败：HTTP ${response.status} ${text || response.statusText}`)
  }
  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[]
  } | null
  const contentText = data?.choices?.[0]?.message?.content?.trim()
  if (!contentText) {
    throw new Error('LLM 返回内容为空')
  }
  return contentText
}

function resolveChatCompletionUrl(baseUrl: string) {
  const trimmed = (baseUrl || '').replace(/\/+$/, '')
  if (!trimmed) {
    return '/v1/chat/completions'
  }
  if (/(\/v\d+\/)?chat\/completions$/i.test(trimmed)) {
    return trimmed
  }
  if (/\/v\d+$/i.test(trimmed)) {
    return `${trimmed}/chat/completions`
  }
  return `${trimmed}/v1/chat/completions`
}
