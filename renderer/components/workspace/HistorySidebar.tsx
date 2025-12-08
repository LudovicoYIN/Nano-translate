'use client'

import { ChangeEvent, useId } from 'react'
import { FileText, History, Image as ImageIcon, Upload } from 'lucide-react'
import { HistoryEntry } from './types'

type Props = {
  items: HistoryEntry[]
  onSelectFiles: (files: FileList | File[]) => void
  onPasteScreenshot: () => void
}

export function HistorySidebar({ items, onSelectFiles, onPasteScreenshot }: Props) {
  const inputId = useId()
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onSelectFiles(event.target.files)
      event.target.value = ''
    }
  }
  return (
    <aside className="w-64 shrink-0 border-r border-slate-100 bg-slate-50">
      <div className="flex items-center justify-between p-4 pb-2 text-slate-500">
        <span className="text-xs font-bold uppercase tracking-wider">历史记录</span>
        <History size={14} />
      </div>
      <div className="px-4 pb-3">
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
        <button
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          onClick={onPasteScreenshot}>
          粘贴截图
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex cursor-pointer items-center gap-3 border-l-2 border-transparent px-4 py-3 transition-all hover:border-blue-500 hover:bg-slate-100">
            <div className="text-slate-400 transition-colors group-hover:text-blue-500">
              {item.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-700"
                title={item.name}>
                {item.name}
              </div>
              <div className="text-xs text-slate-400">{item.time}</div>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
