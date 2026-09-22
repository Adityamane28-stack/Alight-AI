import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import OpenAI from 'openai';

export interface ChatHistoryItem {
  role: string; // 'user' | 'assistant'
  content: string;
}

export interface CustomApiKeys {
  gemini?: string;
  groq?: string;
  openrouter?: string;
  openai?: string;
}

export interface StreamUnifiedChatParams {
  model: string;
  systemPrompt?: string | null;
  temperature?: number;
  history: ChatHistoryItem[];
  newMessage: string;
  customKeys?: CustomApiKeys;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// GEMINI MULTI-KEY POOL & ROTATION
// ============================================================
export function getGeminiKeyPool(customKey?: string): string[] {
  const rawKeys: string[] = [];

  if (customKey && customKey.trim()) {
    rawKeys.push(...customKey.split(',').map((k) => k.trim()));
  }
  if (process.env.GEMINI_API_KEYS) {
    rawKeys.push(...process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()));
  }
  if (process.env.GEMINI_API_KEY) {
    rawKeys.push(...process.env.GEMINI_API_KEY.split(',').map((k) => k.trim()));
  }

  // Filter out blanks, duplicates, and placeholder text
  return Array.from(new Set(rawKeys)).filter(
    (k) => k && !k.includes('your-gemini-api-key-here') && k.length > 5
  );
}

// ============================================================
// FORMATTERS FOR MULTI-TURN HISTORY
// ============================================================
function formatGeminiContents(history: ChatHistoryItem[], newMessage: string): Content[] {
  const contents: Content[] = [];

  for (const item of history) {
    const text = item.content?.trim();
    if (!text || text.startsWith('⚠️') || text.includes('Gemini API Error') || text.includes('HTTP error') || text.includes('Rate Limit Reached') || text.includes('AI Provider Error')) {
      continue;
    }
    const role = item.role === 'assistant' ? 'model' : 'user';

    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text }] });
      }
      continue;
    }

    const lastRole = contents[contents.length - 1].role;
    if (lastRole === role) {
      const prevText = contents[contents.length - 1].parts[0]?.text || '';
      contents[contents.length - 1].parts = [{ text: `${prevText}\n\n${text}` }];
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  const userText = newMessage.trim();
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    const prevText = contents[contents.length - 1].parts[0]?.text || '';
    contents[contents.length - 1].parts = [{ text: `${prevText}\n\n${userText}` }];
  } else {
    contents.push({ role: 'user', parts: [{ text: userText }] });
  }

  return contents;
}

function formatOpenAIMessages(history: ChatHistoryItem[], newMessage: string, systemPrompt?: string | null): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemPrompt?.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }

  for (const item of history) {
    const text = item.content?.trim();
    if (!text || text.startsWith('⚠️') || text.includes('Error') || text.includes('Rate Limit')) continue;
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role, content: text });
  }

  messages.push({ role: 'user', content: newMessage.trim() });
  return messages;
}

// Detect provider by model name
export function detectProvider(modelName: string): 'groq' | 'openrouter' | 'openai' | 'gemini' {
  const name = (modelName || '').toLowerCase();
  if (name.includes('groq') || name.startsWith('openai/gpt-oss') || name.startsWith('qwen/') || name.startsWith('llama-')) {
    return 'groq';
  }
  if (name.includes('deepseek') || name.includes('/')) {
    return 'openrouter';
  }
  if (name.startsWith('gpt-') || name.startsWith('o1') || name.startsWith('o3')) {
    return 'openai';
  }
  return 'gemini';
}

// ============================================================
// PROVIDER STREAMERS
// ============================================================

// 1. Groq Streamer (Ultra Fast, High Limit)
async function* streamGroq(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature: number,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  // Use top active Groq models (openai/gpt-oss-120b or qwen/qwen3.8-27b)
  let targetModel = 'openai/gpt-oss-120b';
  if (model.includes('qwen') || model.includes('27b')) {
    targetModel = 'qwen/qwen3.8-27b';
  } else if (model.includes('20b')) {
    targetModel = 'openai/gpt-oss-20b';
  }

  const response = await client.chat.completions.create({
    model: targetModel,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    stream: true,
  });

  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

// 2. OpenRouter Streamer (DeepSeek R1, Llama 3.3)
async function* streamOpenRouter(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature: number,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Claude AI Assistant',
    },
  });

  let targetModel = model.replace(':free', '');
  if (!targetModel || targetModel.includes('deepseek')) {
    targetModel = 'deepseek/deepseek-r1';
  }

  const response = await client.chat.completions.create({
    model: targetModel,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    stream: true,
  });

  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

// 3. OpenAI Streamer
async function* streamOpenAI(
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature: number,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    stream: true,
  });

  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

// 4. Gemini Streamer (with Pool & Non-Streaming Fallback)
async function* streamGeminiWithKey(
  model: string,
  contents: Content[],
  systemPrompt: string | null | undefined,
  temperature: number,
  apiKey: string
): AsyncGenerator<string, void, unknown> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const selectedModel = 'gemini-3.6-flash';

  const generativeModel = genAI.getGenerativeModel({
    model: selectedModel,
    systemInstruction: systemPrompt?.trim() ? systemPrompt.trim() : undefined,
    generationConfig: {
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    },
  });

  let streamedAny = false;
  try {
    const result = await generativeModel.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        streamedAny = true;
        yield chunkText;
      }
    }
    return;
  } catch (streamError: any) {
    if (streamedAny) {
      yield `\n\n⚠️ **Stream interrupted**: ${streamError?.message || 'Connection lost'}`;
      return;
    }
    // Fall back to direct non-streaming
    const directResult = await generativeModel.generateContent({ contents });
    const directText = directResult.response.text();
    if (directText) {
      const words = directText.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        yield words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
        await sleep(20);
      }
    }
  }
}

