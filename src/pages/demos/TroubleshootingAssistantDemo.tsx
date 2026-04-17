import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const CATEGORIES: Record<string, { label: string; steps: string[] }> = {
  wifi: {
    label: 'WiFi / Network',
    steps: ['Check physical connections', 'Restart router', 'Verify credentials', 'Test alternate device', 'Check ISP status', 'Advanced diagnostics'],
  },
  software: {
    label: 'Software / App',
    steps: ['Identify the issue', 'Check for updates', 'Clear cache/data', 'Reinstall application', 'Check compatibility', 'Escalate to support'],
  },
  hardware: {
    label: 'Hardware / Device',
    steps: ['Identify symptoms', 'Power cycle device', 'Check connections', 'Run diagnostics', 'Test components', 'Service recommendation'],
  },
  account: {
    label: 'Account / Login',
    steps: ['Verify username', 'Reset password', 'Check 2FA settings', 'Clear browser cache', 'Try incognito mode', 'Contact admin'],
  },
};

const TroubleshootingAssistantDemo: React.FC = () => {
  const [category, setCategory] = useState('wifi');
  const [currentStep, setCurrentStep] = useState(0);

  const config = CATEGORIES[category];

  const systemPrompt = `You are a step-by-step troubleshooting assistant for ${config.label} issues. Guide the user through a structured troubleshooting process:

Steps:
${config.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Follow these rules:
- Start by asking the user to describe their problem
- Work through each step sequentially
- Ask the user to confirm whether each step resolved the issue before moving on
- Give clear, simple instructions for each step
- If a step resolves the issue, congratulate them and end
- If all steps fail, recommend contacting professional support
- When moving to a new step, say "Step X:" clearly

Be patient, clear, and avoid technical jargon unless necessary.`;

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

  // Track current step from assistant responses
  React.useEffect(() => {
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal).map((e) => e.text);
    let maxStep = 0;
    for (const text of assistantTexts) {
      const match = /step\s+(\d+)/i.exec(text);
      if (match) maxStep = Math.max(maxStep, parseInt(match[1], 10));
    }
    setCurrentStep(maxStep);
  }, [transcript]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      setCurrentStep(0);
      await startListening();
    }
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setCurrentStep(0);
  };

  return (
    <>
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Category</label>
          <select className="demo-select" value={category} onChange={(e) => { setCategory(e.target.value); setCurrentStep(0); }} disabled={isListening}>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="step-tracker">
        {config.steps.map((step, i) => (
          <div key={i} className={`step-item ${i + 1 <= currentStep ? 'step-item-complete' : i + 1 === currentStep + 1 ? 'step-item-active' : ''}`}>
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{step}</span>
          </div>
        ))}
      </div>

      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
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
          <span className="output-title">Troubleshooting</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={handleReset} type="button">Reset</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Describe your issue to begin…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Tech'}:</strong> {entry.text}
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

export default TroubleshootingAssistantDemo;
