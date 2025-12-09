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
      const translated = await requestChatCompletion(
        options.llm,
        [
          {
            role: 'system',
            content: (options.prompt && options.prompt.trim()) || DEFAULT_PROMPT
          },
          {
            role: 'user',
            content: segment.content
          }
        ],
        options.temperature
      )
      map.set(segment.id, translated)
      completed += 1
      options.onProgress?.(completed, segments.length)
    }
  }

  const tasks = Array.from({ length: Math.min(concurrency, segments.length) }, () => worker())
  await Promise.all(tasks)
  return map
}

export type ChatMessagePayload = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function requestChatCompletion(
  llm: LlmConfig,
  messages: ChatMessagePayload[],
  temperature = 0.2,
  onDelta?: (content: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (!llm?.baseUrl || !llm?.apiKey || !llm?.model) {
    throw new Error('未配置完整的大模型信息')
  }
  const body = {
    model: llm.model,
    temperature,
    messages,
    stream: Boolean(onDelta)
  }
  const response = await fetch(resolveChatCompletionUrl(llm.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llm.apiKey}`
    },
    body: JSON.stringify(body),
    signal
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`LLM 请求失败：HTTP ${response.status} ${text || response.statusText}`)
  }

  if (onDelta && response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || !line.startsWith('data:')) continue
        const dataPart = line.slice(5).trim()
        if (dataPart === '[DONE]') continue
        try {
          const parsed = JSON.parse(dataPart) as {
            choices?: { delta?: { content?: string }; message?: { content?: string } }[]
          }
          const delta =
            parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? ''
          if (delta) {
            accumulated += delta
            onDelta?.(delta)
          }
        } catch (error) {
          console.warn('[translator] parse stream chunk failed', error, dataPart)
        }
      }
    }
    if (accumulated.trim()) {
      return accumulated.trim()
    }
    // fall through to try non流式解析
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
