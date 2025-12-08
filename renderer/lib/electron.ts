type ElectronBridge = {
  captureScreenshot: () => Promise<string>
  openSystemFile: () => Promise<string[]>
  performWindowAction: (action: 'close' | 'minimize' | 'maximize') => Promise<void>
  getLlmConfigs?: () => Promise<{ llms: unknown; activeId?: string }>
  setLlmConfigs?: (payload: { llms: unknown; activeId?: string }) => Promise<void>
  testLlmConnection?: (payload: { baseUrl: string; apiKey: string }) => Promise<number>
  getParserConfigs?: () => Promise<{ parsers: unknown; activeId?: string }>
  setParserConfigs?: (payload: { parsers: unknown; activeId?: string }) => Promise<void>
  getPromptConfigs?: () => Promise<{ prompts: unknown; activeId?: string }>
  setPromptConfigs?: (payload: { prompts: unknown; activeId?: string }) => Promise<void>
  exportDocument?: (payload: {
    markdown: string
    format: 'markdown' | 'docx' | 'pdf'
    defaultFileName?: string
    resourceDir?: string
  }) => Promise<{ success?: boolean; filePath?: string; canceled?: boolean }>
  mineruDownloadAndUnzip?: (payload: { zipUrl: string; batchId: string; fileName: string }) => Promise<{
    extractDir: string
    zipPath?: string
  }>
  mineruApiRequest?: (payload: {
    url: string
    method?: 'GET' | 'POST' | 'PUT'
    headers?: Record<string, string>
    body?: ArrayBuffer | Uint8Array | string | Record<string, unknown> | null
    responseType?: 'json' | 'text'
  }) => Promise<{ status: number; ok: boolean; data?: unknown; text?: string }>
  readLocalFile?: (filePath: string) => Promise<string>
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
      performWindowAction: action => window.electron!.invoke!('window-action', action).then(() => {}),
      getLlmConfigs: () =>
        window.electron!.invoke!('get-llm-configs').then(result => result as { llms: unknown; activeId?: string }),
      setLlmConfigs: payload => window.electron!.invoke!('set-llm-configs', payload).then(() => {}),
      testLlmConnection: payload => window.electron!.invoke!('test-llm-connection', payload).then(Number),
      getParserConfigs: () =>
        window.electron!.invoke!('get-parser-configs').then(result => result as { parsers: unknown; activeId?: string }),
      setParserConfigs: payload => window.electron!.invoke!('set-parser-configs', payload).then(() => {}),
      getPromptConfigs: () =>
        window.electron!.invoke!('get-prompt-configs').then(result => result as { prompts: unknown; activeId?: string }),
      setPromptConfigs: payload => window.electron!.invoke!('set-prompt-configs', payload).then(() => {}),
      exportDocument: payload =>
        window.electron!.invoke!('export-document', payload).then(
          result => result as { success?: boolean; filePath?: string; canceled?: boolean }
        ),
      mineruDownloadAndUnzip: payload =>
        window.electron!.invoke!('mineru-download-unzip', payload).then(result => result as { extractDir: string; zipPath?: string }),
      mineruApiRequest: payload =>
        window.electron!.invoke!('mineru-api-request', payload).then(result => result as { status: number; ok: boolean; data?: unknown; text?: string }),
      readLocalFile: filePath => window.electron!.invoke!('read-local-file', filePath).then(String)
    }
  : fallbackBridge
