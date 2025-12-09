import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import { shell } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import Store from 'electron-store'
import extract from 'extract-zip'

const execFileAsync = promisify(execFile)

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1080,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    transparent: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'default',
    vibrancy: undefined,
    visualEffectState: undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.setMenuBarVisibility(false)
  const emitWindowState = (state: 'normal' | 'maximized' | 'fullscreen') => {
    mainWindow.webContents.send('window-state', state)
  }
  mainWindow.on('enter-full-screen', () => emitWindowState('fullscreen'))
  mainWindow.on('leave-full-screen', () => emitWindowState('normal'))
  mainWindow.on('maximize', () => emitWindowState('maximized'))
  mainWindow.on('unmaximize', () => emitWindowState('normal'))

  if (isProd) {
    await mainWindow.loadURL('app://./')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.handle('window-action', (_, action: 'close' | 'minimize' | 'maximize') => {
  const target = BrowserWindow.getFocusedWindow()
  if (!target) return
  switch (action) {
    case 'close':
      target.close()
      break
    case 'minimize':
      target.minimize()
      break
    case 'maximize':
      if (process.platform === 'darwin') {
        target.setFullScreen(!target.isFullScreen())
      } else if (target.isMaximized()) {
        target.unmaximize()
      } else {
        target.maximize()
      }
      break
    default:
      break
  }
})

ipcMain.handle('select-file-paths', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'docx', 'md'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('capture-screenshot', async () => {
  return ''
})

type LlmConfig = {
  id: string
  name: string
  provider: string
  baseUrl: string
  apiKey: string
  model: string
}

type LlmStoreShape = {
  llms: LlmConfig[]
  activeId?: string
}

const llmStore = new Store<LlmStoreShape>({
  name: 'llm-configs',
  defaults: { llms: [], activeId: undefined }
})

type ParserConfigShape = {
  parsers: { id: string; name: string; type: string; url: string; apiKey?: string }[]
  activeId?: string
}

const parserStore = new Store<ParserConfigShape>({
  name: 'parser-configs',
  defaults: { parsers: [], activeId: undefined }
})

type PromptStoreShape = {
  prompts: { id: string; name: string; content: string }[]
  activeId?: string
}

type HistoryStoreShape = {
  items: unknown[]
}

type ExportFormat = 'markdown' | 'pdf' | 'docx'

const promptStore = new Store<PromptStoreShape>({
  name: 'prompt-configs',
  defaults: { prompts: [], activeId: undefined }
})

const historyStore = new Store<HistoryStoreShape>({
  name: 'history',
  defaults: { items: [] }
})

ipcMain.handle('get-llm-configs', () => {
  return llmStore.store
})

ipcMain.handle('set-llm-configs', (_event, payload: LlmStoreShape) => {
  if (!payload || !Array.isArray(payload.llms)) return false
  llmStore.set('llms', payload.llms)
  llmStore.set('activeId', payload.activeId)
  return true
})

ipcMain.handle('test-llm-connection', async (_event, payload: { baseUrl: string; apiKey: string }) => {
  if (!payload?.baseUrl || !payload?.apiKey) {
    throw new Error('baseUrl/apiKey is required')
  }
  const url = `${payload.baseUrl.replace(/\/+$/, '')}/v1/models`
  const start = Date.now()
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${payload.apiKey}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  return Date.now() - start
})

ipcMain.handle('get-parser-configs', () => {
  return parserStore.store
})

ipcMain.handle('set-parser-configs', (_event, payload: ParserConfigShape) => {
  if (!payload || !Array.isArray(payload.parsers)) return false
  parserStore.set('parsers', payload.parsers)
  parserStore.set('activeId', payload.activeId)
  return true
})

ipcMain.handle('get-prompt-configs', () => {
  return promptStore.store
})

ipcMain.handle('set-prompt-configs', (_event, payload: PromptStoreShape) => {
  if (!payload || !Array.isArray(payload.prompts)) return false
  promptStore.set('prompts', payload.prompts)
  promptStore.set('activeId', payload.activeId)
  return true
})

ipcMain.handle('get-history', () => {
  return historyStore.get('items', [])
})

ipcMain.handle('set-history', (_event, payload: unknown) => {
  if (!payload || !Array.isArray(payload)) return false
  historyStore.set('items', payload)
  return true
})

ipcMain.handle('open-path', async (_event, targetPath: string) => {
  if (!targetPath) return false
  try {
    const stats = await fs.stat(targetPath).catch(() => null)
    if (stats?.isFile()) {
      await shell.showItemInFolder(targetPath)
      return true
    }
    await shell.openPath(targetPath)
    return true
  } catch (error) {
    console.warn('[open-path] failed', error)
    return false
  }
})

ipcMain.handle('delete-path', async (_event, targetPath: string) => {
  if (!targetPath) return false
  try {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  } catch (error) {
    console.warn('[delete-path] failed', error)
    return false
  }
})

const sanitizeSegment = (input: string) => input.replace(/[^a-zA-Z0-9._-]/g, '-')

const getResourcePath = (...segments: string[]) => {
  if (isProd) {
    return path.join(process.resourcesPath, ...segments)
  }
  return path.join(__dirname, '..', 'resources', ...segments)
}

const resolvePandocBinary = async () => {
  let subPath: string[] | null = null
  if (process.platform === 'darwin') {
    subPath = ['pandoc', 'mac', 'pandoc']
  } else if (process.platform === 'win32') {
    subPath = ['pandoc', 'win', 'pandoc.exe']
  }
  if (!subPath) {
    throw new Error('当前系统暂未内置 Pandoc，无法导出该格式')
  }
  const candidate = getResourcePath(...subPath)
  await fs.access(candidate).catch(() => {
    throw new Error(`未找到 Pandoc 可执行文件：${candidate}`)
  })
  return candidate
}

const runPandocExport = async (
  markdown: string,
  target: 'pdf' | 'docx' | 'html',
  outputPath: string,
  options?: { resourceDir?: string | null; extraArgs?: string[] }
) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nano-pandoc-'))
  const inputPath = path.join(tempDir, 'source.md')
  await fs.writeFile(inputPath, markdown, 'utf-8')
  const pandocPath = await resolvePandocBinary()
  const args = [
    inputPath,
    '--from',
    'markdown',
    '--standalone',
    '--to',
    target,
    '--output',
    outputPath
  ]
  if (options?.resourceDir) {
    args.push('--resource-path', options.resourceDir)
  }
  if (options?.extraArgs?.length) {
    args.push(...options.extraArgs)
  }
  try {
    await execFileAsync(pandocPath, args)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

const convertMarkdownToHtmlFile = async (markdown: string, resourceDir?: string | null) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nano-pandoc-html-'))
  const outputPath = path.join(tempDir, 'output.html')
  await runPandocExport(markdown, 'html', outputPath, {
    resourceDir: resourceDir || undefined,
    extraArgs: ['--self-contained']
  })
  return {
    htmlPath: outputPath,
    cleanup: () => fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

const exportPdfWithBrowser = async (markdown: string, outputPath: string, resourceDir?: string | null) => {
  if (!app.isReady()) {
    await app.whenReady()
  }
  const { htmlPath, cleanup } = await convertMarkdownToHtmlFile(markdown, resourceDir)
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      webSecurity: false
    }
  })
  try {
    await pdfWindow.loadURL(`file://${htmlPath}`)
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true
    })
    await fs.writeFile(outputPath, pdfBuffer)
  } finally {
    pdfWindow.close()
    await cleanup()
  }
}

