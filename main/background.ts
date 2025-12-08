import path from 'path'
import { app, ipcMain, BrowserWindow, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'

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
