import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const LANGUAGES = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Mandarin Chinese' },
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LanguageLearningDemo: React.FC = () => {
  const [language, setLanguage] = useState('es');
  const [difficulty, setDifficulty] = useState('beginner');

  const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  const systemPrompt = `You are a friendly ${langLabel} language coach. The student is at ${difficulty} level.

For BEGINNER:
- Teach basic phrases and vocabulary
- Speak mostly in English with key words in ${langLabel}
- Give pronunciation tips
- Use simple sentences and greetings

For INTERMEDIATE:
- Mix English and ${langLabel} in conversation
- Correct grammar mistakes gently
- Introduce more complex vocabulary
- Practice conversation scenarios

For ADVANCED:
- Speak primarily in ${langLabel}
- Discuss complex topics (culture, current events, idioms)
- Point out subtle grammar and usage nuances
- Challenge the student with advanced expressions

When the student makes a mistake, correct it naturally by saying the correct form and explaining briefly. Use this format for corrections: "Good try! The correct way is: [correct phrase]. This is because [brief explanation]."

Start by greeting the student and asking what they'd like to practice today.`;

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

  // Extract corrections from assistant responses
  const corrections = React.useMemo(() => {
    return transcript
      .filter((e) => e.role === 'assistant' && e.isFinal && /correct way|correct form|should be|instead of/i.test(e.text))
      .map((e) => e.text);
  }, [transcript]);

  return (
    <>
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Language</label>
          <select className="demo-select" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isListening}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="demo-control-group">
          <label className="demo-label">Level</label>
          <select className="demo-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={isListening}>
            {DIFFICULTY_LEVELS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Practice'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">{langLabel} Practice</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Start a conversation in {langLabel}…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Coach'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {corrections.length > 0 && (
        <div className="correction-panel">
          <div className="correction-panel-title">Corrections</div>
          {corrections.map((c, i) => (
            <div key={i} className="correction-card">{c}</div>
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

export default LanguageLearningDemo;
