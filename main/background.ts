import path from 'path'
import fs from 'fs/promises'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import Store from 'electron-store'
import extract from 'extract-zip'

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
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
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

const promptStore = new Store<PromptStoreShape>({
  name: 'prompt-configs',
  defaults: { prompts: [], activeId: undefined }
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

const sanitizeSegment = (input: string) => input.replace(/[^a-zA-Z0-9._-]/g, '-')

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

ipcMain.handle('read-local-file', async (_event, filePath: string) => {
  if (!filePath) throw new Error('filePath is required')
  const data = await fs.readFile(filePath, 'utf-8')
  return data
})
