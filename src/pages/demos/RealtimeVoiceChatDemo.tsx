import React from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = 'You are a helpful, friendly assistant. Respond naturally and conversationally. Keep answers concise.';

const RealtimeVoiceChatDemo: React.FC = () => {
  const {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
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

  return (
    <>
      <div className="demo-status">
        {isListening && !isSpeaking && <span className="recording-pulse">Listening…</span>}
        {isSpeaking && 'GPT is speaking…'}
        {!isListening && !isSpeaking && 'Tap to start'}
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
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {isListening ? 'Stop' : 'Start'}
        </button>
      </div>

      {isSpeaking && (
        <div className="speaking-indicator">
          <span className="speaking-dot" />
          <span className="speaking-dot" />
          <span className="speaking-dot" />
          <span className="speaking-label">Speaking</span>
        </div>
      )}

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Conversation</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && (
            <span className="transcript-placeholder">Conversation will appear here…</span>
          )}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.isFinal ? (entry.role === 'assistant' ? 'transcript-assistant' : 'transcript-final') : 'transcript-partial'}>
              <strong>{entry.role === 'user' ? 'You' : 'GPT'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default RealtimeVoiceChatDemo;
