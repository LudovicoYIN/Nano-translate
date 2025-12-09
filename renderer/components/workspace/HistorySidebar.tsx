'use client'

import { ChangeEvent, useEffect, useId, useRef, useState } from 'react'
import { Check, FileText, History, Image as ImageIcon, MoreVertical, Upload } from 'lucide-react'
import { HistoryEntry, PromptConfig } from './types'

type Props = {
  items: HistoryEntry[]
  onSelectFiles: (files: FileList | File[]) => void
  prompts: PromptConfig[]
  activePromptId: string
  onPromptChange: (id: string) => void
  activeHistoryId?: string | null
  onSelectHistory?: (item: HistoryEntry) => void
  onOpenHistoryDir?: (item: HistoryEntry) => void
  onDeleteHistory?: (item: HistoryEntry) => void
}

export function HistorySidebar({
  items,
  onSelectFiles,
  prompts,
  activePromptId,
  onPromptChange,
  activeHistoryId,
  onSelectHistory,
  onOpenHistoryDir,
  onDeleteHistory
}: Props) {
  const inputId = useId()
  const [menu, setMenu] = useState<{ x: number; y: number; item: HistoryEntry } | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onSelectFiles(event.target.files)
      event.target.value = ''
    }
  }

  const closeMenu = () => setMenu(null)

  return (
    <aside className="relative w-64 shrink-0 border-r border-slate-100 bg-slate-50" onClick={closeMenu}>
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
            <div
              className="text-slate-400 opacity-0 transition group-hover:opacity-100"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                setMenu({ x: e.clientX, y: e.clientY, item })
              }}>
              <MoreVertical size={14} />
            </div>
          </button>
        ))}
      </nav>
      {menu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={closeMenu}
            onContextMenu={e => {
              e.preventDefault()
              closeMenu()
            }}
          />
          <div
            className="fixed z-30 w-40 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-xl"
            style={{ top: menu.y + 4, left: menu.x + 4 }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                closeMenu()
                onOpenHistoryDir?.(menu.item)
              }}>
              打开所在位置
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                closeMenu()
                onDeleteHistory?.(menu.item)
              }}>
              删除记录
            </button>
          </div>
        </>
      )}
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
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600"
        onClick={() => setOpen(prev => !prev)}>
        <span className="truncate">{prompts.find(prompt => prompt.id === activePromptId)?.name ?? '选择领域'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-100 bg-white shadow-xl">
          {prompts.map(prompt => (
            <button
              key={prompt.id}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                prompt.id === activePromptId ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-600'
              }`}
              onClick={() => {
                onPromptChange(prompt.id)
                setOpen(false)
              }}>
              <span className="truncate">{prompt.name}</span>
              {prompt.id === activePromptId && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
