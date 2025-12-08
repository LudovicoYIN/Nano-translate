'use client'

import { Activity, Cpu, FileScan, Layout, Plus, Shield, Trash2, X } from 'lucide-react'
import { LlmConfig, ParserConfig, PromptConfig, SettingsTab } from './types'

type PromptSectionProps = {
  prompts: PromptConfig[]
  activePromptId: string
  onSelectPrompt: (id: string) => void
  onDeletePrompt: (id: string) => void
  newPromptName: string
  newPromptContent: string
  onChangeNewPrompt: (field: 'name' | 'content', value: string) => void
  onAddPrompt: () => void
}

type LlmSectionProps = {
  llmConfigs: LlmConfig[]
  activeLlmId: string
  onSelectLlm: (id: string) => void
  onDeleteLlm: (id: string) => void
  showAddLlm: boolean
  onToggleAddLlm: (open: boolean) => void
  newLlm: { name: string; baseUrl: string; apiKey: string; model: string }
  onChangeNewLlm: (field: 'name' | 'baseUrl' | 'apiKey' | 'model', value: string) => void
  onAddLlm: () => void
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  onTestNewLlm: () => void
  testingLlmId: string | null
  onTestExistingLlm: (id: string) => void
}

type ParserSectionProps = {
  parserConfigs: ParserConfig[]
  activeParserId: string
  onSelectParser: (id: string) => void
  onDeleteParser: (id: string) => void
  showAddParser: boolean
  onToggleAddParser: (open: boolean) => void
  newParser: { name: string; type: string; url: string; apiKey: string }
  onChangeNewParser: (field: 'name' | 'type' | 'url' | 'apiKey', value: string) => void
  onAddParser: () => void
}

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
  tab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
  promptProps: PromptSectionProps
  llmProps: LlmSectionProps
  parserProps: ParserSectionProps
}

