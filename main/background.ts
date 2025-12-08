import path from 'path'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import Store from 'electron-store'

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
