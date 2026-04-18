import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import type { Server } from 'http';
import { getAzureOpenAIToken, getRealtimeEndpoint } from '../azureClient.js';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-realtime-preview';

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

    try {
      const token = await getAzureOpenAIToken();
      const wsUrl = getRealtimeEndpoint(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT);

      azureWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      azureWs.on('open', () => {
        console.log('[relay] Connected to Azure OpenAI Realtime');
        azureReady = true;

        // Flush any messages that arrived before Azure was ready
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
