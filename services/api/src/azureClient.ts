import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';

export async function getAzureOpenAIToken(): Promise<string> {
  const token = await credential.getToken(scope);
  return token.token;
}

export function getRealtimeEndpoint(endpoint: string, deployment: string): string {
  const base = endpoint.replace(/\/+$/, '');
  // GA endpoint format required for all Realtime models (gpt-realtime-1.5, etc.)
  // See: https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/realtime-audio
  return `${base.replace(/^https/, 'wss')}/openai/v1/realtime?deployment=${encodeURIComponent(deployment)}`;
}
