import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const SYSTEM_PROMPT = `You are a meeting copilot. Listen carefully to everything the user says during the meeting. When the user says "end meeting" or asks for a summary, provide:
1. A concise meeting summary
2. Action items with owners if mentioned
3. Key decisions made

Format your response clearly with these sections. Answer any follow-up questions about the meeting content accurately.`;

const MeetingCopilotDemo: React.FC = () => {
  const [meetingActive, setMeetingActive] = useState(false);

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

  const handleStartMeeting = async () => {
    setMeetingActive(true);
    await startListening();
  };

  const handleEndMeeting = () => {
    stopListening();
    setMeetingActive(false);
    sendTextMessage('The meeting has ended. Please provide a meeting summary, action items, and key decisions.');
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setMeetingActive(false);
  };

  return (
    <>
      <div className="demo-actions">
        {!meetingActive ? (
          <button className="action-btn action-btn-primary" onClick={handleStartMeeting} type="button">
            Start Meeting
          </button>
        ) : (
          <button className="action-btn action-btn-primary" onClick={handleEndMeeting} type="button" style={{ background: '#c62828' }}>
            End Meeting
          </button>
        )}
        {transcript.length > 0 && (
          <button className="action-btn action-btn-secondary" onClick={handleReset} type="button">
            Reset
          </button>
        )}
      </div>

      <div className="demo-status">
        {isListening && <span className="recording-pulse">Meeting in progress…</span>}
        {isSpeaking && 'Generating summary…'}
        {!isListening && !isSpeaking && !meetingActive && 'Start a meeting to begin'}
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">Meeting Transcript</span>
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Meeting notes will appear here…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'Speaker' : 'Copilot'}:</strong> {entry.text}
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

export default MeetingCopilotDemo;
