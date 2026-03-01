FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline

COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
