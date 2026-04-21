import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const FORM_TYPES: Record<string, { label: string; fields: string[] }> = {
  insurance: {
    label: 'Insurance Claim',
    fields: ['Claimant Name', 'Policy Number', 'Date of Incident', 'Location', 'Description', 'Estimated Amount'],
  },
  service: {
    label: 'Service Request',
    fields: ['Requester Name', 'Department', 'Request Type', 'Priority', 'Description', 'Preferred Date'],
  },
  field: {
    label: 'Field Report',
    fields: ['Inspector Name', 'Site Location', 'Date', 'Conditions', 'Findings', 'Recommendations'],
  },
  intake: {
    label: 'Intake Form',
    fields: ['Full Name', 'Date of Birth', 'Contact Number', 'Email', 'Reason for Visit', 'Notes'],
  },
};

const VoiceFormFillerDemo: React.FC = () => {
  const [formType, setFormType] = useState('insurance');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const formConfig = FORM_TYPES[formType];
  const fieldList = formConfig.fields.join(', ');

  const systemPrompt = `You are a voice form-filling assistant. The user will dictate information for a ${formConfig.label}. Extract data and fill the following fields: ${fieldList}.

When you identify a value for a field, say it clearly like: "Setting [Field Name] to [value]."
Ask clarifying questions for any missing required fields. Be conversational and helpful.

IMPORTANT: After each piece of information, confirm what you've captured.
IMPORTANT: Whenever you set a field value, include a JSON block in your text response (the user won't see it) in exactly this format:
<form_data>{"field":"EXACT_FIELD_NAME","value":"extracted value"}</form_data>
You may include multiple <form_data> blocks in one response. Use the exact field names from this list: ${fieldList}.`;

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

  // Parse field values from assistant responses
  React.useEffect(() => {
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal);
    const newValues: Record<string, string> = { ...fieldValues };

    for (const entry of assistantTexts) {
      // Primary: parse structured <form_data> JSON blocks
      const formDataRegex = /<form_data>\s*(\{[^}]+\})\s*<\/form_data>/gi;
      let fdMatch;
      while ((fdMatch = formDataRegex.exec(entry.text)) !== null) {
        try {
          const parsed = JSON.parse(fdMatch[1]) as { field?: string; value?: string };
          if (parsed.field && parsed.value) {
            // Match against known fields (case-insensitive)
            const matchedField = formConfig.fields.find(
              (f) => f.toLowerCase() === parsed.field!.toLowerCase()
            );
            if (matchedField) {
              newValues[matchedField] = parsed.value;
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }

      // Fallback: match "Setting FIELD to VALUE" or "FIELD: VALUE" patterns
      for (const field of formConfig.fields) {
        const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(`[Ss]etting\\s+${escaped}\\s+to\\s+["']?(.+?)["']?(?:\\.|,|;|$)`, 'i'),
          new RegExp(`${escaped}\\s*(?::|is|to)\\s+["']?(.+?)["']?(?:\\.|,|;|$)`, 'i'),
        ];
        for (const regex of patterns) {
          const match = regex.exec(entry.text);
          if (match && match[1].trim() && !newValues[field]) {
            newValues[field] = match[1].trim();
            break;
          }
        }
      }
    }

    setFieldValues(newValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      await startListening();
    }
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setFieldValues({});
  };

  const filledCount = formConfig.fields.filter((f) => fieldValues[f]).length;

  return (
    <>
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Form Type</label>
          <select className="demo-select" value={formType} onChange={(e) => { setFormType(e.target.value); setFieldValues({}); }} disabled={isListening}>
            {Object.entries(FORM_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-grid">
        {formConfig.fields.map((field) => (
          <div key={field} className="form-field">
            <div className="form-field-label">{field}</div>
            <div className={`form-field-value ${fieldValues[field] ? 'form-field-filled' : ''}`}>
              {fieldValues[field] || <span className="form-field-value-empty">—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="progress-indicator">{filledCount} of {formConfig.fields.length} fields filled</div>

      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Dictate'}
        </button>
      </div>

      {transcript.length > 0 && (
        <div className="demo-actions">
          <button className="action-btn action-btn-secondary" onClick={handleReset} type="button">Reset</button>
        </div>
      )}

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Conversation</span>
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Start dictating your form…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Assistant'}:</strong> {entry.text}
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

export default VoiceFormFillerDemo;
