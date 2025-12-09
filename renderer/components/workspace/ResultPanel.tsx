'use client'

import { useMemo, useState } from 'react'
import { Bot, Check, CornerDownLeft, Download, FileCode, Loader2, Sparkles, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import { ChatMessage } from './types'

type AgentProps = {
  showAgentInput: boolean
  onToggleAgentInput: (open: boolean) => void
  agentQuery: string
  onAgentQueryChange: (value: string) => void
  onAgentSubmit: () => void
  isAgentWorking: boolean
  hasContent: boolean
  history: ChatMessage[]
}

type ResultPanelProps = {
  markdownOutput: string
  onContentChange: (value: string) => void
  onExport: (format: 'pdf' | 'docx' | 'markdown') => void
  isExporting: boolean
  agentProps: AgentProps
  charCount: number
  isProcessing: boolean
  processingLabel: string
  processingPercent: number
  hasFile: boolean
}

export function ResultPanel({
  markdownOutput,
  onContentChange,
  onExport,
  isExporting,
  agentProps,
  charCount,
  isProcessing,
  processingLabel,
  processingPercent,
  hasFile
}: ResultPanelProps) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'markdown'>('pdf')
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const exportDisabled = !markdownOutput || isExporting
  const markdownPlugins = useMemo(() => [remarkGfm, remarkMath], [])

  return (
    <div className="relative flex flex-1 flex-col bg-white">
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-700">
          <Sparkles className="text-yellow-500" size={18} />
          翻译结果
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 shadow-sm">
            <button
              className={`px-3 py-1.5 transition ${viewMode === 'edit' ? 'bg-white text-blue-600' : 'hover:text-blue-600'}`}
              onClick={() => setViewMode('edit')}>
              编辑
            </button>
            <button
              className={`px-3 py-1.5 transition ${viewMode === 'preview' ? 'bg-white text-blue-600' : 'hover:text-blue-600'}`}
              onClick={() => setViewMode('preview')}>
              预览
            </button>
            <button
              className={`px-3 py-1.5 transition ${viewMode === 'split' ? 'bg-white text-blue-600' : 'hover:text-blue-600'}`}
              onClick={() => setViewMode('split')}>
              双栏
            </button>
          </div>
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
      <div className="relative flex-1 min-h-0">
        {markdownOutput ? (
          <div
            className={`grid h-full min-h-0 ${
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}>
            {viewMode !== 'preview' && (
              <textarea
                className="h-full min-h-0 w-full resize-none border-r border-slate-100 p-6 pb-24 font-mono text-sm leading-relaxed text-slate-700 focus:outline-none"
                value={markdownOutput}
                onChange={event => onContentChange(event.target.value)}
                spellCheck={false}
              />
            )}
            {viewMode !== 'edit' && (
              <div className="relative h-full min-h-0 overflow-y-auto bg-slate-50 p-6 pb-24 text-sm leading-relaxed text-slate-800">
                <ReactMarkdown
                  remarkPlugins={markdownPlugins}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    img: props => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img {...props} className="my-2 max-h-[480px] max-w-full rounded-lg border border-slate-200 shadow-sm" />
                    ),
                    code: ({ inline, className, children, ...props }) => {
                      return (
                        <code
                          className={`${className || ''} ${inline ? 'rounded bg-slate-100 px-1 py-0.5' : 'block rounded-lg bg-slate-900/90 px-3 py-2 text-slate-50 overflow-auto'}`}
                          {...props}>
                          {children}
                        </code>
                      )
                    },
                    ans: ({ children, ...props }) => (
                      <mark className="rounded bg-yellow-100 px-1 py-0.5 text-slate-800" {...props}>
                        {children}
                      </mark>
                    )
                  }}>
                  {markdownOutput}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300">
            <div className="text-center">
              <FileCode className="mx-auto mb-2 opacity-20" size={48} />
              {hasFile ? (
                <>
                  <p>正在准备处理结果</p>
                  <p className="mt-2 text-xs text-slate-400">正在解析或转换中...</p>
                </>
              ) : (
                <>
                  <p>翻译结果将显示在这里</p>
                  <p className="mt-2 text-xs text-slate-400">在左侧上传文件或截图后自动开始</p>
                </>
              )}
            </div>
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <div className="text-sm font-semibold text-slate-700">{processingLabel || '处理中...'}</div>
            <div className="text-xs text-slate-500">{processingPercent}%</div>
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
  hasContent,
  history
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
            <span className="text-xs font-bold text-slate-700">AI 智能回答</span>
            <div className="flex-1" />
            <button
              onClick={() => onToggleAgentInput(false)}
              className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto px-2 pb-1">
            {history.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400">输入问题，即可获得 AI 回答</p>
            ) : (
              history.map(message => (
                <div
                  key={message.id}
                  className={`w-full rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-none bg-purple-50 text-purple-700'
                      : 'rounded-bl-none bg-slate-100 text-slate-700'
                  }`}>
                  <span className="font-semibold">{message.role === 'user' ? '我' : 'AI'}</span>：{message.content}
                </div>
              ))
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="请输入问题，例如：总结要点？"
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
          title="唤起 AI 问答">
          <Sparkles className="transition-transform group-hover:rotate-12" size={18} />
        </button>
      )}
    </>
  )
}
