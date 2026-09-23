import { Conversation, User } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Auth API
  async register(email: string, password: string, name?: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log in');
    return data;
  },

  async getGoogleConfig(): Promise<{ clientId: string; configured: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/auth/google/config`);
      if (res.ok) return await res.json();
    } catch {}
    return { clientId: '', configured: false };
  },

  async setGoogleClientId(clientId: string): Promise<{ success: boolean; clientId: string }> {
    const res = await fetch(`${API_BASE}/auth/google/client-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update Google Client ID');
    return data;
  },


  async loginWithGoogle(payload: { credential?: string; accessToken?: string; email?: string; name?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sign in with Google');
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user');
    return data;
  },

  // Conversations API
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get conversations');
    return data.conversations;
  },

  async createConversation(params?: {
    title?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
  }): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create conversation');
    return data.conversation;
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get conversation');
    return data.conversation;
  },

  async updateConversation(
    id: string,
    params: { title?: string; model?: string; systemPrompt?: string | null; temperature?: number }
  ): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update conversation');
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete conversation');
    }
  },

  // Stream Chat Message
  async streamChatMessage({
    conversationId,
    message,
    model,
    systemPrompt,
    temperature,
    signal,
    onToken,
    onDone,
    onError,
  }: {
    conversationId: string;
    message: string;
    model?: string;
    systemPrompt?: string | null;
    temperature?: number;
    signal?: AbortSignal;
    onToken: (token: string) => void;
    onDone: (assistantMessageId?: string) => void;
    onError: (err: Error) => void;
  }): Promise<void> {
    try {
      const customKeysStr = localStorage.getItem('ai_custom_keys');
      const customKeys = customKeysStr ? JSON.parse(customKeysStr) : undefined;

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId,
          message,
          model,
          systemPrompt,
          temperature,
          customKeys,
        }),
        signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream received');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const payload = trimmed.replace('data: ', '').trim();
          if (payload === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              onToken(parsed.text);
            }
            if (parsed.done) {
              onDone(parsed.assistantMessageId);
            }
            if (parsed.error) {
              onError(new Error(parsed.error));
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }

      onDone();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    }
  },
};

