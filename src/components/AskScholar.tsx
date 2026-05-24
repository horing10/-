/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, Book, HelpCircle, User, MessageCircle, Info, RefreshCw } from 'lucide-react';
import { ChatMessage } from '../types';

export default function AskScholar() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '에헴! 어서 오게나, 파릇파릇한 국악 새내기 학도여. 🌸\n\n나는 평생 동안 우리 겨레의 어우러지는 가락과 흥을 연구하고 전수해 온 **AI 국악 훈장**이라네.\n\n가야금과 거문고에 걸린 명주실 결의 비밀부터, 대금 청의 칼칼한 공명음, 판소리 마당의 즉흥적인 거동, 세종 임금께서 직접 지으셨다는 조율 배합까지 어떤 것이든 궁금한 가락이 있다면 넌지시 여쭤보시게나. 허허허!',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Suggestions that users can click to ask instantly
  const questionSuggestions = [
    '가야금과 거문고 줄 수와 수법은 왜 다를까요?',
    '바람과 풍파를 가라앉혔다는 만파식적 대금 전설이 궁금하옵니다.',
    '경기민요와 남도민요(육자배기)는 소리 내는 법이 어떻게 다른가요?',
    '판소리 다섯 마당(다섯 바탕)에는 무엇무엇이 있나요?'
  ];

  // Auto scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle post to express chat route
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      // Gather context of last few messages for minor chat continuity
      const historyCtx = messages.slice(-5).map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/gugak/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyCtx
        })
      });

      if (!response.ok) {
        throw new Error('API key resting');
      }

      const data = await response.json();
      
      const modelMsg: ChatMessage = {
        id: 'model-' + Math.random().toString(36).substr(2, 9),
        role: 'model',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      // Intelligent offline fallback simulating 훈장님 answers to classic FAQ
      const botResponse = getOfflineScholarAnswer(textToSend);
      
      const modelMsg: ChatMessage = {
        id: 'model-' + Math.random().toString(36).substr(2, 9),
        role: 'model',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, modelMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper answering typical questions if server fails or is offline
  const getOfflineScholarAnswer = (query: string): string => {
    if (query.includes('만파식적') || query.includes('피리 전설') || query.includes('대금 전설')) {
      return `허허, 해안가 신라의 옛 만파식적 전설을 언급하시니 내 흥이 절로 돋는구려!

삼국유사에 증언하기를, 신라 영웅 신문왕 시절에 감은사 앞바다의 신비한 섬에 **낮에는 둘이 되고 밤에는 합쳐지는 기이한 대나무**가 자라났다 하오.

용왕이 고하되 "한 손으로 치면 울리지 않으나 두 손으로 치면 소리가 나는 법, 이 대나무로 피리를 장착해 울리게 하소서" 하였으니, 대작하여 피리를 불었더니:
- 불어보니 적군 영혼이 물러가고,
- 역병과 병마가 온전히 치유되었으며,
- 비바람이 그치고 거친 파도가 잔잔해졌다 하여 **'만파식적(萬波息笛)'**이라 가보로 숭앙했다 하네!

오늘날 국악의 거장인 **대금(大琴)**이 바로 이 만파식적 오리지널 가락의 참된 혈통이라네. 깊고 칼칼한 바람 소리에 세상의 시름을 치유해 보시게나!`;
    }
    
    if (query.includes('민요') || query.includes('육자배기')) {
      return `허허허, 우리 땅 곳곳의 창법 맛을 아시는 학도로구려! 

한국 민요의 음률은 지역의 지형과 삶결에 따라 크게 나뉘는데, 경기민요와 남도민요가 가장 대표적인 호적수라오.

1. **경기민요 (수도권 영산공)**: 한북 서울과 경기 벌판의 민요는 목소리를 맑고 깨끗하게 뽑는다네. 콧소리(비음)를 살짝 섞어 경쾌하고 또렷하게 또아리를 틀며 흘러가며, 대표적으로 늴리리야나 태평가가 있지.
2. **남도민요 (육자배기 풍)**: 지리산과 남도 들녘의 가락은 호흡을 아랫배(단전) 깊숙한 곳에서 우려내어, 걸걸하고 슬프게 꺾어 우는 소리를 쓴다네. 떨어주는 소리와 꺾는 소리를 몹시 격렬하게 연주하여 가슴을 저미는 장엄한 풍미를 자랑하오!

에헴, 서당에서 직접 부를 날이 오길 기다리겠네.`;
    }
    
    if (query.includes('다섯 마당') || query.includes('판소리')) {
      return `오호, 판소리 마당의 역사적 뼈대를 공부하려 하시는구려!

원래 조선 후기 신재효 선생 시절에는 판소리 열두 마당이 웅장하게 난무하였으나, 세월의 파도를 거쳐 오늘날까지 줄기가 전수가 된 것은 고상하고 대중적인 **다섯 마당(다섯 바탕)**뿐이라네.

1. **춘향가**: 성춘향과 이도령의 변치 않는 지조와 숭고한 사랑을 다룬, 판소리 보물 중 가장 장엄하고 가락이 아름다운 대목이오.
2. **심청가**: 아비의 눈을 뜨이기 위해 바다 인당수에 몸을 던진 심청의 효심과 극적 상봉을 절절히 읊는 눈물샘 자극 마당이라오.
3. **흥보가**: 착한 흥보 골의 제비 다리에 얽힌 박 타는 대목과, 욕심쟁이 놀보의 심술보를 풍자하며 가장 해학적이고 유쾌한 흥을 선사하지.
4. **수궁가**: 용왕의 신장 병을 낫게 하려 토끼 가느란 간을 노리는 자라의 충정과, 지혜로 위기를 뒤엎는 토끼의 지략 싸움을 동물을 빌려 유쾌히 꼬집는다네.
5. **적벽가**: 삼국지 적벽대전을 토대로 한 영웅들의 영맹스러운 기상과 처절한 군사들의 설움을 웅장하고 칼칼한 통성으로 뿜어내는 호쾌한 군악 창이라오.

자네는 이 중 어떤 가락의 박자가 마음에 와닿으시는가?`;
    }

    return `에헴... 학도여, 내가 자네가 던진 정밀한 고대 가락을 잠시 깊이 관조하고 있었다네. 

인공지능 훈장의 등용선 비밀 열쇠(GEMINI_API_KEY)가 잠시 쉬고 있어서 방대한 우주 가락의 답은 못 낸으나, 대신 내 **가야금과 거문고 차이**, **만파식적 대금 이야기**, **경기/남도민요 해법**, 또는 **판소리 다섯 마당** 이야기 등은 언제든 물으면 즉각 서첩을 풀어드릴 테니 물어보시게나!`;
  };

  return (
    <div id="ask-scholar-container" className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      
      {/* Main Interactive Chat Panel */}
      <div className="flex flex-col rounded-[32px] bg-white border-4 border-zinc-900 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[550px] sm:h-[620px]">
        {/* Chat top navigation */}
        <div className="bg-[#005BAC] text-white p-5 flex items-center justify-between border-b-4 border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFD700] border-2 border-zinc-900 flex items-center justify-center text-zinc-950 font-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-lg">
              訓
            </div>
            <div>
              <h4 className="font-sans text-sm font-extrabold flex items-center gap-1.5 text-white">
                AI 국악 훈장님 (Seodang Master)
                <span className="bg-[#E30613] text-[9px] text-white px-2 py-0.5 rounded-lg font-sans font-black border-2 border-zinc-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">ON</span>
              </h4>
              <p className="text-[11px] text-amber-100 font-bold">에헴! 동양 고대 음악사의 맥박과 유래를 해설하세.</p>
            </div>
          </div>
        </div>
 
        {/* Message Log viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FDFBF7] scroll-smooth" ref={scrollRef}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar icon bubble */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-zinc-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                  isUser 
                    ? 'bg-[#FFD700] text-zinc-950 font-black' 
                    : 'bg-[#005BAC] font-black text-white'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : '訓'}
                </div>
 
                {/* Message Bubble Body */}
                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap border-2 border-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    isUser 
                      ? 'bg-[#FFD700] text-zinc-950 rounded-tr-xs font-bold' 
                      : 'bg-white text-zinc-900 rounded-tl-xs font-serif font-semibold'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[10px] text-zinc-500 font-bold block ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
 
          {/* AI Loader Bubble */}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto items-center">
              <div className="w-8 h-8 rounded-full bg-[#005BAC] border-2 border-zinc-900 flex items-center justify-center font-black text-white shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                訓
              </div>
              <div className="bg-white border-2 border-zinc-900 p-4 rounded-2xl rounded-tl-xs flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-2.5 h-2.5 bg-[#E30613] border border-zinc-900 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-[#FFD700] border border-zinc-900 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-[#005BAC] border border-zinc-900 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span className="font-traditional text-xs text-zinc-500 font-black ml-1">훈장님이 짚고 계십니다...</span>
              </div>
            </div>
          )}
        </div>
 
        {/* Input box form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="p-4 bg-white border-t-4 border-zinc-900 flex gap-3 items-center"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="훈장님께 가야금 음정, 민요 창법, 사물놀이 전설 등을 여쭤보십시오..."
            className="flex-1 bg-white border-2 border-zinc-900 rounded-xl px-4 py-3 text-sm font-black focus:outline-hidden focus:ring-2 focus:ring-[#FFD700] text-zinc-900"
            disabled={loading}
          />
          <button
            type="submit"
            className={`p-3.5 rounded-xl border-2 transition-all shrink-0 cursor-pointer ${
              !inputVal.trim() || loading
                ? 'bg-zinc-100 text-zinc-400 border-zinc-300 cursor-not-allowed'
                : 'bg-[#E30613] hover:bg-[#c20510] text-white border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1.5px]'
            }`}
            disabled={!inputVal.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Informational Left Sidebar */}
      <div className="w-full rounded-[32px] p-6 bg-white border-4 border-zinc-900 flex flex-col justify-between space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#E30613]">
            <Book className="w-5 h-5 stroke-[2.5]" />
            <h3 className="font-sans text-base font-black text-zinc-900">서당 질문 가이드라인</h3>
          </div>
          <p className="text-xs text-zinc-650 leading-relaxed font-traditional font-bold">
            AI 훈장님은 역사서와 전통 악전(樂典) 고서들에 근거하여 한반도의 음악사를 속속들이 꿰뚫고 계십니다. 추천하는 질문 대목들을 탭하여 즉시 물어보시거나, 대화상자에 자유로이 수필 적듯 물어보십시오.
          </p>
 
          <div className="pt-2.5 space-y-2.5">
            <span className="text-[10px] font-black text-zinc-400 block uppercase tracking-wider">학도 추천 물음</span>
            {questionSuggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="w-full text-left p-3 rounded-xl bg-white border-2 border-zinc-900 text-[11.5px] text-zinc-900 font-bold hover:bg-[#FDFBF7] hover:border-zinc-900 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1.5px] focus:outline-hidden leading-snug flex items-start gap-1.5 cursor-pointer"
                disabled={loading}
              >
                <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#005BAC]" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
 
        <div className="bg-[#FDFBF7] rounded-2xl p-4 border-2 border-zinc-900 flex gap-2 items-center text-xs text-zinc-800 font-bold leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Info className="w-4 h-4 shrink-0 text-[#E30613]" />
          <span>훈장님의 주옥같은 조언은 에듀테인먼트 목적으로 인공지능이 즉흥적으로 자아내는 가락입니다.</span>
        </div>
      </div>
 
    </div>
  );
}
