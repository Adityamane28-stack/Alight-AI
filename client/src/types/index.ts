export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string | null;
  temperature: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'Groq' | 'Google' | 'OpenRouter' | 'OpenAI';
  description: string;
  badge?: string;
}

export interface UserCustomKeys {
  gemini?: string;
  groq?: string;
  openrouter?: string;
  openai?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'Groq: GPT-OSS 120B Flagship',
    provider: 'Groq',
    description: '120B parameter flagship on Groq LPUs. Ultra-fast with 14,400 free requests/day',
    badge: 'Recommended',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Groq: Qwen 27B Ultra',
    provider: 'Groq',
    description: 'High performance coding and logical analysis running at ~500 tokens/sec',
    badge: 'Fast',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Google: Gemini 3.6 Flash',
    provider: 'Google',
    description: 'Google multimodal flagship with automatic key-pool rotation and failover',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'OpenRouter: DeepSeek R1',
    provider: 'OpenRouter',
    description: 'Step-by-step reasoning intelligence with seamless failover backup',
    badge: 'Reasoning',
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI: GPT-4o Flagship',
    provider: 'OpenAI',
    description: 'Most intelligent OpenAI multimodal model for complex reasoning and tasks',
    badge: 'OpenAI',
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI: GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Affordable, fast, and lightweight OpenAI model for general tasks',
    badge: 'Fast',
  },
];
