import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';

export async function getAzureOpenAIToken(): Promise<string> {
  const token = await credential.getToken(scope);
  return token.token;
}

export function getRealtimeEndpoint(endpoint: string, deployment: string): string {
  const base = endpoint.replace(/\/+$/, '');
  // Preview endpoint format — proven to work with gpt-realtime-1.5 via the OpenAI SDK
  // Uses /openai/realtime with api-version + deployment query parameters
  return `${base.replace(/^https/, 'wss')}/openai/realtime?api-version=2024-10-01-preview&deployment=${encodeURIComponent(deployment)}`;
}
