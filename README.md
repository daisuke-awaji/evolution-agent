# Evolution Agent

> Autonomous AI agent that monitors cloud applications and drives continuous improvement through data-driven analysis and automated GitHub Issue/PR creation.

## Architecture

```
┌─────────────────────────┐     ┌─────────────────┐
│  Target Applications    │────▶│  CloudWatch      │
│  (Any AWS app)          │     │  Logs / Metrics  │
└─────────────────────────┘     └────────┬────────┘
                                         │
┌─────────────────────────┐              │
│  Users                  │     ┌────────▼────────┐
│  (Feedback via API)     │────▶│  Evolution Agent │
└─────────────────────────┘     │  (AgentCore      │
                                │   Runtime)       │
                                └────────┬────────┘
                                         │
                                ┌────────▼────────┐
                                │  GitHub          │
                                │  Issues & PRs    │
                                └─────────────────┘
```

## Features

- **CloudWatch Log Analysis** — Collects and analyzes error/warning patterns
- **CloudWatch Metrics Monitoring** — Tracks latency, error rates, throughput
- **User Feedback Collection** — REST API for receiving feedback from any application
- **Automated GitHub Issues** — Creates detailed issues with root cause analysis
- **Automated Code Fix PRs** — Proposes concrete code changes via Pull Requests
- **Slack Notifications** — Sends evolution summaries to configured channels
- **Evolution Reports** — Tracks improvement history in DynamoDB

## Project Structure

```
evolution-agent/
├── packages/
│   ├── agent/     # Strands Agent on AgentCore Runtime
│   ├── api/       # Feedback & Reports REST API (Lambda Web Adapter)
│   └── cdk/       # AWS CDK Infrastructure
└── docker/
    ├── agent.Dockerfile
    └── api.Dockerfile
```

## Quick Start

```bash
# Install dependencies
npm install

# Local development
npm run dev:agent   # Start agent locally
npm run dev:api     # Start API locally

# Deploy
npm run deploy:dev  # Deploy dev environment
```

## Configuration

Monitor targets are defined in `packages/cdk/config/environments.ts`:

```typescript
targets: [
  {
    id: 'my-app',
    name: 'My Application',
    cloudwatch: {
      logGroupNames: ['/aws/lambda/my-app-backend'],
    },
    github: {
      owner: 'your-org',
      repo: 'my-app',
    },
  },
],
```

## Sending Feedback

```bash
curl -X POST https://<api-url>/feedback \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -H "X-Target-Id: my-app" \
  -d '{"type":"bug","message":"Login page is slow","rating":2}'
```

## License

MIT
