'use client'

import { useEffect, useState } from 'react'
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { HistoryEntry } from '@/components/workspace/types'
import { mockHistoryEntries } from '@/lib/mock-services'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    mockHistoryEntries().then(items => {
      setHistory(items)
      setLoading(false)
    })
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">历史任务</h1>
        <p className="text-sm text-slate-500">查看最近处理的文档与截图，点击可重新载入工作台。</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={18} /> 正在加载历史记录...
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                  {item.type === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-500">打开</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
