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

| Secret | Required | Description |
|--------|----------|-------------|
| `AZURE_CLIENT_ID` | ✅ | App registration client ID (OIDC) |
| `AZURE_TENANT_ID` | ✅ | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | ✅ | Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | ✅ | Target resource group name |
| `AZURE_OPENAI_ENDPOINT` | ✅ | e.g. `https://myaoai.openai.azure.com/` |
| `AZURE_OPENAI_RESOURCE_ID` | ⚠️ Recommended (MI auth) | Full Azure resource ID for the Managed Identity role assignment (see note below) |
| `AZURE_OPENAI_API_KEY` | ⚠️ Optional (API key auth) | If set, deployment skips OpenAI resource ID auto-discovery and uses API key auth in the API container |

> **`AZURE_OPENAI_RESOURCE_ID`** — Set this to the full resource ID of your Azure OpenAI resource when using **managed identity** auth:
> `/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.CognitiveServices/accounts/<name>`
>
> If `AZURE_OPENAI_API_KEY` is set, this value is optional and the workflow skips OpenAI resource ID auto-resolution/role-assignment.
>
> If omitted, the workflow attempts to auto-resolve it by listing Cognitive Services accounts in the
> subscription and matching by endpoint URL. This fallback requires the service principal to have at
> least **Reader** access at the subscription scope, and it will fail if the Azure OpenAI resource
> lives in a different subscription. Setting this secret explicitly is strongly recommended.

### GitHub Variables

| Variable | Description |
|----------|-------------|
| `AZURE_LOCATION` | Azure region (default: `eastus2`) |

### Deploy

Push to `main` or trigger the workflow manually. The GitHub Action will:
1. Validate required secrets
2. Deploy Bicep infrastructure (ACR, ACA, Managed Identity)
3. Build and push Docker images
4. Resolve the Azure OpenAI resource ID (from secret or auto-discovery)
5. Update Container Apps with the new image
6. Run a health-check smoke test

### Troubleshooting

#### "Could not resolve Azure OpenAI resource ID from AZURE_OPENAI_ENDPOINT"

This error occurs in the **Resolve Azure OpenAI Resource ID** step when `AZURE_OPENAI_RESOURCE_ID`
is not set and auto-resolution fails. Common causes:

| Cause | Fix |
|-------|-----|
| `AZURE_OPENAI_RESOURCE_ID` not set | Set the secret to the full resource ID (see above) |
| Azure OpenAI resource is in a different subscription | Set `AZURE_OPENAI_RESOURCE_ID` explicitly |
| Service principal lacks subscription-level Reader access | Grant Reader on the subscription, or set `AZURE_OPENAI_RESOURCE_ID` |
| `AZURE_OPENAI_ENDPOINT` value is wrong or misspelled | Correct the endpoint secret |
| Azure AI Foundry project endpoint does not match parent account endpoint | Set `AZURE_OPENAI_RESOURCE_ID` explicitly (recommended), or ensure only one OpenAI account exists in the subscription for auto-fallback |
| Multiple accounts with the same name | Set `AZURE_OPENAI_RESOURCE_ID` explicitly |

**Quickest fix:** set `AZURE_OPENAI_RESOURCE_ID` in your GitHub repository secrets. You can find
the value in the Azure portal → your Azure OpenAI resource → **Properties** → **Resource ID**,
or with:

```bash
az cognitiveservices account show \
  --name <resource-name> \
  --resource-group <resource-group> \
  --query id -o tsv
```

#### Deployment stuck / container not starting

Container Apps with `minReplicas: 0` scale to zero when idle. The first request after a cold start
may take 30–60 seconds. If the smoke-test health check warns in CI, the app is usually fine — it
just needs a moment to warm up. Visit the SPA URL in a browser to confirm.

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