ipcMain.handle(
  'mineru-download-unzip',
  async (_event, payload: { zipUrl: string; batchId: string; fileName: string }) => {
    if (!payload?.zipUrl) {
      throw new Error('zipUrl is required')
    }
    const batchId = sanitizeSegment(payload.batchId || 'unknown')
    const fileName = sanitizeSegment(payload.fileName || 'result')
    const userDir = app.getPath('userData')
    const targetDir = path.join(userDir, 'mineru', batchId, fileName)
    await fs.mkdir(targetDir, { recursive: true })
    const zipPath = path.join(targetDir, 'result.zip')
    const res = await fetch(payload.zipUrl)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`下载 MinerU 结果失败：HTTP ${res.status} ${text || res.statusText}`)
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(zipPath, buffer)
    await extract(zipPath, { dir: targetDir })
    return { extractDir: targetDir, zipPath }
  }
)

ipcMain.handle(
  'mineru-api-request',
  async (
    _event,
    payload: {
      url: string
      method?: 'GET' | 'POST' | 'PUT'
      headers?: Record<string, string>
      body?: ArrayBuffer | Uint8Array | string | Record<string, unknown> | null
      responseType?: 'json' | 'text'
    }
  ) => {
    if (!payload?.url) throw new Error('url is required')
    const method = payload.method || 'GET'
    const headers = payload.headers || {}
    let body: BodyInit | undefined
    if (method !== 'GET' && payload.body !== undefined && payload.body !== null) {
      if (payload.body instanceof ArrayBuffer || payload.body instanceof Uint8Array) {
        body = Buffer.from(payload.body)
      } else if (typeof payload.body === 'string') {
        body = payload.body
      } else {
        body = JSON.stringify(payload.body)
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      }
    }
    const res = await fetch(payload.url, { method, headers, body })
    const responseType = payload.responseType || 'json'
    let data: unknown
    let text: string | undefined
    if (responseType === 'json') {
      data = await res.json().catch(() => undefined)
    } else {
      text = await res.text().catch(() => undefined)
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }
    return { status: res.status, ok: res.ok, data, text }
  }
)

