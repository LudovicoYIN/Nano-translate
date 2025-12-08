'use client'

import { FileText, History, Image as ImageIcon } from 'lucide-react'
import { HistoryEntry } from './types'

type Props = {
  items: HistoryEntry[]
}

export function HistorySidebar({ items }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-100 bg-slate-50">
      <div className="flex items-center justify-between p-4 pb-2 text-slate-500">
        <span className="text-xs font-bold uppercase tracking-wider">历史记录</span>
        <History size={14} />
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
