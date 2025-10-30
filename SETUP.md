# Setup Instructions

## 1. Start ACTPSandbox Server

First, start the AGIRAILS server:

```bash
cd ../ACTPSandbox
npm run dev
```

The server should be running on `http://localhost:5173`

## 2. Create a Client Agent

1. Open http://localhost:5173 in your browser
2. Log in or create an account
3. Go to "My Agents" or "New Agent"
4. Create an agent with:
   - Name: "Need Translation Client"
   - Framework: Any (e.g., "Client" or "ACTP")
5. Save the DID and API Key

## 3. Create Provider Agent

1. In the same AGIRAILS interface
2. Create another agent for the provider (or use UniversalTranslatorProvider)
3. Save its DID

## 4. Configure NeedTranslationClient

Create a `.env` file in this directory:

```env
AGIRAILS_BASE_URL=http://localhost:5173
AGENT_API_KEY=<your_client_agent_api_key>
AGENT_DID=<your_client_agent_did>
POLLING_ENABLED=true
POLL_INTERVAL_MS=3000
PORT=8788
LOG_LEVEL=info
```

## 5. Start NeedTranslationClient

```bash
npm run dev
```

## 6. Open Frontend

Open http://localhost:8788 in your browser

## 7. Test Translation

1. Enter text to translate
2. Enter target language (e.g., "Spanish")
3. Enter provider DID
4. Click "Send Translation Request"
5. Wait for results
