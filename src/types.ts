/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuizTopic = 'instrument' | 'theory' | 'genre' | 'history' | 'general';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  question: string;
  type?: 'multiple_choice' | 'visual' | 'matching';
  instrumentId?: string; // For visual questions: gayageum, geomungo, daegeum, haegeum, piri, janggu, kkwaenggwari, jing
  matchingPairs?: MatchingPair[]; // For matching questions
  options: string[];
  correctAnswer: number; // Index of options (0-3) or combination
  explanation: string;
  difficulty: QuizDifficulty;
  hint: string;
}

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  selectedAnswers: (number | null)[];
  isFinished: boolean;
  showExplanation: boolean;
  isAIGenerated: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface InstrumentScaleNote {
  name: string; // Dynamic traditional Korean solfège or name: e.g. Hwang (황), Tae (태), Jung (중), Im (임), Nam (남)
  frequency: number; // Web Audio API frequency (Hz)
  englishName: string;
}

export interface InstrumentInfo {
  id: string;
  name: string;
  hanja?: string;
  category: 'string' | 'wind' | 'percussion';
  categoryLabel: string;
  description: string;
  soundStyle: 'pluck' | 'wind' | 'bend' | 'strike_high' | 'strike_low' | 'strike_metal' | 'vibrate';
  historicalFact: string;
  scaleNotes: InstrumentScaleNote[];
  vibrationMembrane?: boolean; // For instruments with unique features e.g. Daegeum's Cheong
}
