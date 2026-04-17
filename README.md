# Realtime GPT Demo

Interactive kiosk-style demo showcasing 15 capabilities of the Azure OpenAI Realtime API (GPT-4o Realtime). Built with React 19, TypeScript, Vite, and an Express WebSocket relay backend.

## Features

| # | Demo | Description |
|---|------|-------------|
| 1 | Realtime Voice Chat | Open-ended voice conversation |
| 2 | Live Caption + Answer | Transcribes speech and answers questions |
| 3 | Realtime Translator | Speaks translations in a target language |
| 4 | Multilingual Concierge | Auto-detects language, kiosk assistant |
| 5 | Meeting Copilot | Live meeting notes with summary |
| 6 | Voice Summarizer | Records speech, then summarizes |
| 7 | Sentiment-Aware Support | Detects customer emotion, adapts tone |
| 8 | Entity Extraction | Extracts people, orgs, places, dates |
| 9 | Voice Form Filler | Dictate to fill structured forms |
| 10 | Phone IVR Replacement | Natural language call routing |
| 11 | FAQ Voice Assistant | Grounded Q&A with citation |
| 12 | Language Learning Coach | Practice with corrections |
| 13 | Interview Simulator | Mock interviews with scoring |
| 14 | Troubleshooting Assistant | Step-by-step guided repair |
| 15 | Brainstorming Partner | Idea generation + pitch builder |

## Architecture

```
Browser (React SPA)
    ↕ WebSocket (/ws/realtime)
Express API (Node.js)
    ↕ WebSocket (wss://)
Azure OpenAI Realtime API
```

- **SPA**: React 19 + Vite, served via nginx in Docker
- **API**: Express + `ws` library, acquires Azure AD tokens via Managed Identity
- **Auth**: No API keys — uses `@azure/identity` (DefaultAzureCredential)
- **Infra**: Azure Container Apps, ACR, Bicep IaC
- **CI/CD**: GitHub Actions with OIDC federated credentials

## Quick Start (Local)

### Prerequisites

- Node.js 22+
- An Azure OpenAI resource with `gpt-4o-realtime-preview` deployed
- Azure CLI logged in (`az login`)

### 1. Install dependencies

```bash
npm install
cd services/api && npm install && cd ../..
```

### 2. Configure environment

```bash
cp .env.example services/api/.env
# Edit services/api/.env with your Azure OpenAI endpoint
```

### 3. Run

```bash
# Terminal 1 — API
cd services/api && npm run dev

# Terminal 2 — SPA
npm run dev
```

Open http://localhost:5173

## Deploy to Azure

### Prerequisites

1. Azure subscription with an Azure OpenAI resource
2. `gpt-4o-realtime-preview` model deployed
3. GitHub repo with OIDC federated credential configured

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID (OIDC) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_OPENAI_ENDPOINT` | e.g. `https://myaoai.openai.azure.com/` |
| `AZURE_OPENAI_RESOURCE_ID` | Full resource ID for role assignment |

### GitHub Variables

| Variable | Description |
|----------|-------------|
| `AZURE_LOCATION` | Azure region (default: `eastus2`) |

### Deploy

Push to `main` or trigger the workflow manually. The GitHub Action will:
1. Deploy Bicep infrastructure (ACR, ACA, Identity)
2. Build and push Docker images
3. Update Container Apps

## Project Structure

```
├── src/                    # React SPA source
│   ├── pages/
│   │   ├── WelcomeScreen.tsx
│   │   ├── FeaturesScreen.tsx
│   │   ├── DemoScreen.tsx
│   │   └── demos/          # 15 demo components
│   ├── hooks/
│   │   └── useRealtimeSession.ts
│   ├── services/
│   │   └── realtimeClient.ts
│   ├── types.ts
│   └── App.tsx
├── services/api/           # Express API backend
│   └── src/
│       ├── index.ts
│       ├── azureClient.ts
│       └── routes/
├── infra/                  # Bicep IaC
│   ├── main.bicep
│   └── modules/
├── .github/workflows/      # CI/CD
├── Dockerfile              # SPA (nginx)
├── nginx.conf
└── docker-compose.yml
```

## License

MIT
