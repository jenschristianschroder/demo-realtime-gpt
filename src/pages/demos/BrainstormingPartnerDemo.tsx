import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are an energetic and creative brainstorming partner. Your job is to help the user generate, expand, and refine ideas.

Guidelines:
- Be enthusiastic and encouraging about all ideas
- Build on the user's ideas with "Yes, and…" thinking
- Offer diverse perspectives: practical, creative, contrarian
- When asked, help organize ideas into categories
- Suggest unexpected connections between ideas
- Never dismiss an idea — instead, find ways to make it work
- When the user says "pitch" or "summarize," create a compelling 30-second elevator pitch from the best ideas discussed

Start by asking what topic or challenge they want to brainstorm about.`;

const BrainstormingPartnerDemo: React.FC = () => {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [pitchMode, setPitchMode] = useState(false);

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

  // Extract ideas from assistant responses (lines that look like suggestions)
  React.useEffect(() => {
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal).map((e) => e.text);
    const newIdeas: string[] = [];
    for (const text of assistantTexts) {
      const bulletPoints = text.match(/(?:^|\n)\s*[-•*]\s*(.+)/g);
      if (bulletPoints) {
        for (const bp of bulletPoints) {
          const clean = bp.replace(/^[\s\-•*]+/, '').trim();
          if (clean.length > 5 && !newIdeas.includes(clean)) {
            newIdeas.push(clean);
          }
        }
      }
    }
    if (newIdeas.length > 0) setIdeas(newIdeas);
  }, [transcript]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      await startListening();
    }
  };

  const handleCapture = () => {
    // Capture the most recent user idea
    const lastUser = [...transcript].reverse().find((e) => e.role === 'user' && e.isFinal);
    if (lastUser && !ideas.includes(lastUser.text)) {
      setIdeas((prev) => [...prev, lastUser.text]);
    }
  };

  const handlePitch = () => {
    setPitchMode(true);
    const ideaSummary = ideas.length > 0
      ? `Here are the ideas we've discussed: ${ideas.join('; ')}. Now give me a compelling 30-second elevator pitch combining the best of these ideas.`
      : 'Give me a 30-second elevator pitch summarizing our brainstorming conversation.';
    sendTextMessage(ideaSummary);
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setIdeas([]);
    setPitchMode(false);
  };

  return (
    <>
      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Brainstorm'}
        </button>
      </div>

      <div className="demo-actions">
        <button className="action-btn action-btn-secondary" onClick={handleCapture} disabled={transcript.length === 0} type="button">
          💡 Capture Idea
        </button>
        <button className="action-btn action-btn-primary" onClick={handlePitch} disabled={transcript.length === 0} type="button">
          🎤 Generate Pitch
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      {ideas.length > 0 && (
        <div className="ideas-panel">
          <div className="ideas-panel-title">Captured Ideas ({ideas.length})</div>
          {ideas.map((idea, i) => (
            <div key={i} className="idea-item">
              <span className="idea-number">{i + 1}</span>
              <span className="idea-text">{idea}</span>
            </div>
          ))}
        </div>
      )}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">{pitchMode ? 'Elevator Pitch' : 'Brainstorm'}</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={handleReset} type="button">Reset</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Share your topic to start brainstorming…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Partner'}:</strong> {entry.text}
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

export default BrainstormingPartnerDemo;
