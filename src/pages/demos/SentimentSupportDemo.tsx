import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are an empathetic customer support agent. When the user describes a problem or complaint:
1. Detect their emotional state from their tone and words
2. Respond empathetically — acknowledge frustration, show understanding
3. Adapt your tone: calming for angry customers, encouraging for confused ones
4. Ask clarifying questions to understand the issue
5. At the end, if the user asks or conversation concludes, provide a brief issue summary

Start each response by briefly acknowledging the user's emotion before addressing the content.`;

type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

const sentimentConfig: Record<Sentiment, { emoji: string; color: string; label: string }> = {
  positive: { emoji: '😊', color: '#4caf50', label: 'Positive' },
  neutral: { emoji: '😐', color: '#ff9800', label: 'Neutral' },
  negative: { emoji: '😟', color: '#f44336', label: 'Negative' },
  frustrated: { emoji: '😤', color: '#c62828', label: 'Frustrated' },
};

const SentimentSupportDemo: React.FC = () => {
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');

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

  // Simple keyword-based sentiment detection for UI display
  React.useEffect(() => {
    const lastUser = [...transcript].reverse().find((e) => e.role === 'user' && e.isFinal);
    if (!lastUser) return;
    const text = lastUser.text.toLowerCase();
    if (/angry|furious|terrible|worst|hate|unacceptable|ridiculous/i.test(text)) {
      setSentiment('frustrated');
    } else if (/bad|problem|issue|wrong|broken|fail|disappoint|upset/i.test(text)) {
      setSentiment('negative');
    } else if (/great|good|thank|happy|love|excellent|awesome|perfect/i.test(text)) {
      setSentiment('positive');
    } else {
      setSentiment('neutral');
    }
  }, [transcript]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      await startListening();
    }
  };

  const config = sentimentConfig[sentiment];

  return (
    <>
      <div className="sentiment-gauge">
        <span className="sentiment-emoji">{config.emoji}</span>
        <span className="sentiment-label">{config.label}</span>
        <div className="sentiment-bar">
          <div className="sentiment-fill" style={{
            width: sentiment === 'frustrated' ? '100%' : sentiment === 'negative' ? '75%' : sentiment === 'neutral' ? '50%' : '25%',
            background: config.color,
          }} />
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
          {isListening ? 'Stop' : 'Describe Issue'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Support Conversation</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Describe your issue…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Agent'}:</strong> {entry.text}
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

export default SentimentSupportDemo;
