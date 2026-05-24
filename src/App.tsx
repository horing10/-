/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Music, MessageSquareCode, Heart, Sparkles, BookOpen, ExternalLink, HelpCircle
} from 'lucide-react';
import QuizArena from './components/QuizArena';
import AskScholar from './components/AskScholar';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<'quiz' | 'scholar'>('quiz');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // Auto hide welcome hero banner after visiting tabs if they want,
  // or let them keep it for high branding effect. We can keep it or make a subtle toggle!

  return (
    <div id="gugak-app-root" className="min-h-screen bg-[#FDFBF7] text-zinc-900 font-sans flex flex-col relative overflow-x-hidden selection:bg-amber-200">
      
      {/* Obangsaek traditional vibrant band header strip */}
      <div className="h-4 w-full flex select-none z-25 relative">
        <div className="h-full flex-1 bg-[#005BAC]"></div>
        <div className="h-full flex-1 bg-[#E30613]"></div>
        <div className="h-full flex-1 bg-[#FFFFFF]"></div>
        <div className="h-full flex-1 bg-[#000000]"></div>
        <div className="h-full flex-1 bg-[#FFD700]"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 max-w-xl md:max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col space-y-6">
        
        {/* Top Header Branding Banner inside a gorgeous White card with thick borders */}
        <header className="bg-white border-4 border-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Music className="w-16 h-16 text-zinc-900" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-[#FFD700] text-zinc-900 border-2 border-zinc-900 rounded-full text-[10px] sm:text-xs font-mono font-black tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-rose-600" />
            AI-Enhanced Gugak Education
          </div>
          
          <div className="space-y-2">
            <h1 className="font-sans text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight flex items-center justify-center gap-3">
              <span className="font-serif bg-[#005BAC] text-white px-3 py-1 rounded-xl border-2 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-2xl sm:text-3xl">國樂</span>
              국악 퀴즈 마당
            </h1>
            <p className="text-zinc-500 font-serif text-xs sm:text-base tracking-wide font-bold">
              인공지능 훈장님과 함께 누리는 한국 전통 음악(국악) 복합 놀이마당
            </p>
          </div>
        </header>

        {/* Traditional Hanok Ribbed Tab Selectors with Vibrant Palette and Neubrutal style */}
        <div className="bg-white border-4 border-zinc-900 p-1.5 sm:p-2 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] grid grid-cols-2 max-w-2xl w-full mx-auto z-10 select-none">
          <button
            id="menu-quiz"
            onClick={() => { setActiveMenu('quiz'); }}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer border-2 ${
              activeMenu === 'quiz'
                ? 'bg-[#E30613] text-white border-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-extrabold translate-y-[-2px]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>퀴즈 한마당</span>
          </button>

          <button
            id="menu-scholar"
            onClick={() => { setActiveMenu('scholar'); }}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer border-2 ${
              activeMenu === 'scholar'
                ? 'bg-[#FFD700] text-zinc-950 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-extrabold translate-y-[-2px]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <MessageSquareCode className="w-4 h-4 shrink-0" />
            <span>AI 국악 훈장</span>
          </button>
        </div>

        {/* Dynamic Canvas Area */}
        <main className="flex-1 w-full min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {activeMenu === 'quiz' && <QuizArena />}
              {activeMenu === 'scholar' && <AskScholar />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Elegant Footer representing high craft guidelines in neubrutalist style */}
        <footer className="bg-white border-4 border-zinc-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center text-zinc-500 text-xs font-traditional space-y-2 mt-8">
          <div className="flex items-center justify-center gap-1 text-zinc-700 font-bold">
            <span>만든 오르간 ·</span>
            <Heart className="w-3.5 h-3.5 fill-[#E30613] text-[#E30613]" />
            <span>국악 사랑방</span>
          </div>
          <p className="opacity-85 text-[10.5px] font-bold">우리 고유 가락의 깊은 소리와 흥이 한평생 번지기를 기원합니다.</p>
          <div className="flex justify-center gap-3 text-[10px] font-sans font-black text-zinc-400 pt-1.5 select-none">
            <span className="hover:text-zinc-900 cursor-help flex items-center gap-1">
              <HelpCircle className="w-3" /> Web Audio Synthesizer 활성됨
            </span>
            <span>|</span>
            <span className="flex items-center gap-1 text-[#005BAC]">
              <Sparkles className="w-3 text-[#FFD700]" /> Gemini LLM 연동됨
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
