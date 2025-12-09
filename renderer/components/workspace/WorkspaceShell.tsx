/* eslint-disable no-alert */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings, Minimize2, Maximize2, Monitor } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { HistorySidebar } from './HistorySidebar'
import { MiniChat } from './MiniChat'
import { ResultPanel } from './ResultPanel'
import { SettingsDrawer } from './SettingsDrawer'
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
import { mockParseDocument, mockTranslateContent } from '@/lib/mock-services'
import { testLlmConnection } from '@/lib/llm'
import { parseFileWithMineru } from '@/lib/mineru'
import { translateSegments, type SegmentTask, requestChatCompletion } from '@/lib/translator'

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
  const [isExporting, setIsExporting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('prompts')
  const [resourceDir, setResourceDir] = useState<string | null>(null)
  const [showAgentInput, setShowAgentInput] = useState(false)
  const [agentQuery, setAgentQuery] = useState('')
  const [agentHistory, setAgentHistory] = useState<ChatMessage[]>([])
  const [isAgentWorking, setIsAgentWorking] = useState(false)
  const [prompts, setPrompts] = useState<PromptConfig[]>(DEFAULT_PROMPTS)
  const [activePromptId, setActivePromptId] = useState(prompts[0]?.id ?? 'general')
  const [promptsLoaded, setPromptsLoaded] = useState(false)
  const [isChatSending, setIsChatSending] = useState(false)
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>(DEFAULT_LLMS)
  const [activeLlmId, setActiveLlmId] = useState(llmConfigs[0]?.id ?? '')
  const [llmLoaded, setLlmLoaded] = useState(false)
  const [newPromptName, setNewPromptName] = useState('')
  const [newPromptContent, setNewPromptContent] = useState('')
  const [newLlm, setNewLlm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' })
  const [showAddLlm, setShowAddLlm] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testingLlmId, setTestingLlmId] = useState<string | null>(null)
  const [parserConfigs, setParserConfigs] = useState<ParserConfig[]>(DEFAULT_PARSERS)
  const [activeParserId, setActiveParserId] = useState(parserConfigs[0]?.id ?? '')
  const [parserLoaded, setParserLoaded] = useState(false)
  const [newParser, setNewParser] = useState({ name: '', type: 'MinerU', url: '', apiKey: '' })
  const [showAddParser, setShowAddParser] = useState(false)
  const [historyItems] = useState(DEFAULT_HISTORY)
  const [windowState, setWindowState] = useState<'normal' | 'maximized' | 'fullscreen'>('normal')
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const chatAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    const loadLlmConfigs = async () => {
      if (electronBridge.getLlmConfigs) {
        try {
          const stored = await electronBridge.getLlmConfigs()
          const list = Array.isArray((stored as any).llms) ? ((stored as any).llms as LlmConfig[]) : []
          const activeId = (stored as any).activeId as string | undefined
          if (list.length) {
            setLlmConfigs(list)
            setActiveLlmId(activeId || list[0]?.id || '')
            setLlmLoaded(true)
            return
          }
        } catch (error) {
          console.warn('[workspace] load llm configs failed, fallback to default', error)
        }
      }
      setLlmConfigs(DEFAULT_LLMS)
      setActiveLlmId(DEFAULT_LLMS[0]?.id ?? '')
      setLlmLoaded(true)
    }
    loadLlmConfigs()
  }, [])

  useEffect(() => {
    const loadPrompts = async () => {
      if (electronBridge.getPromptConfigs) {
        try {
          const stored = await electronBridge.getPromptConfigs()
          const list = Array.isArray((stored as any).prompts)
            ? ((stored as any).prompts as PromptConfig[])
            : []
          const activeId = (stored as any).activeId as string | undefined
          if (list.length) {
            setPrompts(list)
            setActivePromptId(activeId || list[0]?.id || '')
            setPromptsLoaded(true)
            return
          }
        } catch (error) {
          console.warn('[workspace] load prompts failed, fallback to default', error)
        }
      }
      setPrompts(DEFAULT_PROMPTS)
      setActivePromptId(DEFAULT_PROMPTS[0]?.id ?? '')
      setPromptsLoaded(true)
    }
    loadPrompts()
  }, [])

  useEffect(() => {
    if (!promptsLoaded) return
    if (electronBridge.setPromptConfigs) {
      electronBridge
        .setPromptConfigs({ prompts, activeId: activePromptId })
        .catch(error => console.warn('[workspace] persist prompts failed', error))
    }
  }, [prompts, activePromptId, promptsLoaded])

  useEffect(() => {
    if (!llmLoaded) return
    if (electronBridge.setLlmConfigs) {
      electronBridge
        .setLlmConfigs({ llms: llmConfigs, activeId: activeLlmId })
        .catch(error => console.warn('[workspace] persist llm configs failed', error))
    }
  }, [llmConfigs, activeLlmId, llmLoaded])

  useEffect(() => {
    const loadParserConfigs = async () => {
      if (electronBridge.getParserConfigs) {
        try {
          const stored = await electronBridge.getParserConfigs()
          const list = Array.isArray((stored as any).parsers)
            ? ((stored as any).parsers as ParserConfig[])
            : []
          const activeId = (stored as any).activeId as string | undefined
          if (list.length) {
            setParserConfigs(list)
            setActiveParserId(activeId || list[0]?.id || '')
            setParserLoaded(true)
            return
          }
        } catch (error) {
          console.warn('[workspace] load parser configs failed, fallback to default', error)
        }
      }
      setParserConfigs(DEFAULT_PARSERS)
      setActiveParserId(DEFAULT_PARSERS[0]?.id ?? '')
      setParserLoaded(true)
    }
    loadParserConfigs()
  }, [])

  useEffect(() => {
    if (!parserLoaded) return
    if (electronBridge.setParserConfigs) {
      electronBridge
        .setParserConfigs({ parsers: parserConfigs, activeId: activeParserId })
        .catch(error => console.warn('[workspace] persist parser configs failed', error))
    }
  }, [parserConfigs, activeParserId, parserLoaded])

  useEffect(() => {
    if (openSettingsOnMount) {
      setShowSettings(true)
      setSettingsTab('prompts')
    }
  }, [openSettingsOnMount])

  const updateContent = (newContent: string) => {
    setMarkdownOutput(newContent)
  }

  const processTranslation = async (file: WorkspaceFile) => {
    setIsProcessing(true)
    setProcessingStep({ label: '正在读取文件...', percent: 5 })
    try {
      const parser = parserConfigs.find(item => item.id === activeParserId)
      if (parser?.type === 'MinerU') {
        if (!file.file) {
          throw new Error('当前未拿到上传的文件对象，无法调用 MinerU。请使用上传/拖拽方式。')
        }
        console.info('[workspace] mineru start', parser.url, parser.name)
        const parseResult = await parseFileWithMineru(file.file, parser, step => setProcessingStep(step))
        console.info('[workspace] mineru done', parseResult)
        setResourceDir(parseResult.extractDir)
        const llmConfig = llmConfigs.find(item => item.id === activeLlmId)
        const promptConfig = prompts.find(item => item.id === activePromptId)
        const headerLines = [
          '# MinerU 解析完成',
          `- 文件：${parseResult.fileName}`,
          `- Batch ID：${parseResult.batchId}`,
          `- ZIP 下载：${parseResult.fullZipUrl}`,
          `- 解压目录：${parseResult.extractDir}`,
          parseResult.fullMdPath ? `- full.md：${parseResult.fullMdPath}` : '',
          ''
        ].filter(Boolean)
        const canTranslate =
          !!llmConfig?.apiKey &&
          !!llmConfig?.baseUrl &&
          !!llmConfig?.model &&
          !!promptConfig?.content &&
          !!electronBridge.readDir &&
          !!electronBridge.readLocalFile

        let translatedMarkdown: string | null = null
        if (canTranslate) {
          try {
            setProcessingStep({ label: '解析完成，准备翻译...', percent: 87 })
            translatedMarkdown = await translateMineruContentList({
              extractDir: parseResult.extractDir,
              llm: llmConfig!,
              prompt: promptConfig!.content,
              onProgress: (done, total) => {
                const percent = 87 + Math.round((done / Math.max(total, 1)) * 12)
                setProcessingStep({
                  label: `大模型翻译中 (${done}/${total})...`,
                  percent: Math.min(percent, 99)
                })
              }
            })
          } catch (error) {
            console.warn('[workspace] translate content_list failed', error)
          }
        } else {
          console.info('[workspace] skip translation：配置不完整或缺少读写能力')
        }

        const markdownBody =
          translatedMarkdown ??
          (parseResult.fullMdContent ||
            '未能读取 full.md，请手动检查解压目录中的内容。')
        const header = [
          ...headerLines,
          markdownBody
        ]
        updateContent(header.join('\n'))
        setAgentHistory([])
        setProcessingStep({ label: '完成', percent: 100 })
      } else {
        setResourceDir(null)
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
        setAgentHistory([])
      }
      if (mode !== 'full') {
        appendChat({
          id: makeId(),
          role: 'ai',
          content: `文件 ${file.name} 处理完成！`,
          createdAt: Date.now()
        })
      }
    } catch (error) {
      console.error('[workspace] 解析失败', error)
      setProcessingStep({ label: '解析失败', percent: 100 })
      updateContent(`解析失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFilesSelected = (files: FileList | File[]) => {
    const file = Array.from(files ?? [])[0]
    if (!file) return
    console.info('[workspace] selected file', file.name, file.size)
    const workspaceFile: WorkspaceFile = {
      id: makeId(),
      name: file.name,
      size: file.size,
      source: 'upload',
      file
    }
    setFiles([workspaceFile])
    processTranslation(workspaceFile)
  }

  const appendChat = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message])
  }
  const updateChatContent = (id: string, updater: (content: string) => string) => {
    setChatHistory(prev =>
      prev.map(item => (item.id === id ? { ...item, content: updater(item.content) } : item))
    )
  }

  const handleSendMessage = async () => {
    if (!inputContent.trim()) return
    if (isChatSending) return
    const llmConfig = llmConfigs.find(item => item.id === activeLlmId)
    if (!llmConfig?.baseUrl || !llmConfig?.apiKey || !llmConfig?.model) {
      alert('请先在“设置-大模型”中配置可用的模型')
      return
    }
    const promptConfig = prompts.find(item => item.id === activePromptId)
    const systemPrompt =
      promptConfig?.content || '你是专业的语言助手，请用中文简洁回答用户问题。'
    const userMessage: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: inputContent,
      createdAt: Date.now()
    }
    const conversation = [...chatHistory, userMessage].slice(-10)
    appendChat(userMessage)
    setInputContent('')
    setIsChatSending(true)
    chatAbortRef.current?.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller
    const replyId = makeId()
    appendChat({
      id: replyId,
      role: 'ai',
      content: '',
      createdAt: Date.now()
    })
    try {
      const messages = [
        { role: 'system' as const, content: `${systemPrompt}\n保持回答凝练。` },
        ...conversation.map(item => ({
          role: item.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: item.content
        }))
      ]
      const answer = await requestChatCompletion(
        llmConfig,
        messages,
        0.4,
        delta => updateChatContent(replyId, prev => `${prev}${delta}`),
        controller.signal
      )
      updateChatContent(replyId, () => answer)
    } catch (error) {
      updateChatContent(
        replyId,
        () => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return '已暂停生成'
          }
          if (error instanceof Error) return `回答失败：${error.message}`
          return '回答失败：未知错误'
        }
      )
    } finally {
      chatAbortRef.current = null
      setIsChatSending(false)
    }
  }

  const handlePauseChat = () => {
    if (!isChatSending) return
    chatAbortRef.current?.abort()
  }

  const handleAgentAsk = async () => {
    if (!agentQuery.trim()) return
    const llmConfig = llmConfigs.find(item => item.id === activeLlmId)
    if (!llmConfig?.apiKey || !llmConfig?.baseUrl || !llmConfig?.model) {
      alert('请先在“设置-大模型”中配置可用的模型')
      return
    }
    setIsAgentWorking(true)
    const question: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: agentQuery,
      createdAt: Date.now()
    }
    setAgentHistory(prev => [...prev, question])
    const promptConfig = prompts.find(item => item.id === activePromptId)
    const qaPrompt =
      promptConfig?.content ||
      '你是专业的问答助手，请根据用户问题直接作答，无法回答时请说明原因。'
    setAgentQuery('')
    try {
      const answer = await requestChatCompletion(
        llmConfig,
        [
          { role: 'system', content: `${qaPrompt}\n保持答案简洁。` },
          { role: 'user', content: question.content }
        ],
        0.2
      )
      const reply: ChatMessage = {
        id: makeId(),
        role: 'ai',
        content: answer,
        createdAt: Date.now()
      }
      setAgentHistory(prev => [...prev, reply])
    } catch (error) {
      console.warn('[workspace] agent QA failed', error)
      const reply: ChatMessage = {
        id: makeId(),
        role: 'ai',
        content: error instanceof Error ? `回答失败：${error.message}` : '回答失败：未知错误',
        createdAt: Date.now()
      }
      setAgentHistory(prev => [...prev, reply])
    } finally {
      setIsAgentWorking(false)
    }
  }

  type ExportFormat = 'markdown' | 'docx' | 'pdf'

  const handleExport = async (format: ExportFormat) => {
    if (!markdownOutput || isExporting) return
    setIsExporting(true)
    const defaultFileName = files[0]?.name || 'translation.md'
    try {
      if (electronBridge.exportDocument) {
        await electronBridge.exportDocument({
          markdown: markdownOutput,
          format,
          defaultFileName,
          resourceDir: resourceDir ?? undefined
        })
        return
      }
      if (format === 'markdown') {
        const blob = new Blob([markdownOutput], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = defaultFileName.endsWith('.md') ? defaultFileName : `${defaultFileName}.md`
        link.click()
        URL.revokeObjectURL(url)
        return
      }
      alert('当前环境暂不支持该格式导出，请使用桌面版应用。')
    } catch (error) {
      console.warn('[workspace] export failed', error)
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
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
    setActiveLlmId(llm.id)
    setShowAddLlm(false)
    setTestStatus('idle')
    setNewLlm({ name: '', baseUrl: '', apiKey: '', model: '' })
  }

  const handleTestNewLlm = async () => {
    if (!newLlm.baseUrl || !newLlm.apiKey || !newLlm.model) {
      setTestStatus('error')
      return
    }
    setTestStatus('testing')
    try {
      const ms = await testLlmConnection({
        id: 'preview',
        name: newLlm.name || '临时测试',
        provider: 'openai',
        baseUrl: newLlm.baseUrl,
        apiKey: newLlm.apiKey,
        model: newLlm.model
      })
      console.info(`[llm] new config test ok in ${ms}ms`)
      setTestStatus('success')
    } catch (error) {
      console.error('[llm] new config test failed', error)
      setTestStatus('error')
    }
  }

  const handleTestExistingLlm = async (id: string) => {
    const config = llmConfigs.find(item => item.id === id)
    if (!config) return
    setTestingLlmId(id)
    try {
      const ms = await testLlmConnection(config)
      alert(`连接成功，耗时 ${ms}ms`)
    } catch (error) {
      console.error('[llm] test failed', error)
      alert('连接失败，请检查 Base URL / API Key / 模型名')
    } finally {
      setTestingLlmId(null)
    }
  }

  const handleAddParser = () => {
    if (!newParser.name) return
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
    setAgentHistory([])
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
    onAgentSubmit: handleAgentAsk,
    isAgentWorking,
    hasContent: Boolean(markdownOutput),
    history: agentHistory
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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc?.on) return
    const dispose = window.ipc.on('window-state', (state: unknown) => {
      if (state === 'fullscreen' || state === 'maximized' || state === 'normal') {
        setWindowState(state)
      }
    })
    return dispose
  }, [])

  const shellClasses = useMemo(() => {
    if (windowState !== 'normal') {
      return 'h-screen w-screen'
    }
    return mode === 'full' ? 'w-full h-[90vh] max-w-7xl' : 'h-[600px] w-[400px]'
  }, [mode, windowState])

  const containerClass = cn(
    'flex flex-col overflow-hidden bg-white/95 transition-all',
    shellClasses,
    windowState !== 'normal' ? 'rounded-none border border-slate-200 shadow-none' : 'rounded-2xl border border-slate-200 shadow-2xl'
  )

  return (
    <div
      className={cn(
        'flex min-h-screen w-full bg-transparent',
        windowState !== 'normal' ? 'items-stretch justify-stretch px-0 py-0' : 'items-center justify-center px-6 py-4'
      )}>
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        promptProps={settingsPromptProps}
        llmProps={settingsLlmProps}
        parserProps={settingsParserProps}
      />
      <div className={containerClass}>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white">
                <Image
                  src="/app-icon.png"
                  alt="Nano Translate icon"
                  width={48}
                  height={48}
                  className="rounded-md"
                />
              </div>
              <span className="font-bold text-slate-700">Nano-TransLate</span>
            </div>
          </div>
          <div className="no-drag flex items-center gap-3">
            {mode === 'full' && (
              <>
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
          {mode === 'full' && (
            <HistorySidebar
              items={historyItems}
              onSelectFiles={handleFilesSelected}
              prompts={prompts}
              activePromptId={activePromptId}
              onPromptChange={setActivePromptId}
            />
          )}
          <main className="relative flex flex-1 bg-white">
            {mode === 'mini' ? (
              <MiniChat
                chatHistory={chatHistory}
                inputValue={inputContent}
                onInputChange={setInputContent}
                onSend={handleSendMessage}
                chatEndRef={chatEndRef}
                prompts={prompts}
                activePromptId={activePromptId}
                onPromptChange={setActivePromptId}
                onClear={() => setChatHistory([])}
                isSending={isChatSending}
                onPause={handlePauseChat}
              />
            ) : (
              <>
                <ResultPanel
                  markdownOutput={markdownOutput}
                  onContentChange={updateContent}
                  onExport={handleExport}
                  isExporting={isExporting}
                  agentProps={agentProps}
                  charCount={markdownOutput.length}
                  isProcessing={isProcessing}
                  processingLabel={processingStep.label}
                  processingPercent={processingStep.percent}
                  hasFile={files.length > 0}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

type MineruContentListItem = {
  type?: string
  text?: string
  text_format?: string
  img_path?: string
  image_caption?: string[]
}

type TranslateContentListParams = {
  extractDir: string
  llm: LlmConfig
  prompt: string
  onProgress?: (done: number, total: number) => void
}

async function translateMineruContentList({
  extractDir,
  llm,
  prompt,
  onProgress
}: TranslateContentListParams): Promise<string | null> {
  if (!electronBridge.readDir || !electronBridge.readLocalFile) {
    return null
  }
  const entries = await electronBridge.readDir(extractDir).catch(() => [])
  const target = entries.find(name => name.endsWith('_content_list.json'))
  if (!target) {
    return null
  }
  const filePath = joinLocalPath(extractDir, target)
  let contentListRaw: string
  try {
    contentListRaw = await electronBridge.readLocalFile(filePath)
  } catch (error) {
    console.warn('[workspace] read content_list failed', error)
    return null
  }
  let items: MineruContentListItem[]
  try {
    const parsed = JSON.parse(contentListRaw)
    if (!Array.isArray(parsed)) return null
    items = parsed
  } catch (error) {
    console.warn('[workspace] parse content_list json failed', error)
    return null
  }
  const segments = collectTranslatableSegments(items)
  if (!segments.length) {
    return null
  }
  const translations = await translateSegments(segments, {
    llm,
    prompt,
    concurrency: 5,
    onProgress
  })
  return buildMarkdownFromContentList(items, translations)
}

function collectTranslatableSegments(items: MineruContentListItem[]): SegmentTask[] {
  const segments: SegmentTask[] = []
  items.forEach((item, index) => {
    if (!item || typeof item.type !== 'string') {
      return
    }
    if (item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
      segments.push({ id: makeSegmentKey(index, 'text'), content: item.text })
      return
    }
    if (item.type === 'image') {
      const caption = mergeImageCaptions(item.image_caption)
      if (caption) {
        segments.push({ id: makeSegmentKey(index, 'image'), content: caption })
      }
    }
  })
  return segments
}

function buildMarkdownFromContentList(items: MineruContentListItem[], translations: Map<string, string>) {
  const fragments = items
    .map((item, index) => renderContentListItem(item, index, translations))
    .filter(fragment => fragment !== null && fragment !== undefined)
    .map(fragment => fragment as string)
  return fragments.join('\n\n')
}

function renderContentListItem(item: MineruContentListItem, index: number, translations: Map<string, string>) {
  if (!item || typeof item.type !== 'string') {
    return ''
  }
  if (item.type === 'text') {
    const key = makeSegmentKey(index, 'text')
    return translations.get(key) ?? (item.text ?? '')
  }
  if (item.type === 'equation') {
    return (item.text || '').trim()
  }
  if (item.type === 'image') {
    const key = makeSegmentKey(index, 'image')
    const caption =
      translations.get(key) ??
      mergeImageCaptions(item.image_caption)
    const path = item.img_path || ''
    if (!caption) {
      return `![](${path})`
    }
    return `![](${path})  \n${caption}`
  }
  return typeof item.text === 'string' ? item.text : ''
}

function makeSegmentKey(index: number, type: 'text' | 'image') {
  return `${type}-${index}`
}

function joinLocalPath(dir: string, fileName: string) {
  const safeDir = dir.replace(/\/+$/, '')
  const safeFile = fileName.replace(/^\/+/, '')
  return `${safeDir}/${safeFile}`
}

function mergeImageCaptions(lines?: string[]) {
  if (!Array.isArray(lines)) {
    return ''
  }
  return lines
    .map(line => (typeof line === 'string' ? line.trim() : ''))
    .filter(line => line.length > 0)
    .join('\n')
}