ipcMain.handle('read-dir', async (_event, dirPath: string) => {
  if (!dirPath) throw new Error('dirPath is required')
  const entries = await fs.readdir(dirPath)
  return entries
})

ipcMain.handle('read-local-file', async (_event, filePath: string) => {
  if (!filePath) throw new Error('filePath is required')
  const data = await fs.readFile(filePath, 'utf-8')
  return data
})

ipcMain.handle(
  'export-document',
  async (
    _event,
    payload: { markdown: string; format?: ExportFormat; defaultFileName?: string; resourceDir?: string | null }
  ) => {
    if (!payload?.markdown) {
      throw new Error('缺少待导出的 Markdown 内容')
    }
    const format: ExportFormat = payload.format ?? 'markdown'
    const extMap: Record<ExportFormat, { ext: string; label: string }> = {
      markdown: { ext: 'md', label: 'Markdown 文本' },
      docx: { ext: 'docx', label: 'Word 文档' },
      pdf: { ext: 'pdf', label: 'PDF 文档' }
    }
    const defaultBaseName = (payload.defaultFileName || 'translation').replace(/\.[^/.]+$/, '')
    const sanitizedDefaultName = defaultBaseName.replace(/[\\/:*?"<>|]/g, '').trim() || 'translation'
    const { ext, label } = extMap[format]
    const defaultPath = path.join(app.getPath('documents'), `${sanitizedDefaultName}.${ext}`)
    const saveResult = await dialog.showSaveDialog({
      title: `导出 ${label}`,
      defaultPath,
      filters: [{ name: label, extensions: [ext] }]
    })
    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true }
    }
    try {
      if (format === 'markdown') {
        await fs.writeFile(saveResult.filePath, payload.markdown, 'utf-8')
      } else if (format === 'docx') {
        await runPandocExport(payload.markdown, 'docx', saveResult.filePath, {
          resourceDir: payload.resourceDir
        })
      } else if (format === 'pdf') {
        await exportPdfWithBrowser(payload.markdown, saveResult.filePath, payload.resourceDir)
      }
      return { success: true, filePath: saveResult.filePath }
    } catch (error) {
      console.error('[export-document] failed', error)
      throw error
    }
  }
)
