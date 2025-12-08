import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, Minimize2, Image as ImageIcon, FileText, 
  Upload, X, Download, Command, Send, Copy, 
  Settings, History, Sparkles, Languages, Check, Monitor, 
  MoreHorizontal, Camera, Plus, Trash2, Save, ChevronDown, 
  Cpu, FileCode, Server, FileScan, Key, Globe, Layout, Shield,
  Activity, Loader2, Wifi, WifiOff, PanelLeftClose, PanelLeftOpen,
  Undo, Redo, Bot, CornerDownLeft
} from 'lucide-react';

// --- Mock Data & Constants ---

const MOCK_TRANSLATION_RESULT = `# 项目计划书 (已翻译)

## 1. 概述
本项目旨在开发一款集成了OCR、文档解析与AI翻译的智能助手。

## 2. 核心功能
* **多格式支持**: 支持 Word (.docx), PDF, 以及各种图片格式。
* **Markdown 导出**: 所有内容最终转换为标准的 Markdown 格式，方便二次编辑。
* **Mini 模式**: 快速响应的聊天窗口，支持快捷键呼出。

## 3. 技术栈
> 建议使用 Electron 或 Tauri 进行桌面端开发，以便获取系统级截图权限。

**注意**: 这是一个模拟的翻译结果。在实际应用中，这里将显示解析后的双语对照内容。
`;

const THEMES = {
  light: 'bg-slate-50 text-slate-900',
  dark: 'bg-slate-900 text-slate-100',
};

// 默认数据
const DEFAULT_PROMPTS = [
  { id: 'general', name: '通用翻译', content: '请将以下内容翻译为中文，保持原意通顺，风格自然。' },
  { id: 'it', name: 'IT/技术领域', content: '请翻译为中文，专门针对计算机科学领域，保留专业术语（如 API, React, Hook 等），代码块保持原样。' },
  { id: 'legal', name: '法律/合同', content: '请翻译为法律专业中文，用词严谨，格式规范，确保准确性。' },
];

