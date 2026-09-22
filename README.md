# Alight — Autonomous Multi-Provider AI Assistant

<p align="center">
  <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23E8A520'/><path d='M50 18 L58 42 L82 50 L58 58 L50 82 L42 58 L18 50 L42 42 Z' fill='white'/></svg>" width="80" height="80" alt="Alight Beacon" />
</p>

<p align="center">
  <strong>An intelligent, resilient, full-stack AI workstation built with an obsidian-amber radiant design, token-by-token SSE streaming, and multi-provider failover engine (Groq, OpenRouter, Google Gemini multi-key rotation).</strong>
</p>

---

## 🌟 What is Alight?

**Alight** is a production-grade AI chat application built to overcome the rate limits, capacity spikes (503), and outages common to standalone free-tier AI APIs.

Combining the speed of **Groq** (1,000 tokens/sec with 14,400 free requests/day), the reasoning depth of **OpenRouter's DeepSeek R1**, and a **Google Gemini Multi-Key Rotation Pool**, Alight delivers virtually limitless and uninterrupted AI intelligence through a responsive dark-mode workstation.

---

## ✨ Key Features

### 1. 🛡️ Resilient Multi-Provider AI Engine & Vast Limits

- **Groq Acceleration**: Lightning-fast inference (up to 1,000 tok/sec) with **14,400 free requests per day** using `openai/gpt-oss-120b` (120B parameter flagship) and `qwen/qwen3.8-27b`.
- **OpenRouter Reasoning**: Free access to `deepseek/deepseek-r1` for step-by-step mathematical, algorithmic, and logic reasoning.
- **Gemini Multi-Key Rotation Pool**: Automatically distributes requests in a round-robin rotation across multiple Gemini API keys (`GEMINI_API_KEYS="k1,k2,k3..."`) to scale throughput.
- **Instant Automatic Failover**: If any model or key encounters a rate limit (`429`), demand spike (`503`), or auth failure (`401`), Alight instantly cascades to the next active provider within milliseconds with zero interruption.

### 2. 🎨 Obsidian Radiant Aesthetic & Smooth Animations

- **Dark Mode by Default**: Deep obsidian backdrop (`#0A0B10`) complemented by radiant golden-amber ambient glows, halo rings, and micro-interactions.
- **Animated Front Page**:
  - Floating luminous Alight star beacon with ambient pulsing halo and rotating outer ring.
  - Contextual time-based greeting (_"Good morning"_, _"Good afternoon"_, _"Good evening"_).
  - Staggered prompt suggestion cards with sheen hover sweep, icon lift, and border glow.
- **Dual Theme Switcher**: Instant Sun/Moon toggle for users who prefer a crisp warm-ivory light mode.

### 3. 🔐 Complete Authentication & Google SSO

- **Sign In & Sign Up Modes**:
  - **Sign Up**: Clean registration form for new users (Email, Password, Name).
  - **Sign In**: Fast login form for existing users.
  - Password visibility toggle (Show/Hide Eye icon).
- **Continue with Google**: One-click Google sign-in integration.
- **1-Click Instant Demo Login**: Immediate guest evaluation without typing credentials.
- **Security**: Cryptographically salted passwords (`bcryptjs`) and secure JWT session tokens (`jsonwebtoken`).

### 4. ⚡ Real-Time Streaming & Rich Markdown

- **Token-by-Token SSE Streaming**: Real-time Server-Sent Events with active amber glowing cursor and smooth auto-scrolling.
- **GitHub Flavored Markdown**: Tables, bulleted task lists, blockquotes, and bold/italic typography.
- **Interactive Code Blocks**: Syntax highlighting via Prism (`vscDarkPlus`), language badge, and 1-click copy-to-clipboard button.

### 5. 📂 Persistent SQLite Thread Management

- **Full History Persistence**: Backed by SQLite via Prisma ORM (`dev.db`).
- **Collapsible Sidebar**: Browse past conversation threads, start new conversations, inline rename chat titles, and delete old discussions.

### 6. ⚙️ In-App Model & Key Configuration

