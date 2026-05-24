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
    '국악을 귀로 감상할 수 있는 유튜브 채널을 추천해 주시게나!',
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

  // Render helper to format markdown links [text](url) and bold **text** safely
  const formatMessageText = (text: string) => {
    if (!text) return null;

    // Split text by markdown links: [Text](URL)
    const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s\)]+\))/g);
    
    return parts.map((part, index) => {
      const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)$/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        return (
          <a
            key={index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 mx-1 bg-red-50 hover:bg-[#E30613] hover:text-white border-2 border-zinc-900 rounded-xl text-xs font-black text-zinc-900 transition-all hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] no-underline cursor-pointer"
          >
            {linkText} ↗
          </a>
        );
      }

      // Inside non-link parts, split by bold markdown: **text**
      const subParts = part.split(/(\*\*[^*]+\*\*)/g);
      return subParts.map((subPart, subIdx) => {
        const boldMatch = subPart.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return (
            <strong key={`${index}-${subIdx}`} className="font-extrabold text-zinc-950">
              {boldMatch[1]}
            </strong>
          );
        }
        return subPart;
      });
    });
  };

  // Helper answering typical questions if server fails or is offline
  const getOfflineScholarAnswer = (query: string): string => {
    const cleanQuery = query.toLowerCase();

    if (cleanQuery.includes('피리') || cleanQuery.includes('구멍') || cleanQuery.includes('지공') || cleanQuery.includes('대금') || cleanQuery.includes('단소') || cleanQuery.includes('가야금') || cleanQuery.includes('거문고') || cleanQuery.includes('줄') || cleanQuery.includes('현') || cleanQuery.includes('생황') || cleanQuery.includes('악기')) {
      if (cleanQuery.includes('생황')) {
        return `에헴! 국악기 중 가장 신비롭고 아름다운 화음을 품은 **생황(Saeghwang)**에 관심이 있으시구려! 내 기쁜 마음으로 일러주겠네.

생황은 다음과 같은 신묘한 비밀을 간직하고 있다네:
1. **유일무이한 화음 관악기**: 일반적인 대금, 피리, 단소 등 국악 관악기는 한 번에 하나의 음만 연주하지만, 생황은 손가락으로 여러 지공을 함께 짚어 **국악기 중 유일하게 아름다운 "화음(chords)"을 조화롭게 자아낼 수 있는 관악기**라네.
2. **구조와 재료 (17관 및 현대 개량형)**: 본래 오동나무나 금속(고대에는 동그란 박 바가지 자체)으로 만든 둥근 바람통(울림통) 위에 다양한 길이의 세밀한 대나무 관을 빙 둘러 꽂아 만드는데, 전통적인 생황은 **정확히 "17개의 대나무 관(17관)"**을 사용한다오! 요즘 현대에 이르러서는 넓은 화음 연주와 다채로운 조바꿈(전조)을 소화하기 위하여 **"24관"부터 "36관", "38관"** 같은 풍부한 동관 개량 생황도 널리 제작되어 무대 위에서 대활약하고 있다네.
3. **독특한 발음 방식 (황, Reed)**: 각 대나무 관의 밑부분에는 쇠붙이로 된 얇은 떨림판인 '황(簧)'이 붙어 있어서, 숨을 들이마실 때(들숨)와 내쉴 때(날숨) 모두 이 황이 파르르 떨리며 영롱하게 울린다네. 아코디언이나 하모니카의 먼 조상 격이라 볼 수 있지!
4. **생소병주 (笙簫竝奏)**: 생황의 맑고 우아하며 아스라한 소리는 단소의 맑고 가냘픈 선율과 우주적인 음색 조합을 지녔다네. 그래서 생황과 단소의 이중주를 **'생소병주'**라 칭하며, 선비들이 가장 지극히 사랑한 영혼의 풍류 예술이었다네.

오색구름 속에 깃들어 조화를 부리는 신선의 악기, 생황 고유의 깊이를 깊숙이 이해해 보시게나!`;
      }
      if (cleanQuery.includes('피리')) {
        return `에헴! 피리(Piri)에 대해 묻는구려. 기특하기도 해라! 
        
우리의 소박하면서도 울림이 거창한 관악기 **피리는 지공(손가락 구멍)이 정확히 "8개"**라네.
- 지공 구성: **뒷면에 1개, 앞면에 7개**가 있다오.
- 구조적 특징: 대나무 관대 끝에 갈대로 얇게 만든 겹리드인 '서(혀)'를 끼워서 입에 모아 물고 숨결을 세차게 불어넣는 방식으로 소리를 낸다네. 크기는 작지만 향피리나 당피리는 그 성량이 매우 우람하여 합주에서 늘 대장(주선율) 역할을 맡는다네!`;
      }
      if (cleanQuery.includes('대금')) {
        return `허허, 청아하고 기품 넘치는 우리 대금(Daegeum)을 궁금해 하시는구려!

**대금의 지공(손가락 구멍)은 정확히 "6개"**라오. 하지만 악기 전체를 살펴보면 구멍이 아주 많고 신비하다네:
1. **취구 (1개)**: 김을 불어넣는 입구 구멍이 하나 있고,
2. **청공 (1개)**: 갈대 속껍질로 만든 얇은 '청'을 붙여서 특유의 탁하게 떨리는 소리를 자아내는 청공이 있으며,
3. **지공 (6개)**: 손가락으로 막고 열며 소리 조절을 하는 6개의 구멍이 실질적인 음정을 지휘하고,
4. **칠성공 (1~2개)**: 악기 아래쪽 끝에 음정을 조율하기 위해 뚫어둔 구멍들이 있다네.

지공은 6개이지만 전체 구멍은 다채로우니, 참으로 온 조화를 품은 악기가 아니겠는가?`;
      }
      if (cleanQuery.includes('가야금') || cleanQuery.includes('거문고') || cleanQuery.includes('줄') || cleanQuery.includes('현')) {
        return `오호! 우리 나라를 대표하는 현악기인 가야금(Gayageum)과 거문고(Geomungo)의 줄 수에 대해 여쭤보시는구려. 아주 훌륭한 탐구열일세!

쉽게 정리해 줄 테니 머릿속에 꼭 새겨두시게나:
1. **가야금 (Gayageum)**: 전통적인 정악 및 산조 가야금은 정확히 **"12줄(12현)"**이라네! 기러기발 모양의 '안족' 위에 명주실 줄을 얹고 맨손가락 끝으로 뜯고 튕기며 부드럽고 수려한 가락을 노래하지. 현대에는 18현이나 25현으로 활짝 넓힌 개량 가야금도 널리 쓰인다오.
2. **거문고 (Geomungo)**: 고구려의 왕산악이 만든 악기로, 정확히 **"6줄(6현)"**을 쓴다네. 또한 안족뿐만 아니라 오동나무 판에 박힌 **16개의 '괘'**를 짚어 조율한다오. 손에 대나무 '술대'를 쥐고 시원하고 단단하게 후려쳐서 지르는 웅장하고 남성적인 맥박을 내오!

12줄 가야금과 6줄 거문고, 이 둘의 대조적인 음색은 국악 한마당의 영원한 아름다움이라오!`;
      }
      if (cleanQuery.includes('단소')) {
        return `허허, 서당의 친숙한 동반자 단소(Danso)를 파헤치시는구려!
        
**단소의 지공(손가락 구멍)은 전통적으로 뒤에 1개, 앞에 4개로 총 "5개"**가 뚫려 있다네.
다만 실제 연주를 할 때는 가장 아래에 뚫린 제5공을 거의 막지 않고 항상 열어두며 연주하기 때문에, **실질적으로는 4개의 구멍만 제어**하여 오음(황종, 태주, 중려, 임종, 남려)을 청아하게 불어낸다오!`;
      }
      return `허허, 국악기에 얽힌 기이한 구멍(지공)과 현(명주 줄)의 가치를 물어봐 주셔서 고맙소!
      
우리 전통 악기들은 대나무와 지공, 명주 줄을 통해 지극히 자연에 가까운 동양학적 소리의 완결을 이끌어 낸다오. 가야금의 12줄, 거문고의 6줄, 피리의 8구멍, 대금의 6구멍(지공) 등 자연의 숫자들과 밀접히 닮아 있지. 더 궁금한 악기의 비밀이 있다면 언제든 이름을 불러 질문해 주시게나!`;
    }

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

    if (cleanQuery.includes("유튜브") || cleanQuery.includes("youtube") || cleanQuery.includes("추천") || cleanQuery.includes("링크") || cleanQuery.includes("채널") || cleanQuery.includes("영상") || cleanQuery.includes("동영상")) {
      return `허허허! 맑은 눈의 학도여, 눈부시게 움직이는 현대의 기예인 동영상(유튜브)을 통해 국악을 배우려 하시다니! 참으로 기특하고 현명한 배움이라네.

내가 평소에도 즐겨보며 학도들에게 권하는 우리 겨레의 **국악 유튜브 천하 명품 채널**들을 추려 주겠소. 아래 링크를 선택하면 즉석에서 소리를 감상하러 갈 수 있다네!

1. **국립국악원 (National Gugak Center)**
- [국립국악원 유튜브](https://www.youtube.com/@gugak1951)
- *특징*: 궁중 정악, 아악부터 신명 나는 민속악까지 모든 전통 가락의 종갓집이라네! 최고의 연주력과 음향으로 우리 음악을 소장해 두었소.

2. **국악방송 (Gugak TV)**
- [국악방송 유튜브](https://www.youtube.com/@gugaktv)
- *특징*: 풍성한 전국의 국악 축제, 명창들의 경연, 국악 다큐멘터리가 송출되고 있어 친숙하게 귀를 틔울 수 있다네.

3. **이날치 (LEENALCHI)**
- [이날치 OFFICIAL](https://www.youtube.com/@leenalchiofficial)
- *특징*: 수궁가 판소리 대목을 엄청나게 신나고 세련된 팝 가락으로 엮어 온 세상을 흔든 퓨전 국악의 신화라네!

4. **악단광칠 (ADG7)**
- [악단광칠 유튜브](https://www.youtube.com/@ADG7)
- *특징*: 황해도 굿 장단과 서민의 소리를 기막히게 강력하고 힙한 현대식 에너자이저 그루브로 녹여내어 어깨가 절로 들썩이네!

5. **서도밴드 (sEODo BAND)**
- [서도밴드 유튜브](https://www.youtube.com/@seodoband)
- *특징*: 국악 가락과 소울 팝을 접목하여 구성지고 아름다운 "조선팝(Chosun Pop)"이라는 뉴 장르 효시를 이룩한 예술적 악단이라오.

에헴, 백문이 불여일견이고 백견이 불여일청이니, 어서 위 링크들을 눌러 즉석에서 국악의 참맛을 두 귀로 감상하러 가시게나!`;
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
                    {formatMessageText(msg.text)}
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
