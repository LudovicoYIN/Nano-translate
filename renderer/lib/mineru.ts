import { ParserConfig, ProcessingStep } from '@/components/workspace/types'
import { electronBridge } from './electron'

type MineruResponse<T> = {
  code: number
  data: T
  msg?: string
}

type CreateUploadResponse = {
  batch_id: string
  file_urls: string[]
}

type ExtractResultItem = {
  file_name: string
  state: string
  err_msg?: string
  full_zip_url?: string
}

type BatchExtractResponse = {
  batch_id: string
  extract_result: ExtractResultItem[]
}

export type MineruParseResult = {
  batchId: string
  fileName: string
  fullZipUrl: string
  extractDir: string
  zipPath?: string
  state: string
  fullMdPath?: string
  fullMdContent?: string
}

const DEFAULT_BASE_URL = 'https://mineru.net'
const POLL_INTERVAL = 4000
const MAX_POLL_ATTEMPTS = 40

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const sanitizeSegment = (input: string) => input.replace(/[^a-zA-Z0-9._-]/g, '-')

const normalizeBaseUrl = (baseUrl?: string) => {
  if (!baseUrl) return DEFAULT_BASE_URL
  return baseUrl.replace(/\/+$/, '')
}

async function mineruRequest<T>({
  url,
  apiKey,
  method = 'GET',
  body
}: {
  url: string
  apiKey: string
  method?: 'GET' | 'POST'
  body?: unknown
}) {
  // 优先走主进程，避免 CORS
  if (electronBridge.mineruApiRequest) {
    const resp = await electronBridge.mineruApiRequest({
      url,
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: (body ?? null) as any,
      responseType: 'json'
    })
    const json = resp.data as MineruResponse<T> | null
    if (!json) {
      throw new Error('MinerU 返回空响应')
    }
    if (json.code !== 0) {
      throw new Error(json.msg || 'MinerU 返回非 0 状态码')
    }
    return json.data
  }

  // fallback: 直接 fetch（可能被 CORS 拦截）
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = (await res.json().catch(() => null)) as MineruResponse<T> | null
  if (!res.ok || !json) {
    const text = await res.text().catch(() => '')
    throw new Error(`MinerU 请求失败：HTTP ${res.status} ${text || res.statusText}`)
  }
  if (json.code !== 0) {
    throw new Error(json.msg || 'MinerU 返回非 0 状态码')
  }
  return json.data
}

async function applyUploadUrl(baseUrl: string, apiKey: string, file: File) {
  const data = await mineruRequest<CreateUploadResponse>({
    url: `${baseUrl}/api/v4/file-urls/batch`,
    apiKey,
    method: 'POST',
    body: {
      files: [{ name: file.name }],
      model_version: 'vlm'
    }
  })
  if (!data.batch_id || !Array.isArray(data.file_urls) || !data.file_urls.length) {
    throw new Error('MinerU 未返回 batch_id 或上传地址')
  }
  return data
}

async function uploadFile(uploadUrl: string, file: File) {
  if (electronBridge.mineruApiRequest) {
    const buffer = await file.arrayBuffer()
    const res = await electronBridge.mineruApiRequest({
      url: uploadUrl,
      method: 'PUT',
      headers: {}, // 上传接口不需要 Content-Type
      body: buffer,
      responseType: 'text'
    })
    if (!res.ok) {
      throw new Error(`上传到 MinerU 失败：HTTP ${res.status} ${res.text || ''}`)
    }
    return
  }

  // fallback: 直接 fetch（可能被 CORS 拦截）
  const res = await fetch(uploadUrl, { method: 'PUT', body: file })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`上传到 MinerU 失败：HTTP ${res.status} ${text || res.statusText}`)
  }
}

async function pollResult(baseUrl: string, apiKey: string, batchId: string, fileName: string, onProgress?: (step: ProcessingStep) => void) {
  const pollUrl = `${baseUrl}/api/v4/extract-results/batch/${batchId}`
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const percent = 55 + Math.floor((attempt / MAX_POLL_ATTEMPTS) * 25)
    onProgress?.({ label: 'MinerU 解析中...', percent })
    const data = await mineruRequest<BatchExtractResponse>({ url: pollUrl, apiKey })
    const target =
      data.extract_result.find(item => item.file_name === fileName) ||
      data.extract_result[0]
    if (!target) {
      await wait(POLL_INTERVAL)
      continue
    }
    if (target.state === 'failed') {
      throw new Error(target.err_msg || 'MinerU 解析失败')
    }
    if (target.state === 'done' && target.full_zip_url) {
      return target
    }
    await wait(POLL_INTERVAL)
  }
  throw new Error('等待 MinerU 解析结果超时，请稍后重试')
}

async function downloadAndUnzip(payload: { zipUrl: string; batchId: string; fileName: string }) {
  if (electronBridge.mineruDownloadAndUnzip) {
    return electronBridge.mineruDownloadAndUnzip(payload)
  }
  throw new Error('当前环境不支持下载/解压 MinerU 结果（缺少 Electron IPC）')
}

export async function parseFileWithMineru(
  file: File,
  parser: ParserConfig,
  onProgress?: (step: ProcessingStep) => void
): Promise<MineruParseResult> {
  if (!parser.apiKey) {
    throw new Error('请在“文档解析服务”中配置 MinerU 的 API Key')
  }
  const baseUrl = normalizeBaseUrl(parser.url)
  onProgress?.({ label: '申请上传链接...', percent: 10 })
  const uploadInfo = await applyUploadUrl(baseUrl, parser.apiKey, file)

  onProgress?.({ label: '上传文件到 MinerU...', percent: 25 })
  await uploadFile(uploadInfo.file_urls[0], file)

  onProgress?.({ label: '等待 MinerU 解析...', percent: 50 })
  const result = await pollResult(baseUrl, parser.apiKey, uploadInfo.batch_id, file.name, onProgress)

  onProgress?.({ label: '下载并解压结果...', percent: 85 })
  const safeFileName = sanitizeSegment(file.name)
  const unzipInfo = await downloadAndUnzip({
    zipUrl: result.full_zip_url!,
    batchId: uploadInfo.batch_id,
    fileName: safeFileName
  })

  let fullMdContent: string | undefined
  const fullMdPath = `${unzipInfo.extractDir.replace(/\/+$/, '')}/full.md`
  if (electronBridge.readLocalFile) {
    try {
      fullMdContent = await electronBridge.readLocalFile(fullMdPath)
    } catch (error) {
      console.warn('[mineru] read full.md failed', error)
    }
  }

  onProgress?.({ label: '完成', percent: 100 })
  return {
    batchId: uploadInfo.batch_id,
    fileName: file.name,
    fullZipUrl: result.full_zip_url!,
    extractDir: unzipInfo.extractDir,
    zipPath: unzipInfo.zipPath,
    state: result.state,
    fullMdPath,
    fullMdContent
  }
}
