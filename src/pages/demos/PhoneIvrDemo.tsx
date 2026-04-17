import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are an IVR replacement for Contoso support. When the conversation starts, greet the caller warmly: "Welcome to Contoso support. How can I help you today?"

Understand the caller's intent from natural language and route them to the correct department:
- **Billing**: payments, invoices, charges, subscription, refund
- **Technical Support**: bugs, errors, not working, broken, installation
- **Sales**: pricing, plans, upgrade, purchase, demo
- **General Inquiries**: hours, location, general questions

Once you identify the department, say: "I'll connect you to [Department]. Let me help you with that."
Then handle the request conversationally. Be professional and efficient.`;

const PhoneIvrDemo: React.FC = () => {
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [department, setDepartment] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  // Detect department from assistant responses
  useEffect(() => {
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal).map((e) => e.text).join(' ').toLowerCase();
    if (assistantTexts.includes('billing')) setDepartment('Billing');
    else if (assistantTexts.includes('technical support')) setDepartment('Technical Support');
    else if (assistantTexts.includes('sales')) setDepartment('Sales');
    else if (assistantTexts.includes('general inquir')) setDepartment('General Inquiries');
  }, [transcript]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCall = async () => {
    setCallActive(true);
    setCallSeconds(0);
    setDepartment(null);
    await startListening();
  };

  const handleEndCall = () => {
    stopListening();
    disconnect();
    setCallActive(false);
  };

  const handleReset = () => {
    handleEndCall();
    clearTranscript();
    setDepartment(null);
    setCallSeconds(0);
  };

  return (
    <>
      <div className="phone-card">
        <div className="phone-status">
          {callActive ? (isListening ? 'Connected' : 'Connecting…') : 'Ready'}
        </div>
        <div className="phone-timer">{formatTime(callSeconds)}</div>
        {!callActive ? (
          <button className="phone-call-btn" onClick={handleCall} type="button">📞 Call</button>
        ) : (
          <button className="phone-call-btn phone-call-btn-end" onClick={handleEndCall} type="button">End Call</button>
        )}
        {department && <div className="phone-department">Routed to: {department}</div>}
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Call Transcript</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={handleReset} type="button">Reset</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Press Call to begin…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'Caller' : 'System'}:</strong> {entry.text}
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

export default PhoneIvrDemo;
