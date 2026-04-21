import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

export function createAzureOpenAIClient(endpoint: string, deployment: string): AzureOpenAI {
  return new AzureOpenAI({
    azureADTokenProvider,
    endpoint: endpoint.replace(/\/+$/, ''),
    deployment,
    apiVersion: '2024-10-01-preview',
  });
}
