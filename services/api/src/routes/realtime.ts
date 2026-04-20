import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import type { Server } from 'http';
import { getAzureOpenAIToken, getRealtimeEndpoint } from '../azureClient.js';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-realtime-preview';

function sendDebug(ws: WebSocket, message: string, details?: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'debug',
      debug: { message, timestamp: new Date().toISOString(), ...details },
    }));
  }
  console.log(`[relay] ${message}`, details ?? '');
}

export function attachRealtimeWebSocket(server: Server): void {
  if (!AZURE_OPENAI_ENDPOINT) {
    console.error('[relay] AZURE_OPENAI_ENDPOINT is not set. WebSocket relay will not be attached.');
    return;
  }

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    if (url.pathname === '/ws/realtime') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    let azureWs: WebSocket | null = null;
    let azureReady = false;
    const messageBuffer: RawData[] = [];

    sendDebug(clientWs, 'Client connected to relay', {
      endpoint: AZURE_OPENAI_ENDPOINT,
      deployment: AZURE_OPENAI_DEPLOYMENT,
    });

    try {
      const wsUrl = getRealtimeEndpoint(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT);
      sendDebug(clientWs, 'Acquiring Azure AD token via DefaultAzureCredential...');
      const token = await getAzureOpenAIToken();
      sendDebug(clientWs, 'Azure AD token acquired, connecting to Azure OpenAI Realtime');

      azureWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      azureWs.on('open', () => {
        console.log('[relay] Connected to Azure OpenAI Realtime');
        sendDebug(clientWs, 'Successfully connected to Azure OpenAI Realtime');
        azureReady = true;

        // Flush any messages that arrived before Azure was ready
        if (messageBuffer.length > 0) {
          sendDebug(clientWs, `Flushing ${messageBuffer.length} buffered message(s)`);
        }
        for (const msg of messageBuffer) {
          azureWs!.send(msg);
        }
        messageBuffer.length = 0;
      });

      // Relay: Azure → Client
      azureWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      azureWs.on('error', (err) => {
        console.error('[relay] Azure WS error:', err.message);
        sendDebug(clientWs, 'Azure WebSocket error', {
          errorMessage: err.message,
          endpoint: AZURE_OPENAI_ENDPOINT,
          deployment: AZURE_OPENAI_DEPLOYMENT,
          hint: err.message.includes('401')
            ? 'Authentication failed. Verify the managed identity has Cognitive Services User role on the Azure OpenAI resource.'
            : err.message.includes('404')
              ? 'Endpoint or deployment not found. Verify AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT.'
              : undefined,
        });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: { message: `Upstream connection error: ${err.message}` },
          }));
          clientWs.close(1011, 'Upstream error');
        }
      });

      azureWs.on('close', (code, reason) => {
        console.log(`[relay] Azure WS closed: ${code} ${reason.toString()}`);
        sendDebug(clientWs, 'Azure WebSocket closed', { code, reason: reason.toString() });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1000, 'Upstream closed');
        }
      });

      // Relay: Client → Azure (buffer messages until Azure is ready)
      clientWs.on('message', (data) => {
        if (azureWs && azureReady && azureWs.readyState === WebSocket.OPEN) {
          azureWs.send(data);
        } else {
          messageBuffer.push(data);
        }
      });

      clientWs.on('close', () => {
        console.log('[relay] Client disconnected');
        if (azureWs && azureWs.readyState === WebSocket.OPEN) {
          azureWs.close();
        }
      });

      clientWs.on('error', (err) => {
        console.error('[relay] Client WS error:', err.message);
        if (azureWs && azureWs.readyState === WebSocket.OPEN) {
          azureWs.close();
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[relay] Failed to establish Azure connection:', message);
      sendDebug(clientWs, 'Failed to establish Azure connection', {
        errorMessage: message,
        endpoint: AZURE_OPENAI_ENDPOINT,
        deployment: AZURE_OPENAI_DEPLOYMENT,
        hint: 'Token acquisition failed. Ensure DefaultAzureCredential is properly configured (managed identity in Azure, Azure CLI locally).',
      });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: { message: `Failed to connect to Azure OpenAI: ${message}` },
        }));
        clientWs.close(1011, 'Failed to connect');
      }
    }
  });

  console.log('[relay] WebSocket relay attached at /ws/realtime');
}
