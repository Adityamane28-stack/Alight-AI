import { GoogleGenerativeAI, Content } from '@google/generative-ai';

export interface ChatHistoryItem {
  role: string; // 'user' | 'assistant'
  content: string;
}

export interface StreamChatParams {
  model: string;
  systemPrompt?: string | null;
  temperature?: number;
  history: ChatHistoryItem[];
  newMessage: string;
}

const STABLE_DEFAULT_MODEL = 'gemini-3.6-flash';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 3000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds valid Gemini multi-turn chat contents:
 * 1. Skips error messages.
 * 2. Ensures the first message has role 'user'.
 * 3. Enforces strict alternation between 'user' and 'model'.
 * 4. Appends the new user message.
 */
function buildGeminiContents(history: ChatHistoryItem[], newMessage: string): Content[] {
  const contents: Content[] = [];

  for (const item of history) {
    const text = item.content?.trim();
    // Skip empty messages or previous error banners
    if (!text || text.startsWith('⚠️') || text.includes('Gemini API Error') || text.includes('HTTP error')) {
      continue;
    }

    const role = item.role === 'assistant' ? 'model' : 'user';

    if (contents.length === 0) {
      // First turn in Gemini MUST be 'user'
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text }] });
      }
      continue;
    }

    const lastRole = contents[contents.length - 1].role;
    if (lastRole === role) {
      // Merge consecutive turns of the same role
      const prevText = contents[contents.length - 1].parts[0]?.text || '';
      contents[contents.length - 1].parts = [{ text: `${prevText}\n\n${text}` }];
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // Append new user message
  const userText = newMessage.trim();
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    const prevText = contents[contents.length - 1].parts[0]?.text || '';
    contents[contents.length - 1].parts = [{ text: `${prevText}\n\n${userText}` }];
  } else {
    contents.push({ role: 'user', parts: [{ text: userText }] });
  }

  return contents;
}

function isRetryableError(error: any): boolean {
  const status = error?.status;
  const msg = String(error?.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('failed to parse stream') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

export async function* streamGeminiChat({
  model = STABLE_DEFAULT_MODEL,
  systemPrompt,
  temperature = 0.7,
  history,
  newMessage,
}: StreamChatParams): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    yield '⚠️ **API Key Missing**: Please configure your `GEMINI_API_KEY` in `server/.env` to enable real-time Gemini responses. You can get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).';
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const contents = buildGeminiContents(history, newMessage);

  // Always prefer STABLE_DEFAULT_MODEL if requested model is known to be overloaded
  const requested = model && model.trim() !== 'gemini-3.8-flash' && model.trim() !== 'gemini-2.5-flash'
    ? model.trim()
    : STABLE_DEFAULT_MODEL;

  const modelsToTry: string[] = [requested];
  if (!modelsToTry.includes(STABLE_DEFAULT_MODEL)) {
    modelsToTry.push(STABLE_DEFAULT_MODEL);
  }

  let streamedAny = false;
  let lastError: any = null;

  for (const currentModelName of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const generativeModel = genAI.getGenerativeModel({
          model: currentModelName,
          systemInstruction: systemPrompt?.trim() ? systemPrompt.trim() : undefined,
          generationConfig: {
            temperature: typeof temperature === 'number' ? temperature : 0.7,
          },
        });

        // Try streaming first
        try {
          const result = await generativeModel.generateContentStream({ contents });

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              streamedAny = true;
              yield chunkText;
            }
          }

          // Successfully completed streaming!
          return;
        } catch (streamError: any) {
          // If streaming failed mid-response after emitting text, report interruption cleanly
          if (streamedAny) {
            yield `\n\n⚠️ **Stream interrupted**: ${streamError?.message || 'Connection lost'}`;
            return;
          }

          // If stream failed before emitting anything (e.g. "Failed to parse stream" or 503 HTML),
          // fallback to standard non-streaming generateContent!
          console.warn(`[GeminiService] Stream attempt failed for '${currentModelName}', trying non-streaming fallback...`);
          const directResult = await generativeModel.generateContent({ contents });
          const directText = directResult.response.text();
          if (directText) {
            streamedAny = true;
            // Emit chunks to simulate streaming for UI smoothness
            const words = directText.split(' ');
            for (let i = 0; i < words.length; i += 3) {
              const slice = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
              yield slice;
              await sleep(25);
            }
            return;
          }
        }
      } catch (error: any) {
        lastError = error;

        // If we already started streaming tokens to the client, cannot retry from scratch
        if (streamedAny) {
          yield `\n\n⚠️ **Stream interrupted**: ${error?.message || 'Connection lost'}`;
          return;
        }

        const retryable = isRetryableError(error);
        if (retryable && attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] || 1500;
          console.warn(
            `[GeminiService] Model '${currentModelName}' returned retryable error (${error?.status || error?.message}). Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          );
          await sleep(delay);
          continue;
        }

        console.warn(
          `[GeminiService] Model '${currentModelName}' failed for this attempt (${error?.status || error?.message}).`
        );
        break; // Break inner loop to try next model in cascade
      }
    }
  }

  // If all candidate models and retries failed
  console.error('All Gemini model candidates failed after retries:', lastError);
  const rawMsg = String(lastError?.message || '');

  if (lastError?.status === 429 || rawMsg.includes('429') || rawMsg.includes('quota')) {
    const match = rawMsg.match(/Please retry in ([\d\.]+)s/i) || rawMsg.match(/retryDelay":"(\d+s)"/);
    const retryWait = match ? match[1] : '30-60 seconds';
    yield `\n\n⏳ **Free-Tier Rate Limit Reached (429)**: You've reached Google's free-tier API request quota. Please wait **${retryWait}** before sending the next message.`;
    return;
  }

  if (lastError?.status === 503 || rawMsg.includes('503') || rawMsg.includes('high demand')) {
    yield `\n\n⏳ **High Demand Spike (503)**: Google's AI servers are temporarily experiencing high traffic. Please retry in 10-15 seconds.`;
    return;
  }

  const errorMessage = lastError?.message || 'Service is temporarily overloaded. Please try again.';
  yield `\n\n⚠️ **Gemini API Error**: ${errorMessage}`;
}
