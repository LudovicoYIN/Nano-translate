/* eslint-disable no-alert */
'use client'

import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react'
import { Languages, Settings, Minimize2, Maximize2, Monitor } from 'lucide-react'
import { HistorySidebar } from './HistorySidebar'
import { MiniChat } from './MiniChat'
import { ResultPanel } from './ResultPanel'
import { SettingsDrawer } from './SettingsDrawer'
import { SourcePanel } from './SourcePanel'
import {
  DEFAULT_CHAT_HISTORY,
  DEFAULT_HISTORY,
  DEFAULT_LLMS,
  DEFAULT_PARSERS,
  DEFAULT_PROMPTS
} from './constants'
import {
  ChatMessage,
  LlmConfig,
  ParserConfig,
  PromptConfig,
  SettingsTab,
  WorkspaceFile,
  WorkspaceMode
} from './types'
import { electronBridge } from '@/lib/electron'
import {
  mockAgentRewrite,
  mockChatResponse,
  mockParseDocument,
  mockScreenshotFile,
  mockTranslateContent
} from '@/lib/mock-services'

type WorkspaceShellProps = {
  initialMode?: WorkspaceMode
  openSettingsOnMount?: boolean
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`

export function WorkspaceShell({ initialMode = 'full', openSettingsOnMount = false }: WorkspaceShellProps) {
  const [mode, setMode] = useState<WorkspaceMode>(initialMode)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(DEFAULT_CHAT_HISTORY)
  const [inputContent, setInputContent] = useState('')
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState({ label: '', percent: 0 })
  const [markdownOutput, setMarkdownOutput] = useState('')
  const [history, setHistory] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('prompts')
  const [showAgentInput, setShowAgentInput] = useState(false)
  const [agentQuery, setAgentQuery] = useState('')
  const [isAgentWorking, setIsAgentWorking] = useState(false)
  const [isSourceCollapsed, setIsSourceCollapsed] = useState(false)
  const [prompts, setPrompts] = useState<PromptConfig[]>(DEFAULT_PROMPTS)
  const [activePromptId, setActivePromptId] = useState(prompts[0]?.id ?? 'general')
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>(DEFAULT_LLMS)
  const [activeLlmId, setActiveLlmId] = useState(llmConfigs[0]?.id ?? 'openai-1')
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptContent, setNewPromptContent] = useState('')
  const [newLlm, setNewLlm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' })
  const [showAddLlm, setShowAddLlm] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testingLlmId, setTestingLlmId] = useState<string | null>(null)
  const [parserConfigs, setParserConfigs] = useState<ParserConfig[]>(DEFAULT_PARSERS)
  const [activeParserId, setActiveParserId] = useState(parserConfigs[0]?.id ?? 'mineru-local')
  const [newParser, setNewParser] = useState({ name: '', type: 'MinerU', url: '', apiKey: '' })
  const [showAddParser, setShowAddParser] = useState(false)
  const [historyItems] = useState(DEFAULT_HISTORY)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    if (openSettingsOnMount) {
      setShowSettings(true)
      setSettingsTab('prompts')
    }
  }, [openSettingsOnMount])

  const updateContent = (newContent: string) => {
    const snapshot = history.slice(0, historyIndex + 1)
    snapshot.push(newContent)
    setHistory(snapshot)
    setHistoryIndex(snapshot.length - 1)
    setMarkdownOutput(newContent)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1
      setHistoryIndex(nextIndex)
      setMarkdownOutput(history[nextIndex])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setHistoryIndex(nextIndex)
      setMarkdownOutput(history[nextIndex])
    }
  }

  const processTranslation = async (file: WorkspaceFile) => {
    setIsProcessing(true)
    setProcessingStep({ label: '正在读取文件...', percent: 5 })
    await wait(600)
    const parsed = await mockParseDocument(file)
    setProcessingStep({ label: '正在解析文档结构...', percent: 35 })
    await wait(900)
    setProcessingStep({ label: '正在进行 AI 推理...', percent: 70 })
    const translation = await mockTranslateContent({
      parserId: activeParserId,
      llmId: activeLlmId,
      promptId: activePromptId,
      content: parsed.content
    })
    await wait(600)
    setProcessingStep({ label: '完成', percent: 100 })
    updateContent(translation.markdown)
    setIsProcessing(false)
    if (mode === 'full') {
      setIsSourceCollapsed(true)
    } else {
      appendChat({
        id: makeId(),
        role: 'ai',
        content: `文件 “${file.name}” 处理完成！`,
        createdAt: Date.now()
      })
    }
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const workspaceFile: WorkspaceFile = {
      id: makeId(),
      name: file.name,
      size: file.size,
      source: 'upload',
      file
    }
    setFiles([workspaceFile])
    setIsSourceCollapsed(false)
    processTranslation(workspaceFile)
  }

  const handlePasteScreenshot = async () => {
    setIsProcessing(true)
    setIsSourceCollapsed(false)
    try {
      await electronBridge.captureScreenshot()
    } catch (error) {
      console.warn('[workspace] captureScreenshot fallback', error)
    }
    const screenshot = await mockScreenshotFile()
    setFiles([screenshot])
    await processTranslation(screenshot)
  }

  const appendChat = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message])
  }

  const handleSendMessage = async () => {
    if (!inputContent.trim()) return
    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: inputContent,
      createdAt: Date.now()
    }
    appendChat(userMessage)
    setInputContent('')
    const reply = await mockChatResponse(userMessage.content)
    appendChat(reply)
  }

  const handleAgentModify = async () => {
    if (!agentQuery.trim() || !markdownOutput) return
    setIsAgentWorking(true)
    const newContent = await mockAgentRewrite(agentQuery, markdownOutput)
    updateContent(newContent)
    setAgentQuery('')
    setIsAgentWorking(false)
  }

  const handleCopy = async () => {
    if (!markdownOutput) return
    try {
      await navigator.clipboard.writeText(markdownOutput)
    } catch (error) {
      console.warn('复制失败', error)
    }
  }

  const handleExport = () => {
    if (!markdownOutput) return
    const blob = new Blob([markdownOutput], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'translation.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAddPrompt = () => {
    if (!newPromptName.trim()) return
    const prompt: PromptConfig = {
      id: makeId(),
      name: newPromptName,
      content: newPromptContent
    }
    setPrompts(prev => [...prev, prompt])
    setNewPromptName('')
    setNewPromptContent('')
  }

  const handleAddLlm = () => {
    if (!newLlm.name || !newLlm.baseUrl || !newLlm.apiKey) return
    const llm: LlmConfig = {
      id: makeId(),
      name: newLlm.name,
      baseUrl: newLlm.baseUrl,
      apiKey: newLlm.apiKey,
      model: newLlm.model || 'gpt-4o',
      provider: 'openai'
    }
    setLlmConfigs(prev => [...prev, llm])
    setShowAddLlm(false)
    setTestStatus('idle')
    setNewLlm({ name: '', baseUrl: '', apiKey: '', model: '' })
  }

  const handleTestNewLlm = () => {
    if (!newLlm.baseUrl || !newLlm.apiKey) {
      setTestStatus('error')
      return
    }
    setTestStatus('testing')
    setTimeout(() => {
      setTestStatus(Math.random() > 0.2 ? 'success' : 'error')
    }, 1200)
  }

  const handleTestExistingLlm = (id: string) => {
    setTestingLlmId(id)
    setTimeout(() => {
      setTestingLlmId(null)
      alert(`连接成功！延迟 ${Math.floor(Math.random() * 200 + 50)}ms`)
    }, 1000)
  }

  const handleAddParser = () => {
    if (!newParser.name || !newParser.url) return
    const parser: ParserConfig = {
      id: makeId(),
      name: newParser.name,
      type: newParser.type,
      url: newParser.url,
      apiKey: newParser.apiKey || undefined
    }
    setParserConfigs(prev => [...prev, parser])
    setShowAddParser(false)
    setNewParser({ name: '', type: 'MinerU', url: '', apiKey: '' })
  }

  const deleteItem = <T extends { id: string }>(
    list: T[],
    setList: (value: T[]) => void,
    id: string,
    onActiveReset: (newId?: string) => void
  ) => {
    const filtered = list.filter(item => item.id !== id)
    setList(filtered)
    onActiveReset(filtered[0]?.id)
  }

  const handleDeleteFile = () => {
    setFiles([])
    setMarkdownOutput('')
    setHistory([''])
    setHistoryIndex(0)
    setIsSourceCollapsed(false)
  }

  const handleReprocess = () => {
    if (files[0]) {
      processTranslation(files[0])
    }
  }

  const handleSystemFilePick = async () => {
    const paths = await electronBridge.openSystemFile()
    if (!paths.length) return
    const fileName = paths[0].split(/[/\\]/).pop() ?? '系统文件'
    const placeholder: WorkspaceFile = {
      id: makeId(),
      name: fileName,
      size: 512,
      source: 'upload'
    }
    setFiles([placeholder])
    setIsSourceCollapsed(false)
    processTranslation(placeholder)
  }

  const toggleMode = () => {
    setMode(prev => (prev === 'full' ? 'mini' : 'full'))
  }

  const handleWindowAction = (action: 'close' | 'minimize' | 'maximize') => {
    electronBridge.performWindowAction(action).catch(error => {
      console.warn('[workspace] window action failed', error)
    })
  }

  const agentProps = {
    showAgentInput,
    onToggleAgentInput: setShowAgentInput,
    agentQuery,
    onAgentQueryChange: setAgentQuery,
    onAgentSubmit: handleAgentModify,
    isAgentWorking,
    hasContent: Boolean(markdownOutput)
  }

  const settingsPromptProps = {
    prompts,
    activePromptId,
    onSelectPrompt: setActivePromptId,
    onDeletePrompt: (id: string) =>
      deleteItem(prompts, setPrompts, id, newId => {
        if (newId) setActivePromptId(newId)
      }),
    newPromptName,
    newPromptContent,
    onChangeNewPrompt: (field: 'name' | 'content', value: string) => {
      if (field === 'name') setNewPromptName(value)
      if (field === 'content') setNewPromptContent(value)
    },
    onAddPrompt: handleAddPrompt
  }

  const settingsLlmProps = {
    llmConfigs,
    activeLlmId,
    onSelectLlm: setActiveLlmId,
    onDeleteLlm: (id: string) =>
      deleteItem(llmConfigs, setLlmConfigs, id, newId => {
        if (newId) setActiveLlmId(newId)
      }),
    showAddLlm,
    onToggleAddLlm: setShowAddLlm,
    newLlm,
    onChangeNewLlm: (field: 'name' | 'baseUrl' | 'apiKey' | 'model', value: string) => {
      setNewLlm(prev => ({ ...prev, [field]: value }))
    },
    onAddLlm: handleAddLlm,
    testStatus,
    onTestNewLlm: handleTestNewLlm,
    testingLlmId,
    onTestExistingLlm: handleTestExistingLlm
  }

  const settingsParserProps = {
    parserConfigs,
    activeParserId,
    onSelectParser: setActiveParserId,
    onDeleteParser: (id: string) =>
      deleteItem(parserConfigs, setParserConfigs, id, newId => {
        if (newId) setActiveParserId(newId)
      }),
    showAddParser,
    onToggleAddParser: setShowAddParser,
    newParser,
    onChangeNewParser: (field: 'name' | 'type' | 'url' | 'apiKey', value: string) => {
      setNewParser(prev => ({ ...prev, [field]: value }))
    },
    onAddParser: handleAddParser
  }

  const shellClasses = useMemo(
    () =>
      mode === 'full'
        ? 'w-full h-[90vh] max-w-7xl'
        : 'h-[600px] w-[400px]',
    [mode]
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-4">
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        promptProps={settingsPromptProps}
        llmProps={settingsLlmProps}
        parserProps={settingsParserProps}
      />
      <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl transition-all ${shellClasses}`}>
        <header className="drag-region flex h-14 select-none items-center justify-between border-b border-slate-100 bg-slate-50/95 px-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="no-drag flex items-center gap-2">
              <button
                aria-label="关闭窗口"
                className="h-3.5 w-3.5 rounded-full bg-[#ff5f57] shadow-inner transition hover:scale-105"
                onClick={() => handleWindowAction('close')}
              />
              <button
                aria-label="最小化窗口"
                className="h-3.5 w-3.5 rounded-full bg-[#febb2e] shadow-inner transition hover:scale-105"
                onClick={() => handleWindowAction('minimize')}
              />
              <button
                aria-label="最大化窗口"
                className="h-3.5 w-3.5 rounded-full bg-[#28c840] shadow-inner transition hover:scale-105"
                onClick={() => handleWindowAction('maximize')}
              />
            </div>
            <div className="no-drag flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Languages size={18} />
              </div>
              <span className="font-bold text-slate-700">TransLate Pro</span>
              {mode === 'full' && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  AI Editor
                </span>
              )}
            </div>
          </div>
          <div className="no-drag flex items-center gap-3">
            {mode === 'full' && (
              <>
                <div className="hidden items-center gap-1 text-xs text-slate-400 md:flex">
                  <Monitor size={14} /> 截图 Ctrl+Shift+A
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-200">
                  <Settings size={18} />
                </button>
              </>
            )}
            <button
              onClick={toggleMode}
              className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50">
              {mode === 'full' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>
        <div className="no-drag flex flex-1 overflow-hidden">
          {mode === 'full' && <HistorySidebar items={historyItems} />}
          <main className="relative flex flex-1 bg-white">
            {mode === 'mini' ? (
              <MiniChat
                chatHistory={chatHistory}
                inputValue={inputContent}
                onInputChange={setInputContent}
                onSend={handleSendMessage}
                chatEndRef={chatEndRef}
              />
            ) : (
              <>
                {!isSourceCollapsed && (
                  <div className="w-1/2 border-r border-slate-100">
                    <SourcePanel
                      files={files}
                      isProcessing={isProcessing}
                      processingLabel={processingStep.label}
                      processingPercent={processingStep.percent}
                      prompts={prompts}
                      activePromptId={activePromptId}
                      onPromptChange={setActivePromptId}
                      onUpload={handleFileUpload}
                      onDeleteFile={handleDeleteFile}
                      onReprocess={handleReprocess}
                      onPasteScreenshot={handlePasteScreenshot}
                      onOpenSystemFile={handleSystemFilePick}
                    />
                  </div>
                )}
                <ResultPanel
                  markdownOutput={markdownOutput}
                  onContentChange={updateContent}
                  historyIndex={historyIndex}
                  historyLength={history.length}
                  onUndo={undo}
                  onRedo={redo}
                  onCopy={handleCopy}
                  onExport={handleExport}
                  agentProps={agentProps}
                  isSourceCollapsed={isSourceCollapsed}
                  onToggleSource={() => setIsSourceCollapsed(prev => !prev)}
                  charCount={markdownOutput.length}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
