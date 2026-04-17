import React from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = 'You are a helpful assistant. Always respond with both clear text and speech. Keep answers concise and informative.';

const LiveCaptionAnswerDemo: React.FC = () => {
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

  const userEntries = transcript.filter((e) => e.role === 'user');
  const assistantEntries = transcript.filter((e) => e.role === 'assistant');

  return (
    <>
      <div className="demo-status">
        {isListening && !isSpeaking && <span className="recording-pulse">Listening…</span>}
        {isSpeaking && 'GPT is responding…'}
        {!isListening && !isSpeaking && 'Tap to start speaking'}
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
          {isListening ? 'Stop' : 'Start'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Live Caption</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {userEntries.length === 0 && (
            <span className="transcript-placeholder">Your speech will appear here…</span>
          )}
          {userEntries.map((entry, i) => (
            <div key={i} className={entry.isFinal ? 'transcript-final' : 'transcript-partial'}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      {assistantEntries.length > 0 && (
        <div className="answer-card">
          <div className="answer-label">Answer</div>
          {assistantEntries.map((entry, i) => (
            <div key={i} className="answer-text">{entry.text}</div>
          ))}
        </div>
      )}

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

export default LiveCaptionAnswerDemo;
