import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const KNOWLEDGE_SOURCES: Record<string, { label: string; context: string }> = {
  product: {
    label: 'Product Manual',
    context: `You have access to the Contoso Smart Widget Pro manual:
- Setup: Download the Contoso app, press and hold the power button for 3 seconds, pair via Bluetooth.
- Battery: Lasts 12 hours. Charge with USB-C cable (included). Full charge takes 2 hours.
- Features: Voice control, gesture recognition, auto-brightness, water resistant (IP67).
- Troubleshooting: If unresponsive, hold power + volume down for 10 seconds. Factory reset in Settings > System > Reset.
- Warranty: 2-year limited warranty. Contact support@contoso.com for claims.
- Dimensions: 45mm x 45mm x 12mm, weight 52g.`,
  },
  hr: {
    label: 'HR Policy',
    context: `You have access to Contoso HR policies:
- PTO: Full-time employees get 25 days per year. Carries over max 5 days.
- Remote Work: Hybrid policy — minimum 3 days in office per week. Fully remote requires VP approval.
- Expenses: Submit within 30 days. Meals up to $50/day on travel. Flights must be economy for trips under 6 hours.
- Parental Leave: 16 weeks paid for primary caregiver, 8 weeks for secondary.
- Learning: $3,000 annual learning budget. Pre-approval required for conferences over $500.
- Sick Leave: Up to 10 days per year. Doctor's note required for 3+ consecutive days.`,
  },
  faq: {
    label: 'Company FAQ',
    context: `You have access to the Contoso company FAQ:
- Founded: 2005 in Seattle, WA. Now operates in 40 countries.
- Employees: ~12,000 globally.
- Products: Smart Widget Pro, Widget Hub, Widget Cloud Platform.
- CEO: Sarah Chen (since 2019).
- Stock: Listed on NASDAQ as CNTO.
- Office Hours: Mon-Fri 9am-6pm local time. 24/7 online support.
- Headquarters: 1234 Innovation Drive, Seattle, WA 98101.
- Mission: "Making technology accessible and delightful for everyone."`,
  },
};

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  product: ['How do I set it up?', 'What is the battery life?', 'Is it waterproof?'],
  hr: ['How much PTO do I get?', 'What is the remote work policy?', 'How do I submit expenses?'],
  faq: ['When was the company founded?', 'Who is the CEO?', 'What are your office hours?'],
};

const FaqVoiceAssistantDemo: React.FC = () => {
  const [source, setSource] = useState('product');

  const config = KNOWLEDGE_SOURCES[source];
  const systemPrompt = `You are a FAQ assistant. Answer questions using ONLY the following knowledge base. If the answer isn't available in the knowledge base, say "I don't have that information in my current knowledge base."

${config.context}

Cite the relevant topic when answering. Keep answers concise and conversational.`;

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
  } = useRealtimeSession({ systemPrompt });

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
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Knowledge Source</label>
          <select className="demo-select" value={source} onChange={(e) => setSource(e.target.value)} disabled={isListening}>
            {Object.entries(KNOWLEDGE_SOURCES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="suggestion-chips">
        {SUGGESTED_QUESTIONS[source]?.map((q) => (
          <button key={q} className="suggestion-chip" onClick={() => sendTextMessage(q)} type="button">{q}</button>
        ))}
      </div>

      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Ask'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Q&A</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Ask a question…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Assistant'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {transcript.some((e) => e.role === 'assistant' && e.isFinal) && (
        <span className="citation-badge">Source: {config.label}</span>
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

export default FaqVoiceAssistantDemo;
