/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Sparkles, AlertCircle, HelpCircle, ArrowRight,
  RotateCcw, CheckCircle2, XCircle, ChevronRight, BookOpen, Clock, RefreshCw, ArrowLeft,
  Users
} from 'lucide-react';
import { QuizQuestion, QuizTopic, QuizDifficulty } from '../types';
import { curatedQuizQuestions } from '../data/quizQuestions';
import MultiplayerArena from './MultiplayerArena';

// Premium high-fidelity graphic illustrations for traditional Gugak instruments
function GugakInstrumentVisual({ instrumentId, isAnswered }: { instrumentId: string; isAnswered: boolean }) {
  const images: { [key: string]: { url: string; label: string; desc: string; source: string } } = {
    gayageum: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Korean_instrument-Gayageum-02.jpg',
      label: '가야금 (Gayageum)',
      desc: '오동나무 울림통 위에 기러기발(안족)을 세우고 명주실 12줄을 얹어 손가락 끝으로 직접 주무르고 뜯는 대표 현악기',
      source: '국립국악원 소장 해상 고증 사진'
    },
    geomungo: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Geomungo.jpg',
      label: '거문고 (Geomungo)',
      desc: '오동나무 판 위 괘에 걸린 6현의 굵은 명주실을 대나무 술대를 쥔 채 기개 있고 힘차게 내리치거나 뜨는 선비의 악기',
      source: '전통 악기 박물관 실물 전시 사진'
    },
    haegeum: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Korean_instrument-Haegeum-01.jpg',
      label: '해금 (Haegeum)',
      desc: '둥근 대나무 울림통과 입구대 기둥 사이에 수놓아진 두 가닥의 명주실 사이에 말총 활시위를 끼워 마찰시켜 높은 연주력을 자랑하는 대표 찰현악기',
      source: '국악 전주 보전 연구회 학술 사진'
    },
    janggu: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Korean_instrument-Janggu-01.jpg',
      label: '장구 (Janggu)',
      desc: '잘록한 모래시계 오동나무 통 양편에 소와 말 등 가죽판을 대고 궁글채와 열채로 장단을 연타하는 핵심 타격 장기',
      source: '국립국악원 표준 소리 기각 사진'
    }
  };

  const current = images[instrumentId];
  if (!current) return null;

  return (
    <div className="w-full max-w-md mx-auto bg-[#FAF7F0] border-4 border-zinc-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-4 font-sans flex flex-col">
      <div className="relative h-48 bg-white border-b-2 border-zinc-900 flex items-center justify-center p-3 overflow-hidden">
        <img 
          src={current.url} 
          alt={current.label}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-xs text-white text-[8px] font-mono px-2 py-0.5 rounded border border-zinc-700">
          {current.source}
        </div>
      </div>
      <div className="p-3 text-center bg-[#FAF7F0]">
        <h4 className="text-zinc-900 font-extrabold text-xs mb-1">
          {isAnswered ? current.label : "국립국악원 도해 - 이 전통 음악 기물은 무엇일까요?"}
        </h4>
        <p className="text-zinc-650 text-[10px] leading-relaxed font-semibold">
          {isAnswered ? current.desc : "학술 문헌과 전시 도록에 기재된 전통 악기의 고해상도 실제 유물 사진 자료입니다."}
        </p>
      </div>
    </div>
  );
}

