export type RealtimeFeature =
  | 'voiceChat'
  | 'liveCaptionAnswer'
  | 'translator'
  | 'concierge'
  | 'meetingCopilot'
  | 'voiceSummarizer'
  | 'sentimentSupport'
  | 'entityExtraction'
  | 'voiceFormFiller'
  | 'phoneIvr'
  | 'faqAssistant'
  | 'languageLearning'
  | 'interviewSimulator'
  | 'troubleshooting'
  | 'brainstorming';

export interface FeatureInfo {
  id: RealtimeFeature;
  label: string;
  description: string;
}

export const FEATURES: FeatureInfo[] = [
  {
    id: 'voiceChat',
    label: 'Realtime Voice Chat',
    description: 'Talk naturally and get spoken responses with interruption support',
  },
  {
    id: 'liveCaptionAnswer',
    label: 'Live Caption + Answer',
    description: 'See live transcript while speaking, then get text and voice responses',
  },
  {
    id: 'translator',
    label: 'Realtime Translator',
    description: 'Speak in one language, get answers in another with live translation',
  },
  {
    id: 'concierge',
    label: 'Multilingual Concierge',
    description: 'Ask questions in any language and get concise spoken guidance',
  },
  {
    id: 'meetingCopilot',
    label: 'Meeting Copilot',
    description: 'Speak during a mock meeting — get summaries and action items',
  },
  {
    id: 'voiceSummarizer',
    label: 'Voice Summarizer',
    description: 'Speak for 30–60 seconds, get an instant spoken and visual summary',
  },
  {
    id: 'sentimentSupport',
    label: 'Sentiment-Aware Support',
    description: 'Describe a problem by voice and get empathetic, adaptive responses',
  },
  {
    id: 'entityExtraction',
    label: 'Entity Extraction',
    description: 'Speak naturally and see people, places, dates, and intent highlighted',
  },
  {
    id: 'voiceFormFiller',
    label: 'Voice Form Filler',
    description: 'Dictate a form and watch structured fields fill in live',
  },
  {
    id: 'phoneIvr',
    label: 'Phone IVR Replacement',
    description: 'Say what you want in natural language instead of pressing menu numbers',
  },
  {
    id: 'faqAssistant',
    label: 'FAQ Voice Assistant',
    description: 'Ask questions and get spoken answers grounded in a knowledge source',
  },
  {
    id: 'languageLearning',
    label: 'Language Learning Coach',
    description: 'Practice speaking — get corrections and conversational follow-ups',
  },
  {
    id: 'interviewSimulator',
    label: 'Interview Simulator',
    description: 'GPT interviews you live with follow-ups, reacts to hesitations',
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting Assistant',
    description: 'Describe a problem, get step-by-step clarifying questions and fixes',
  },
  {
    id: 'brainstorming',
    label: 'Brainstorming Partner',
    description: 'Ideate by voice — refine, pivot, and shape ideas conversationally',
  },
];

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  timestamp: number;
}
