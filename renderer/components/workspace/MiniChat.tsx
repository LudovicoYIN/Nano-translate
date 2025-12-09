'use client'

import { Send } from 'lucide-react'
import { ChatMessage } from './types'
import { MutableRefObject } from 'react'

type Props = {
  chatHistory: ChatMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  chatEndRef: MutableRefObject<HTMLDivElement | null>
}

export function MiniChat({ chatHistory, inputValue, onInputChange, onSend, chatEndRef }: Props) {
  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4">
        {chatHistory.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                message.role === 'user'
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : 'rounded-bl-none border border-slate-100 bg-slate-100 text-slate-700'
              }`}>
              {message.content}
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
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600"
            onClick={onSend}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