export default function QuizArena() {
  // Config & Quiz selection state
  const [activeTab, setActiveTab] = useState<'curated' | 'ai' | 'multiplayer'>('curated');
  const [selectedTopic, setSelectedTopic] = useState<QuizTopic | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'multiple_choice' | 'visual' | 'matching'>('all');
  
  // Custom topic for AI infinite generator
  const [customAITopic, setCustomAITopic] = useState<string>('');
  
  // Quiz running state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);

  // Matching game state
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matchingRightItems, setMatchingRightItems] = useState<{ id: number; text: string; originalIndex: number }[]>([]);
  const [userMatches, setUserMatches] = useState<{ [leftIdx: number]: number }>({});
  
  // Loading & state
  const [loading, setLoading] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>('');

  // Auto-detect room link parameter to open battle arena instantly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) {
      setActiveTab('multiplayer');
    }
  }, []);

  // Check health and if API key is present
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHasApiKey(data.hasApiKey);
      })
      .catch(() => {
        setHasApiKey(false); // offline/error fallback
      });
  }, []);

  // Filter curated database questions
  const startCuratedQuiz = () => {
    setErrorText('');
    let filtered = [...curatedQuizQuestions];
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(q => q.topic === selectedTopic);
    }
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter(q => (q.type || 'multiple_choice') === selectedType);
    }

    if (filtered.length === 0) {
      setErrorText('해당 조건의 기출 퀴즈가 없습니다. 다른 분야, 난이도, 혹은 문제 유형을 선택해 주십시오.');
      setQuestions([]);
      return;
    }

    // Shuffle filtered questions
    filtered.sort(() => Math.random() - 0.5);
    const limit = Math.min(filtered.length, 10);
    
    setQuestions(filtered.slice(0, limit));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setShowHint(false);
    setIsQuizActive(true);
    
    // Reset matching state
    setSelectedLeft(null);
    setUserMatches({});
  };

  // Initialize matching data when question shifts
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (currentQ && currentQ.type === 'matching' && currentQ.matchingPairs) {
      const shuffled = currentQ.matchingPairs.map((p, idx) => ({
        id: idx,
        text: p.right,
        originalIndex: idx
      })).sort(() => Math.random() - 0.5);
      setMatchingRightItems(shuffled);
      setUserMatches({});
      setSelectedLeft(null);
    }
  }, [currentIndex, questions]);

  // Generate question using server-side Gemini
  const generateAIQuestion = async (topicStr?: string) => {
    setLoading(true);
    setErrorText('');
    setIsQuizActive(true);
    
    const requestBody = {
      topic: topicStr || (selectedTopic === 'all' ? '' : selectedTopic),
      difficulty: selectedDifficulty === 'all' ? 'medium' : selectedDifficulty,
      type: selectedType
    };

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('AI 생성에 장애가 발생해 기출 문제로 대체합니다.');
      }
      
      const newQuestion: QuizQuestion = await response.json();
      
      setQuestions([newQuestion]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizFinished(false);
      setShowHint(false);
    } catch (err: any) {
      console.error(err);
      setErrorText('훈장님이 바쁘십니다! 인공지능 퀴즈 연동에 실패하여 엄선된 기출 퀴즈가 기동됩니다.');
      // Fallback
      const randomCurated = curatedQuizQuestions[Math.floor(Math.random() * curatedQuizQuestions.length)];
      setQuestions([randomCurated]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setQuizFinished(false);
      setShowHint(false);
    } finally {
      setLoading(false);
    }
  };

  // Select an answer option
  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
  };

  // Confirm Answer
  const handleConfirmAnswer = () => {
    if (isAnswered) return;
    const currentQ = questions[currentIndex];

    if (currentQ.type === 'matching') {
      const isAllCorrect = checkMatchingAnswerCorrect();
      setIsAnswered(true);
      if (isAllCorrect) {
        setScore(prev => prev + 1);
      }
    } else {
      if (selectedAnswer === null) return;
      setIsAnswered(true);
      if (selectedAnswer === currentQ.correctAnswer) {
        setScore(prev => prev + 1);
      }
    }
  };

  // Check matching correctness
  const checkMatchingAnswerCorrect = () => {
    const q = questions[currentIndex];
    if (!q || !q.matchingPairs) return false;
    
    let isAllCorrect = true;
    for (let leftIdx = 0; leftIdx < q.matchingPairs.length; leftIdx++) {
      const matchedRightIndex = userMatches[leftIdx];
      if (matchedRightIndex === undefined) {
        isAllCorrect = false;
        break;
      }
      const rightItem = matchingRightItems[matchedRightIndex];
      if (rightItem.originalIndex !== leftIdx) {
        isAllCorrect = false;
      }
    }
    return isAllCorrect;
  };

  // Progress to next question or finish quiz
  const handleNext = () => {
    setShowHint(false);
    setSelectedAnswer(null);
    setIsAnswered(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  // Initialize on first mount
  useEffect(() => {
    // We let the user select settings first, rather than auto-starting
  }, []);

  const getTopicLabel = (topic: string) => {
    switch (topic) {
      case 'instrument': return '악기';
      case 'theory': return '이론·가락';
      case 'genre': return '소리·판소리';
      case 'history': return '역사·기록';
      default: return '전반·상식';
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy': return <span className="bg-[#10B981] text-white px-2.5 py-1 text-xs font-black rounded-lg border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">초보 (쉬움)</span>;
      case 'hard': return <span className="bg-[#E30613] text-white px-2.5 py-1 text-xs font-black rounded-lg border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">명인 (어려움)</span>;
      default: return <span className="bg-[#FFD700] text-zinc-950 px-2.5 py-1 text-xs font-black rounded-lg border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">전수자 (보통)</span>;
    }
  };

  const shadowColors = [
    'shadow-[6px_6px_0px_0px_rgba(0,91,172,1)]',
    'shadow-[6px_6px_0px_0px_rgba(227,6,19,1)]',
    'shadow-[6px_6px_0px_0px_rgba(255,191,36,1)]',
    'shadow-[6px_6px_0px_0px_rgba(16,185,129,1)]'
  ];

  const borderColors = [
    'border-[#005BAC]',
    'border-[#E30613]',
    'border-[#FFD700]',
    'border-[#10B981]'
  ];

  return (
    <div id="quiz-arena-root" className="w-full max-w-4xl mx-auto space-y-6">
      
      {activeTab === 'multiplayer' ? (
        <MultiplayerArena />
      ) : !isQuizActive ? (
        <div className="bg-white rounded-[32px] p-6 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[#005BAC] font-black text-xs tracking-widest uppercase block mb-1">GUGAK ARENA</span>
              <h2 className="font-sans text-2xl font-black text-zinc-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-[#E30613]" />
                국악 퀴즈 한마당
              </h2>
              <p className="text-zinc-500 text-sm mt-1 font-medium">엄선된 역사적인 전통 국악 상식을 겨루거나, 인공지능을 활용해 무한한 문제를 연주해 보십시오.</p>
            </div>
            
            <div className="bg-[#FDFBF7] p-1.5 border-2 border-zinc-900 rounded-xl flex flex-wrap gap-1.5 self-start sm:self-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <button
                id="tab-curated"
                onClick={() => { setActiveTab('curated'); setErrorText(''); }}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  activeTab === 'curated' 
                    ? 'bg-[#E30613] text-white border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'text-zinc-650 hover:text-zinc-900'
                }`}
              >
                기출 퀴즈 (10선)
              </button>
              <button
                id="tab-infinite-ai"
                onClick={() => { setActiveTab('ai'); setErrorText(''); }}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'ai' 
                    ? 'bg-[#005BAC] text-white border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'text-zinc-650 hover:text-zinc-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#FFD700] animate-pulse" />
                AI 무한 생성
              </button>
              <button
                id="tab-multiplayer"
                onClick={() => { setActiveTab('multiplayer'); setErrorText(''); }}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'multiplayer' 
                    ? 'bg-amber-400 text-zinc-950 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'text-zinc-650 hover:text-zinc-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                실시간 겨루기
              </button>
            </div>
          </div>

          {/* Sub-Filters / Custom Fields */}
          <div className="mt-6 pt-5 border-t-2 border-dashed border-zinc-200 grid grid-cols-1 md:grid-cols-12 gap-5 font-sans">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-black text-zinc-700 block">분야 분류</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as QuizTopic | 'all')}
                className="w-full bg-white border-2 border-zinc-900 text-zinc-900 text-sm rounded-xl px-3 py-2.5 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="all">모든 분야 (전체)</option>
                <option value="instrument">악기 (가야금, 거문고, 대금 등)</option>
                <option value="theory">이론·율명 (정악, 12율, 장단 장단)</option>
                <option value="genre">노래·장르 (판소리, 민요, 사물놀이)</option>
                <option value="history">의식·역사 (종묘제례악, 건국 설화)</option>
              </select>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-black text-zinc-700 block">난이도</label>
              <div className="flex gap-2">
                {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`flex-1 py-2.5 text-xs rounded-xl border-2 text-center transition-all cursor-pointer ${
                      selectedDifficulty === diff
                        ? 'bg-[#FFD700] text-zinc-950 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900'
                    }`}
                  >
                    {diff === 'all' ? '전체' : diff === 'easy' ? '초보' : diff === 'medium' ? '중수' : '명인'}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-black text-zinc-700 block">문제 유형 (신규 다양한 방식)</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full bg-white border-2 border-zinc-900 text-zinc-900 text-sm rounded-xl px-3 py-2.5 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="all">모든 유형 (전체)</option>
                <option value="multiple_choice">4지선다형</option>
                <option value="visual">악기 도해/그림 보고 명칭 맞추기</option>
                <option value="matching">전통 국악 용어·설명 알맞게 짝짓기</option>
              </select>
            </div>
          </div>

          {/* 실시간 문제수 매칭 문구 & 메인 구동 버튼 */}
          <div className="mt-6 pt-5 border-t-2 border-zinc-900 flex flex-col items-center gap-4 bg-[#F9F7F2] p-5 rounded-2xl border-2 border-zinc-900">
            {activeTab === 'curated' ? (
              <div className="w-full flex flex-col items-center text-center gap-3">
                <p className="text-sm font-black text-zinc-800 leading-relaxed font-serif">
                  선택하신 조건에 해당하는 기출 서고의 명품 국악 퀴즈는 <span className="text-[#E30613] text-lg font-black">{
                    curatedQuizQuestions.filter(q => 
                      (selectedTopic === 'all' || q.topic === selectedTopic) && 
                      (selectedDifficulty === 'all' || q.difficulty === selectedDifficulty) &&
                      (selectedType === 'all' || (q.type || 'multiple_choice') === selectedType)
                    ).length
                  }개</span> 존재합니다.
                </p>
                <p className="text-[11px] text-zinc-500 font-bold max-w-lg">
                  (기출 시험 시작 시, 중복이 없도록 임의 배열하여 풍성하게 출제됩니다.)
                </p>
                
                <button
                  id="btn-start-curated"
                  onClick={startCuratedQuiz}
                  className="w-full max-w-sm mt-2 bg-[#005BAC] hover:bg-[#004e94] text-white text-base font-black border-2 border-zinc-900 rounded-2xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                >
                  <RefreshCw className="w-5 h-5" />
                  기출 시험보기 (과거시험 입장)
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center text-center gap-3">
                <p className="text-sm font-black text-zinc-800 leading-relaxed font-serif">
                  AI 국악 훈장님께서 맞춤형 문제를 단독 출제합니다.<br/>
                  원하는 주제 키워드를 적으신 후 출제하기 버튼을 누르십시오.
                </p>
                
                <div className="w-full max-w-md flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 경기민요, 가야금 산조, 세종대왕, 피리 수법..."
                    value={customAITopic}
                    onChange={(e) => setCustomAITopic(e.target.value)}
                    className="flex-1 bg-white border-2 border-zinc-900 text-zinc-900 text-sm rounded-xl px-4 py-3 font-bold focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    id="btn-generate-ai"
                    onClick={() => generateAIQuestion(customAITopic)}
                    className="bg-[#E30613] hover:bg-[#c20510] text-white text-sm font-black border-2 border-zinc-900 rounded-xl px-5 py-3 transition-all flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] min-w-28 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFD700]" />
                    출제하기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Warning if AI mode has no key */}
          {!hasApiKey && activeTab === 'ai' && (
            <div className="mt-4 bg-[#FDFBF7] border-2 border-zinc-900 text-zinc-900 text-xs rounded-2xl p-4 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#E30613]" />
              <div>
                <p className="font-black text-sm">인공지능 훈장님 외출 중 (API 키 확인 필요)</p>
                <p className="mt-0.5 opacity-85 font-medium">현재 GEMINI_API_KEY가 등록되어 있지 않습니다. 기출 퀴즈 한마당은 키 없이도 전적으로 플레이 가능하며, AI 기능은 데모 모드(기출 문제 복제)로 원활하게 연주됩니다.</p>
              </div>
            </div>
          )}

          {errorText && (
            <div className="mt-4 bg-rose-100 border-2 border-zinc-900 text-rose-950 text-xs font-bold rounded-xl py-2.5 px-4.5 shadow-[3px_3px_0px_0px_rgba(227,6,19,1)]">
              {errorText}
            </div>
          )}
        </div>
      ) : (
        /* 2단계: 퀴즈 풀이 및 결과 화면 (isQuizActive가 true일 때 표시) */
        <div className="w-full">
          {loading ? (
            <div className="bg-white rounded-[32px] p-16 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-zinc-250 border-t-[#E30613] rounded-full animate-spin"></div>
              <p className="font-sans text-xl font-black text-zinc-900">훈장님이 서당 책장을 뒤지며 문제를 출제하고 계십니다...</p>
              <p className="text-xs font-bold text-zinc-400">잠시만 기다려 주십시오.</p>
            </div>
          ) : questions.length > 0 && !quizFinished ? (
            <div className="flex flex-col gap-4">
              {/* 처음 설정으로 돌아가기 단추 */}
              <button 
                onClick={() => {
                  setIsQuizActive(false);
                  setQuestions([]);
                }} 
                className="self-start text-xs font-black text-zinc-600 hover:text-[#E30613] flex items-center gap-1 bg-white border-2 border-zinc-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-1px] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 처음 설정으로 돌아가기 (시험 포기)
              </button>

              {/* Question Card */}
              <div className="w-full space-y-4">
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                  
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <span className="bg-[#005BAC] text-white border-2 border-zinc-900 px-3 py-1 text-xs font-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      대목 {currentIndex + 1} / {questions.length}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-zinc-600">{getTopicLabel(questions[currentIndex].topic)}</span>
                      <span className="text-zinc-300 font-extrabold">|</span>
                      {getDifficultyBadge(questions[currentIndex].difficulty)}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-zinc-100 h-3 border-2 border-zinc-900 rounded-full mb-8 overflow-hidden">
                    <div 
                      className="bg-[#E30613] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Problem Question Statement */}
                  <h3 className="font-serif text-lg sm:text-2xl font-black text-zinc-900 leading-relaxed mb-8">
                    {questions[currentIndex].question}
                  </h3>

                  {/* Options List or Matching Board */}
                  {questions[currentIndex].type === 'matching' ? (
                    /* Elegant Matching Board Component */
                    <div className="space-y-6 mb-6">
                      <div className="text-[11px] font-bold text-zinc-400 font-sans tracking-wide uppercase text-center mb-2">
                        {isAnswered 
                          ? '짝짓기 대조 결과' 
                          : '왼쪽 용어를 선택하고 알맞은 설명을 골라 짝을 이어 완주해 주시오.'}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column (Terms) */}
                        <div className="space-y-3">
                          <span className="text-xs font-black text-[#E30613] block mb-1">용어 마당</span>
                          {questions[currentIndex].matchingPairs?.map((pair, leftIdx) => {
                            const matchedRightIdx = userMatches[leftIdx];
                            const isSelected = selectedLeft === leftIdx;
                            
                            // Obangsaek coloring presets
                            const obangsaekBgs = ['bg-[#005BAC]/10 text-[#005BAC]', 'bg-[#E30613]/10 text-[#E30613]', 'bg-[#FFD700]/15 text-[#78350f]', 'bg-[#10B981]/10 text-[#065f46]'];
                            const obangsaekBorders = ['border-[#005BAC]', 'border-[#E30613]', 'border-[#FFD700]', 'border-[#10B981]'];
                            
                            let pairBgStyle = 'bg-white border-2 border-zinc-900';
                            if (isSelected) {
                              pairBgStyle = 'bg-amber-100 ring-4 ring-zinc-900 border-2 border-zinc-900 scale-[1.02]';
                            } else if (matchedRightIdx !== undefined) {
                              const colorIdx = leftIdx % 4;
                              pairBgStyle = `${obangsaekBgs[colorIdx]} ${obangsaekBorders[colorIdx]} border-3`;
                            }

                            return (
                              <button
                                key={leftIdx}
                                disabled={isAnswered}
                                onClick={() => {
                                  setSelectedLeft(leftIdx);
                                }}
                                className={`w-full text-left p-4 rounded-2xl font-black text-sm flex items-center justify-between transition-all duration-150 cursor-pointer ${pairBgStyle}`}
                              >
                                <span>
                                  <span className="inline-block w-6 h-6 text-xs text-center leading-6 rounded-full bg-zinc-900 text-white font-mono mr-2">
                                    {String.fromCharCode(65 + leftIdx)}
                                  </span>
                                  {pair.left}
                                </span>
                                
                                {matchedRightIdx !== undefined && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/85 border border-current">
                                    짝 {leftIdx + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Column (Descriptions) */}
                        <div className="space-y-3">
                          <span className="text-xs font-black text-[#005BAC] block mb-1">설명 서고</span>
                          {matchingRightItems.map((item, rightIdx) => {
                            const matchedLeftIdx = Object.keys(userMatches).find(
                              (key) => userMatches[Number(key)] === rightIdx
                            );
                            
                            const obangsaekRightBgs = ['bg-[#005BAC]/10 text-zinc-900', 'bg-[#E30613]/10 text-zinc-900', 'bg-[#FFD700]/15 text-zinc-800', 'bg-[#10B981]/10 text-zinc-900'];
                            const obangsaekRightBorders = ['border-[#005BAC]', 'border-[#E30613]', 'border-[#FFD700]', 'border-[#10B981]'];
                            
                            let cardStyle = 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-950 hover:bg-zinc-50';
                            
                            if (matchedLeftIdx !== undefined) {
                              const leftIdxNum = Number(matchedLeftIdx);
                              const colorIdx = leftIdxNum % 4;
                              
                              if (isAnswered) {
                                const isCorrect = item.originalIndex === leftIdxNum;
                                if (isCorrect) {
                                  cardStyle = 'bg-emerald-50 border-3 border-emerald-500 text-emerald-900 font-bold';
                                } else {
                                  cardStyle = 'bg-rose-50 border-3 border-rose-500 text-rose-900 font-bold';
                                }
                              } else {
                                cardStyle = `${obangsaekRightBgs[colorIdx]} ${obangsaekRightBorders[colorIdx]} border-3 font-bold`;
                              }
                            }

                            return (
                              <button
                                key={rightIdx}
                                disabled={isAnswered || selectedLeft === null}
                                onClick={() => {
                                  if (selectedLeft === null) return;
                                  
                                  setUserMatches(prev => {
                                    const next = { ...prev };
                                    
                                    // Make sure we enforce 1-to-1 matching (remove old matching pointing to same right elements)
                                    Object.keys(next).forEach(k => {
                                      if (next[Number(k)] === rightIdx) {
                                        delete next[Number(k)];
                                      }
                                    });
                                    
                                    next[selectedLeft] = rightIdx;
                                    return next;
                                  });
                                  
                                  setSelectedLeft(null);
                                }}
                                className={`w-full text-left p-3.5 rounded-2xl text-xs flex items-start gap-2.5 transition-all outline-hidden cursor-pointer ${cardStyle} ${
                                  selectedLeft !== null && matchedLeftIdx === undefined ? 'ring-2 ring-amber-300' : ''
                                }`}
                              >
                                <span className="font-mono font-bold text-zinc-450 mt-0.5">•</span>
                                <div className="flex-1 text-left leading-relaxed font-medium">
                                  {item.text}
                                </div>
                                
                                {isAnswered && matchedLeftIdx !== undefined && (
                                  <div className="shrink-0 pt-0.5">
                                    {item.originalIndex === Number(matchedLeftIdx) ? (
                                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                                    ) : (
                                      <XCircle className="w-4.5 h-4.5 text-rose-600" />
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Restart / Trigger reset option inside matching */}
                      {!isAnswered && Object.keys(userMatches).length > 0 && (
                        <div className="text-right">
                          <button
                            onClick={() => {
                              setUserMatches({});
                              setSelectedLeft(null);
                            }}
                            className="text-[10px] text-[#E30613] font-black hover:underline bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            매칭 전부 초기화
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Render Visual Illustration if question has type 'visual' */}
                      {questions[currentIndex].type === 'visual' && (
                        <GugakInstrumentVisual instrumentId={questions[currentIndex].instrumentId || ''} isAnswered={isAnswered} />
                      )}

                      {/* Options List */}
                      <div className="space-y-4.5 mb-6">
                        {questions[currentIndex].options.map((opt, idx) => {
                          let optStyle = `border-2 border-zinc-900 bg-white hover:translate-y-[-2px] transition-all cursor-pointer font-bold ${shadowColors[idx]} ${borderColors[idx]}`;
                          
                          if (selectedAnswer === idx) {
                            optStyle = 'border-4 border-zinc-900 bg-amber-50/70 font-black ring-2 ring-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]';
                          }

                          if (isAnswered) {
                            if (idx === questions[currentIndex].correctAnswer) {
                              optStyle = 'border-4 border-emerald-500 bg-emerald-50 text-emerald-950 font-black shadow-[6px_6px_0px_0px_rgba(16,185,129,1)]';
                            } else if (selectedAnswer === idx) {
                              optStyle = 'border-4 border-rose-500 bg-rose-50 text-rose-950 font-black shadow-[6px_6px_0px_0px_rgba(227,6,19,1)] translate-y-0';
                            } else {
                              optStyle = 'border-2 border-zinc-200 bg-zinc-50/40 text-zinc-400 opacity-60 shadow-none';
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectOption(idx)}
                              disabled={isAnswered}
                              className={`w-full text-left p-4.5 rounded-2xl text-base transition-all focus:outline-hidden flex items-center justify-between gap-4 ${optStyle}`}
                            >
                              <span>
                                <span className="font-mono mr-3 font-black text-zinc-950 text-lg">{idx + 1}.</span>
                                {opt}
                              </span>
                              {isAnswered && idx === questions[currentIndex].correctAnswer && (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                              )}
                              {isAnswered && selectedAnswer === idx && idx !== questions[currentIndex].correctAnswer && (
                                <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Submit / Next Button controls */}
                  <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t-2 border-dashed border-zinc-200">
                    <button
                      onClick={() => setShowHint(prev => !prev)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border-2 border-zinc-900 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] ${
                        showHint 
                          ? 'bg-amber-150 text-amber-950' 
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      {showHint ? '힌트 닫기' : '동작 힌트보기'}
                    </button>

                    <div className="flex gap-2">
                      {!isAnswered ? (
                        <button
                          id="btn-confirm-answer"
                          onClick={handleConfirmAnswer}
                          disabled={
                            questions[currentIndex].type === 'matching'
                              ? Object.keys(userMatches).length < (questions[currentIndex].matchingPairs?.length || 4)
                              : selectedAnswer === null
                          }
                          className={`px-6 py-2.5 text-xs font-black rounded-xl border-2 border-zinc-900 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            (questions[currentIndex].type === 'matching'
                              ? Object.keys(userMatches).length < (questions[currentIndex].matchingPairs?.length || 4)
                              : selectedAnswer === null)
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                              : 'bg-[#FFD700] hover:bg-amber-400 text-zinc-950 hover:translate-y-[-2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                          }`}
                        >
                          정답 제출하기
                        </button>
                      ) : (
                        <button
                          id="btn-next-question"
                          onClick={handleNext}
                          className="border-2 border-zinc-900 bg-[#E30613] hover:bg-[#c20510] text-white px-6 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                        >
                          {currentIndex + 1 === questions.length ? '결과 확인하기' : '다음 문항'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sliding Hint Box */}
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl p-4 text-xs text-zinc-900 leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <span className="font-black text-amber-700 block mb-0.5">💡 훈장님의 넌지시 귀띔</span>
                          {questions[currentIndex].hint}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Explanation card displayed once Answered */}
                  {isAnswered && (
                    <div className="mt-6 p-5 rounded-2xl border-2 border-[#005BAC] bg-[#FDFBF7] text-xs text-zinc-900 leading-relaxed font-serif font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <span className="font-sans text-xs font-black text-[#005BAC] block mb-1">📖 훈장님의 역사 한 구절 해설</span>
                      {questions[currentIndex].explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : quizFinished ? (
            /* Results Billboard Screen */
            <div id="quiz-results" className="bg-white rounded-[32px] p-8 sm:p-12 border-4 border-zinc-900 text-center relative overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute top-0 left-0 w-full h-3 flex">
                <div className="bg-[#005BAC] flex-1 h-full"></div>
                <div className="bg-[#E30613] flex-1 h-full"></div>
                <div className="bg-[#FFD700] flex-1 h-full"></div>
                <div className="bg-[#10B981] flex-1 h-full"></div>
              </div>
              
              <div className="max-w-md mx-auto space-y-6">
                <div className="inline-block p-4 bg-[#FFD700] border-2 border-zinc-900 rounded-full text-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Award className="w-12 h-12" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-sans text-3xl font-black text-zinc-900 italic">풍악을 울려라!</h3>
                  <p className="text-zinc-600 font-traditional text-sm px-4 font-bold">
                    이로써 오늘 준비된 대목을 모두 주파하셨구려. 수고가 매우 많았소!
                  </p>
                </div>

                {/* Score Ring */}
                <div className="py-6 flex justify-center">
                  <div className="w-40 h-40 rounded-full border-4 border-zinc-900 flex flex-col items-center justify-center bg-[#FFD700] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-mono text-5xl font-black text-[#E30613]">{score}</span>
                    <span className="text-zinc-900 font-black text-xl">/</span>
                    <span className="text-zinc-900 font-black text-xs uppercase mt-0.5">{questions.length} 문제 통과</span>
                  </div>
                </div>

                {/* 훈장 평점 */}
                <div className="bg-[#FDFBF7] rounded-2xl p-5 border-2 border-zinc-900 text-left space-y-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-[10px] font-black text-[#005BAC] tracking-wider block uppercase">훈장님의 종합 평점</span>
                  <p className="font-serif text-sm text-zinc-800 leading-relaxed font-bold">
                    {score === questions.length ? (
                      '"허허허! 가히 국악 인간문화재 급이로다! 한 곡조 한 곡조의 미학을 원초적으로 꿰뚫고 있으니 내 더 전수할 비책이 없구나. 명인의 경지일세!"'
                    ) : score >= questions.length * 0.7 ? (
                      '"수백 년 가문 대대로 내려온 이 가락을 훌륭히 경청하셨소. 이 정도 안목이면 벼슬길 풍류 마당에서 당당히 가야금 풍월을 읊을 실력이외다!"'
                    ) : score >= questions.length * 0.4 ? (
                      '"가냘픈 줄소리에 흔들림이 있으나, 국악을 마주하는 자세가 매우 참되오. 소리 박물관에서 악기 소리를 더 자주 울리다 보면 명필이 될 걸세."'
                    ) : (
                      '"허허, 아직 소릿길을 따라 걷는 아장아장 새싹 관객이구려. 귀가 틔기 위해 몇 대목 더 정진하고 오면 온당히 가락이 들릴 것이야. 화이팅!"'
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={startCuratedQuiz}
                    className="flex-1 bg-[#005BAC] hover:bg-[#004e94] text-white text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다시 풀어보기
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsQuizActive(false);
                      setQuestions([]);
                    }}
                    className="flex-1 bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    설정 바꾸기 (처음으로)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="bg-white rounded-[32px] p-16 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4">
              <BookOpen className="w-12 h-12 text-zinc-300 mx-auto" />
              <p className="font-serif text-zinc-700 text-lg">아직 출제된 문제가 없습니다.</p>
              <button
                onClick={() => setIsQuizActive(false)}
                className="bg-[#E30613] text-white text-xs font-black border-2 border-zinc-900 rounded-lg px-4 py-2.5 hover:bg-[#c20510] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-all cursor-pointer"
              >
                처음 설정화면으로 가기
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
