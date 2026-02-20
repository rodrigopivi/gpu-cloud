import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inference } from '../api';
import { useApiKeys } from '../hooks/useQueries';
import { Send, Bot, User, Loader2, AlertCircle, Plus } from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function Playground() {
  const { data: apiKeys } = useApiKeys();
  const activeKey = apiKeys?.find(k => k.isActive);
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a helpful assistant.' }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ tokens: number; latency: number } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const models = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'llama-2-70b', name: 'Llama 2 70B' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeKey || isStreaming) return;
    
    setError('');
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    
    const startTime = Date.now();
    
    try {
      // Get the full key from localStorage (stored when key was created)
      const keyMap = JSON.parse(localStorage.getItem('apiKeyMap') || '{}');
      const fullKey = keyMap[activeKey.id];
      
      if (!fullKey) {
        setError('API key not found in storage. Please create a new key.');
        setIsStreaming(false);
        return;
      }
      
      let assistantContent = '';
      
      for await (const chunk of inference.createChatCompletionStream(
        {
          model: selectedModel,
          messages: [...messages, userMessage],
          stream: true,
        },
        fullKey
      )) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          assistantContent += content;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant') {
              lastMessage.content = assistantContent;
            } else {
              newMessages.push({ role: 'assistant', content: assistantContent });
            }
            return newMessages;
          });
        }
      }
      
      setStats({
        tokens: Math.ceil(assistantContent.length / 4),
        latency: Date.now() - startTime,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeKey) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Active API Key</h3>
          <p className="text-gray-500 mt-1 mb-4">Create an API key to use the playground</p>
          <Link
            to="/keys"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playground</h1>
          <p className="text-gray-600">Test your API key with live inference</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.filter(m => m.role !== 'system').map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {isStreaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          
          {stats && (
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>~{stats.tokens} tokens</span>
              <span>{stats.latency}ms latency</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