- **Model Selector**: Switch between Groq, OpenRouter, and Gemini models on the fly.
- **Temperature Slider**: Fine-tune output randomness from Deterministic (0.0) to Creative (1.0).
- **Custom System Persona**: Custom instructions and system prompts per conversation.
- **In-App Key Manager**: Add or override custom API keys directly inside the chat interface with local browser persistence.

---

## 🏗️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   Alight Frontend                      │
│     React 18 + TypeScript + Vite + Tailwind CSS        │
│  Dual Theme Engine · Lucide Icons · Prism Highlighting │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP & SSE Tokens
┌───────────────────────────▼────────────────────────────┐
│                    Alight Backend                      │
│              Express.js + TypeScript                   │
│          JWT Authentication & CORS Security            │
└─────────────┬────────────────────────────┬─────────────┘
              │ Prisma ORM                 │ Multi-Provider Routing
┌─────────────▼───────────────┐ ┌──────────▼─────────────┐
│       SQLite Database       │ │      AI LLM Engine     │
│ Users · Chats · Messages    │ │ ⚡ Groq (14,400 req/d) │
│ dev.db                      │ │ 🧠 OpenRouter (R1)     │
│                             │ │ 🔄 Gemini Key Pool     │
└─────────────────────────────┘ └────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### 1. Clone & Configure Environment

Navigate to the `server/` directory and configure your keys in `server/.env`:

```env
PORT=5000
JWT_SECRET=your-secure-jwt-secret-here
DATABASE_URL="file:./dev.db"

# Google Gemini (Free: 20 req/min)
GEMINI_API_KEY="AIzaSy..."
# GEMINI_API_KEYS="key1,key2,key3" # Optional: comma-separated pool for rotation!

# Groq API (Free: 14,400 req/day at 1,000 tok/sec!)
# Get your free key instantly: https://console.groq.com/keys
GROQ_API_KEY="gsk_..."

# OpenRouter API (Free DeepSeek R1 & Llama 3.3)
# Get your free key: https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-v1-..."
```

### 2. Start the Backend Server

```bash
cd server
npm install
npx prisma db push
npm run dev
```

Backend API will start on **`http://localhost:5000`**.

### 3. Start the Frontend Client

In a new terminal:

```bash
cd client
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser to experience Alight.

---

## 🔑 How to Unlock Vast & Free Daily Usage

| Provider          | Daily Free Limit     | Speed          | Best For                           | Get Key                                                       |
| :---------------- | :------------------- | :------------- | :--------------------------------- | :------------------------------------------------------------ |
| **Groq**          | **14,400 req / day** | ~1,000 tok/sec | Blazing-fast coding & conversation | [console.groq.com/keys](https://console.groq.com/keys)        |
| **OpenRouter**    | Free models          | ~80 tok/sec    | DeepSeek R1 reasoning & logic      | [openrouter.ai/keys](https://openrouter.ai/keys)              |
| **Google Gemini** | 20 req / min per key | ~120 tok/sec   | Multilingual & versatile queries   | [aistudio.google.com](https://aistudio.google.com/app/apikey) |

> **Pro Tip**: Paste your Groq API key into `server/.env` or inside the Alight chat **Settings → API Keys** panel. With Groq active, Alight answers requests in milliseconds without ever running into 429 quota limits.

---

## 📡 API Endpoints Reference

### Authentication

- `POST /api/auth/register` — Create a new account with email & password.
- `POST /api/auth/login` — Sign in with email & password.
- `POST /api/auth/google` — Authenticate seamlessly via Google SSO.
- `GET /api/auth/me` — Retrieve the authenticated user's profile.

### Conversations & Chat

- `GET /api/conversations` — List all conversations for the authenticated user.
- `POST /api/conversations` — Create a new conversation thread.
- `GET /api/conversations/:id` — Retrieve conversation history and messages.
- `PATCH /api/conversations/:id` — Update thread title, system prompt, or model.
- `DELETE /api/conversations/:id` — Delete a conversation thread.
- `POST /api/chat/stream` — Real-time Server-Sent Events (SSE) token streaming.

### System Health

- `GET /api/health` — Service uptime and database status.

---

## 📝 License

MIT License. Built for seamless developer productivity and unbounded AI exploration.
