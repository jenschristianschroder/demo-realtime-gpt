const SAMPLE_RATE = 24000;

const PCM_WORKLET_NAME = 'pcm-capture-processor';
const PCM_WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage(input[0]);
    }
    return true;
  }
}
registerProcessor('${PCM_WORKLET_NAME}', PcmCaptureProcessor);
`;

export type RealtimeEventType =
  | 'session.created'
  | 'session.updated'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'input_audio_buffer.committed'
  | 'conversation.item.created'
  | 'response.created'
  | 'response.output_item.added'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.text.delta'
  | 'response.text.done'
  | 'response.done'
  | 'conversation.item.input_audio_transcription.completed'
  | 'error'
  | 'debug';

export interface RealtimeEvent {
  type: RealtimeEventType;
  [key: string]: unknown;
}

export interface RealtimeClientOptions {
  systemPrompt: string;
  onEvent?: (event: RealtimeEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;
  private options: RealtimeClientOptions;
  private nextPlaybackTime = 0;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;

    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));

      this.ws.onopen = () => {
        // Send session config immediately; relay buffers it until Azure is connected
        this.sendSessionUpdate();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as RealtimeEvent;

          // Wait for the relay to signal the upstream session is live
          if ((data as Record<string, unknown>).type === 'relay.ready') {
            console.debug('[realtime] Relay signalled upstream is ready');
            resolve();
            return;
          }

          this.handleEvent(data);
        } catch {
          // binary audio data or parse error — ignore
        }
      };

      this.ws.onerror = () => {
        console.error('[realtime] WebSocket connection failed');
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.options.onClose?.();
      };
    });
  }

  private sendSessionUpdate(): void {
    this.send({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.options.systemPrompt,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        },
      },
    });
  }

  private handleEvent(event: RealtimeEvent): void {
    if (event.type === 'debug') {
      const debugEvent = event as RealtimeEvent & { debug?: { message?: string; [key: string]: unknown } };
      const { message, ...details } = debugEvent.debug ?? {};
      const label = '[relay]';
      if (Object.keys(details).length > 0) {
        console.debug(label, message ?? 'debug', details);
      } else {
        console.debug(label, message ?? 'debug');
      }
      return;
    }

    if (event.type === 'response.audio.delta') {
      const audioData = event.delta as string;
      this.queueAudio(audioData);
    }

    if (event.type === 'input_audio_buffer.speech_started') {
      this.clearPlayback();
    }

    if (event.type === 'error') {
      const errorEvent = event as RealtimeEvent & { error?: { message?: string } };
      this.options.onError?.(new Error(errorEvent.error?.message ?? 'Realtime API error'));
    }

    this.options.onEvent?.(event);
  }

  async startMicrophone(): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    const blob = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    try {
      await this.audioContext.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }

    this.workletNode = new AudioWorkletNode(this.audioContext, PCM_WORKLET_NAME);
    this.workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const pcm16 = this.float32ToPcm16(e.data);
      this.sendAudio(pcm16);
    };

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  stopMicrophone(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  private sendAudio(pcm16: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const bytes = new Uint8Array(pcm16);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64,
    });
  }

  private queueAudio(base64Audio: string): void {
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }
    this.playbackQueue.push(float32);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext(): void {
    if (!this.audioContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const samples = this.playbackQueue.shift()!;
    const buffer = this.audioContext.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlaybackTime);
    source.start(startTime);
    this.nextPlaybackTime = startTime + buffer.duration;

    source.onended = () => {
      this.playNext();
    };
  }

  private clearPlayback(): void {
    this.playbackQueue = [];
    this.nextPlaybackTime = 0;
    this.isPlaying = false;
  }

  private float32ToPcm16(float32: Float32Array): ArrayBuffer {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16.buffer;
  }

  send(event: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  sendText(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.send({ type: 'response.create' });
  }

  disconnect(): void {
    this.stopMicrophone();
    this.clearPlayback();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
