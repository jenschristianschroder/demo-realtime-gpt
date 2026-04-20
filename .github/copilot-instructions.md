# Copilot Instructions for demo-realtime-gpt

## Project Overview

This is an **Azure OpenAI Realtime API** demo — a kiosk-style React SPA with an Express WebSocket relay backend. It connects to the **Azure OpenAI Realtime API** (GPT-4o Realtime) deployed via **Azure AI Foundry**.

## Critical Architecture Decisions — DO NOT CHANGE

### Authentication: Managed Identity ONLY
- The API backend uses `@azure/identity` `DefaultAzureCredential` to acquire Bearer tokens.
- **DO NOT** add API key authentication, `AZURE_OPENAI_API_KEY`, or `api-key` headers.
- **DO NOT** add `@secure()` API key parameters to Bicep files.
- The token scope is `https://cognitiveservices.azure.com/.default` — this is correct for Azure OpenAI.

### Azure OpenAI is NOT a standalone Cognitive Services resource
- The Azure OpenAI resource is accessed via Azure AI Foundry.
- The Bicep `identity.bicep` module assigns the **Cognitive Services User** role (`a97b65f3-24c7-4388-baec-2e87135dc908`) on the Azure OpenAI resource to the user-assigned managed identity.
- **DO NOT** create separate `openai-role-assignment.bicep` modules or cross-resource-group deployments.
- **DO NOT** add `az cognitiveservices account list` auto-resolution logic in the GitHub Actions workflow.
- The `AZURE_OPENAI_RESOURCE_ID` is a **required** GitHub secret — it is not auto-resolved.

### Infrastructure: Single Bicep Deploy
- All infrastructure is deployed in a **single `main.bicep`** deployment step.
- **DO NOT** split into `base.bicep` + `main.bicep` two-phase deployments.
- **DO NOT** add `Microsoft.CognitiveServices/accounts` resource ID parsing/validation logic in Bicep.

### Container App Identity
- The API container app uses **UserAssigned** identity (not SystemAssigned,UserAssigned).
- The user-assigned managed identity is created in `identity.bicep` and shared by both container apps for ACR pull and Azure OpenAI access.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| SPA | React 19 + TypeScript + Vite |
| API | Express + `ws` + `@azure/identity` |
| Infra | Azure Container Apps, ACR, Bicep |
| CI/CD | GitHub Actions with OIDC |
| Auth | Managed Identity (DefaultAzureCredential) |

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID (OIDC) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_OPENAI_ENDPOINT` | Base URL, e.g. `https://my-resource.cognitiveservices.azure.com/` |
| `AZURE_OPENAI_RESOURCE_ID` | Full resource ID for role assignment |

## Environment Variables (API)

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_ENDPOINT` | Base endpoint URL (no path) |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name (default: `gpt-4o-realtime-preview`) |
| `PORT` | API server port (default: `3001`) |

## File Structure Rules

- `infra/main.bicep` — single entry point, references modules in `infra/modules/`
- `infra/modules/` — only: `acr.bicep`, `aca-environment.bicep`, `aca-api.bicep`, `aca-spa.bicep`, `identity.bicep`
- **DO NOT** add extra Bicep files like `base.bicep` or `openai-role-assignment.bicep`
- `services/api/src/azureClient.ts` — token acquisition only, no API key functions
- `services/api/src/routes/realtime.ts` — WebSocket relay, Managed Identity auth only
