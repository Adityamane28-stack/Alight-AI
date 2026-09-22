import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const detectedLanguage = language ? language.replace(/language-/, '') : 'text';

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-stone-800 bg-[#1E1E1E] text-stone-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-stone-800 text-xs text-stone-400">
        <span className="font-mono uppercase tracking-wider">{detectedLanguage}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-stone-700/60 transition text-stone-300 hover:text-white"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">Copy code</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <SyntaxHighlighter
          language={detectedLanguage}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

