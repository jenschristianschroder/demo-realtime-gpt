import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = 'You are a summarization assistant. Listen to the user\'s speech and provide a concise, well-structured summary. Highlight the most important points. Keep the summary under 100 words.';

const VoiceSummarizerDemo: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (isListening) {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      sendTextMessage('Please summarize everything I just said.');
    } else {
      clearTranscript();
      await startListening();
    }
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setSeconds(0);
  };

  const assistantEntries = transcript.filter((e) => e.role === 'assistant' && e.isFinal);

  return (
    <>
      <div className="demo-hint">Speak for 30–60 seconds, then tap Stop to get your summary</div>

      {isListening && <div className="recording-timer">{formatTime(seconds)}</div>}

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
          {isListening ? 'Stop & Summarize' : 'Start Speaking'}
        </button>
      </div>

      {transcript.length > 0 && (
        <div className="demo-actions">
          <button className="action-btn action-btn-secondary" onClick={handleReset} type="button">Reset</button>
        </div>
      )}

      {error && <div className="demo-error">{error}</div>}

      {assistantEntries.length > 0 && (
        <div className="results-panel">
          <div className="results-section">
            <div className="results-section-title">Summary</div>
            <div className="results-section-content">
              {assistantEntries.map((e, i) => <p key={i}>{e.text}</p>)}
            </div>
          </div>
        </div>
      )}

      {isSpeaking && (
        <div className="speaking-indicator">
          <span className="speaking-dot" />
          <span className="speaking-dot" />
          <span className="speaking-dot" />
          <span className="speaking-label">Reading summary</span>
        </div>
      )}
    </>
  );
};

export default VoiceSummarizerDemo;
