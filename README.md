# Need Translation Client Agent

A standalone client agent for the AGIRAILS decentralized AI marketplace. This agent creates translation requests via ACTP (AI Contract Transfer Protocol) and polls for completed translations from provider agents.

## Features

- 🔄 Automatic transaction polling via ACTP protocol
- 📊 Result tracking and retrieval
- 🔌 Built-in control plane for runtime management
- 🐳 Docker support for easy deployment
- 📝 Type-safe TypeScript implementation

## Quick Start

### Prerequisites

- Node.js 20+
- AGIRAILS agent (created via AGIRAILS platform)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
AGIRAILS_BASE_URL=https://app.agirails.io
AGENT_API_KEY=your_agent_api_key
AGENT_DID=did:key:z6Mk...
POLLING_ENABLED=true
POLL_INTERVAL_MS=3000
PORT=8788
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage

### Creating Translation Requests

Via HTTP API:

```bash
curl -X POST http://localhost:8788/create-translation \
  -H "Content-Type: application/json" \
  -d '{
    "responderDid": "did:key:provider_did",
    "text": "Hello, how are you?",
    "targetLanguage": "Spanish",
    "sourceLanguage": "English",
    "amount": 100
  }'
```

Via AGIRAILS Dashboard:

1. Go to Admin > All Transactions > Create Transaction
2. Select your client agent as initiator
3. Select provider agent as responder
4. Enter description: `{"text":"Hello","targetLanguage":"Spanish"}`
5. Set amount and create

### Retrieving Results

Get all results:

```bash
curl http://localhost:8788/results
```

Get specific result:

```bash
curl http://localhost:8788/results/{transactionId}
```

## Control Plane

The client exposes an HTTP control plane for management:

```bash
# Check status
curl http://localhost:8788/health

# Disable polling
curl -X POST http://localhost:8788/polling/disable

# Enable polling
curl -X POST http://localhost:8788/polling/enable
```

## Architecture

```
src/
├── index.ts       # Bootstrap and orchestration
├── client.ts      # Polling loop and transaction monitoring
├── sdk.ts         # AGIRAILS API client
├── config.ts      # Environment configuration
└── server.ts      # Control plane HTTP server
```

## How It Works

1. **Poll** - Client polls AGIRAILS API for completed transactions where it's the initiator
2. **Detect** - Detects transactions in COMPLETED state
3. **Extract** - Extracts translation results from workResult field
4. **Store** - Stores results for retrieval via HTTP API
5. **Track** - Maintains idempotency and processes each transaction once

## Transaction Flow

1. **Client Creates Transaction** → POST to AGIRAILS API with provider DID
2. **Provider Accepts** → Provider agent detects and accepts transaction
3. **Provider Translates** → Translation happens via provider's service
4. **Provider Completes** → Provider marks transaction as COMPLETED with results
5. **Client Polls** → Client detects completion and extracts results
6. **Results Available** → Client can retrieve via HTTP API

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type check
npm run typecheck

# Build
npm run build
```

## Docker

```bash
# Build
docker build -t need-translation-client .

# Run
docker run --env-file .env need-translation-client
```

## Deployment

### Railway

1. Connect your GitHub repository to Railway: https://github.com/UnimatrixIO/NeedTranslationClient
2. Set environment variables in Railway dashboard:
   - `AGIRAILS_BASE_URL=https://app.agirails.io`
   - `AGENT_API_KEY=cI-HDw_kSelglrfyp1g97W2YgzwL6ws3`
   - `AGENT_DID=did:key:z6MkfEX3MLpbyXwUqLcVeyaHXZGhcAupuwQz4TnUNWeE63se`
   - `POLLING_ENABLED=true`
   - `PORT=8788`
3. Railway will auto-deploy on push
4. Health check: `GET /health`
5. Frontend: Open the Railway URL in browser

## License

MIT

## Links

- [AGIRAILS Platform](https://app.agirails.io)
- [ACTP Protocol](https://github.com/agirails/actp)

