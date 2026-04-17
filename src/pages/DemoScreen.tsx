import React from 'react';
import { useParams } from 'react-router-dom';
import { FEATURES, RealtimeFeature } from '../types';
import RealtimeVoiceChatDemo from './demos/RealtimeVoiceChatDemo';
import LiveCaptionAnswerDemo from './demos/LiveCaptionAnswerDemo';
import RealtimeTranslatorDemo from './demos/RealtimeTranslatorDemo';
import MultilingualConciergeDemo from './demos/MultilingualConciergeDemo';
import MeetingCopilotDemo from './demos/MeetingCopilotDemo';
import VoiceSummarizerDemo from './demos/VoiceSummarizerDemo';
import SentimentSupportDemo from './demos/SentimentSupportDemo';
import EntityExtractionDemo from './demos/EntityExtractionDemo';
import VoiceFormFillerDemo from './demos/VoiceFormFillerDemo';
import PhoneIvrDemo from './demos/PhoneIvrDemo';
import FaqVoiceAssistantDemo from './demos/FaqVoiceAssistantDemo';
import LanguageLearningDemo from './demos/LanguageLearningDemo';
import InterviewSimulatorDemo from './demos/InterviewSimulatorDemo';
import TroubleshootingAssistantDemo from './demos/TroubleshootingAssistantDemo';
import BrainstormingPartnerDemo from './demos/BrainstormingPartnerDemo';
import './DemoScreen.css';

const demoComponents: Record<RealtimeFeature, React.FC> = {
  voiceChat: RealtimeVoiceChatDemo,
  liveCaptionAnswer: LiveCaptionAnswerDemo,
  translator: RealtimeTranslatorDemo,
  concierge: MultilingualConciergeDemo,
  meetingCopilot: MeetingCopilotDemo,
  voiceSummarizer: VoiceSummarizerDemo,
  sentimentSupport: SentimentSupportDemo,
  entityExtraction: EntityExtractionDemo,
  voiceFormFiller: VoiceFormFillerDemo,
  phoneIvr: PhoneIvrDemo,
  faqAssistant: FaqVoiceAssistantDemo,
  languageLearning: LanguageLearningDemo,
  interviewSimulator: InterviewSimulatorDemo,
  troubleshooting: TroubleshootingAssistantDemo,
  brainstorming: BrainstormingPartnerDemo,
};

const DemoScreen: React.FC = () => {
  const { feature } = useParams<{ feature: string }>();

  const featureId = feature as RealtimeFeature;
  const featureInfo = FEATURES.find((f) => f.id === featureId);
  const DemoComponent = demoComponents[featureId];

  if (!featureInfo || !DemoComponent) {
    return (
      <div className="demo-screen">
        <div className="demo-content kiosk-container">
          <p className="demo-error">Unknown feature: {feature}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-screen">
      <div className="demo-content kiosk-container">
        <h1 className="demo-title">{featureInfo.label}</h1>
        <p className="demo-subtitle">{featureInfo.description}</p>

        <DemoComponent />
      </div>
    </div>
  );
};

export default DemoScreen;