export function SettingsDrawer({
  open,
  onClose,
  tab,
  onTabChange,
  promptProps,
  llmProps,
  parserProps
}: SettingsDrawerProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-8"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}>
      <div className="flex h-[600px] w-[800px] overflow-hidden rounded-xl bg-white/95 shadow-[0_25px_65px_rgba(15,23,42,0.25)] backdrop-blur">
        <SettingsSidebar
          activeTab={tab}
          onTabChange={onTabChange}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6">
            <h2 className="font-bold text-slate-800">
              {tab === 'prompts' && 'Prompt 预设'}
              {tab === 'llm' && '大模型连接 (OpenAI 格式)'}
              {tab === 'parser' && '文档解析服务'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-6">
            {tab === 'prompts' && <PromptSection {...promptProps} />}
            {tab === 'llm' && <LlmSection {...llmProps} />}
            {tab === 'parser' && <ParserSection {...parserProps} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSidebar({
  activeTab,
  onTabChange
}: {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}) {
  const tabs: { id: SettingsTab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'prompts', icon: Layout, label: 'Prompt 管理' },
    { id: 'llm', icon: Cpu, label: '大模型设置' },
    { id: 'parser', icon: FileScan, label: '文档解析' }
  ]

  return (
    <div className="flex w-56 flex-col border-r border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-6 flex items-center gap-2 px-2 font-bold text-slate-700">
        <Layout size={20} /> 设置
      </h3>
      <div className="space-y-1">
        {tabs.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}>
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-slate-200 pt-4 text-xs text-slate-400">Ver 1.0.0 Beta</div>
    </div>
  )
}

function PromptSection({
  prompts,
  activePromptId,
  onSelectPrompt,
  onDeletePrompt,
  newPromptName,
  newPromptContent,
  onChangeNewPrompt,
  onAddPrompt
}: PromptSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {prompts.map(prompt => (
          <div
            key={prompt.id}
            className={`rounded-xl border bg-white p-4 transition-all ${
              activePromptId === prompt.id
                ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-blue-300'
            }`}>
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="activePrompt"
                  checked={activePromptId === prompt.id}
                  onChange={() => onSelectPrompt(prompt.id)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-700">{prompt.name}</span>
              </div>
              <button
                onClick={() => onDeletePrompt(prompt.id)}
                className="text-slate-300 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
            <p className="ml-6 rounded border border-slate-100 bg-slate-50 p-2 font-mono text-sm text-slate-500">
              {prompt.content}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Plus size={16} /> 添加 Prompt
        </h4>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="名称 (如：论文翻译)"
            value={newPromptName}
            onChange={event => onChangeNewPrompt('name', event.target.value)}
          />
          <textarea
            className="h-20 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="输入指令..."
            value={newPromptContent}
            onChange={event => onChangeNewPrompt('content', event.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={onAddPrompt}
              disabled={!newPromptName}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LlmSection({
  llmConfigs,
  activeLlmId,
  onSelectLlm,
  onDeleteLlm,
  showAddLlm,
  onToggleAddLlm,
  newLlm,
  onChangeNewLlm,
  onAddLlm,
  testStatus,
  onTestNewLlm,
  testingLlmId,
  onTestExistingLlm
}: LlmSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {llmConfigs.map(llm => (
          <div
            key={llm.id}
            className={`rounded-xl border bg-white p-4 transition-all ${
              activeLlmId === llm.id
                ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-blue-300'
            }`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    activeLlmId === llm.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                  <Cpu size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{llm.name}</div>
                  <div className="text-xs text-slate-400">{llm.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTestExistingLlm(llm.id)}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                  {testingLlmId === llm.id ? (
                    <Activity className="animate-spin text-blue-600" size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                </button>
                <div className="mx-1 h-4 w-px bg-slate-200" />
                <button
                  onClick={() => onSelectLlm(llm.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activeLlmId === llm.id
                      ? 'border-blue-200 bg-blue-50 font-medium text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                  {activeLlmId === llm.id ? '当前使用' : '使用此模型'}
                </button>
                <button
                  onClick={() => onDeleteLlm(llm.id)}
                  className="p-2 text-slate-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded bg-slate-50 p-2 text-xs text-slate-500">
              <div className="truncate">
                <span className="mr-2 text-slate-400">Host:</span>
                {llm.baseUrl}
              </div>
              <div className="truncate">
                <span className="mr-2 text-slate-400">Key:</span>
                {llm.apiKey.slice(0, 6)}...
              </div>
            </div>
          </div>
        ))}
      </div>
      {showAddLlm ? (
        <div className="animate-in slide-in-from-bottom-2 rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">添加新模型配置</h4>
            <button onClick={() => onToggleAddLlm(false)}>
              <X className="text-slate-400" size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="配置名称 (如：公司内网 LLM)"
              value={newLlm.name}
              onChange={event => onChangeNewLlm('name', event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Model Name (如：gpt-4o)"
                value={newLlm.model}
                onChange={event => onChangeNewLlm('model', event.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                type="password"
                placeholder="API Key"
                value={newLlm.apiKey}
                onChange={event => onChangeNewLlm('apiKey', event.target.value)}
              />
            </div>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Base URL (如：https://api.openai.com/v1)"
              value={newLlm.baseUrl}
              onChange={event => onChangeNewLlm('baseUrl', event.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={onTestNewLlm}
                disabled={testStatus === 'testing'}
                className={`flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  testStatus === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : testStatus === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {testStatus === 'testing'
                  ? '测试中...'
                  : testStatus === 'success'
                    ? '连接成功'
                    : testStatus === 'error'
                      ? '连接失败'
                      : '测试连接'}
              </button>
              <button
                onClick={onAddLlm}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
                确认添加
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onToggleAddLlm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600">
          <Plus size={16} /> 添加大模型
        </button>
      )}
    </div>
  )
}

function ParserSection({
  parserConfigs,
  activeParserId,
  onSelectParser,
  onDeleteParser,
  showAddParser,
  onToggleAddParser,
  newParser,
  onChangeNewParser,
  onAddParser
}: ParserSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
        <div className="flex items-start gap-2">
          <Shield size={16} className="shrink-0" />
          <p>文档解析服务用于将 PDF / 图片 转换为可编辑文本，随后再送往大模型翻译。</p>
        </div>
      </div>
      <div className="grid gap-3">
        {parserConfigs.map(parser => (
          <div
            key={parser.id}
            className={`rounded-xl border bg-white p-4 transition-all ${
              activeParserId === parser.id
                ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-blue-300'
            }`}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    activeParserId === parser.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                  <FileScan size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{parser.name}</div>
                  <div className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
                    {parser.type}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectParser(parser.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activeParserId === parser.id
                      ? 'border-blue-200 bg-blue-50 font-medium text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                  {activeParserId === parser.id ? '当前使用' : '使用此服务'}
                </button>
                <button
                  onClick={() => onDeleteParser(parser.id)}
                  className="p-2 text-slate-300 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 text-xs text-slate-500">
              <span className="flex-1 truncate">{parser.url}</span>
              {parser.apiKey && <span className="text-slate-400">🔑 已配置密钥</span>}
            </div>
          </div>
        ))}
      </div>
      {showAddParser ? (
        <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">配置新的解析服务</h4>
            <button onClick={() => onToggleAddParser(false)}>
              <X className="text-slate-400" size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="显示名称 (如：本地 MinerU)"
              value={newParser.name}
              onChange={event => onChangeNewParser('name', event.target.value)}
            />
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              value={newParser.type}
              onChange={event => onChangeNewParser('type', event.target.value)}>
              <option value="MinerU">MinerU (PDF 解析)</option>
              <option value="PaddleOCR">PaddleOCR (通用 OCR)</option>
            </select>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Service URL (如：http://127.0.0.1:8000)"
              value={newParser.url}
              onChange={event => onChangeNewParser('url', event.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              type="password"
              placeholder="API Key (选填)"
              value={newParser.apiKey}
              onChange={event => onChangeNewParser('apiKey', event.target.value)}
            />
            <button
              onClick={onAddParser}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
              确认添加
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onToggleAddParser(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600">
          <Plus size={16} /> 添加解析服务
        </button>
      )}
    </div>
  )
}
