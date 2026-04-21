import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import type { Server } from 'http';
import { OpenAIRealtimeWS } from 'openai/realtime/ws';
import { createAzureOpenAIClient } from '../azureClient.js';

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

  const openAIClient = createAzureOpenAIClient(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT);

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
    let rt: OpenAIRealtimeWS | null = null;
    let azureReady = false;
    const messageBuffer: RawData[] = [];

    sendDebug(clientWs, 'Client connected to relay', {
      endpoint: AZURE_OPENAI_ENDPOINT,
      deployment: AZURE_OPENAI_DEPLOYMENT,
    });

    // Register client handlers BEFORE async work so messages are buffered immediately
    clientWs.on('message', (data) => {
      if (rt && azureReady && rt.socket.readyState === WebSocket.OPEN) {
        try {
          const parsed = JSON.parse(data.toString());
          console.log('[relay] Client →', parsed.type);
        } catch {
          // binary frame
        }
        rt.socket.send(data);
      } else {
        messageBuffer.push(data);
      }
    });

    clientWs.on('close', () => {
      console.log('[relay] Client disconnected');
      rt?.close();
    });

    clientWs.on('error', (err) => {
      console.error('[relay] Client WS error:', err.message);
      rt?.close();
    });

    try {
      sendDebug(clientWs, 'Connecting via OpenAI SDK (token acquisition + WebSocket)...');
      rt = await OpenAIRealtimeWS.azure(openAIClient);
      sendDebug(clientWs, 'SDK connection created, waiting for session.created...');

      // Prevent unhandled SDK error events from crashing the process
      rt.on('error', (err) => {
        console.error('[relay] SDK error event:', err instanceof Error ? err.message : err);
      });

      const azureSocket = rt.socket;

      // Forward Azure → Client via the SDK's underlying socket
      azureSocket.on('message', (data: Buffer) => {
        try {
          const parsed = JSON.parse(data.toString());
          console.log('[relay] Azure →', parsed.type);

          if (parsed.type === 'session.created') {
            console.log('[relay] session.created →', JSON.stringify(parsed.session, null, 2));

            // Now it's safe to flush buffered control messages (session.update)
            azureReady = true;
            const sessionMessages: RawData[] = [];
            let droppedCount = 0;
            for (const msg of messageBuffer) {
              try {
                const msgParsed = JSON.parse(msg.toString());
                if (msgParsed.type === 'input_audio_buffer.append') {
                  droppedCount++;
                } else {
                  sessionMessages.push(msg);
                }
              } catch {
                droppedCount++;
              }
            }
            messageBuffer.length = 0;

            if (sessionMessages.length > 0 || droppedCount > 0) {
              sendDebug(clientWs, `Flushing ${sessionMessages.length} control message(s), dropped ${droppedCount} stale audio chunk(s)`);
            }
            for (const msg of sessionMessages) {
              try {
                console.log('[relay] Flushing →', msg.toString());
              } catch { /* ignore */ }
              azureSocket.send(msg);
            }

            // Tell the client the upstream session is live
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'relay.ready' }));
            }
          }

          if (parsed.type === 'error') {
            console.error('[relay] Azure error event:', JSON.stringify(parsed.error));
          }
        } catch {
          // binary frame — skip logging
        }

        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      azureSocket.on('error', (err: Error) => {
        console.error('[relay] Azure WS error:', err.message);
        sendDebug(clientWs, 'Azure WebSocket error', {
          errorMessage: err.message,
          endpoint: AZURE_OPENAI_ENDPOINT,
          deployment: AZURE_OPENAI_DEPLOYMENT,
        });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: { message: `Upstream connection error: ${err.message}` },
          }));
          clientWs.close(1011, 'Upstream error');
        }
      });

      azureSocket.on('close', (code: number, reason: Buffer) => {
        console.log(`[relay] Azure WS closed: ${code} ${reason.toString()}`);
        sendDebug(clientWs, 'Azure WebSocket closed', { code, reason: reason.toString() });
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1000, 'Upstream closed');
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[relay] Failed to establish Azure connection:', message);
      sendDebug(clientWs, 'Failed to establish Azure connection', {
        errorMessage: message,
        endpoint: AZURE_OPENAI_ENDPOINT,
        deployment: AZURE_OPENAI_DEPLOYMENT,
        hint: 'SDK connection failed. Ensure DefaultAzureCredential is properly configured (managed identity in Azure, Azure CLI locally).',
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
