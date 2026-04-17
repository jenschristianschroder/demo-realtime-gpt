import React from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are an entity extraction assistant. When the user speaks, identify and extract the following entity types:
- **People**: Names of individuals
- **Organizations**: Company or organization names
- **Places**: Locations, cities, countries
- **Dates/Times**: Any temporal references
- **Intent**: What the user wants to do

After extracting entities, respond by confirming what you found in a clear, structured format. Speak your response naturally.`;

interface ExtractedEntity {
  text: string;
  category: 'person' | 'org' | 'place' | 'date' | 'intent';
}

const categoryLabels: Record<string, string> = {
  person: 'People',
  org: 'Organizations',
  place: 'Places',
  date: 'Dates/Times',
  intent: 'Intent',
};

const EntityExtractionDemo: React.FC = () => {
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

  // Parse entities from assistant responses (simple pattern matching for display)
  const entities: ExtractedEntity[] = React.useMemo(() => {
    const result: ExtractedEntity[] = [];
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal).map((e) => e.text).join(' ');
    if (!assistantTexts) return result;

    const patterns: [RegExp, ExtractedEntity['category']][] = [
      [/(?:people|person|name)[:\s]+([^,\n.]+)/gi, 'person'],
      [/(?:organization|company|org)[:\s]+([^,\n.]+)/gi, 'org'],
      [/(?:place|location|city|country)[:\s]+([^,\n.]+)/gi, 'place'],
      [/(?:date|time|when)[:\s]+([^,\n.]+)/gi, 'date'],
      [/(?:intent|action|wants?)[:\s]+([^,\n.]+)/gi, 'intent'],
    ];

    for (const [pattern, category] of patterns) {
      let match;
      while ((match = pattern.exec(assistantTexts)) !== null) {
        result.push({ text: match[1].trim(), category });
      }
    }
    return result;
  }, [transcript]);

  const groupedEntities = React.useMemo(() => {
    const groups: Record<string, ExtractedEntity[]> = {};
    for (const entity of entities) {
      if (!groups[entity.category]) groups[entity.category] = [];
      groups[entity.category].push(entity);
    }
    return groups;
  }, [entities]);

  return (
    <>
      <div className="demo-hint">Say something like: &ldquo;Set up a call with Contoso next Tuesday in London about the retail rollout&rdquo;</div>

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
          {isListening ? 'Stop' : 'Speak'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Transcript</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={clearTranscript} type="button">Clear</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Speak to extract entities…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'GPT'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {Object.keys(groupedEntities).length > 0 && (
        <div className="entity-panel">
          {Object.entries(groupedEntities).map(([category, ents]) => (
            <div key={category} className="entity-category">
              <div className="entity-category-label">{categoryLabels[category] ?? category}</div>
              <div>
                {ents.map((e, i) => (
                  <span key={i} className={`entity-chip entity-chip-${category}`}>{e.text}</span>
                ))}
              </div>
            </div>
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

export default EntityExtractionDemo;
