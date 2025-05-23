import React, { useEffect, useRef } from 'react';
import { Message } from '@/types'; // Using alias
import { UserIcon, BotIcon, AlertTriangleIcon, CheckCircleIcon, CogIcon, Edit3Icon, FileTextIcon, ZapIcon } from '@components/Icons'; // Using alias

const ChatWindow: React.FC<{ messages: Message[]; isLoading: boolean }> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getIconForType = (type?: Message['type']) => {
    switch (type) {
      case 'plan_step': return <CogIcon className="w-4 h-4 mr-2 text-blue-400" />;
      case 'code_update': return <Edit3Icon className="w-4 h-4 mr-2 text-purple-400" />;
      case 'test_log': return <FileTextIcon className="w-4 h-4 mr-2 text-yellow-400" />;
      case 'error': return <AlertTriangleIcon className="w-4 h-4 mr-2 text-red-400" />;
      case 'task_complete': return <CheckCircleIcon className="w-4 h-4 mr-2 text-green-400" />;
      case 'status': return <ZapIcon className="w-4 h-4 mr-2 text-cyan-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-850">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xl flex items-start space-x-2 p-3 rounded-xl shadow-md ${
            msg.sender === 'user' 
              ? 'bg-indigo-600 text-white rounded-br-none' 
              : msg.type === 'error' 
                ? 'bg-red-700 bg-opacity-50 text-red-100 rounded-bl-none border border-red-600'
                : 'bg-gray-700 text-gray-200 rounded-bl-none'
          }`}>
            {msg.sender === 'ai' && msg.type !== 'error' && <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />}
            {msg.sender === 'ai' && msg.type === 'error' && <AlertTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />}
             {msg.sender === 'user' && <UserIcon className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5" />}
            
            <div className="flex-grow">
              <div className="flex items-center mb-0.5">
                {getIconForType(msg.type)}
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.type === 'code_update' && msg.fileName ? <strong>{`Code update for ${msg.fileName}:`}</strong> : msg.text}
                </p>
              </div>
              {msg.type === 'code_update' && msg.codeContent && (
                <details className="mt-1">
                  <summary className="text-xs text-indigo-300 cursor-pointer hover:underline">View Code</summary>
                  <pre className="mt-1 p-2 bg-gray-800 rounded text-xs overflow-x-auto max-h-60">
                    <code>{msg.codeContent}</code>
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;