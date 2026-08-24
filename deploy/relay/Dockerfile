# lnwjud Persistent MCP Relay
# Deploy: docker compose up -d  (on 192.168.0.3, port 10100)
FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# pnpm via corepack
RUN corepack enable

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN corepack pnpm install --frozen-lockfile --filter @lnwjud/relay... || corepack pnpm install --no-frozen-lockfile

# Build the relay TypeScript
COPY tsconfig.json tsconfig.json
COPY src src
RUN corepack pnpm run build && corepack pnpm prune --prod

ENV RELAY_PORT=10100
ENV RELAY_HOST=0.0.0.0
EXPOSE 10100

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:10100/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
