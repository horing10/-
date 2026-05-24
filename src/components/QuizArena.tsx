/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Sparkles, AlertCircle, HelpCircle, ArrowRight,
  RotateCcw, CheckCircle2, XCircle, ChevronRight, BookOpen, Clock, RefreshCw
} from 'lucide-react';
import { QuizQuestion, QuizTopic, QuizDifficulty } from '../types';
import { curatedQuizQuestions } from '../data/quizQuestions';

export default function QuizArena() {
  // Config & Quiz selection state
  const [activeTab, setActiveTab] = useState<'curated' | 'ai'>('curated');
  const [selectedTopic, setSelectedTopic] = useState<QuizTopic | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty | 'all'>('all');
  
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
  
  // Loading & state
  const [loading, setLoading] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>('');

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
    setLoading(true);
    let filtered = [...curatedQuizQuestions];
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(q => q.topic === selectedTopic);
    }
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }

    if (filtered.length === 0) {
      setErrorText('해당 조건의 기출 퀴즈가 없습니다. 다른 분야나 난이도를 선택해 주십시오.');
      setQuestions([]);
      setLoading(false);
      return;
    }

    // Shuffle filtered questions
    filtered.sort(() => Math.random() - 0.5);
    
    setErrorText('');
    setQuestions(filtered);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setShowHint(false);
    setLoading(false);
  };

  // Generate question using server-side Gemini
  const generateAIQuestion = async (topicStr?: string) => {
    setLoading(true);
    setErrorText('');
    
    const requestBody = {
      topic: topicStr || (selectedTopic === 'all' ? '' : selectedTopic),
      difficulty: selectedDifficulty === 'all' ? 'medium' : selectedDifficulty
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
    if (selectedAnswer === null || isAnswered) return;
    
    setIsAnswered(true);
    const currentQ = questions[currentIndex];
    
    if (selectedAnswer === currentQ.correctAnswer) {
      setScore(prev => prev + 1);
    }
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
    startCuratedQuiz();
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
      
      {/* Quiz Selector & Banner in beautiful White card with thick border */}
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
          
          <div className="bg-[#FDFBF7] p-1.5 border-2 border-zinc-900 rounded-xl flex gap-1.5 self-start sm:self-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              id="tab-curated"
              onClick={() => { setActiveTab('curated'); setErrorText(''); }}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
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
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ai' 
                  ? 'bg-[#005BAC] text-white border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'text-zinc-650 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#FFD700] animate-pulse" />
              AI 무한 생성
            </button>
          </div>
        </div>

        {/* Sub-Filters / Custom Fields */}
        <div className="mt-6 pt-5 border-t-2 border-dashed border-zinc-200 grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-black text-zinc-700 block">분야 분류</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value as QuizTopic | 'all')}
              className="w-full bg-white border-2 border-zinc-900 text-zinc-900 text-sm rounded-xl px-3 py-2 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
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
                  className={`flex-1 py-1.5 text-xs rounded-xl border-2 text-center transition-all ${
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

          <div className="md:col-span-4 flex items-end">
            {activeTab === 'curated' ? (
              <button
                id="btn-start-curated"
                onClick={startCuratedQuiz}
                className="w-full bg-[#005BAC] hover:bg-[#004e94] text-white text-sm font-black border-2 border-zinc-900 rounded-xl py-2.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                기출 시험보기
              </button>
            ) : (
              <div className="w-full flex gap-2">
                <input
                  type="text"
                  placeholder="예: 경기민요, 가야금 산조, 세종대왕..."
                  value={customAITopic}
                  onChange={(e) => setCustomAITopic(e.target.value)}
                  className="flex-1 bg-white border-2 border-zinc-900 text-zinc-900 text-sm rounded-xl px-3 py-2 font-bold focus:outline-hidden focus:border-amber-400"
                />
                <button
                  id="btn-generate-ai"
                  onClick={() => generateAIQuestion(customAITopic)}
                  className="bg-[#E30613] hover:bg-[#c20510] text-white text-sm font-black border-2 border-zinc-900 rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] min-w-28 cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      출제하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
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

      {/* Main Quiz Gameplay Stage */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-[#E30613] rounded-full animate-spin"></div>
          <p className="font-sans text-xl font-black text-zinc-900">훈장님이 서당 책장을 뒤지며 문제를 출제하고 계십니다...</p>
          <p className="text-xs font-bold text-zinc-400">잠시만 기다려 주십시오.</p>
        </div>
      ) : questions.length > 0 && !quizFinished ? (
        <div className="flex flex-col gap-6">
          
          {/* Question Zither Card */}
          <div className="w-full space-y-4">
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              {/* Question Header Status */}
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

              {/* Options */}
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

              {/* Bottom buttons (Submit Answer, Next Question, Hints) */}
              <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t-2 border-dashed border-zinc-200">
                <button
                  onClick={() => setShowHint(prev => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border-2 border-zinc-900 ${
                    showHint 
                      ? 'bg-amber-150 text-amber-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
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
                      disabled={selectedAnswer === null}
                      className={`px-6 py-2.5 text-xs font-black rounded-xl border-2 border-zinc-900 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        selectedAnswer === null
                          ? 'bg-zinc-100 text-zinc-450 cursor-not-allowed'
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

              {/* Sliding Hint block */}
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

              {/* Show built-in custom explanation once answered */}
              {isAnswered && (
                <div className="mt-6 p-5 rounded-2xl border-2 border-[#005BAC] bg-[#FDFBF7] text-xs text-zinc-900 leading-relaxed font-serif font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-fade-in">
                  <span className="font-sans text-xs font-black text-[#005BAC] block mb-1">📖 훈장님의 역사 한 구절 해설</span>
                  {questions[currentIndex].explanation}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : quizFinished ? (
        /* Results Billboard */
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

            {/* Score Ring Display */}
            <div className="py-6 flex justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-zinc-900 flex flex-col items-center justify-center bg-[#FFD700] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-mono text-5xl font-black text-[#E30613]">{score}</span>
                <span className="text-zinc-900 font-black text-xl">/</span>
                <span className="text-zinc-900 font-black text-xs uppercase mt-0.5">{questions.length} 문제 통과</span>
              </div>
            </div>

            {/* Evaluation verdict sentence */}
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
                  '"허허, 아직 소릿길을 따라 걷는 아장아장 새싹 관객이구려. 귀차니즘을 버리고 소리 도감을 몇 대목 더 연구하고 오면 당장에 귀가 틔울 걸세. 화이팅!"'
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={startCuratedQuiz}
                className="flex-1 bg-white hover:bg-zinc-150 text-zinc-900 text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                기출 다시풀기
              </button>
              
              {hasApiKey && (
                <button
                  onClick={() => {
                    setActiveTab('ai');
                    generateAIQuestion();
                  }}
                  className="flex-1 bg-[#E30613] hover:bg-[#c20510] text-white text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 무한 퀴즈하기
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-[32px] p-16 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4">
          <BookOpen className="w-12 h-12 text-zinc-300 mx-auto" />
          <p className="font-serif text-zinc-700 text-lg">아직 출제된 문제가 없습니다.</p>
          <button
            onClick={startCuratedQuiz}
            className="bg-[#E30613] text-white text-xs font-black border-2 border-zinc-900 rounded-lg px-4 py-2.5 hover:bg-[#c20510] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            기출 퀴즈 한마당 출제하기
          </button>
        </div>
      )}

    </div>
  );
}
