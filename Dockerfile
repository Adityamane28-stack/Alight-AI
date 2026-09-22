# ==========================================
# Alight AI Assistant - Production Dockerfile
# Multi-stage build for ultra-compact image
# ==========================================

# Stage 1: Build Frontend Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy server package and production dependencies
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/
RUN cd server && npm ci --omit=dev && npx prisma generate

# Copy built artifacts from builders
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Push Prisma schema to ensure SQLite database schema is initialized
RUN cd server && npx prisma db push --skip-generate

EXPOSE 5000

CMD ["node", "server/dist/index.js"]

