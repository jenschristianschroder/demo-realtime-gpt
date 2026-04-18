import { DefaultAzureCredential } from '@azure/identity';

const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY ?? '';

let credential: DefaultAzureCredential | null = null;
const scope = 'https://cognitiveservices.azure.com/.default';

export function useApiKey(): boolean {
  return AZURE_OPENAI_API_KEY.length > 0;
}

export function getApiKey(): string {
  return AZURE_OPENAI_API_KEY;
}

export async function getAzureOpenAIToken(): Promise<string> {
  if (!credential) {
    credential = new DefaultAzureCredential();
  }
  const token = await credential.getToken(scope);
  return token.token;
}

export function getRealtimeEndpoint(endpoint: string, deployment: string): string {
  const base = endpoint.replace(/\/+$/, '');
  return `${base.replace(/^https/, 'wss')}/openai/realtime?api-version=2025-04-01-preview&deployment=${encodeURIComponent(deployment)}`;
}
