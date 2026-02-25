# Evolution Agent — AgentCore Runtime Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:22-slim AS builder

WORKDIR /build

COPY package*.json tsconfig.base.json ./
COPY packages/agent/package*.json ./packages/agent/
COPY packages/agent/tsconfig.json ./packages/agent/

RUN npm ci

COPY packages/agent/src/ ./packages/agent/src/

RUN cd packages/agent && npm run build

# Stage 2: Production
FROM public.ecr.aws/docker/library/node:22-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/agent/package*.json ./packages/agent/

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node --from=builder /build/packages/agent/dist ./packages/agent/dist

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ping || exit 1

USER node

CMD ["node", "packages/agent/dist/index.js"]
