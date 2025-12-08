'use client'

import { Check, FileText, Image as ImageIcon, Upload } from 'lucide-react'
import { PromptConfig, WorkspaceFile } from './types'
import { ChangeEvent } from 'react'

type SourcePanelProps = {
  files: WorkspaceFile[]
  isProcessing: boolean
  processingLabel: string
  processingPercent: number
  prompts: PromptConfig[]
  activePromptId: string
  onPromptChange: (id: string) => void
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
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
  prompts,
  activePromptId,
  onPromptChange,
  onUpload,
  onDeleteFile,
  onReprocess,
  onPasteScreenshot,
  onOpenSystemFile
}: SourcePanelProps) {
  const currentFile = files[0]

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/30 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">源文档</h2>
        <PromptDropdown
          prompts={prompts}
          activePromptId={activePromptId}
          onPromptChange={onPromptChange}
        />
      </div>
      {currentFile ? (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <FileText
            size={64}
            className={`mb-6 text-blue-500 ${isProcessing ? 'animate-bounce' : ''}`}
          />
          <h3
            className="max-w-[80%] truncate text-center text-lg font-bold text-slate-800"
            title={currentFile.name}>
            {currentFile.name}
          </h3>
          <p className="mt-1 mb-8 text-sm text-slate-500">{(currentFile.size / 1024).toFixed(1)} KB</p>
          {isProcessing ? (
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-600">
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
        <label className="group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-all hover:border-blue-400 hover:bg-blue-50/30">
          <input
            id="workspace-upload"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            onChange={onUpload}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 transition-transform group-hover:scale-110">
            <Upload className="text-slate-400 group-hover:text-blue-500" size={32} />
          </div>
          <p className="font-medium text-slate-600">点击或拖拽上传</p>
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-blue-600"
              onClick={onPasteScreenshot}>
              <ImageIcon size={14} /> 粘贴截图
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-blue-600"
              onClick={onOpenSystemFile}>
              <FileText size={14} /> 系统文件
            </button>
          </div>
        </label>
      )}
    </div>
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
      <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600">
        {prompts.find(prompt => prompt.id === activePromptId)?.name ?? '选择领域'}
      </button>
      <div className="absolute right-0 top-full z-10 mt-1 hidden w-48 overflow-hidden rounded-lg border border-slate-100 bg-white shadow-xl transition-all group-hover:block">
        {prompts.map(prompt => (
          <button
            key={prompt.id}
            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
              prompt.id === activePromptId ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-600'
            }`}
            onClick={() => onPromptChange(prompt.id)}>
            {prompt.name}
            {prompt.id === activePromptId && <Check size={12} />}
          </button>
        ))}
      </div>
    </div>
  )
}
