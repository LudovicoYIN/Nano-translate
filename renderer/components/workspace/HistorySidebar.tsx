'use client'

import { ChangeEvent, useId } from 'react'
import { Check, FileText, History, Image as ImageIcon, Upload } from 'lucide-react'
import { HistoryEntry, PromptConfig } from './types'

type Props = {
  items: HistoryEntry[]
  onSelectFiles: (files: FileList | File[]) => void
  prompts: PromptConfig[]
  activePromptId: string
  onPromptChange: (id: string) => void
  activeHistoryId?: string | null
  onSelectHistory?: (item: HistoryEntry) => void
}

export function HistorySidebar({
  items,
  onSelectFiles,
  prompts,
  activePromptId,
  onPromptChange,
  activeHistoryId,
  onSelectHistory
}: Props) {
  const inputId = useId()
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onSelectFiles(event.target.files)
      event.target.value = ''
    }
  }
  return (
    <aside className="w-64 shrink-0 border-r border-slate-100 bg-slate-50">
      <div className="space-y-3 px-4 pb-3">
        <div>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleChange}
          />
          <label
            htmlFor={inputId}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-100">
            <Upload size={14} /> 上传文件
          </label>
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Prompt</p>
          <PromptDropdown
            prompts={prompts}
            activePromptId={activePromptId}
            onPromptChange={onPromptChange}
          />
        </div>
        <div className="flex items-center justify-between pt-1 text-slate-500">
          <span className="text-xs font-bold uppercase tracking-wider">历史记录</span>
          <History size={14} />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map(item => (
          <button
            key={item.id}
            className={`group flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-all hover:border-blue-500 hover:bg-slate-100 ${
              item.id === activeHistoryId ? 'border-blue-500 bg-blue-50/70' : 'border-transparent'
            }`}
            onClick={() => onSelectHistory?.(item)}>
            <div
              className={`text-slate-400 transition-colors group-hover:text-blue-500 ${
                item.id === activeHistoryId ? 'text-blue-500' : ''
              }`}>
              {item.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-700" title={item.name}>
                {item.name}
              </div>
              <div className="text-xs text-slate-400">
                {item.status === 'processing' ? '处理中…' : item.status === 'failed' ? '失败' : item.time}
              </div>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  )
}

function PromptDropdown({
  prompts,
  activePromptId,
  onPromptChange
}: {
  prompts: PromptConfig[]
  activePromptId: string
  onPromptChange: (id: string) => void
}) {
  return (
    <div className="group relative">
      <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600">
        <span className="truncate">{prompts.find(prompt => prompt.id === activePromptId)?.name ?? '选择领域'}</span>
      </button>
      <div className="absolute left-0 top-full z-10 mt-1 hidden w-full overflow-hidden rounded-lg border border-slate-100 bg-white shadow-xl transition-all group-hover:block">
        {prompts.map(prompt => (
          <button
            key={prompt.id}
            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
              prompt.id === activePromptId ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-600'
            }`}
            onClick={() => onPromptChange(prompt.id)}>
            <span className="truncate">{prompt.name}</span>
            {prompt.id === activePromptId && <Check size={12} />}
          </button>
        ))}
      </div>
    </div>
  )
}