// ============================================================
// MAIN UNIFIED STREAM ROUTER & AUTOMATIC FAILOVER
// ============================================================
export async function* streamUnifiedChat({
  model = 'openai/gpt-oss-120b',
  systemPrompt,
  temperature = 0.7,
  history,
  newMessage,
  customKeys = {},
}: StreamUnifiedChatParams): AsyncGenerator<string, void, unknown> {
  const geminiPool = getGeminiKeyPool(customKeys.gemini);
  const groqKey = customKeys.groq || process.env.GROQ_API_KEY;
  const openrouterKey = customKeys.openrouter || process.env.OPENROUTER_API_KEY;
  const openaiKey = customKeys.openai || process.env.OPENAI_API_KEY;

  const targetProvider = detectProvider(model);
  const openAIMessages = formatOpenAIMessages(history, newMessage, systemPrompt);
  const geminiContents = formatGeminiContents(history, newMessage);

  let streamedAny = false;
  let lastError: any = null;

  type ProviderAttempt = {
    provider: 'groq' | 'openrouter' | 'gemini' | 'openai';
    model: string;
    apiKey: string;
  };

  const attempts: ProviderAttempt[] = [];

  // Primary attempt based on requested target
  if (targetProvider === 'groq' && groqKey) {
    attempts.push({ provider: 'groq', model, apiKey: groqKey });
  } else if (targetProvider === 'openrouter' && openrouterKey) {
    attempts.push({ provider: 'openrouter', model, apiKey: openrouterKey });
  } else if (targetProvider === 'openai' && openaiKey) {
    attempts.push({ provider: 'openai', model, apiKey: openaiKey });
  } else if (targetProvider === 'gemini' && geminiPool.length > 0) {
    for (const key of geminiPool) {
      attempts.push({ provider: 'gemini', model: 'gemini-3.6-flash', apiKey: key });
    }
  }

  // Cross-Provider Failover Cascade:
  // 1. If Groq key is present, ALWAYS add it as failover (since Groq is ultra-fast & high limit)!
  if (groqKey && !attempts.some((a) => a.provider === 'groq')) {
    attempts.push({ provider: 'groq', model: 'openai/gpt-oss-120b', apiKey: groqKey });
  }
  // 2. If OpenRouter key is present, add DeepSeek R1 as failover!
  if (openrouterKey && !attempts.some((a) => a.provider === 'openrouter')) {
    attempts.push({ provider: 'openrouter', model: 'deepseek/deepseek-r1', apiKey: openrouterKey });
  }
  // 3. If Gemini keys are present, add to cascade!
  if (geminiPool.length > 0 && !attempts.some((a) => a.provider === 'gemini')) {
    for (const key of geminiPool) {
      attempts.push({ provider: 'gemini', model: 'gemini-3.6-flash', apiKey: key });
    }
  }

  if (attempts.length === 0) {
    yield '⚠️ **No Active API Keys Found**: Please configure your API key in `server/.env` or in the Chat Settings panel. You can add a free Groq key (14,400 req/day from https://console.groq.com) or Google Gemini key.';
    return;
  }

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      if (attempt.provider === 'groq') {
        const stream = streamGroq(attempt.model, openAIMessages, temperature, attempt.apiKey);
        for await (const chunk of stream) {
          streamedAny = true;
          yield chunk;
        }
        return;
      } else if (attempt.provider === 'openrouter') {
        const stream = streamOpenRouter(attempt.model, openAIMessages, temperature, attempt.apiKey);
        for await (const chunk of stream) {
          streamedAny = true;
          yield chunk;
        }
        return;
      } else if (attempt.provider === 'openai') {
        const stream = streamOpenAI(attempt.model, openAIMessages, temperature, attempt.apiKey);
        for await (const chunk of stream) {
          streamedAny = true;
          yield chunk;
        }
        return;
      } else if (attempt.provider === 'gemini') {
        const stream = streamGeminiWithKey(attempt.model, geminiContents, systemPrompt, temperature, attempt.apiKey);
        for await (const chunk of stream) {
          streamedAny = true;
          yield chunk;
        }
        return;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[LLMService] Attempt ${i + 1}/${attempts.length} (${attempt.provider}:${attempt.model}) failed:`, err?.status || err?.message);

      if (streamedAny) {
        yield `\n\n⚠️ **Stream interrupted**: ${err?.message || 'Connection lost'}`;
        return;
      }

      // If more providers are in the cascade, seamlessly fail over to the next provider!
      if (i < attempts.length - 1) {
        console.info(`[LLMService] Seamlessly failing over to next provider (${attempts[i + 1].provider})...`);
        await sleep(300);
        continue;
      }
    }
  }

  // If all providers and keys failed
  const rawMsg = String(lastError?.message || '');
  yield `\n\n⚠️ **AI Provider Error**: ${rawMsg || 'Failed to generate response across all configured providers.'}`;
}
