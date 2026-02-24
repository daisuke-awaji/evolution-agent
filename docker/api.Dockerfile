# Evolution Agent API — Lambda Web Adapter Dockerfile
# Multi-stage build

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:22-slim AS builder

WORKDIR /build

COPY package*.json tsconfig.base.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/api/tsconfig.json ./packages/api/

RUN npm ci

COPY packages/api/src/ ./packages/api/src/

RUN cd packages/api && npm run build

# Stage 2: Production
FROM public.ecr.aws/docker/library/node:22-slim

COPY --from=public.ecr.aws/awsguru/aws-lambda-web-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=3000

WORKDIR /app

COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/api/package*.json ./packages/api/

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --chown=node:node --from=builder /build/packages/api/dist ./packages/api/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ping || exit 1

USER node

CMD ["node", "packages/api/dist/index.js"]
