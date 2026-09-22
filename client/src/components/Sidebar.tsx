import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  Sliders,
  Zap,
  ChevronLeft,
  User as UserIcon,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, onOpenSettings }) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createNewChat,
    deleteChat,
    updateSettings,
    isLoadingConversations,
  } = useChat();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      try {
        await api.updateConversation(id, { title: editTitle.trim() });
        await updateSettings({ title: editTitle.trim() });
      } catch (err) {
        console.error('Failed to rename conversation:', err);
      }
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      await deleteChat(id);
    }
  };

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out ${
        theme === 'dark'
          ? 'bg-[#0B0C12] border-[#1D2030] text-stone-200'
          : 'bg-[#F3F2EB] border-stone-200 text-stone-800'
      } ${
        isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'
      }`}
    >
      {/* Brand & Mobile Toggle Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        theme === 'dark' ? 'border-[#1D2030]' : 'border-stone-200/60'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4890A] to-[#F9CF66] text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-base bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-yellow-200 bg-clip-text text-transparent">
              Alight
            </span>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={`p-1 rounded-lg transition md:hidden ${
            theme === 'dark' ? 'text-stone-400 hover:text-white hover:bg-stone-800' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/50'
          }`}
          title="Close sidebar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={createNewChat}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition shadow-2xs group ${
            theme === 'dark'
              ? 'bg-[#141624] hover:bg-[#1B1E30] border-[#25283C] text-stone-200 hover:border-amber-500/40'
              : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-amber-500 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Chat</span>
          </div>
          <span className="text-[10px] text-stone-400 font-mono">⌘K</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          History
        </div>

        {isLoadingConversations && conversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-stone-400 italic">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-stone-400">No chats yet. Spark a question!</div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = conv.id === editingId;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-[#181A2A] text-amber-400 font-semibold border border-amber-500/30'
                      : 'bg-[#EAE8DD] text-stone-900 font-semibold border border-amber-500/20'
                    : theme === 'dark'
                    ? 'text-stone-400 hover:bg-[#131522] hover:text-stone-200'
                    : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className={`flex-1 rounded px-2 py-1 text-xs focus:outline-none ${
                        theme === 'dark' ? 'bg-[#0E0F17] text-white border border-stone-700' : 'bg-white border border-stone-300'
                      }`}
                    />
                    <button
                      onClick={(e) => handleSaveEdit(conv.id, e)}
                      className="p-1 text-emerald-500 hover:bg-stone-700/30 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-stone-400 hover:bg-stone-700/30 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-amber-500' : 'text-stone-400 group-hover:text-stone-300'
                      }`} />
                      <span className="truncate text-[13px]">{conv.title || 'New Conversation'}</span>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleStartEdit(conv.id, conv.title, e)}
                        className="p-1 text-stone-400 hover:text-amber-500 rounded transition"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="p-1 text-stone-400 hover:text-red-500 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User profile & Settings Footer */}
      <div className={`p-3 border-t ${
        theme === 'dark' ? 'bg-[#0A0B10] border-[#1D2030]' : 'bg-[#EFECE3] border-stone-200/70'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0 text-xs font-bold">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold truncate">
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">{user?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800/40 rounded-lg transition"
              title="Settings & API Keys"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800/40 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
