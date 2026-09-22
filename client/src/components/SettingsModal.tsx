import React, { useState, useEffect } from 'react';
import { X, Sliders, Cpu, MessageSquareText, Sparkles, Key, ExternalLink, CheckCircle2 } from 'lucide-react';
import { AVAILABLE_MODELS, UserCustomKeys } from '../types';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { model, systemPrompt, temperature, updateSettings } = useChat();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'models' | 'keys'>('models');
  const [tempModel, setTempModel] = useState(model);
  const [tempPrompt, setTempPrompt] = useState(systemPrompt);
  const [tempTemperature, setTempTemperature] = useState(temperature);

  // Custom API keys state
  const [keys, setKeys] = useState<UserCustomKeys>({
    gemini: '',
    groq: '',
    openrouter: '',
    openai: '',
  });
  const [savedKeysNotification, setSavedKeysNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempModel(model);
      setTempPrompt(systemPrompt);
      setTempTemperature(temperature);

      // Load saved keys from localStorage
      try {
        const stored = localStorage.getItem('ai_custom_keys');
        if (stored) {
          setKeys(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [isOpen, model, systemPrompt, temperature]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateSettings({
      model: tempModel,
      systemPrompt: tempPrompt,
      temperature: tempTemperature,
    });

    // Save custom keys
    localStorage.setItem('ai_custom_keys', JSON.stringify(keys));
    setSavedKeysNotification(true);
    setTimeout(() => {
      setSavedKeysNotification(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-[#10121B] border-[#222538] text-stone-100 shadow-black/80'
          : 'bg-white border-stone-200 text-stone-800 shadow-xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'dark' ? 'border-[#1E2133]' : 'border-stone-100'
        }`}>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">Alight Configuration & Models</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition ${
              theme === 'dark'
                ? 'text-stone-400 hover:text-white hover:bg-[#1E2133]'
                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b px-6 pt-2 ${
          theme === 'dark' ? 'bg-[#0E0F17] border-[#1E2133]' : 'bg-stone-50/50 border-stone-100'
        }`}>
          <button
            onClick={() => setActiveTab('models')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'models'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Models & Prompt
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'keys'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys & Vast Limits</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'models' ? (
            <>
              {/* Model Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2.5">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  <span>Select Active AI Model</span>
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {AVAILABLE_MODELS.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setTempModel(m.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                        tempModel === m.id
                          ? theme === 'dark'
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                            : 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/50'
                          : theme === 'dark'
                            ? 'border-[#222538] hover:border-stone-700 bg-[#141624]'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            theme === 'dark' ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {m.provider}
                          </span>
                          {m.badge && (
                            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-1">{m.description}</p>
                      </div>
                      <input
                        type="radio"
                        name="model"
                        checked={tempModel === m.id}
                        onChange={() => setTempModel(m.id)}
                        className="mt-1 accent-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Temperature</span>
                  </label>
                  <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                    theme === 'dark' ? 'bg-stone-800 text-amber-400' : 'bg-stone-100 text-stone-800'
                  }`}>
                    {tempTemperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={tempTemperature}
                  onChange={(e) => setTempTemperature(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                  <span>Precise & Deterministic (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                  <MessageSquareText className="w-4 h-4 text-amber-500" />
                  <span>System Prompt (Persona & Instructions)</span>
                </label>
                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  placeholder="e.g. You are Alight, an ultra-smart coding and reasoning AI assistant..."
                  rows={3}
                  className={`w-full p-3 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 leading-relaxed resize-none transition ${
                    theme === 'dark'
                      ? 'bg-[#161826] border-[#25283E] text-white placeholder-stone-600'
                      : 'bg-white border-stone-200 text-stone-800 placeholder-stone-400'
                  }`}
                />
              </div>
            </>
          ) : (
            /* Tab 2: Custom API Keys & Limits */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 leading-relaxed">
                <span className="font-semibold">💡 Vast / Unlimited AI Access:</span> Google Gemini free tier limits requests to 20/min. Adding your free <strong>Groq API key</strong> unlocks <strong>14,400 free requests per day</strong> at up to 1,000 tokens/sec. Alight features <strong>instant automatic multi-provider failover</strong>!
              </div>

              {/* Groq Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Groq API Key (14,400 Free Req/Day)
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get Free Groq Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={keys.groq || ''}
                  onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                  placeholder="gsk_..."
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:border-amber-500 ${
                    theme === 'dark'
                      ? 'bg-[#161826] border-[#25283E] text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                />
              </div>

              {/* Gemini Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get Gemini Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={keys.gemini || ''}
                  onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                  placeholder="AIzaSy... (leave blank to use server key)"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:border-amber-500 ${
                    theme === 'dark'
                      ? 'bg-[#161826] border-[#25283E] text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                />
              </div>

              {/* OpenRouter Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    OpenRouter API Key (Free DeepSeek R1 & Llama)
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get OpenRouter Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={keys.openrouter || ''}
                  onChange={(e) => setKeys({ ...keys, openrouter: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:border-amber-500 ${
                    theme === 'dark'
                      ? 'bg-[#161826] border-[#25283E] text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                />
              </div>

              {/* OpenAI Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    OpenAI API Key (Optional)
                  </label>
                </div>
                <input
                  type="password"
                  value={keys.openai || ''}
                  onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                  placeholder="sk-proj-..."
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:border-amber-500 ${
                    theme === 'dark'
                      ? 'bg-[#161826] border-[#25283E] text-white'
                      : 'bg-white border-stone-200 text-stone-800'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${
          theme === 'dark' ? 'bg-[#0E0F17] border-[#1E2133]' : 'bg-stone-50 border-stone-100'
        }`}>
          <div className="flex items-center gap-2">
            {savedKeysNotification && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Configuration saved!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                theme === 'dark'
                  ? 'text-stone-400 hover:text-white hover:bg-[#1E2133]'
                  : 'text-stone-600 hover:text-stone-800 hover:bg-stone-200/60'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-gradient-to-r from-[#D4890A] via-[#E8A520] to-[#F9CF66] hover:brightness-110 rounded-xl transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
