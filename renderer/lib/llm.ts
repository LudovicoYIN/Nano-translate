import { electronBridge } from './electron'
import { LlmConfig } from '@/components/workspace/types'

/**
 * 使用 GET /v1/models 测试 OpenAI 兼容服务连通性。
 * 成功返回耗时（ms），失败抛出异常。
 */
export async function testLlmConnection(config: LlmConfig) {
  // 优先走主进程 IPC，避免渲染进程的 CORS 限制
  if (electronBridge.testLlmConnection) {
    return electronBridge.testLlmConnection({ baseUrl: config.baseUrl, apiKey: config.apiKey })
  }

  // fallback（可能受 CORS 限制）
  const url = normalizeModelsUrl(config.baseUrl)
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : Date.now
  const start = now()
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return Math.round(now() - start)
}

function normalizeModelsUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, '')
  return `${trimmed}/v1/models`
}
