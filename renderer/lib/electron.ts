type ElectronBridge = {
  captureScreenshot: () => Promise<string>
  openSystemFile: () => Promise<string[]>
  performWindowAction: (action: 'close' | 'minimize' | 'maximize') => Promise<void>
}

declare global {
  interface Window {
    electron?: {
      invoke?: (channel: string, payload?: unknown) => Promise<unknown>
    }
  }
}

const hasWindow = typeof window !== 'undefined'

const fallbackBridge: ElectronBridge = {
  captureScreenshot: async () => {
    console.warn('[electronBridge] captureScreenshot fallback triggered')
    return Promise.resolve('mock-screenshot.png')
  },
  openSystemFile: async () => {
    console.warn('[electronBridge] openSystemFile fallback triggered')
    return Promise.resolve([])
  },
  performWindowAction: async action => {
    console.warn(`[electronBridge] window action fallback: ${action}`)
    return Promise.resolve()
  }
}

export const electronBridge: ElectronBridge = hasWindow && window.electron?.invoke
  ? {
      captureScreenshot: () =>
        window.electron!.invoke!('capture-screenshot').then(String),
      openSystemFile: () =>
        window.electron!.invoke!('select-file-paths').then(result => {
          if (Array.isArray(result)) {
            return result.map(String)
          }
          if (typeof result === 'string') {
            return [result]
          }
          return []
        }),
      performWindowAction: action => window.electron!.invoke!('window-action', action).then(() => {})
    }
  : fallbackBridge
