'use client'

import { FileText } from 'lucide-react'
import { WorkspaceFile } from './types'

type SourcePanelProps = {
  files: WorkspaceFile[]
  isProcessing: boolean
  processingLabel: string
  processingPercent: number
  onDeleteFile: () => void
  onReprocess: () => void
  onPasteScreenshot: () => void
  onOpenSystemFile: () => void
}

export function SourcePanel({
  files,
  isProcessing,
  processingLabel,
  processingPercent,
  onDeleteFile,
  onReprocess,
  onPasteScreenshot,
  onOpenSystemFile
}: SourcePanelProps) {
  const currentFile = files[0]
  const formatSize = (size: number) => `${(size / 1024).toFixed(1)} KB`

  return (
    <div className="flex h-full flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Source</p>
          <h2 className="text-lg font-bold text-slate-800">源文档</h2>
        </div>
      </div>
      <div className="flex flex-1 flex-col rounded-xl border border-dashed border-slate-200 bg-white/80 p-4">
        {currentFile ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-slate-800" title={currentFile.name}>
                  {currentFile.name}
                </div>
                <div className="text-xs text-slate-500">{formatSize(currentFile.size)}</div>
              </div>
            </div>
            {isProcessing ? (
              <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>{processingLabel}</span>
                  <span>{processingPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full border border-slate-100 bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                    style={{ width: `${processingPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  className="rounded-md px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                  onClick={onDeleteFile}>
                  删除
                </button>
                <button
                  className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  onClick={onReprocess}>
                  重新解析
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
            <p className="text-sm">请在左侧“上传文件”按钮导入文档</p>
            <p className="mt-1 text-xs text-slate-400">或使用以下快捷操作</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                onClick={onOpenSystemFile}>
                选择系统文件
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
                onClick={onPasteScreenshot}>
                粘贴截图
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
