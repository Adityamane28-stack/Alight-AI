import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Zap, User, Copy, Check } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { useTheme } from '../context/ThemeContext';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 group animate-fade-in">
        <div className="flex items-start gap-3 max-w-[85%] md:max-w-[75%]">
          <div className={`px-5 py-3.5 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed shadow-xs transition ${
            theme === 'dark'
              ? 'bg-[#181A28] border border-[#25283E] text-stone-100 hover:bg-[#1E2133]'
              : 'bg-[#F0EEE6] hover:bg-[#EBE8DF] text-stone-800'
          }`}>
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-stone-400 to-stone-600 dark:from-stone-700 dark:to-stone-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold shadow-2xs">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 mb-8 group animate-fade-in">
      {/* Alight Radiant Avatar */}
      <div className={`relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4890A] via-[#E8A520] to-[#F9CF66] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-amber-500/20 transition-all ${
        isStreaming ? 'animate-pulse ring-2 ring-amber-400/50 ring-offset-2 ring-offset-transparent' : ''
      }`}>
        <Zap className="w-4 h-4 fill-white" />
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
              Alight
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${
              theme === 'dark'
                ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
            }`}
            title="Copy response"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className={`prose max-w-none text-[15px] leading-relaxed break-words ${
          theme === 'dark' ? 'prose-invert text-stone-200' : 'prose-stone text-stone-800'
        }`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                if (!inline && match) {
                  return <CodeBlock language={match[1]} value={codeString} />;
                } else if (!inline && codeString.includes('\n')) {
                  return <CodeBlock language="text" value={codeString} />;
                } else {
                  return (
                    <code
                      className={`px-1.5 py-0.5 rounded font-mono text-[13px] ${
                        theme === 'dark'
                          ? 'bg-[#181A28] text-amber-400 border border-amber-500/20'
                          : 'bg-[#ECEAE2] text-[#B26C04]'
                      }`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
              },
              p({ children }) {
                return <p className="mb-3 leading-relaxed last:mb-0">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
              },
              table({ children }) {
                return (
                  <div className={`overflow-x-auto my-4 border rounded-xl ${
                    theme === 'dark' ? 'border-[#25283C]' : 'border-stone-300'
                  }`}>
                    <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-sm">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className={`px-3 py-2 font-semibold text-left ${
                    theme === 'dark' ? 'bg-[#151724]' : 'bg-stone-100'
                  }`}>
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className={`px-3 py-2 border-t ${
                    theme === 'dark' ? 'border-[#25283C]' : 'border-stone-200'
                  }`}>
                    {children}
                  </td>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>

          {isStreaming && <span className="cursor-blink" />}
        </div>
      </div>
    </div>
  );
};
