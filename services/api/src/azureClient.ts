import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';

export async function getAzureOpenAIToken(): Promise<string> {
  const token = await credential.getToken(scope);
  return token.token;
}

export function getRealtimeEndpoint(endpoint: string, deployment: string): string {
  const base = endpoint.replace(/\/+$/, '');
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2025-04-01-preview';
  return `${base.replace(/^https/, 'wss')}/openai/realtime?api-version=${apiVersion}&deployment=${encodeURIComponent(deployment)}`;
}
