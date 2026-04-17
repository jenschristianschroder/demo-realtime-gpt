import React from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are a multilingual concierge assistant for a public kiosk at the Microsoft Innovation Hub Denmark. Detect the user's language and respond in the same language. Be concise, helpful, and friendly. You can help with directions, opening hours, nearby services, WiFi information, and general questions about the venue. Keep responses short and suitable for a kiosk display.`;

const SUGGESTIONS = ['Directions', 'Opening Hours', 'WiFi', 'Recommendations', 'Events', 'Restrooms'];

const MultilingualConciergeDemo: React.FC = () => {
  const {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    sendTextMessage,
    clearTranscript,
    disconnect,
  } = useRealtimeSession({ systemPrompt: SYSTEM_PROMPT });

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      await startListening();
    }
  };

  const handleSuggestion = (topic: string) => {
    sendTextMessage(`Tell me about ${topic}`);
  };

  return (
    <>
      <div className="suggestion-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="suggestion-chip" onClick={() => handleSuggestion(s)} type="button">
            {s}
          </button>
        ))}
      </div>

      <div className="demo-mic-section">
        <button
          className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`}
          onClick={handleMicToggle}
          type="button"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Ask'}
        </button>
      </div>

      <div className="demo-status">
        {isListening && !isSpeaking && <span className="recording-pulse">Listening…</span>}
        {isSpeaking && 'Responding…'}
        {!isListening && !isSpeaking && 'Ask a question in any language'}
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Conversation</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Ask me anything…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Concierge'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {isSpeaking && (
        <div className="speaking-indicator">
          <span className="speaking-dot" />
          <span className="speaking-dot" />
          <span className="speaking-dot" />
        </div>
      )}
    </>
  );
};

export default MultilingualConciergeDemo;
