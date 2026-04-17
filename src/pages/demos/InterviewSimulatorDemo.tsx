import React, { useState } from 'react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const INTERVIEW_TYPES: Record<string, { label: string; description: string }> = {
  behavioral: {
    label: 'Behavioral',
    description: 'STAR method questions about past experiences',
  },
  technical: {
    label: 'Technical',
    description: 'Technical knowledge and problem-solving',
  },
  system_design: {
    label: 'System Design',
    description: 'Architecture and design thinking',
  },
  case: {
    label: 'Case Study',
    description: 'Business case analysis and strategy',
  },
};

const InterviewSimulatorDemo: React.FC = () => {
  const [interviewType, setInterviewType] = useState('behavioral');
  const [questionCount, setQuestionCount] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const totalQuestions = 5;

  const config = INTERVIEW_TYPES[interviewType];

  const systemPrompt = `You are a professional interviewer conducting a ${config.label} interview. Your role:

1. Start by introducing yourself and the interview format
2. Ask ${totalQuestions} ${config.label.toLowerCase()} interview questions, one at a time
3. Wait for the candidate's answer before asking the next question
4. After each answer, give brief constructive feedback (1-2 sentences)
5. After all ${totalQuestions} questions, provide a summary with:
   - Overall performance score (1-10)
   - Key strengths observed
   - Areas for improvement
   - One specific tip for next time

For BEHAVIORAL: Focus on STAR method (Situation, Task, Action, Result). Ask about leadership, teamwork, conflict resolution, problem-solving, and time management.
For TECHNICAL: Ask progressively harder technical questions relevant to software engineering.
For SYSTEM DESIGN: Present a system to design and probe on scalability, reliability, and trade-offs.
For CASE STUDY: Present a business problem and evaluate analytical thinking and communication.

Start each question with "Question X of ${totalQuestions}:" so the candidate can track progress.`;

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

  // Track question count from assistant responses
  React.useEffect(() => {
    const assistantTexts = transcript.filter((e) => e.role === 'assistant' && e.isFinal).map((e) => e.text);
    let maxQ = 0;
    for (const text of assistantTexts) {
      const match = /question\s+(\d+)\s+of/i.exec(text);
      if (match) maxQ = Math.max(maxQ, parseInt(match[1], 10));
      if (/overall.*score|performance.*score|summary/i.test(text)) setShowScore(true);
    }
    setQuestionCount(maxQ);
  }, [transcript]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopListening();
      disconnect();
    } else {
      setShowScore(false);
      setQuestionCount(0);
      await startListening();
    }
  };

  const handleReset = () => {
    disconnect();
    clearTranscript();
    setQuestionCount(0);
    setShowScore(false);
  };

  return (
    <>
      <div className="demo-controls">
        <div className="demo-control-group">
          <label className="demo-label">Interview Type</label>
          <select className="demo-select" value={interviewType} onChange={(e) => setInterviewType(e.target.value)} disabled={isListening}>
            {Object.entries(INTERVIEW_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label} — {val.description}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="progress-indicator">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(questionCount / totalQuestions) * 100}%` }} />
        </div>
        <span className="progress-text">Question {questionCount} of {totalQuestions}</span>
      </div>

      <div className="demo-mic-section">
        <button className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`} onClick={handleMicToggle} type="button">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {isListening ? 'Stop' : 'Start Interview'}
        </button>
      </div>

      {error && <div className="demo-error">{error}</div>}

      <div className="demo-output">
        <div className="output-header">
          <span className="output-title">{config.label} Interview</span>
          {transcript.length > 0 && (
            <button className="output-clear-btn" onClick={handleReset} type="button">Reset</button>
          )}
        </div>
        <div className="transcript-area">
          {transcript.length === 0 && <span className="transcript-placeholder">Press Start Interview to begin…</span>}
          {transcript.map((entry, i) => (
            <div key={i} className={entry.role === 'assistant' ? 'transcript-assistant' : (entry.isFinal ? 'transcript-final' : 'transcript-partial')}>
              <strong>{entry.role === 'user' ? 'You' : 'Interviewer'}:</strong> {entry.text}
            </div>
          ))}
        </div>
      </div>

      {showScore && (
        <div className="score-card">
          <div className="score-card-title">Interview Complete</div>
          <div className="score-card-body">See the interviewer's feedback above for your score and improvement areas.</div>
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

export default InterviewSimulatorDemo;
