import React, { useRef, useEffect } from 'react';
import {
  Menu,
  Sliders,
  Code2,
  Lightbulb,
  Compass,
  FileText,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage } from './ChatMessage';
import { PromptInput } from './PromptInput';

interface ChatAreaProps {
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  sidebarOpen: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onToggleSidebar,
  onOpenSettings,
  sidebarOpen,
}) => {
  const {
    messages,
    isStreaming,
    streamingContent,
    activeConversation,
    sendMessage,
    model,
  } = useChat();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on streaming or new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const quickPrompts = [
    {
      icon: <Code2 className="w-5 h-5 text-amber-500" />,
      tag: 'Coding',
      title: 'Generate Full-Stack Code',
      prompt: 'Write a high-performance REST API with Express, TypeScript, and rate limiting middleware.',
      delay: 'delay-100',
    },
    {
      icon: <Lightbulb className="w-5 h-5 text-emerald-500" />,
      tag: 'Creative',
      title: 'Brainstorm Breakthrough Concepts',
      prompt: 'Give me 5 revolutionary AI agent architecture ideas that disrupt developer productivity in 2026.',
      delay: 'delay-200',
    },
    {
      icon: <Compass className="w-5 h-5 text-blue-500" />,
      tag: 'Analysis',
      title: 'Explain Complex Deep Learning',
      prompt: 'Explain how Speculative Decoding and Mixture of Experts (MoE) achieve 10x inference acceleration.',
      delay: 'delay-300',
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-500" />,
      tag: 'Strategy',
      title: 'Draft a High-Impact Pitch',
      prompt: 'Draft an executive summary and value proposition for an AI enterprise search startup.',
      delay: 'delay-400',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#0A0B10] alight-glow-dark text-stone-100' : 'bg-[#FAF9F5] alight-glow-light text-stone-900'
    }`}>
      {/* Top Navigation Bar */}
      <header className={`h-14 px-4 flex items-center justify-between border-b backdrop-blur-md shrink-0 z-10 transition-colors ${
        theme === 'dark'
          ? 'bg-[#0E0F17]/80 border-[#202334]'
          : 'bg-[#FAF9F5]/80 border-stone-200/80'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-xl transition ${
              theme === 'dark'
                ? 'text-stone-400 hover:text-white hover:bg-[#1A1C2B]'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/60'
            }`}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate max-w-[200px] md:max-w-md tracking-tight">
              {activeConversation?.title || 'New Conversation'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-[#141622] border-[#25273A] text-amber-400 hover:bg-[#1C1F30]'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-amber-600 shadow-2xs'
            }`}
            title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Model & Settings Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition shadow-2xs ${
              theme === 'dark'
                ? 'bg-[#141622] border-[#25273A] text-stone-200 hover:bg-[#1C1F30] hover:border-amber-500/50'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-amber-500/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[130px]">{model.split('/').pop() || model}</span>
            <Sliders className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-between">
          {/* Animated Hero / Welcome Screen */}
          {messages.length === 0 && !isStreaming ? (
            <div className="relative flex-1 flex flex-col items-center justify-center my-auto py-8 text-center animate-fade-in">
              {/* Ambient Floating Glow Orbs */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none animate-float" />
              <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '2.5s' }} />

              {/* Luminous Animated Emblem */}
              <div className="relative mb-6 group cursor-pointer">
                {/* Rotating Outer Dashed Ring */}
                <div className="absolute -inset-6 rounded-full border border-dashed border-amber-500/25 dark:border-amber-500/35 animate-spin-slow pointer-events-none" />

                {/* Radiant Ambient Glow Halo */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/35 via-orange-500/25 to-yellow-500/35 blur-2xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse-slow" />
                
                {/* Emblem Box */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D4890A] via-[#E8A520] to-[#F9CF66] text-white flex items-center justify-center shadow-xl shadow-amber-500/30 animate-float sheen-card">
                  <Zap className="w-8 h-8 fill-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>
              </div>

              {/* Greeting & Headline */}
              <h1 className="relative text-3xl sm:text-4xl font-extrabold tracking-tight mb-2.5 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-700 dark:from-white dark:via-stone-200 dark:to-amber-400 bg-clip-text text-transparent animate-fade-up">
                {getGreeting()}, {userName}
              </h1>

              <p className="relative text-sm sm:text-base text-stone-500 dark:text-stone-400 max-w-lg mb-8 leading-relaxed animate-fade-up">
                Welcome to <span className="font-semibold text-amber-600 dark:text-amber-400">Alight</span>. Unbounded intelligence with real-time multi-provider resilience. What will we illuminate today?
              </p>

              {/* Staggered Animated Quick Prompts */}
              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(item.prompt)}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 text-left group overflow-hidden sheen-card ${
                      theme === 'dark'
                        ? 'bg-[#12131C]/90 border-[#222538] hover:border-amber-500/60 hover:bg-[#181A28] shadow-lg shadow-black/20 hover:shadow-amber-500/10'
                        : 'bg-white border-stone-200/90 hover:border-amber-500/60 hover:bg-[#FFFDF8] shadow-xs hover:shadow-md'
                    } hover:-translate-y-1 active:scale-[0.99]`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 group-hover:text-amber-400 transition-colors">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Render Message History */
            <div className="space-y-4 pb-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                />
              ))}

              {/* Active Streaming Message */}
              {isStreaming && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Prompt Bar */}
      <PromptInput onOpenSettings={onOpenSettings} />
    </div>
  );
};
