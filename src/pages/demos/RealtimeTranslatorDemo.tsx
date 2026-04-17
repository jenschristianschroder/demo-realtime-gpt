import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const LANGUAGES = [
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Mandarin Chinese', label: 'Mandarin Chinese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Korean', label: 'Korean' },
];

const RealtimeTranslatorDemo: React.FC = () => {
  const [targetLang, setTargetLang] = useState('Spanish');

  const systemPrompt = `You are a real-time translator. The user will speak in one language. Detect their language automatically. Translate everything they say into ${targetLang} and respond ONLY in ${targetLang}. Keep translations accurate and natural-sounding.`;

  const {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    disconnect,
  } = useRealtimeSession({ systemPrompt });

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
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Translate to</label>
          <select
            className="demo-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            disabled={isListening}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
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
          <span className="output-title">Original</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {userEntries.length === 0 && <span className="transcript-placeholder">Speak in any language…</span>}
          {userEntries.map((entry, i) => (
            <div key={i} className={entry.isFinal ? 'transcript-final' : 'transcript-partial'}>{entry.text}</div>
          ))}
        </div>
      </div>

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Translation ({targetLang})</span>
        </div>
        <div className="transcript-area translation-area">
          {assistantEntries.length === 0 && <span className="transcript-placeholder">Translation will appear here…</span>}
          {assistantEntries.map((entry, i) => (
            <div key={i} className="transcript-assistant">{entry.text}</div>
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

export default RealtimeTranslatorDemo;
