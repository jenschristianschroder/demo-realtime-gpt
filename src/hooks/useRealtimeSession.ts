import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeClient, RealtimeEvent } from '../services/realtimeClient';
import { TranscriptEntry } from '../types';

interface UseRealtimeSessionOptions {
  systemPrompt: string;
}

interface UseRealtimeSessionReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: TranscriptEntry[];
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendTextMessage: (text: string) => void;
  clearTranscript: () => void;
  disconnect: () => void;
}

export function useRealtimeSession(options: UseRealtimeSessionOptions): UseRealtimeSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RealtimeClient | null>(null);
  const partialUserRef = useRef('');
  const partialAssistantRef = useRef('');

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const updatePartialTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.isFinal) {
        return [...prev.slice(0, -1), { ...last, text }];
      }
      return [...prev, { role, text, isFinal: false, timestamp: Date.now() }];
    });
  }, []);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'response.audio_transcript.delta': {
        partialAssistantRef.current += (event.delta as string) ?? '';
        updatePartialTranscript('assistant', partialAssistantRef.current);
        setIsSpeaking(true);
        break;
      }
      case 'response.audio_transcript.done': {
        const finalText = (event.transcript as string) ?? partialAssistantRef.current;
        addTranscriptEntry({ role: 'assistant', text: finalText, isFinal: true, timestamp: Date.now() });
        partialAssistantRef.current = '';
        break;
      }
      case 'response.audio.done':
      case 'response.done': {
        setIsSpeaking(false);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const userText = (event.transcript as string) ?? partialUserRef.current;
        if (userText.trim()) {
          addTranscriptEntry({ role: 'user', text: userText.trim(), isFinal: true, timestamp: Date.now() });
        }
        partialUserRef.current = '';
        break;
      }
      case 'input_audio_buffer.speech_started': {
        partialUserRef.current = '';
        updatePartialTranscript('user', '…');
        setIsSpeaking(false);
        break;
      }
      case 'input_audio_buffer.speech_stopped': {
        break;
      }
      case 'error': {
        const errorEvent = event as RealtimeEvent & { error?: { message?: string } };
        setError(errorEvent.error?.message ?? 'An error occurred');
        break;
      }
    }
  }, [addTranscriptEntry, updatePartialTranscript]);

  const startListening = useCallback(async () => {
    setError(null);

    try {
      const client = new RealtimeClient({
        systemPrompt: options.systemPrompt,
        onEvent: handleEvent,
        onError: (err) => setError(err.message),
        onClose: () => {
          setIsConnected(false);
          setIsListening(false);
          setIsSpeaking(false);
        },
      });

      await client.connect();
      clientRef.current = client;
      setIsConnected(true);

      await client.startMicrophone();
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setIsListening(false);
    }
  }, [options.systemPrompt, handleEvent]);

  const stopListening = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopMicrophone();
      setIsListening(false);
    }
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (clientRef.current?.connected) {
      addTranscriptEntry({ role: 'user', text, isFinal: true, timestamp: Date.now() });
      clientRef.current.sendText(text);
    }
  }, [addTranscriptEntry]);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    sendTextMessage,
    clearTranscript,
    disconnect,
  };
}
