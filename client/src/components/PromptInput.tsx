import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, SlidersHorizontal } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';

interface PromptInputProps {
  onOpenSettings: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onOpenSettings }) => {
  const { sendMessage, isStreaming, stopStreaming, model } = useChat();
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const shortModel = model.split('/').pop() || model;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className={`relative rounded-2xl border shadow-lg transition-all duration-200 ${
        theme === 'dark'
          ? 'bg-[#12131C] border-[#222538] focus-within:border-amber-500/60 focus-within:shadow-amber-500/10'
          : 'bg-white border-stone-300/80 focus-within:border-amber-500/60 focus-within:shadow-md'
      }`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Alight anything..."
          rows={1}
          className={`w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-[15px] leading-relaxed focus:outline-none max-h-56 overflow-y-auto ${
            theme === 'dark'
              ? 'text-stone-100 placeholder-stone-500'
              : 'text-stone-800 placeholder-stone-400'
          }`}
        />

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Model Tag & Settings button */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onOpenSettings}
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl transition ${
                theme === 'dark'
                  ? 'text-stone-400 hover:text-amber-400 hover:bg-[#1A1D2E]'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
              title="Configure model and system instructions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{shortModel}</span>
            </button>
          </div>

          {/* Submit / Stop Button */}
          <div className="pointer-events-auto">
            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="w-8 h-8 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 flex items-center justify-center transition shadow-sm"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                  input.trim()
                    ? 'bg-gradient-to-tr from-[#D4890A] to-[#F9CF66] hover:brightness-110 text-white cursor-pointer shadow-amber-500/30'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-stone-400 dark:text-stone-500 mt-2">
        Alight can make mistakes. Please verify critical information.
      </p>
    </div>
  );
};