const DEFAULT_LLMS = [
  { id: 'openai-1', name: 'OpenAI官方', provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-********', model: 'gpt-4o' },
  { id: 'deepseek', name: 'DeepSeek (兼容)', provider: 'openai', baseUrl: 'https://api.deepseek.com', apiKey: 'sk-********', model: 'deepseek-chat' },
];

const DEFAULT_PARSERS = [
  { id: 'mineru-local', name: 'MinerU 本地服务', type: 'MinerU', url: 'http://localhost:8000', apiKey: '' },
  { id: 'paddle-cloud', name: 'PaddleOCR 云端', type: 'PaddleOCR', url: 'https://api.example.com/ocr', apiKey: 'xyz-token' },
];

// --- Components ---

export default function App() {
  const [mode, setMode] = useState('full'); // 'full' or 'mini'
  const [inputContent, setInputContent] = useState('');
  
  // Undo/Redo System
  const [markdownOutput, setMarkdownOutput] = useState('');
  const [history, setHistory] = useState(['']); 
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState({ label: '', percent: 0 });
  const [files, setFiles] = useState([]);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: '你好！我是你的翻译助手。Mini 模式下可以快速问答。' }
  ]);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('prompts'); // 'prompts', 'llm', 'parser'

  // Agent State
  const [showAgentInput, setShowAgentInput] = useState(false);
  const [agentQuery, setAgentQuery] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  
  // UI State
  const [isSourceCollapsed, setIsSourceCollapsed] = useState(false); // 控制源文件区折叠

  // 1. Prompt State
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const [activePromptId, setActivePromptId] = useState('general');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  // 2. LLM State
  const [llmConfigs, setLlmConfigs] = useState(DEFAULT_LLMS);
  const [activeLlmId, setActiveLlmId] = useState('openai-1');
  const [newLlm, setNewLlm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' });
  const [showAddLlm, setShowAddLlm] = useState(false);
  const [testStatus, setTestStatus] = useState('idle'); 
  const [testingLlmId, setTestingLlmId] = useState(null); 

  // 3. Parser State
  const [parserConfigs, setParserConfigs] = useState(DEFAULT_PARSERS);
  const [activeParserId, setActiveParserId] = useState('mineru-local');
  const [newParser, setNewParser] = useState({ name: '', type: 'MinerU', url: '', apiKey: '' });
  const [showAddParser, setShowAddParser] = useState(false);

  const chatEndRef = useRef(null);

  // --- Undo/Redo Helpers ---
  const updateContent = (newContent) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarkdownOutput(newContent);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMarkdownOutput(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMarkdownOutput(history[historyIndex + 1]);
    }
  };

  // --- Handlers ---
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length > 0) {
      setFiles(uploadedFiles);
      setIsSourceCollapsed(false); // 上传新文件时自动展开
      processTranslation(uploadedFiles[0].name);
    }
  };

  const processTranslation = (sourceName) => {
    setIsProcessing(true);
    setProcessingStep({ label: '正在读取文件...', percent: 5 });
    
    setTimeout(() => {
      setProcessingStep({ label: `正在解析文档结构...`, percent: 35 });
    }, 800);

    setTimeout(() => {
      setProcessingStep({ label: `正在进行 AI 推理...`, percent: 70 });
    }, 2000);

    setTimeout(() => {
      setIsProcessing(false);
      setProcessingStep({ label: '完成', percent: 100 });
      updateContent(MOCK_TRANSLATION_RESULT);
      
      // 翻译完成后自动折叠左侧
      if (mode === 'full') {
        setIsSourceCollapsed(true); 
      }
      
      if (mode === 'mini') {
        addChatMessage('ai', `文件 "${sourceName}" 处理完成！`);
      }
    }, 3500);
  };

  const handleAgentModify = () => {
    if (!agentQuery.trim()) return;
    setIsAgentWorking(true);
    setTimeout(() => {
      setIsAgentWorking(false);
      const modification = `\n\n> **[AI 修正]:** 根据您的要求 "${agentQuery}"，我优化了相关措辞。\n\n`;
      updateContent(markdownOutput + modification);
      setAgentQuery('');
    }, 1500);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setIsSourceCollapsed(false);
    addChatMessage('user', '[发送了一张截图]');
    setTimeout(() => {
       setIsProcessing(false);
       updateContent(MOCK_TRANSLATION_RESULT);
       setIsSourceCollapsed(true);
       addChatMessage('ai', '截图已识别并翻译。');
    }, 1500);
  };

  const addChatMessage = (role, content) => {
    setChatHistory(prev => [...prev, { role, content }]);
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = () => {
    if (!inputContent.trim()) return;
    addChatMessage('user', inputContent);
    setInputContent('');
    setTimeout(() => {
      addChatMessage('ai', `(Mini模式) 收到："${inputContent}"。`);
    }, 600);
  };

  const toggleMode = () => {
    setMode(prev => prev === 'full' ? 'mini' : 'full');
  };

  // --- Settings Handlers ---
  const handleAddPrompt = () => {
    if (!newPromptName) return;
    setPrompts([...prompts, { id: Date.now().toString(), name: newPromptName, content: newPromptContent }]);
    setNewPromptName(''); setNewPromptContent('');
  };

  const handleAddLlm = () => {
    if (!newLlm.name || !newLlm.baseUrl || !newLlm.apiKey) return;
    setLlmConfigs([...llmConfigs, { ...newLlm, id: Date.now().toString(), provider: 'openai' }]);
    setNewLlm({ name: '', baseUrl: '', apiKey: '', model: '' });
    setShowAddLlm(false);
    setTestStatus('idle');
  };

  const handleTestConnection = () => {
     if (!newLlm.baseUrl || !newLlm.apiKey) {
        setTestStatus('error'); return;
     }
     setTestStatus('testing');
     setTimeout(() => setTestStatus(Math.random() > 0.2 ? 'success' : 'error'), 1200);
  };

  const handleTestExistingLlm = (id) => {
      setTestingLlmId(id);
      setTimeout(() => {
          setTestingLlmId(null);
          alert(`连接成功！延迟: ${Math.floor(Math.random() * 200 + 50)}ms`);
      }, 1000);
  };

  const handleAddParser = () => {
    if (!newParser.name || !newParser.url) return;
    setParserConfigs([...parserConfigs, { ...newParser, id: Date.now().toString() }]);
    setNewParser({ name: '', type: 'MinerU', url: '', apiKey: '' });
    setShowAddParser(false);
  };

  const deleteItem = (id, list, setList, activeId, setActiveId) => {
    const newList = list.filter(item => item.id !== id);
    setList(newList);
    if (activeId === id && newList.length > 0) setActiveId(newList[0].id);
  };

  return (
    <div className={`min-h-screen ${THEMES.light} font-sans transition-all duration-300 flex items-center justify-center p-4 bg-gray-200`}>
      
      {/* Settings Modal (恢复完整功能) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-[800px] h-[600px] rounded-xl shadow-2xl flex overflow-hidden">
            
            {/* Sidebar Navigation */}
            <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col p-4">
               <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 px-2">
                 <Settings size={20} /> 设置
               </h3>
               <div className="space-y-1">
                 {[
                   { id: 'prompts', icon: Layout, label: 'Prompt 管理' },
                   { id: 'llm', icon: Server, label: '大模型设置' },
                   { id: 'parser', icon: FileScan, label: '文档解析服务' }
                 ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setSettingsTab(tab.id)}
                     className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                       settingsTab === tab.id 
                         ? 'bg-blue-100 text-blue-700' 
                         : 'text-slate-600 hover:bg-slate-100'
                     }`}
                   >
                     <tab.icon size={16} />
                     {tab.label}
                   </button>
                 ))}
               </div>
               <div className="mt-auto pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-400 px-2">Ver 1.0.0 Beta</div>
               </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
               <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                 <h2 className="font-bold text-slate-800">
                    {settingsTab === 'prompts' && 'Prompt 预设'}
                    {settingsTab === 'llm' && '大模型连接 (OpenAI 格式)'}
                    {settingsTab === 'parser' && '文档解析服务'}
                 </h2>
                 <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                   <X size={20} />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                 
                 {/* --- Tab 1: Prompts --- */}
                 {settingsTab === 'prompts' && (
                   <div className="space-y-6">
                     <div className="grid gap-3">
                       {prompts.map(prompt => (
                         <div key={prompt.id} className={`bg-white border rounded-xl p-4 transition-all ${activePromptId === prompt.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}>
                           <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                               <input 
                                 type="radio" 
                                 name="activePrompt" 
                                 checked={activePromptId === prompt.id}
                                 onChange={() => setActivePromptId(prompt.id)}
                                 className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                               />
                               <span className="font-bold text-slate-700">{prompt.name}</span>
                             </div>
                             <button onClick={() => deleteItem(prompt.id, prompts, setPrompts, activePromptId, setActivePromptId)} className="text-slate-300 hover:text-red-500">
                               <Trash2 size={16} />
                             </button>
                           </div>
                           <p className="text-sm text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100 ml-6">{prompt.content}</p>
                         </div>
                       ))}
                     </div>
                     
                     <div className="bg-white rounded-xl border border-slate-200 p-4">
                       <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Plus size={16}/> 添加新 Prompt</h4>
                       <div className="space-y-3">
                         <input 
                           className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                           placeholder="名称 (如: 论文翻译)"
                           value={newPromptName} onChange={e => setNewPromptName(e.target.value)}
                         />
                         <textarea 
                           className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 h-20 resize-none"
                           placeholder="输入指令..."
                           value={newPromptContent} onChange={e => setNewPromptContent(e.target.value)}
                         />
                         <div className="flex justify-end">
                            <button onClick={handleAddPrompt} disabled={!newPromptName} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">保存</button>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* --- Tab 2: LLM Settings --- */}
                 {settingsTab === 'llm' && (
                    <div className="space-y-6">
                      <div className="grid gap-3">
                        {llmConfigs.map(llm => (
                          <div key={llm.id} className={`bg-white border rounded-xl p-4 transition-all ${activeLlmId === llm.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}>
                             <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeLlmId === llm.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      <Cpu size={18} />
                                   </div>
                                   <div>
                                      <div className="font-bold text-sm text-slate-700">{llm.name}</div>
                                      <div className="text-xs text-slate-400">{llm.model}</div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => handleTestExistingLlm(llm.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                      {testingLlmId === llm.id ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <Activity size={16} />}
                                   </button>
                                   <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                   <button 
                                      onClick={() => setActiveLlmId(llm.id)}
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeLlmId === llm.id ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                   >
                                      {activeLlmId === llm.id ? '当前使用' : '使用此模型'}
                                   </button>
                                   <button onClick={() => deleteItem(llm.id, llmConfigs, setLlmConfigs, activeLlmId, setActiveLlmId)} className="p-2 text-slate-300 hover:text-red-500">
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                <div className="truncate"><span className="text-slate-400 mr-2">Host:</span>{llm.baseUrl}</div>
                                <div className="truncate"><span className="text-slate-400 mr-2">Key:</span>{llm.apiKey.substring(0,6)}...</div>
                             </div>
                          </div>
                        ))}
                      </div>

                      {showAddLlm ? (
                        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-bottom-2">
                           <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-sm text-slate-700">添加新模型配置</h4>
                              <button onClick={() => {setShowAddLlm(false); setTestStatus('idle');}}><X size={16} className="text-slate-400"/></button>
                           </div>
                           <div className="space-y-3">
                              <input 
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                placeholder="配置名称 (如: 公司内部LLM)"
                                value={newLlm.name} onChange={e => setNewLlm({...newLlm, name: e.target.value})}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <input 
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                  placeholder="Model Name (如: gpt-4)"
                                  value={newLlm.model} onChange={e => setNewLlm({...newLlm, model: e.target.value})}
                                />
                                <input 
                                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                  placeholder="API Key"
                                  type="password"
                                  value={newLlm.apiKey} onChange={e => setNewLlm({...newLlm, apiKey: e.target.value})}
                                />
                              </div>
                              <input 
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                placeholder="Base URL (例如: https://api.openai.com/v1)"
                                value={newLlm.baseUrl} onChange={e => setNewLlm({...newLlm, baseUrl: e.target.value})}
                              />
                              <div className="flex gap-3 pt-2">
                                 <button onClick={handleTestConnection} disabled={testStatus === 'testing'} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${testStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : testStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {testStatus === 'testing' ? <Loader2 size={16} className="animate-spin"/> : testStatus === 'success' ? <Wifi size={16}/> : testStatus === 'error' ? <WifiOff size={16}/> : <Activity size={16}/>}
                                    {testStatus === 'testing' ? '正在连接...' : testStatus === 'success' ? '连接成功' : testStatus === 'error' ? '连接失败' : '测试连通性'}
                                 </button>
                                 <button onClick={handleAddLlm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">确认添加</button>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <button onClick={() => {setShowAddLlm(true); setTestStatus('idle');}} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                           <Plus size={16} /> 添加 OpenAI 兼容模型
                        </button>
                      )}
                    </div>
                 )}

                 {/* --- Tab 3: Parser Settings --- */}
                 {settingsTab === 'parser' && (
                    <div className="space-y-6">
                       <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex gap-2">
                          <Shield size={16} className="shrink-0" />
                          <p>文档解析服务用于将 PDF/图片 转换为可编辑文本。</p>
                       </div>
                       
                       <div className="grid gap-3">
                        {parserConfigs.map(parser => (
                          <div key={parser.id} className={`bg-white border rounded-xl p-4 transition-all ${activeParserId === parser.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}>
                             <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeParserId === parser.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      <FileScan size={18} />
                                   </div>
                                   <div>
                                      <div className="font-bold text-sm text-slate-700">{parser.name}</div>
                                      <div className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{parser.type}</div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <button 
                                      onClick={() => setActiveParserId(parser.id)}
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeParserId === parser.id ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                   >
                                      {activeParserId === parser.id ? '当前使用' : '使用此服务'}
                                   </button>
                                   <button onClick={() => deleteItem(parser.id, parserConfigs, setParserConfigs, activeParserId, setActiveParserId)} className="p-2 text-slate-300 hover:text-red-500">
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                             </div>
                             <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded flex items-center gap-2">
                                <Globe size={12} className="text-slate-400"/>
                                <span className="truncate flex-1">{parser.url}</span>
                                {parser.apiKey && <span className="flex items-center gap-1 text-slate-400"><Key size={10}/> 已配置密钥</span>}
                             </div>
                          </div>
                        ))}
                      </div>

                      {showAddParser ? (
                        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-bottom-2">
                           <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-sm text-slate-700">配置新的解析服务</h4>
                              <button onClick={() => setShowAddParser(false)}><X size={16} className="text-slate-400"/></button>
                           </div>
                           <div className="space-y-3">
                              <input 
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                placeholder="显示名称 (如: 本地 MinerU)"
                                value={newParser.name} onChange={e => setNewParser({...newParser, name: e.target.value})}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                 <select 
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                    value={newParser.type} onChange={e => setNewParser({...newParser, type: e.target.value})}
                                 >
                                    <option value="MinerU">MinerU</option>
                                 </select>
                              </div>
                              <input 
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                placeholder="Service URL (例如: http://127.0.0.1:8000)"
                                value={newParser.url} onChange={e => setNewParser({...newParser, url: e.target.value})}
                              />
                              <input 
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                                placeholder="API Key (选填)"
                                type="password"
                                value={newParser.apiKey} onChange={e => setNewParser({...newParser, apiKey: e.target.value})}
                              />
                              <button onClick={handleAddParser} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium">确认添加</button>
                           </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddParser(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                           <Plus size={16} /> 添加解析服务
                        </button>
                      )}
                    </div>
                 )}

               </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div 
        className={`
          bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out border border-slate-200
          ${mode === 'full' ? 'w-full h-[90vh] max-w-7xl' : 'w-[400px] h-[600px]'}
        `}
      >
        
        {/* --- Header --- */}
        <header className="h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50 select-none drag-handle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Languages size={18} />
            </div>
            <span className="font-bold text-slate-700">TransLate Pro</span>
            {mode === 'full' && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">AI Editor</span>}
          </div>
          
          <div className="flex items-center gap-3">
            {mode === 'full' && (
              <>
                 <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 mr-4">
                  <Monitor size={14} /> <span>快捷键: 截图 Ctrl+Shift+A</span>
                </div>
                <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-200 rounded-md text-slate-500">
                  <Settings size={18} />
                </button>
              </>
            )}
            <button onClick={toggleMode} className="p-2 hover:bg-blue-50 text-blue-600 rounded-md transition-colors">
              {mode === 'full' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>

        {/* --- Body --- */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 1. History Sidebar (Fixed width) */}
          {mode === 'full' && (
            <aside className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col shrink-0">
              <div className="p-4 pb-2 flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">历史记录</span>
                  <History size={14} />
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                {[
                  { name: '项目计划书_en.pdf', time: '2分钟前', type: 'pdf' },
                  { name: 'Meeting_Notes.docx', time: '昨天', type: 'word' },
                  { name: 'Screenshot_001.png', time: '3天前', type: 'image' },
                ].map((item, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-slate-100 cursor-pointer flex items-center gap-3 border-l-2 border-transparent hover:border-blue-500 transition-all group">
                    <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                      {item.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700" title={item.name}>{item.name}</div>
                      <div className="text-xs text-slate-400">{item.time}</div>
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          )}

          {/* Main Content Area */}
          <main className="flex-1 flex relative bg-white overflow-hidden">
            
            {/* MINI Mode */}
            {mode === 'mini' && (
              <div className="flex-1 flex flex-col w-full">
                <div className="bg-blue-50/50 p-2 text-xs text-center text-blue-600 border-b border-blue-100">
                   ⚡ 快速问答模式
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-white space-y-4">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-700 border border-slate-100 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-100">
                   <div className="relative">
                      <input 
                        className="w-full pl-4 pr-10 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                        placeholder="快速提问..."
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600">
                         <Send size={16} />
                      </button>
                   </div>
                </div>
              </div>
            )}

            {/* FULL Mode: Split Pane (Source | Editor) */}
            {mode === 'full' && (
              <>
                {/* 2. Source File Area (完全折叠逻辑) */}
                <div 
                  className={`
                    border-r border-slate-100 flex flex-col bg-slate-50/30 transition-all duration-500 ease-in-out relative
                    ${isSourceCollapsed ? 'w-0 p-0 border-0 overflow-hidden' : 'w-1/2 p-6'}
                  `}
                >
                  {!isSourceCollapsed && (
                    <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                      <div className="mb-4 flex items-center justify-between shrink-0">
                        <h2 className="text-lg font-bold text-slate-700">源文件</h2>
                        
                        {/* Prompt Selector */}
                        <div className="relative group">
                          <button className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all">
                             <Cpu size={14} />
                             {prompts.find(p => p.id === activePromptId)?.name || '选择领域'}
                             <ChevronDown size={12} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-100 shadow-xl rounded-lg overflow-hidden z-10 hidden group-hover:block animate-in fade-in zoom-in-95 duration-100">
                             {prompts.map(p => (
                                <div key={p.id} onClick={() => setActivePromptId(p.id)} className={`px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between ${activePromptId === p.id ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600'}`}>
                                   {p.name} {activePromptId === p.id && <Check size={12} />}
                                </div>
                             ))}
                          </div>
                       </div>
                      </div>

                      {files.length === 0 ? (
                        <div 
                          className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-blue-50/30 hover:border-blue-400 transition-all cursor-pointer group"
                          onClick={() => document.getElementById('file-upload').click()}
                        >
                          <input id="file-upload" type="file" className="hidden" accept=".pdf,.docx,.jpg,.png" onChange={handleFileUpload} />
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={32} className="text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <p className="font-medium text-slate-600">点击或拖拽上传</p>
                          <div className="mt-6 flex gap-4">
                            <button className="px-4 py-2 bg-white border shadow-sm rounded-lg text-xs font-medium hover:text-blue-600 flex items-center gap-2">
                              <ImageIcon size={14}/> 粘贴截图
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                          <FileText size={64} className={`text-blue-500 mb-6 ${isProcessing ? 'animate-bounce' : ''}`} />
                          <h3 className="font-bold text-lg text-slate-800 text-center max-w-[80%] truncate" title={files[0].name}>
                            {files[0].name}
                          </h3>
                          <p className="text-slate-500 text-sm mt-1 mb-8">{(files[0].size / 1024).toFixed(1)} KB</p>
                          
                          {isProcessing ? (
                            <div className="w-full max-w-xs space-y-3">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                 <span>{processingStep.label}</span>
                                 <span>{processingStep.percent}%</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                 <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out" style={{width: `${processingStep.percent}%`}}></div>
                              </div>
                            </div>
                          ) : (
                             <div className="flex gap-3">
                                <button className="text-sm text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors" onClick={() => {setFiles([]); setMarkdownOutput('')}}>删除</button>
                                <button className="text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-medium">重新解析</button>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Right: Editor & Agent (Auto Expands) */}
                <div className="flex-1 flex flex-col bg-white h-full relative group transition-all duration-500">
                   
                   {/* Toggle Button: 放在右侧编辑区的左边缘 */}
                   <button 
                      onClick={() => setIsSourceCollapsed(!isSourceCollapsed)}
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 z-50 transition-colors"
                      title={isSourceCollapsed ? "展开源文件" : "折叠源文件"}
                    >
                      {isSourceCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                   </button>

                   <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <Sparkles size={18} className="text-yellow-500" />
                        翻译结果
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-2">
                           <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded-md transition-all" title="撤销">
                             <Undo size={16} />
                           </button>
                           <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                           <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white rounded-md transition-all" title="重做">
                             <Redo size={16} />
                           </button>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="复制"><Copy size={18} /></button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md">
                            <Download size={16} /> 导出 PDF
                        </button>
                    </div>
                  </div>

                  <div className="flex-1 relative">
                    {markdownOutput ? (
                         <textarea 
                         className="w-full h-full p-6 pb-24 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-700"
                         value={markdownOutput}
                         onChange={(e) => updateContent(e.target.value)}
                         spellCheck={false}
                       />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 select-none pointer-events-none">
                            <div className="text-center">
                                <FileCode size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>翻译结果将显示在这里</p>
                                <p className="text-xs mt-2 text-slate-400">上传文件后自动开始</p>
                            </div>
                        </div>
                    )}

                    {/* Agent Floating Input */}
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md transition-all duration-300 ${showAgentInput ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-2 ring-1 ring-black/5">
                           <div className="flex items-center gap-2 px-2 pt-1 pb-1">
                              <Bot size={16} className="text-purple-600" />
                              <span className="text-xs font-bold text-slate-700">AI 智能修改</span>
                              <div className="flex-1"/>
                              <button onClick={() => setShowAgentInput(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                           </div>
                           <div className="relative">
                              <input 
                                type="text" 
                                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                                placeholder="输入要求，例如：语气更正式一点..."
                                value={agentQuery}
                                onChange={e => setAgentQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgentModify()}
                                autoFocus={showAgentInput}
                              />
                              <button onClick={handleAgentModify} disabled={isAgentWorking || !agentQuery} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                {isAgentWorking ? <Loader2 size={14} className="animate-spin"/> : <CornerDownLeft size={14} />}
                              </button>
                           </div>
                        </div>
                    </div>

                    {!showAgentInput && markdownOutput && (
                      <button onClick={() => setShowAgentInput(true)} className="absolute bottom-6 right-6 w-10 h-10 bg-white border border-slate-200 text-purple-600 rounded-full shadow-lg hover:scale-110 hover:shadow-xl transition-all flex items-center justify-center group z-10" title="唤起 AI 修改">
                         <Sparkles size={18} className="group-hover:rotate-12 transition-transform"/>
                      </button>
                    )}
                  </div>
                  
                  <div className="h-8 border-t border-slate-100 flex items-center px-4 gap-4 text-[10px] text-slate-400 bg-slate-50 select-none shrink-0">
                    <span>{markdownOutput.length} 字符</span>
                    <div className="flex-1" />
                    <span className="flex items-center gap-1"><Check size={10}/> 自动保存</span>
                  </div>
                </div>
              </>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}