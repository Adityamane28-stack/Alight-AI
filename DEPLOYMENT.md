# Deployment Guide: Alight AI Assistant

Alight can be deployed as an **all-in-one full-stack service** where the Node.js Express server automatically serves the compiled React frontend assets (`client/dist`) and handles the API routes seamlessly on a single port.

---

## 🌟 Quick Platform Comparison

| Platform                                                                    | Difficulty          | Cost                     | Database Persistence              | Best For                |
| :-------------------------------------------------------------------------- | :------------------ | :----------------------- | :-------------------------------- | :---------------------- |
| **[Render.com](#option-1-render-recommended-free)**                         | Very Easy (1-Click) | **Free**                 | Disks available (or local SQLite) | **Best Overall / Free** |
| **[Railway.app](#option-2-railway-one-click)**                              | Very Easy           | Free trial / \$5 mo      | Persistent volumes supported      | Easiest setup           |
| **[Netlify + Render](#option-5-netlify-frontend--render--railway-backend)** | Easy                | **Free**                 | Backend persistent on Render      | Global CDN Frontend     |
| **[Docker / VPS](#option-3-docker--vps-self-hosted)**                       | Intermediate        | Self-hosted (\$4-\$6 mo) | Full local persistence            | Full control            |
| **[Google Cloud Run](#option-4-google-cloud-run)**                          | Intermediate        | Generous free tier       | Serverless                        | Scalable container      |

---

## Option 1: Render (Recommended & Free)

Render lets you deploy Alight as a free Web Service directly from GitHub.

### Step 1: Push Your Code to GitHub

Ensure your repository contains the root files (`package.json`, `render.yaml`, `Dockerfile`, `client/`, `server/`).

```bash
git add .
git commit -m "Prepare for Alight deployment"
git push origin main
```

### Step 2: Create Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `alight-ai` (or your preferred name)
   - **Region**: Choose the closest region (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: _(Leave blank)_
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     cd server && npx prisma db push && node dist/index.js
     ```
   - **Plan**: `Free`

### Step 3: Add Environment Variables

Under **Environment Variables**, add:

| Key                  | Value                                 | Notes                                   |
| :------------------- | :------------------------------------ | :-------------------------------------- |
| `NODE_ENV`           | `production`                          | Enables production optimizations        |
| `PORT`               | `10000`                               | Render standard port                    |
| `JWT_SECRET`         | _(Generate a random 32+ char secret)_ | For secure user sessions                |
| `DATABASE_URL`       | `file:./dev.db`                       | Local SQLite database                   |
| `GROQ_API_KEY`       | `gsk_...`                             | **Recommended**: 14,400 free daily reqs |
| `GEMINI_API_KEY`     | `AIzaSy...`                           | Optional / fallback                     |
| `OPENROUTER_API_KEY` | `sk-or-v1-...`                        | Optional for DeepSeek R1                |
| `GOOGLE_CLIENT_ID`   | `...`                                 | Optional for Google SSO popup           |

### Step 4: Deploy!

Click **Create Web Service**. Render will build the client, compile the server, initialize the SQLite schema, and provide you with a live HTTPS URL (e.g. `https://alight-ai.onrender.com`).

---

## Option 2: Railway (One-Click)

Railway automatically detects the multi-stage `Dockerfile` and deploys both backend and frontend together.

1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Go to **Variables** tab and add:
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `DATABASE_URL="file:./dev.db"`
5. Go to **Settings** → **Networking** → Click **Generate Domain**.
6. Railway will build the container and deploy your live URL in ~2 minutes!

---

## Option 3: Docker & VPS (Self-Hosted)

If you have a Linux VPS (Ubuntu, Debian, DigitalOcean Droplet, AWS EC2, or Hetzner):

### 1. Build the Docker Image

```bash
docker build -t alight-ai:latest .
```

### 2. Run the Container

```bash
docker run -d \
  --name alight \
  -p 5000:5000 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e JWT_SECRET="your-strong-random-jwt-secret-string" \
  -e DATABASE_URL="file:./dev.db" \
  -e GROQ_API_KEY="gsk_..." \
  -e GEMINI_API_KEY="AIzaSy..." \
  -v alight_data:/app/server/prisma \
  alight-ai:latest
```

The app will now be running live on `http://your-server-ip:5000`.

### 3. (Optional) Nginx + SSL with Certbot

Point your domain to your VPS IP and add a reverse proxy config:

```nginx
server {
    server_name alight.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE Streaming support
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

Then run `certbot --nginx -d alight.yourdomain.com` for free SSL.

---

## Option 4: Google Cloud Run

Cloud Run runs containerized web services serverlessly:

1. Install [Google Cloud SDK](https://cloud.google.com/sdk).
2. Authenticate: `gcloud auth login`.
3. Build and deploy directly:
   ```bash
   gcloud run deploy alight \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,DATABASE_URL="file:./dev.db",GROQ_API_KEY="gsk_..."
   ```

---

## Option 5: Netlify (Frontend) + Render / Railway (Backend)

You can host the **Alight Frontend** on Netlify for free global CDN delivery and custom domains:

### Why Decouple with Netlify?

- **Frontend on Netlify**: Netlify is a world-class static host. You get instant builds, instant cache invalidation, custom domain management, and free SSL.
- **Backend on Render / Railway**: The backend uses SQLite (`dev.db`), Server-Sent Events (SSE) token streaming, and long-running HTTP connections. Netlify serverless functions have execution timeouts (10-26s max) and ephemeral storage (SQLite would lose its database file on each cold start). Therefore, running the Node.js Express server on Render or Railway while hosting the frontend on Netlify provides the ultimate production architecture.

### Step 1: Deploy the Backend on Render or Railway

Follow [Option 1](#option-1-render-recommended-free) to deploy the backend. Note down your backend URL (e.g. `https://alight-backend.onrender.com`).

### Step 2: Deploy Frontend on Netlify

1. Log in to [app.netlify.com](https://app.netlify.com/) and click **Add new site** → **Import an existing project**.
2. Select your GitHub repository.
3. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist` (or `dist`)
4. Add Environment Variable:
   - `VITE_API_URL` = `https://alight-backend.onrender.com/api` (your Render backend API URL)
5. Click **Deploy Site**. Netlify will build and publish your frontend to `https://alight-ai.netlify.app`!

---

## 🔒 Post-Deployment Checklist

- [ ] Ensure `JWT_SECRET` is set to a long, secure random string.
- [ ] Add your `GROQ_API_KEY` for 14,400 free requests per day at ~1,000 tok/sec.
- [ ] Test user registration and login on your live domain.
- [ ] Send a test prompt to verify SSE token streaming is passing through any proxies without buffering.
