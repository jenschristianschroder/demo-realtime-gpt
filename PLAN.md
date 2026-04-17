# Realtime GPT — Azure AI Demo

## Overview

A touch-first demo app showcasing Azure OpenAI GPT-4o Realtime API capabilities,
built for use with the [Demo Kiosk](https://github.com/jenschristianschroder/demo-kiosk).

Follows the identical architecture, UI theme, project structure, infra patterns,
and CI/CD workflows established by the existing demo repos:

- [demo-text-understanding](https://github.com/jenschristianschroder/demo-text-understanding)
- [demo-speech-service](https://github.com/jenschristianschroder/demo-speech-service)

---

## Architecture Summary (matched from reference repos)

### Frontend (SPA)

| Aspect | Detail |
|---|---|
| Stack | React 19 + TypeScript + Vite |
| Routing | `react-router-dom` — 3-screen flow: `/ → /features → /demo/:feature` |
| Layout | Kiosk-first: 480px `max-width`, centered, white bg `#ffffff`, black text `#111111` |
| CSS | Hand-written CSS per page — no CSS framework |
| Touch | `user-select: none`, `overscroll-behavior: none`, `-webkit-tap-highlight-color: transparent`, `min-height: 44px` on all interactive elements |
| Iframe | `Content-Security-Policy: frame-ancestors *` via nginx header |
| Logo | `/images/Microsoft-logo_rgb_c-gray.png` on WelcomeScreen |
| Footer | `Microsoft Innovation Hub Denmark` fixed at bottom of WelcomeScreen |

### Backend (API)

| Aspect | Detail |
|---|---|
| Stack | Express.js + TypeScript |
| Port | 3001 |
| Auth | User-Assigned Managed Identity via `@azure/identity` `DefaultAzureCredential` — **no API keys deployed** |
| Routes | `/api/realtime/*` (feature-specific), `/health/ready`, `/health/live` |
| CORS | `cors({ origin: CORS_ORIGIN })` with `CORS_ORIGIN=*` default |
| Body limit | `express.json({ limit: '100kb' })` |
| **WebSocket** | `ws` library to relay client ↔ Azure OpenAI Realtime API WebSocket connections |

### Containers

| Container | Base | Port | Details |
|---|---|---|---|
| SPA | `node:20-alpine` → `nginx:alpine` | 80 | Multi-stage build; nginx serves static + proxies `/api/` and `/health/` to API |
| API | `node:20-alpine` → `node:20-alpine` | 3001 | Multi-stage build; runtime `node dist/index.js` |

`nginx.conf` uses `envsubst` for `${API_BACKEND_URL}` at runtime.
Additionally, nginx proxies `/ws/` for WebSocket relay:
```
location /ws/ {
    proxy_pass ${API_BACKEND_URL};
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $proxy_host;
    proxy_read_timeout 86400;
}
```

### Infrastructure (Bicep)

```
infra/
├── main.bicep              # Orchestrator — params, derived names, module wiring
├── main.bicepparam         # Parameter file
└── modules/
    ├── acr.bicep           # Azure Container Registry (Basic SKU)
    ├── aca-environment.bicep # Container Apps Environment + Log Analytics
    ├── aca-api.bicep       # API Container App (internal ingress, port 3001)
    ├── aca-spa.bicep       # SPA Container App (external ingress, port 80)
    └── identity.bicep      # User-Assigned Managed Identity + role assignments
```

| Resource | Config |
|---|---|
| API Container App | 0.25 CPU, 0.5Gi, minReplicas=1, maxReplicas=3, internal ingress |
| SPA Container App | 0.25 CPU, 0.5Gi, minReplicas=0, maxReplicas=3, external ingress |
| Managed Identity | Cognitive Services User role on Azure OpenAI resource + AcrPull on ACR |

### CI/CD (GitHub Actions)

**File:** `.github/workflows/deploy.yml`

**Trigger:** `push` to `main` + `workflow_dispatch`

**Permissions:** `id-token: write`, `contents: read`

**env:**
```yaml
APP_NAME: realtime-gpt
```

**Steps:**
1. Checkout
2. Azure Login (OIDC — federated credential)
3. Ensure Resource Group exists
4. Deploy Bicep (infra — placeholder images)
5. Handle MANIFEST_UNKNOWN bootstrap failures gracefully
6. Resolve ACR login server
7. ACR Login
8. Build & push API image → `{acr}/{APP_NAME}-api:{sha}`
9. Build & push SPA image → `{acr}/{APP_NAME}-spa:{sha}`
10. Update API Container App with new image (`--min-replicas 1`)
11. Update SPA Container App with new image (`--min-replicas 1`)
12. Output SPA URL

### GitHub Secrets

| Secret | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | App registration (service principal) client ID for OIDC |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | Target resource group name |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL (e.g. `https://<resource>.openai.azure.com`) |
| `AZURE_OPENAI_RESOURCE_ID` | Full resource ID of the Azure OpenAI resource |

### GitHub Variables

| Variable | Purpose |
|---|---|
| `AZURE_LOCATION` | Azure region for resource group (e.g. `swedencentral`) |

### Azure AD App Registration (for OIDC)

- Federated credential:
  - Issuer: `https://token.actions.githubusercontent.com`
  - Subject: `repo:<owner>/real-time-gpt:ref:refs/heads/main`
  - Audience: `api://AzureADTokenExchange`

---

## Project Structure

```
├── src/                          # SPA (React + Vite) source
│   ├── pages/
│   │   ├── WelcomeScreen.tsx     # Landing page with Microsoft logo + CTA
│   │   ├── WelcomeScreen.css
│   │   ├── FeaturesScreen.tsx    # Feature card grid — selects a demo
│   │   ├── FeaturesScreen.css
│   │   ├── DemoScreen.tsx        # Dynamic demo host — loads per-feature component
│   │   ├── DemoScreen.css
│   │   └── demos/                # One component per feature
│   │       ├── RealtimeVoiceChatDemo.tsx
│   │       ├── LiveCaptionAnswerDemo.tsx
│   │       ├── RealtimeTranslatorDemo.tsx
│   │       ├── MultilingualConciergeDemo.tsx
│   │       ├── MeetingCopilotDemo.tsx
│   │       ├── VoiceSummarizerDemo.tsx
│   │       ├── SentimentSupportDemo.tsx
│   │       ├── EntityExtractionDemo.tsx
│   │       ├── VoiceFormFillerDemo.tsx
│   │       ├── PhoneIvrDemo.tsx
│   │       ├── FaqVoiceAssistantDemo.tsx
│   │       ├── LanguageLearningDemo.tsx
│   │       ├── InterviewSimulatorDemo.tsx
│   │       ├── TroubleshootingAssistantDemo.tsx
│   │       └── BrainstormingPartnerDemo.tsx
│   ├── hooks/
│   │   └── useRealtimeSession.ts # Shared WebSocket + audio hook
│   ├── services/
│   │   └── realtimeClient.ts     # WebSocket client for Realtime API relay
│   ├── App.tsx                   # Router
│   ├── index.css                 # Global kiosk styles (identical to reference repos)
│   ├── main.tsx                  # Entry point (BrowserRouter + StrictMode)
│   ├── types.ts                  # Feature types + FEATURES array
│   └── vite-env.d.ts
├── services/api/                 # Express API backend
│   ├── src/
│   │   ├── index.ts              # Express app — mounts routes, health, ws upgrade
│   │   ├── azureClient.ts        # Azure OpenAI auth via DefaultAzureCredential
│   │   └── routes/
│   │       ├── health.ts         # /health/ready, /health/live
│   │       └── realtime.ts       # /api/realtime/token + WebSocket relay endpoint
│   ├── Dockerfile                # Multi-stage Node build
│   ├── package.json
│   └── tsconfig.json
├── infra/                        # Azure Bicep IaC
│   ├── main.bicep
│   ├── main.bicepparam
│   └── modules/
│       ├── acr.bicep
│       ├── aca-environment.bicep
│       ├── aca-api.bicep
│       ├── aca-spa.bicep
│       └── identity.bicep
├── public/
│   └── images/
│       ├── Microsoft-logo_rgb_c-gray.png
│       └── realtime-gpt-thumbnail.png   # For kiosk registry
├── .github/workflows/
│   └── deploy.yml
├── Dockerfile                    # SPA multi-stage (Node → nginx)
├── nginx.conf                    # SPA serving + API proxy + WebSocket proxy
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
├── eslint.config.js
├── index.html
├── LICENSE                       # MIT
└── README.md
```

---

## Features (15 Demos)

Each demo is a `RealtimeFeature` type and has its own component under `src/pages/demos/`.

```typescript
// src/types.ts
export type RealtimeFeature =
  | 'voiceChat'
  | 'liveCaptionAnswer'
  | 'translator'
  | 'concierge'
  | 'meetingCopilot'
  | 'voiceSummarizer'
  | 'sentimentSupport'
  | 'entityExtraction'
  | 'voiceFormFiller'
  | 'phoneIvr'
  | 'faqAssistant'
  | 'languageLearning'
  | 'interviewSimulator'
  | 'troubleshooting'
  | 'brainstorming';

export interface FeatureInfo {
  id: RealtimeFeature;
  label: string;
  description: string;
}

export const FEATURES: FeatureInfo[] = [
  {
    id: 'voiceChat',
    label: 'Realtime Voice Chat',
    description: 'Talk naturally and get spoken responses with interruption support',
  },
  {
    id: 'liveCaptionAnswer',
    label: 'Live Caption + Answer',
    description: 'See live transcript while speaking, then get text and voice responses',
  },
  {
    id: 'translator',
    label: 'Realtime Translator',
    description: 'Speak in one language, get answers in another with live translation',
  },
  {
    id: 'concierge',
    label: 'Multilingual Concierge',
    description: 'Ask questions in any language and get concise spoken guidance',
  },
  {
    id: 'meetingCopilot',
    label: 'Meeting Copilot',
    description: 'Speak during a mock meeting — get summaries and action items',
  },
  {
    id: 'voiceSummarizer',
    label: 'Voice Summarizer',
    description: 'Speak for 30–60 seconds, get an instant spoken and visual summary',
  },
  {
    id: 'sentimentSupport',
    label: 'Sentiment-Aware Support',
    description: 'Describe a problem by voice and get empathetic, adaptive responses',
  },
  {
    id: 'entityExtraction',
    label: 'Entity Extraction',
    description: 'Speak naturally and see people, places, dates, and intent highlighted',
  },
  {
    id: 'voiceFormFiller',
    label: 'Voice Form Filler',
    description: 'Dictate a form and watch structured fields fill in live',
  },
  {
    id: 'phoneIvr',
    label: 'Phone IVR Replacement',
    description: 'Say what you want in natural language instead of pressing menu numbers',
  },
  {
    id: 'faqAssistant',
    label: 'FAQ Voice Assistant',
    description: 'Ask questions and get spoken answers grounded in a knowledge source',
  },
  {
    id: 'languageLearning',
    label: 'Language Learning Coach',
    description: 'Practice speaking — get corrections and conversational follow-ups',
  },
  {
    id: 'interviewSimulator',
    label: 'Interview Simulator',
    description: 'GPT interviews you live with follow-ups, reacts to hesitations',
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting Assistant',
    description: 'Describe a problem, get step-by-step clarifying questions and fixes',
  },
  {
    id: 'brainstorming',
    label: 'Brainstorming Partner',
    description: 'Ideate by voice — refine, pivot, and shape ideas conversationally',
  },
];
```

---

## Detailed Demo Specifications

### 1. Realtime Voice Chat

**Component:** `RealtimeVoiceChatDemo.tsx`

**UX Flow:**
1. User taps mic button → browser requests microphone permission
2. Audio streams to API via WebSocket relay → Azure OpenAI Realtime API
3. GPT responds with streaming audio played back immediately
4. User can interrupt mid-answer (barge-in) — GPT stops and listens
5. Transcript of both user and GPT shown in `transcript-area`
6. Tap mic again to stop

**UI Elements:**
- Mic button (`.mic-btn` / `.mic-btn-active` with pulse animation)
- Transcript area showing user turns (black) and GPT turns (blue `#0078d4`)
- Speaking indicator (bouncing dots) when GPT is responding
- Status text: "Tap to start" → "Listening…" → "GPT is speaking…"

**System Prompt:** Generic helpful assistant. No special persona.

**API Behavior:** WebSocket relay — API authenticates with Managed Identity, opens upstream WebSocket to Azure OpenAI, relays audio frames bidirectionally.

---

### 2. Live Caption + Answer

**Component:** `LiveCaptionAnswerDemo.tsx`

**UX Flow:**
1. User taps mic → speaks
2. Live transcript appears word-by-word (partial in gray italic, final in black)
3. When user pauses, GPT responds with both text (displayed) and voice (played)
4. Response text appears in a separate "Answer" section below transcript

**UI Elements:**
- Mic button
- Transcript area (user speech, live captions)
- Answer card with GPT's text response
- Audio playback with speaking indicator

**System Prompt:** "You are a helpful assistant. Always respond with both clear text and speech. Keep answers concise."

---

### 3. Realtime Translator

**Component:** `RealtimeTranslatorDemo.tsx`

**UX Flow:**
1. User selects target language from dropdown (e.g., Spanish, French, German, Japanese, Danish, etc.)
2. User taps mic → speaks in any language
3. Original transcript shown in top area
4. Translated text + translated spoken response in bottom area (with blue left-border like speech-service repo)
5. GPT responds in the target language

**UI Elements:**
- Language selector dropdown (`.demo-select`)
- Original transcript area
- Translation area (`.translation-area` with blue left border)
- Mic button
- Speaking indicator

**System Prompt:** "You are a real-time translator. The user will speak in one language. Translate and respond in {targetLanguage}. Show the translation clearly."

---

### 4. Multilingual Concierge

**Component:** `MultilingualConciergeDemo.tsx`

**UX Flow:**
1. User taps mic → asks a question in any language
2. GPT auto-detects language and responds in the same language
3. Concierge persona: helpful, concise, kiosk-appropriate answers
4. Topic cards shown as suggestions ("Directions", "Opening Hours", "WiFi", "Recommendations")
5. Supports interruption and topic switching

**UI Elements:**
- Suggestion chips/cards at top
- Mic button
- Transcript area (bilingual if needed)
- Detected language badge
- Speaking indicator

**System Prompt:** "You are a multilingual concierge assistant for a public kiosk at the Microsoft Innovation Hub. Detect the user's language and respond in the same language. Be concise, helpful, and friendly. You can help with directions, hours, nearby services, and general questions."

---

### 5. Meeting Copilot

**Component:** `MeetingCopilotDemo.tsx`

**UX Flow:**
1. User taps "Start Meeting" → mic activates
2. User speaks as if in a meeting (monologue or simulated discussion)
3. Live transcript scrolls
4. User taps "End Meeting" → GPT generates:
   - Meeting summary
   - Action items (bulleted list)
   - Key decisions
5. User can ask follow-up questions: "What did we decide about pricing?"

**UI Elements:**
- Start/End Meeting button (primary action)
- Live transcript area
- Results panel with tabs/sections: Summary | Action Items | Decisions
- Follow-up question input (mic button for voice follow-up)

**System Prompt:** "You are a meeting copilot. Listen to the meeting discussion and when asked, provide: 1) a concise summary, 2) action items with owners if mentioned, 3) key decisions. Answer follow-up questions about the meeting content."

---

### 6. Voice Summarizer

**Component:** `VoiceSummarizerDemo.tsx`

**UX Flow:**
1. User taps mic → speaks for 30–60 seconds
2. Timer/progress indicator shows recording duration
3. User taps stop → GPT generates summary
4. Summary shown as text AND spoken back
5. Key phrases highlighted

**UI Elements:**
- Mic button with timer (e.g., "0:34")
- Recording pulse animation
- Summary card with formatted text
- "Listen Again" button to replay summary audio
- Speaking indicator during summary playback

**System Prompt:** "You are a summarization assistant. Listen to the user's speech and provide a concise, well-structured summary. Highlight the most important points. Then speak the summary back."

---

### 7. Sentiment-Aware Support Agent

**Component:** `SentimentSupportDemo.tsx`

**UX Flow:**
1. User taps mic → describes a complaint or issue
2. Live transcript + detected sentiment indicator (emoji + label)
3. GPT responds empathetically, adapting tone to sentiment
4. Sentiment gauge updates in real-time (Positive / Neutral / Negative / Frustrated)
5. Issue summary card generated after conversation

**UI Elements:**
- Sentiment indicator bar (color-coded: green/yellow/orange/red)
- Mic button
- Transcript area
- Issue summary card at end
- Speaking indicator

**System Prompt:** "You are a customer support agent. Detect the user's emotional state from their tone and words. Respond empathetically — acknowledge frustration, show understanding. Adapt your tone: calming for angry customers, encouraging for confused ones. At the end, summarize the issue clearly."

---

### 8. Entity Extraction Assistant

**Component:** `EntityExtractionDemo.tsx`

**UX Flow:**
1. User taps mic → speaks a sentence like "Set up a call with Contoso next Tuesday in London about the retail rollout"
2. Transcript appears with inline entity highlighting:
   - People → blue badges
   - Organizations → purple badges
   - Places → green badges
   - Dates/Times → orange badges
   - Intent → gray badge
3. Extracted entities listed in a structured panel below

**UI Elements:**
- Mic button
- Transcript area with highlighted entity spans (colored chips inline)
- Entity panel: categorized list (People, Orgs, Places, Dates, Intent)
- Each entity as a chip with category color

**System Prompt:** "You are an entity extraction assistant. When the user speaks, identify and extract: people names, organization names, locations, dates/times, and the user's intent. Respond with a structured breakdown and confirm back to the user what you extracted."

---

### 9. Voice Form Filler

**Component:** `VoiceFormFillerDemo.tsx`

**UX Flow:**
1. User selects form type from dropdown: Insurance Claim | Service Request | Field Report | Intake Form
2. Structured form fields shown (empty)
3. User taps mic → dictates information naturally
4. Fields fill in live as GPT extracts data
5. GPT asks clarifying questions for missing fields ("What was the date of the incident?")
6. User can correct/update any field by speaking

**UI Elements:**
- Form type selector (`.demo-select`)
- Form grid with labeled fields (auto-populated)
- Field status indicators (filled ✓ / missing ✗)
- Mic button
- Clarifying question area
- "Submit" button (disabled until required fields filled)

**System Prompt:** "You are a voice form-filling assistant. The user will dictate information for a {formType}. Extract data and fill the following fields: {fieldList}. Ask clarifying questions for any missing required fields. Confirm each field as you fill it."

---

### 10. Phone IVR Replacement

**Component:** `PhoneIvrDemo.tsx`

**UX Flow:**
1. Simulated phone UI with a "Call" button
2. User taps Call → greeting plays: "Welcome to Contoso support. How can I help?"
3. User speaks naturally instead of pressing menu numbers
4. GPT routes to appropriate "department" and handles the request
5. Visual call status bar shows: Ringing → Connected → department routing

**UI Elements:**
- Phone-style UI card (call button, status bar)
- Department routing indicator
- Transcript area (user + system messages)
- "End Call" button
- Call duration timer

**System Prompt:** "You are an IVR replacement for Contoso support. Greet the caller warmly. Understand their intent from natural language and route to the correct department: Billing, Technical Support, Sales, or General Inquiries. Handle the request conversationally without menus."

---

### 11. FAQ Voice Assistant with Grounding

**Component:** `FaqVoiceAssistantDemo.tsx`

**UX Flow:**
1. User selects knowledge source: Product Manual | HR Policy | Company FAQ
2. User taps mic → asks a question
3. GPT answers with spoken response grounded in the selected knowledge source
4. Source citation shown below the answer
5. "Not found" fallback if question is outside the knowledge base

**UI Elements:**
- Knowledge source selector (`.demo-select`)
- Mic button
- Answer card with text
- Source citation badge
- Speaking indicator
- Suggested questions chips

**System Prompt:** "You are a FAQ assistant grounded in the {knowledgeSource} knowledge base. Answer questions using only information from this source. If the answer isn't available, say so clearly. Cite the relevant section when possible."

**Note:** Knowledge sources are embedded in the system prompt as context (no external RAG for the demo — keeps it self-contained).

---

### 12. Language Learning Coach

**Component:** `LanguageLearningDemo.tsx`

**UX Flow:**
1. User selects target language to practice
2. GPT starts with a prompt in the target language
3. User responds by speaking
4. GPT:
   - Provides corrections if wording/grammar is off
   - Responds conversationally to keep dialog flowing
   - Asks follow-up questions
5. Correction cards highlight mistakes + suggested fixes

**UI Elements:**
- Language selector dropdown
- Conversation transcript (user turns + GPT turns)
- Correction cards (red strikethrough → green correction)
- Mic button
- Difficulty level chips (Beginner / Intermediate / Advanced)

**System Prompt:** "You are a language learning coach for {language}. Start conversations at {difficulty} level. When the user speaks, gently correct grammar and pronunciation errors, then continue the conversation naturally. Ask engaging follow-up questions to keep them talking."

---

### 13. Interview Simulator

**Component:** `InterviewSimulatorDemo.tsx`

**UX Flow:**
1. User selects interview type: Technical | Behavioral | Case Study
2. GPT asks opening question
3. User responds by speaking
4. GPT asks follow-ups, reacts to hesitations
5. After 5–7 exchanges, GPT provides feedback:
   - Strengths
   - Areas to improve
   - Overall score (1–10)

**UI Elements:**
- Interview type selector
- Question card (current question highlighted)
- Mic button
- Progress indicator (Question 3 of 7)
- Feedback panel at end (score card)

**System Prompt:** "You are an interview simulator conducting a {type} interview. Ask one question at a time. React naturally to the candidate's responses — ask follow-ups, probe deeper on vague answers. After {questionCount} questions, provide structured feedback: strengths, areas to improve, and an overall score out of 10."

---

### 14. Guided Troubleshooting Assistant

**Component:** `TroubleshootingAssistantDemo.tsx`

**UX Flow:**
1. User selects device/service category: Laptop | Printer | Network | Software
2. User taps mic → describes the problem
3. GPT asks step-by-step clarifying questions
4. Progress through troubleshooting tree shown visually
5. GPT proposes a fix and asks if it worked
6. If not, continues to next step

**UI Elements:**
- Category selector
- Problem description area
- Step tracker (Step 1 → Step 2 → … → Resolution)
- Mic button
- Fix proposal card with "Did this help?" Yes/No buttons
- Speaking indicator

**System Prompt:** "You are a troubleshooting assistant for {category} issues. Ask one clarifying question at a time to narrow down the problem. Follow a logical diagnostic flow. After gathering enough information, propose a specific fix. If it doesn't work, try the next most likely solution."

---

### 15. Realtime Brainstorming Partner

**Component:** `BrainstormingPartnerDemo.tsx`

**UX Flow:**
1. User taps mic → states a topic ("Give me startup ideas for healthcare")
2. GPT responds with ideas
3. User refines by interrupting: "make them cheaper", "focus on sustainability"
4. Ideas evolve in real-time
5. "Capture" button saves the current state
6. "Turn into a pitch" generates a structured pitch from the best idea

**UI Elements:**
- Mic button
- Ideas panel (scrolling list of generated ideas)
- Refinement history (user prompts shown as chips)
- "Capture Idea" button
- "Generate Pitch" button
- Speaking indicator

**System Prompt:** "You are a creative brainstorming partner. Generate ideas based on the user's topic. When they refine (cheaper, different industry, etc.), adapt immediately. Keep ideas concise. When asked, turn the best idea into a short pitch with problem, solution, and market."

---

## Shared Frontend Hook: `useRealtimeSession`

All 15 demos share a common React hook for WebSocket + audio management:

```typescript
// src/hooks/useRealtimeSession.ts
interface UseRealtimeSessionOptions {
  systemPrompt: string;
  onTranscriptUpdate?: (text: string, isFinal: boolean, role: 'user' | 'assistant') => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onFunctionCall?: (name: string, args: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

interface UseRealtimeSessionReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendTextMessage: (text: string) => void;
  disconnect: () => void;
  error: string | null;
}
```

**Responsibilities:**
- Opens WebSocket to `/ws/realtime`
- Requests microphone via `navigator.mediaDevices.getUserMedia`
- Streams PCM16 audio frames to server
- Receives and plays audio responses via Web Audio API (`AudioContext`)
- Handles turn-taking and barge-in (interrupt detection)
- Emits transcript updates (partial + final) for both user and assistant

---

## Backend: WebSocket Relay Architecture

The API backend acts as a **relay** between the browser and Azure OpenAI Realtime API:

```
Browser ←→ [WebSocket /ws/realtime] ←→ API Server ←→ [WebSocket] ←→ Azure OpenAI Realtime API
```

**Why a relay (not direct)?**
- Azure OpenAI auth uses Managed Identity tokens — cannot expose these to the browser
- API server obtains access tokens via `DefaultAzureCredential` and passes them upstream
- Keeps API keys and credentials completely server-side

**API Route:** `/ws/realtime?systemPrompt={encoded}&feature={featureId}`

**Flow:**
1. Browser opens WebSocket to `/ws/realtime`
2. API server authenticates with Azure OpenAI using Managed Identity
3. API server opens upstream WebSocket to `wss://{endpoint}/openai/realtime?api-version=2025-04-01-preview&deployment={model}`
4. Relays frames bidirectionally
5. Injects `session.update` with the system prompt from the feature
6. On disconnect, cleans up both sides

---

## Backend API Routes

```
GET  /health/ready          → { status: 'ok' }
GET  /health/live           → { status: 'ok' }
GET  /api/realtime/config   → { features: [...], deployment: string }
WS   /ws/realtime           → WebSocket relay to Azure OpenAI Realtime API
```

---

## Environment Variables

### `.env.example`
```
# Azure OpenAI (used by the API service, not the SPA)
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

### API Container App env vars (set via Bicep)
```
PORT=3001
AZURE_OPENAI_ENDPOINT=<from Bicep param>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_CLIENT_ID=<managed identity client ID>
CORS_ORIGIN=*
```

---

## Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

---

## Docker Compose (local dev)

```yaml
services:
  realtime-gpt-spa:
    build: .
    ports:
      - "3000:80"
    environment:
      - API_BACKEND_URL=http://realtime-gpt-api:3001
    depends_on:
      - realtime-gpt-api

  realtime-gpt-api:
    build: ./services/api
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}
      - AZURE_OPENAI_DEPLOYMENT=${AZURE_OPENAI_DEPLOYMENT:-gpt-4o-realtime-preview}
      - AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION:-2025-04-01-preview}
      - CORS_ORIGIN=*
```

---

## Key Dependencies

### SPA (`package.json`)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0"
  }
}
```
No additional SDK — audio handled via Web Audio API + WebSocket (browser-native).

### API (`services/api/package.json`)
```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "ws": "^8.18.0",
    "@azure/identity": "^4.5.0"
  }
}
```

---

## UI Theme Reference (exact match to existing repos)

### Colors
| Token | Value | Usage |
|---|---|---|
| Background | `#ffffff` | Page background |
| Primary text | `#111111` | Titles, labels, body text |
| Secondary text | `#666666` | Subtitles, descriptions |
| Muted text | `#999999` | Placeholders, footer |
| Accent | `#0078d4` | Focus states, links, translation borders |
| Error | `#c62828` | Error messages, recording active |
| Surface | `#fafafa` | Card backgrounds, input backgrounds |
| Border | `#222222` | Card borders (1.5px solid) |
| Light border | `#e0e0e0` | Button borders, input borders |
| CTA | `#000000` bg / `#ffffff` text | Primary buttons |

### Typography
| Element | Size | Weight |
|---|---|---|
| Welcome title | 3rem | 700 |
| Features title | 2.25rem | 700 |
| Demo title | 2rem | 700 |
| Feature card label | 1.125rem | 600 |
| Body / subtitle | 1.25rem / 1.125rem | 400 |
| Description | 0.875rem | 400 |
| Labels | 0.75rem | 600, uppercase, letter-spacing 0.05em |

### Spacing & Radii
| Element | Value |
|---|---|
| Card border-radius | 12px |
| Button border-radius | 12px (CTA), 8px (secondary), 16px (mic) |
| Card padding | 20px 16px |
| Card min-height | 80px |
| Touch target min | 44px × 44px |
| Feature list gap | 16px |
| Content max-width | 480px |

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

---

## Registering with Demo Kiosk

| Field | Value |
|---|---|
| Title | Realtime GPT |
| Tags | OpenAI, Realtime |
| Demo URL | `https://<your-deployment-url>` |
| Launch Mode | newTab or sameTab |
| Thumbnail | `/images/realtime-gpt-thumbnail.png` |

---

## Implementation Order

### Phase 1 — Scaffold & Infrastructure
1. Initialize project (Vite + React + TypeScript)
2. Create global styles (`index.css`) — copy from reference repos
3. Create `WelcomeScreen`, `FeaturesScreen`, `DemoScreen` shell pages
4. Create `types.ts` with all 15 features
5. Set up Express API backend with health routes
6. Create Bicep infrastructure modules
7. Create GitHub Actions workflow
8. Create Dockerfiles, nginx.conf, docker-compose.yml

### Phase 2 — Core Realtime Engine
9. Implement WebSocket relay in API (`ws` upgrade handling)
10. Implement Azure OpenAI Realtime API authentication (Managed Identity)
11. Implement `useRealtimeSession` hook (WebSocket + Web Audio)
12. Implement `realtimeClient.ts` service

### Phase 3 — Demo Components
13. **Realtime Voice Chat** — baseline demo, validates full audio loop
14. **Live Caption + Answer** — adds transcript display
15. **Realtime Translator** — adds language selection + dual output
16. **Multilingual Concierge** — adds auto-detect + suggestion chips
17. **Voice Summarizer** — adds timer + summary card
18. **Meeting Copilot** — adds start/end + structured output
19. **Sentiment-Aware Support** — adds sentiment gauge
20. **Entity Extraction** — adds inline highlighting + entity panel
21. **Voice Form Filler** — adds form grid + field population
22. **Phone IVR Replacement** — adds phone UI + routing
23. **FAQ Voice Assistant** — adds knowledge source selection + citations
24. **Language Learning Coach** — adds correction cards
25. **Interview Simulator** — adds progress tracker + feedback
26. **Troubleshooting Assistant** — adds step tracker + resolution flow
27. **Brainstorming Partner** — adds idea capture + pitch generation

### Phase 4 — Polish & Deploy
28. Add thumbnail image for kiosk registry
29. Test iframe embedding
30. Deploy to Azure Container Apps
31. Register with Demo Kiosk

---

## Prerequisites

- Node.js v20+
- Docker (for container builds)
- Azure OpenAI resource with `gpt-4o-realtime-preview` model deployed
- Azure subscription with resource group
- Azure AD App Registration with OIDC federated credential for GitHub Actions
