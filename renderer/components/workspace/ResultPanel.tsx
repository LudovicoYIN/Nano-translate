'use client'

import { useState } from 'react'
import {
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  Download,
  FileCode,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Redo,
  Sparkles,
  Undo,
  X
} from 'lucide-react'

type AgentProps = {
  showAgentInput: boolean
  onToggleAgentInput: (open: boolean) => void
  agentQuery: string
  onAgentQueryChange: (value: string) => void
  onAgentSubmit: () => void
  isAgentWorking: boolean
  hasContent: boolean
}

type ResultPanelProps = {
  markdownOutput: string
  onContentChange: (value: string) => void
  historyIndex: number
  historyLength: number
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onExport: (format: 'pdf' | 'docx' | 'markdown') => void
  isExporting: boolean
  agentProps: AgentProps
  isSourceCollapsed: boolean
  onToggleSource: () => void
  charCount: number
}

export function ResultPanel({
  markdownOutput,
  onContentChange,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  onCopy,
  onExport,
  isExporting,
  agentProps,
  isSourceCollapsed,
  onToggleSource,
  charCount
}: ResultPanelProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'markdown'>('pdf')
  const exportDisabled = !markdownOutput || isExporting

  return (
    <div className="relative flex flex-1 flex-col bg-white">
      <button
        onClick={onToggleSource}
        className="absolute -left-3 top-1/2 z-50 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-colors hover:border-blue-300 hover:text-blue-600">
        {isSourceCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-700">
          <Sparkles className="text-yellow-500" size={18} />
          翻译结果
        </h2>
        <div className="flex items-center gap-2">
          <div className="mr-2 flex items-center rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={onUndo}
              disabled={historyIndex <= 0}
              className="rounded-md p-1.5 text-slate-500 transition-all hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              title="撤销">
              <Undo size={16} />
            </button>
            <div className="mx-0.5 h-4 w-px bg-slate-300" />
            <button
              onClick={onRedo}
              disabled={historyIndex >= historyLength - 1}
              className="rounded-md p-1.5 text-slate-500 transition-all hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
              title="重做">
              <Redo size={16} />
            </button>
          </div>
          <button
            className="p-2 text-slate-400 transition-colors hover:text-blue-600"
            onClick={onCopy}
            title="复制">
            <Copy size={18} />
          </button>
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={event => setExportFormat(event.target.value as 'pdf' | 'docx' | 'markdown')}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition focus:border-blue-400 focus:outline-none disabled:opacity-50"
              disabled={!markdownOutput || isExporting}>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="markdown">Markdown</option>
            </select>
            <button
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onExport(exportFormat)}
              disabled={exportDisabled}>
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 导出
            </button>
          </div>
        </div>
      </div>
      <div className="relative flex-1">
        {markdownOutput ? (
          <textarea
            className="h-full w-full resize-none p-6 pb-24 font-mono text-sm leading-relaxed text-slate-700 focus:outline-none"
            value={markdownOutput}
            onChange={event => onContentChange(event.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300">
            <div className="text-center">
              <FileCode className="mx-auto mb-2 opacity-20" size={48} />
              <p>翻译结果将显示在这里</p>
              <p className="mt-2 text-xs text-slate-400">上传文件后自动开始</p>
            </div>
          </div>
        )}
        <AgentInput {...agentProps} />
      </div>
      <div className="flex h-8 items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 text-[10px] text-slate-400">
        <span>{charCount} 字符</span>
        <div className="flex-1" />
        <span className="flex items-center gap-1">
          <Check size={10} /> 自动保存
        </span>
      </div>
    </div>
  )
}

function AgentInput({
  showAgentInput,
  onToggleAgentInput,
  agentQuery,
  onAgentQueryChange,
  onAgentSubmit,
  isAgentWorking,
  hasContent
}: AgentProps) {
  return (
    <>
      <div
        className={`pointer-events-none absolute bottom-6 left-1/2 w-[90%] max-w-md -translate-x-1/2 transition-all ${
          showAgentInput ? 'pointer-events-auto translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center gap-2 px-2 pt-1">
            <Bot className="text-purple-600" size={16} />
            <span className="text-xs font-bold text-slate-700">AI 智能修改</span>
            <div className="flex-1" />
            <button
              onClick={() => onToggleAgentInput(false)}
              className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="输入修改指令，例如：语气更正式一些..."
              value={agentQuery}
              onChange={event => onAgentQueryChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  onAgentSubmit()
                }
              }}
            />
            <button
              onClick={onAgentSubmit}
              disabled={isAgentWorking || !agentQuery.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-purple-600 p-1.5 text-white transition-colors hover:bg-purple-700 disabled:opacity-50">
              {isAgentWorking ? <Loader2 className="animate-spin" size={14} /> : <CornerDownLeft size={14} />}
            </button>
          </div>
        </div>
      </div>
      {!showAgentInput && hasContent && (
        <button
          onClick={() => onToggleAgentInput(true)}
          className="group absolute bottom-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-purple-600 shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          title="唤起 AI 修改">
          <Sparkles className="transition-transform group-hover:rotate-12" size={18} />
        </button>
      )}
    </>
  )
}
