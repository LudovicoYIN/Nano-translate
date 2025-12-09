'use client'

import { Loader2, PauseCircle, Send, XCircle } from 'lucide-react'
import { MutableRefObject } from 'react'
import { ChatMessage, PromptConfig } from './types'

type Props = {
  chatHistory: ChatMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  chatEndRef: MutableRefObject<HTMLDivElement | null>
  prompts: PromptConfig[]
  activePromptId: string
  onPromptChange: (id: string) => void
  onClear: () => void
  isSending: boolean
  onPause: () => void
}

export function MiniChat({
  chatHistory,
  inputValue,
  onInputChange,
  onSend,
  chatEndRef,
  prompts,
  activePromptId,
  onPromptChange,
  onClear,
  isSending,
  onPause
}: Props) {
  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Prompt</span>
          <select
            className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
            value={activePromptId}
            onChange={event => onPromptChange(event.target.value)}>
            {prompts.map(prompt => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onPause}
            disabled={!isSending}>
            <PauseCircle size={14} />
            暂停
          </button>
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
            onClick={onClear}>
            <XCircle size={14} />
            清除
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4">
        {chatHistory.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`w-fit max-w-[70%] sm:max-w-[75%] lg:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : 'rounded-bl-none border border-slate-100 bg-slate-100 text-slate-700'
              } whitespace-pre-wrap break-words max-h-48 overflow-y-auto`}>
              <div>{message.content}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="border-t border-slate-100 bg-white p-3">
        <div className="relative">
          <input
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="快速提问..."
            value={inputValue}
            onChange={event => onInputChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                onSend()
              }
            }}
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
            onClick={onSend}
            disabled={isSending}>
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
