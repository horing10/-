/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Trophy, Crown, Play, Sparkles, Copy, QrCode, 
  CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, 
  ArrowRight, Share2, LogOut, Check, RefreshCw, Send, ShieldAlert
} from 'lucide-react';
import { QuizTopic, QuizDifficulty } from '../types';
import QRCode from 'qrcode';

interface PlayerState {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  answered: boolean;
  selectedAnswer: boolean | number | null; // boolean during playing, index during revealing/finished
  streak: number;
  answerHistory: { [key: number]: { isCorrect: boolean; selected: number } };
}

interface RoomState {
  id: string;
  topic: string;
  difficulty: string;
  questions: any[];
  status: 'lobby' | 'playing' | 'revealing' | 'finished';
  currentIndex: number;
  timer: number;
  maxTimer: number;
  useAi: boolean;
  players: PlayerState[];
}

export default function MultiplayerArena() {
  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('gugak_nickname') || '';
  });
  const [roomId, setRoomId] = useState<string>('');
  const [topic, setTopic] = useState<QuizTopic | 'all'>('all');
  const [difficulty, setDifficulty] = useState<QuizDifficulty | 'all'>('all');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [useAi, setUseAi] = useState<boolean>(false);
  
  // Game instance state
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [errorText, setErrorText] = useState<string>('');
  const [localClientId, setLocalClientId] = useState<string>('');
  const [localAnswerSelected, setLocalAnswerSelected] = useState<number | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  const timerAudioRef = useRef<AudioContext | null>(null);

  // Read initial query param ?room=XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomId(code.toUpperCase().trim());
    }
  }, []);

  // Generate QR code client-side using qrcode package, bypasses all cookies/iframe blocking!
  useEffect(() => {
    if (roomState?.id) {
      const url = getJoinUrl();
      QRCode.toDataURL(url, {
        margin: 1,
        width: 256,
        color: {
          dark: '#09090b', // Zinc 950 color
          light: '#ffffff'
        }
      })
      .then(urlData => {
        setQrDataUrl(urlData);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
      });
    }
  }, [roomState?.id]);

  // Sync nickname to localStorage
  const saveNickname = (name: string) => {
    setNickname(name);
    localStorage.setItem('gugak_nickname', name);
  };

  // Toast effect helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // Setup Socket Connection
  const connectToServer = (actionPayload: any) => {
    if (ws) {
      ws.close();
    }
    
    setErrorText('');
    setIsConnecting(true);
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        setIsConnecting(false);
        // Send join or create action
        socket.send(JSON.stringify(actionPayload));
      };
      
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;
        
        switch (type) {
          case 'ROOM_STATE':
            setRoomState(payload);
            setIsJoined(true);
            
            // Find local player ID
            const me = payload.players.find((p: any) => p.nickname === nickname || p.nickname === nickname.trim());
            if (me) {
              setLocalClientId(me.id);
            }
            break;
            
          case 'ERROR':
            setErrorText(payload.message);
            setIsConnecting(false);
            setIsJoined(false);
            socket.close();
            break;
        }
      };
      
      socket.onclose = () => {
        setWs(null);
        setIsJoined(false);
      };
      
      setWs(socket);
    } catch (e: any) {
      console.error(e);
      setErrorText('해당 배틀 장터(서버)와의 전구 교신에 실패하였소.');
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setErrorText('대결에 참여하기 위한 닉네임을 적어 주십시오.');
      return;
    }
    
    const action = {
      type: 'CREATE_ROOM',
      payload: {
        topic,
        difficulty,
        nickname: nickname.trim(),
        numQuestions,
        useAi
      }
    };
    
    connectToServer(action);
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setErrorText('대결에 참여하기 위한 닉네임을 적어 주십시오.');
      return;
    }
    if (!roomId.trim()) {
      setErrorText('입장할 대결방 4자리 암호를 적어 주십시오.');
      return;
    }
    
    const action = {
      type: 'JOIN_ROOM',
      payload: {
        roomId: roomId.trim().toUpperCase(),
        nickname: nickname.trim()
      }
    };
    
    connectToServer(action);
  };

  const handleStartQuiz = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'START_QUIZ' }));
    }
  };

  const handleSelectOption = (idx: number) => {
    if (!roomState || roomState.status !== 'playing') return;
    
    // Check if the local client has already submitted
    const localPlayer = roomState.players.find(p => p.id === localClientId);
    if (localPlayer?.answered) return;
    
    setLocalAnswerSelected(idx);
  };

  const submitAnswer = () => {
    if (localAnswerSelected === null || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({
      type: 'SUBMIT_ANSWER',
      payload: {
        answerIndex: localAnswerSelected,
        timeTaken: roomState ? roomState.maxTimer - roomState.timer : 0
      }
    }));
  };

  const handleNextQuestion = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'NEXT_QUESTION' }));
      // Reset local answer
      setLocalAnswerSelected(null);
    }
  };

  const handleLeaveRoom = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
      ws.close();
    }
    setRoomState(null);
    setIsJoined(false);
    setLocalAnswerSelected(null);
  };

  // Beep synthesizer on low-timer
  useEffect(() => {
    if (roomState && roomState.status === 'playing' && roomState.timer <= 5 && roomState.timer > 0) {
      try {
        if (!timerAudioRef.current) {
          timerAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = timerAudioRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(roomState.timer === 1 ? 880 : 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch (err) {
        // audio context blocked or not active
      }
    }
  }, [roomState?.timer, roomState?.status]);

  // Copy join link
  const getJoinUrl = () => {
    if (!roomState) return '';
    return `${window.location.origin}${window.location.pathname}?room=${roomState.id}`;
  };

  const copyJoinLink = () => {
    const link = getJoinUrl();
    navigator.clipboard.writeText(link).then(() => {
      triggerToast('대결방 초청 링크가 클립보드에 안착하였소!');
    }).catch(() => {
      triggerToast('링크 복사에 실패하였소. 직접 전송해 보시구려.');
    });
  };

  const getTopicLabel = (topicStr: string) => {
    switch (topicStr) {
      case 'instrument': return '악기';
      case 'theory': return '이론·가락';
      case 'genre': return '소리·판소리';
      case 'history': return '의식·역사';
      default: return '전반·상식';
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy': return <span className="bg-[#10B981] text-white px-2 py-0.5 text-[10px] font-black rounded border-2 border-zinc-900">태학제자 (쉬움)</span>;
      case 'hard': return <span className="bg-[#E30613] text-white px-2 py-0.5 text-[10px] font-black rounded border-2 border-zinc-900">명인 (어려움)</span>;
      default: return <span className="bg-[#FFD700] text-zinc-950 px-2 py-0.5 text-[10px] font-black rounded border-2 border-zinc-900">전수자 (보통)</span>;
    }
  };

  return (
    <div id="multiplayer-arena" className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Toast Alert Popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-55 bg-[#FFD700] border-4 border-zinc-900 px-6 py-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs font-black text-zinc-900 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isJoined ? (
        /* ================= 1단계: 닉네임 입력 및 방 만들기 / 참여하기 대문 ================= */
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-[#E30613] border-2 border-[#E30613] rounded-full text-[10px] font-black tracking-widest uppercase">
              <Users className="w-3.5 h-3.5 animate-bounce" />
              Real-time Team Battle (실시간 다자연주)
            </span>
            <h2 className="font-sans text-3xl font-black text-zinc-900 flex items-center justify-center gap-2">
              국악과거 실시간 겨루기
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm font-serif font-bold">
              QR 코드로 한 자리에 모여, 우리 전통 가락과 이론 퀴즈를 가장 빠르고 정확하게 맞힌 장원급제자를 가려보세!
            </p>
          </div>

          <div className="p-4 sm:p-5 bg-[#F9F7F2] border-2 border-zinc-900 rounded-2xl space-y-3">
            <label className="text-xs font-black text-zinc-700 block">학도의 이름 (닉네임)</label>
            <input
              type="text"
              maxLength={8}
              placeholder="예: 경기명창, 대금선비, 가야선녀 등 (최대 8자)"
              value={nickname}
              onChange={(e) => saveNickname(e.target.value)}
              className="w-full bg-white border-4 border-zinc-900 text-zinc-900 text-sm font-black rounded-xl px-4 py-3.5 focus:outline-hidden focus:border-[#FFD700] placeholder-zinc-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* 왼쪽: 새로운 방 만들기 (Host) */}
            <div className="border-4 border-zinc-900 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-black text-[#005BAC] tracking-widest uppercase block border-b-2 border-dashed border-zinc-200 pb-2">
                  새 과거시험 마당 개설
                </span>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 block">퀴즈 분야</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as QuizTopic | 'all')}
                    className="w-full bg-white border-2 border-zinc-900 text-sm rounded-lg p-2 font-bold cursor-pointer"
                  >
                    <option value="all">모든 분야 (무작위)</option>
                    <option value="instrument">악기 (가야금, 거문고, 대금 등)</option>
                    <option value="theory">이론·율명 (대조, 12율, 장단)</option>
                    <option value="genre">소리·장르 (판소리, 민요, 잡가)</option>
                    <option value="history">의식·역사 (종묘제례악, 세종대왕)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 block">난이도 사정</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as QuizDifficulty | 'all')}
                    className="w-full bg-white border-2 border-zinc-900 text-sm rounded-lg p-2 font-bold cursor-pointer"
                  >
                    <option value="all">모든 난이도</option>
                    <option value="easy">초보 (쉬움)</option>
                    <option value="medium">보통 (전수자)</option>
                    <option value="hard">명인 (어려움)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 block">출제 문항 수</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => setNumQuestions(num)}
                        className={`py-1.5 text-xs rounded border-2 font-bold ${
                          numQuestions === num
                            ? 'bg-[#005BAC] text-white border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900 cursor-pointer'
                        }`}
                      >
                        {num}문제
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#FDFBF7] p-2.5 border-2 border-dashed border-zinc-300 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-rose-700 block">AI 무한 퀴즈 연동</span>
                    <span className="text-[10px] text-zinc-400 font-bold block leading-tight">Gemini가 이 방의 전수 문제를 즉시 연수</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useAi}
                    onChange={(e) => setUseAi(e.target.checked)}
                    className="w-5 h-5 accent-[#E30613] border-2 border-zinc-900 rounded cursor-pointer"
                  />
                </div>
              </div>

              <button
                id="btn-create-multi-room"
                onClick={handleCreateRoom}
                disabled={isConnecting}
                className="w-full bg-[#005BAC] hover:bg-[#004e94] text-white text-xs sm:text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer mt-4"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                방 만들기 (과거시험 마당 열기)
              </button>
            </div>

            {/* 오른쪽: 기존의 방 참여하기 (Client/Guest) */}
            <div className="border-4 border-zinc-900 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between bg-amber-50/15">
              <div className="space-y-4">
                <span className="text-xs font-black text-[#E30613] tracking-widest uppercase block border-b-2 border-dashed border-zinc-200 pb-2">
                  기존 과거시험 마당 입장
                </span>
                
                <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                  동료 학도나 친구에게 공유받은 암호 4자리를 아래에 입력하면 실시간으로 동일한 시험장에 접속하실 수 있소.
                </p>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-zinc-600 block">입장 암호 (Room Code)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="예: FG51"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase().trim())}
                    className="w-full bg-white border-2 border-zinc-900 text-center text-lg uppercase tracking-widest font-black rounded-lg py-2 focus:outline-hidden focus:border-[#E30613]"
                  />
                </div>
              </div>

              <button
                id="btn-join-multi-room"
                onClick={handleJoinRoom}
                disabled={isConnecting}
                className="w-full bg-[#E30613] hover:bg-[#c20510] text-white text-xs sm:text-sm font-black border-2 border-zinc-900 rounded-xl py-3.5 transition-all flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer mt-4"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                대결 참여하기 (시험장 들어가기)
              </button>
            </div>
          </div>

          {errorText && (
            <div className="bg-rose-100 border-2 border-zinc-900 text-rose-950 text-xs font-bold rounded-xl py-2.5 px-4.5 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(227,6,19,1)]">
              <ShieldAlert className="w-4 h-4 text-[#E30613] shrink-0" />
              <span>{errorText}</span>
            </div>
          )}
        </div>
      ) : (
        /* ================= 2단계: 실시간 접속 후 게임 내 뷰어 ================= */
        <div className="space-y-6">
          {/* 상단 현재 시험 마당 정보 표시판 */}
          <div className="bg-white border-4 border-zinc-900 rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-[#FFD700] flex items-center justify-center font-extrabold text-zinc-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                {roomState?.id}
              </span>
              <div>
                <span className="text-[10px] sm:text-xs font-black text-[#005BAC] tracking-widest block uppercase">GU_GAK MULTIPLAYER BATTLE</span>
                <h3 className="font-sans text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-1">
                  <span>과거 율장방: </span>
                  <span className="text-[#E30613] uppercase font-black">{roomState?.id}</span>
                </h3>
              </div>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="text-[10px] sm:text-xs font-black border-2 border-zinc-900 text-zinc-800 hover:text-[#E30613] bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>시험장 퇴장</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {roomState?.status === 'lobby' && (
              /* ----------------- [A] 대기방 요약 및 명부 ----------------- */
              <motion.div
                key="lobby"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-12 gap-8"
              >
                {/* 대기방 왼쪽: 대결방 초대 패널 (QR 포함) */}
                <div className="md:col-span-5 text-center space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="inline-block p-2.5 bg-amber-100 border-2 border-zinc-900 rounded-full text-zinc-900">
                      <QrCode className="w-8 h-8" />
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-zinc-900 text-base">동료 초대하기 (무대 소환)</h4>
                      <p className="text-[11px] text-zinc-500 font-bold leading-tight">
                        동료의 카메라로 아래 QR 코드를 비추거나 링크를 복사해 전송해 국악 대결을 펼쳐보시구려.
                      </p>
                    </div>

                    {/* QR Code image generated completely client-side to bypass cookie block policies */}
                    <div className="w-44 h-44 mx-auto border-4 border-zinc-900 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="QR Code" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-[10px] text-zinc-400 font-bold">생성 중...</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getJoinUrl()}
                        className="flex-1 bg-zinc-50 border-2 border-zinc-300 text-[10px] font-mono p-2 rounded-lg text-zinc-500 overflow-ellipsis"
                      />
                      <button
                        onClick={copyJoinLink}
                        className="bg-[#005BAC] hover:bg-[#004e94] text-white p-2 border-2 border-zinc-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] transition-all cursor-pointer"
                        title="주소 복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold">방 코드: <b className="text-zinc-700">{roomState.id}</b></p>
                  </div>
                </div>

                {/* 대기방 오른쪽: 참여 유생 명부 (Roster) 및 시험 출제 시작 */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-2">
                      <h4 className="font-serif font-black text-lg text-zinc-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>과거 참여 유종진 {roomState.players.length}명 대기 중</span>
                      </h4>
                      <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded border border-zinc-400 font-bold">
                        {roomState.useAi ? 'AI 출제방' : '기출 서고방'}
                      </span>
                    </div>

                    {/* Roster items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {roomState.players.map((plyr) => (
                        <div
                          key={plyr.id}
                          className={`p-3 border-2 border-zinc-900 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                            plyr.id === localClientId
                              ? 'bg-amber-50 shadow-[2px_2px_0px_0px_rgba(255,191,36,1)]'
                              : 'bg-white shadow-[2px_2px_0px_0px_rgba(9,9,11,1)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {plyr.isHost ? (
                              <Crown className="w-4.5 h-4.5 text-[#FFD700] fill-[#FFD700] stroke-zinc-900 stroke-2" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-800"></div>
                            )}
                            <span className="text-sm truncate max-w-28 text-zinc-900">{plyr.nickname}</span>
                            {plyr.id === localClientId && <span className="text-[10px] text-[#005BAC] font-black">(나)</span>}
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${plyr.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {plyr.connected ? '접속전수' : '수맥 끊김'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Start battle controller */}
                  <div className="pt-4 border-t border-dashed border-zinc-200">
                    {roomState.players.find(p => p.id === localClientId)?.isHost ? (
                      <div className="space-y-3.5">
                        {roomState.players.length < 2 && (
                          <p className="text-[11px] text-zinc-400 text-center font-bold">
                            (최소 2인 이상 모이면 실제 풍류가 흐르는 대전의 진가를 느낄 수 있습니다. 혼자 연습 시작도 가능합니다.)
                          </p>
                        )}
                        <button
                          id="btn-trigger-multi-battle"
                          onClick={handleStartQuiz}
                          className="w-full bg-[#E30613] hover:bg-[#c20510] text-white text-base font-black border-4 border-zinc-900 rounded-2xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] cursor-pointer"
                        >
                          <Play className="w-5 h-5 fill-white" />
                          명고수들아 풍악을 올려라! (과거시험 출제)
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#FDFBF7] border-2 border-zinc-900 p-4 rounded-xl text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="w-6 h-6 border-2 border-zinc-300 border-t-[#E30613] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs font-black text-zinc-700 font-serif">
                          방장 훈생님이 북을 둥둥 쳐 대결(과거 출제)를 울리기만을 기다리는 중이외다...
                        </p>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1">
                          (현재 분야: {getTopicLabel(roomState.topic)} · 난이도: {roomState.difficulty === 'all' ? '전체' : roomState.difficulty})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {roomState?.status === 'playing' && (
              /* ----------------- [B] 실시간 문제 출제 및 타이머 ----------------- */
              <motion.div
                key="playing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* 퀴즈 왼쪽: 대목 질문 및 오지선다 */}
                <div className="md:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-zinc-100 pb-3">
                    <span className="bg-[#005BAC] text-white border-2 border-zinc-900 px-3 py-1 text-xs font-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      대목 {roomState.currentIndex + 1} / {roomState.questions.length}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-zinc-650">{getTopicLabel(roomState.topic)}</span>
                      <span className="text-zinc-300 font-extrabold">|</span>
                      {getDifficultyBadge(roomState.difficulty)}
                    </div>
                  </div>

                  {/* Question Stat */}
                  <h3 className="font-serif text-lg sm:text-2xl font-black text-zinc-900 leading-relaxed font-bold">
                    {roomState.questions[roomState.currentIndex]?.question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-4 pt-1">
                    {roomState.questions[roomState.currentIndex]?.options.map((opt: string, idx: number) => {
                      const localPlayer = roomState.players.find(p => p.id === localClientId);
                      const isSubmitted = localPlayer?.answered;
                      
                      let btnStyle = `border-2 border-zinc-900 hover:translate-y-[-2px] transition-all cursor-pointer font-bold ${
                        idx === 0 ? 'hover:bg-amber-50/50 shadow-[4px_4px_0px_0px_rgba(0,91,172,1)]' :
                        idx === 1 ? 'hover:bg-amber-50/50 shadow-[4px_4px_0px_0px_rgba(227,6,19,1)]' :
                        idx === 2 ? 'hover:bg-amber-50/50 shadow-[4px_4px_0px_0px_rgba(255,215,0,1)]' :
                        'hover:bg-amber-50/50 shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]'
                      }`;

                      // Handle selected answers
                      if (localAnswerSelected === idx) {
                        btnStyle = 'border-4 border-zinc-900 bg-amber-100 font-black ring-2 ring-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]';
                      }

                      // If submitted
                      if (isSubmitted) {
                        if (localAnswerSelected === idx) {
                          btnStyle = 'border-4 border-zinc-500 bg-zinc-100 text-zinc-700 opacity-80 cursor-not-allowed shadow-none translate-y-0';
                        } else {
                          btnStyle = 'border-2 border-zinc-200 bg-zinc-50 opacity-40 cursor-not-allowed shadow-none translate-y-0';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isSubmitted}
                          className={`w-full text-left p-4 rounded-xl text-sm sm:text-base flex items-center justify-between gap-4 transition-all focus:outline-hidden ${btnStyle}`}
                        >
                          <span>
                            <span className="font-mono mr-3 font-black text-zinc-900 text-lg">{idx + 1}.</span>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission control */}
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-dashed border-zinc-200">
                    <span className="text-[10.5px] text-zinc-500 font-bold font-serif leading-tight">
                      * 정답을 짚은 후 '제출하기'를 누르면, 남은 시간 몫만큼 보너스 획득이 증가합니다!
                    </span>
                    
                    {roomState.players.find(p => p.id === localClientId)?.answered ? (
                      <span className="bg-zinc-100 text-zinc-500 border-2 border-zinc-300 px-4 py-2 text-xs font-black rounded-lg">
                        제출 완료!대조 대기 중...
                      </span>
                    ) : (
                      <button
                        onClick={submitAnswer}
                        disabled={localAnswerSelected === null}
                        className={`px-5 py-2.5 text-xs font-black rounded-xl border-2 border-zinc-900 transition-all ${
                          localAnswerSelected === null
                            ? 'bg-zinc-100 text-zinc-450 cursor-not-allowed shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-[#FFD700] hover:bg-amber-400 text-zinc-950 hover:translate-y-[-2px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                        }`}
                      >
                        답란 동인 제출하기
                      </button>
                    )}
                  </div>
                </div>

                {/* 퀴즈 오른쪽: 타이머 및 다른 참가자 제출 스태프 */}
                <div className="md:col-span-4 space-y-6">
                  {/* Countdown graphic board */}
                  <div className="bg-white border-4 border-zinc-900 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1.5 bg-[#E30613] transition-all duration-1000" style={{ width: `${(roomState.timer / roomState.maxTimer) * 100}%` }}></div>
                    <span className="text-[10px] font-black text-rose-700 tracking-widest block uppercase">남은 시각 (TIMER)</span>
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className={`w-6 h-6 ${roomState.timer <= 5 ? 'text-[#E30613] animate-ping' : 'text-zinc-700'}`} />
                      <span className={`font-mono text-4xl sm:text-5xl font-black ${roomState.timer <= 5 ? 'text-[#E30613]' : 'text-zinc-950'}`}>
                        {roomState.timer}
                      </span>
                      <span className="text-zinc-400 font-bold text-xs self-end pb-1">초</span>
                    </div>
                  </div>

                  {/* Submission status for other players */}
                  <div className="bg-white border-4 border-zinc-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                    <div className="border-b-2 border-zinc-900 pb-1.5 text-xs font-black text-zinc-800 flex justify-between items-center">
                      <span>실시간 답지 제출 장부</span>
                      <span className="text-[#005BAC] bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        {roomState.players.filter(p => p.answered).length} / {roomState.players.length} 완료
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {roomState.players.map((plyr) => (
                        <div key={plyr.id} className="flex justify-between items-center text-xs text-zinc-700 border-b border-zinc-100 pb-1.5">
                          <span className="truncate font-bold font-serif">{plyr.nickname}</span>
                          {plyr.answered ? (
                            <span className="text-emerald-600 font-black flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                              <Check className="w-3" /> 완료
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-bold flex items-center gap-0.5 italic text-[10px]">
                              생각 중...
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {roomState?.status === 'revealing' && (
              /* ----------------- [C] 정답 및 심층 해설, 매칭 순위 공개 ----------------- */
              <motion.div
                key="revealing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* 퀴즈 왼쪽: 결과 해설 보드 */}
                <div className="md:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border-4 border-zinc-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                  {/* Status header */}
                  <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-zinc-100 pb-3">
                    <div className="flex items-center gap-1.5 text-sm font-black text-[#E30613]">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>이번 대목 주파 결과</span>
                    </div>
                    <span className="bg-[#005BAC] text-white border-2 border-zinc-900 px-3 py-1 text-xs font-black rounded-lg">
                      대목 {roomState.currentIndex + 1} / {roomState.questions.length}
                    </span>
                  </div>

                  {/* Explanatory text */}
                  <div className="space-y-4">
                    <h3 className="font-serif text-lg sm:text-2xl font-black text-zinc-900 leading-relaxed font-bold">
                      {roomState.questions[roomState.currentIndex]?.question}
                    </h3>

                    {/* Result for local player */}
                    {(() => {
                      const me = roomState.players.find(p => p.id === localClientId);
                      const isCorrect = me?.answerHistory[roomState.currentIndex]?.isCorrect;
                      const selAnswerIdx = me?.selectedAnswer;
                      const correctIdx = roomState.questions[roomState.currentIndex]?.correctAnswer;

                      return (
                        <div className={`p-4 border-4 rounded-2xl flex items-start gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950' 
                            : 'bg-rose-50 border-rose-500 text-rose-950'
                        }`}>
                          {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
                          )}
                          <div>
                            <span className="font-sans text-xs font-black uppercase tracking-wider block">
                              {isCorrect ? '장원 급제! (정답이외다)' : '안타깝소! (오답이외다)'}
                            </span>
                            <p className="font-serif text-sm font-bold mt-1 leading-relaxed">
                              {isCorrect 
                                ? '아름다운 우리 고유 율장의 해법을 정확히 꿰뚫었소. 보너스 점수까지 두둑이 얹었네!'
                                : `자네는 ${selAnswerIdx !== undefined ? selAnswerIdx as number + 1 : '무응'}번지 율명을 짚었으나, 훈장님이 판정하신 정답은 정확히 [ ${correctIdx + 1}번. ${roomState.questions[roomState.currentIndex]?.options[correctIdx]} ] 이라네.`}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Core standard explanation */}
                    <div className="p-5 rounded-2xl border-2 border-[#005BAC] bg-[#FDFBF7] text-xs sm:text-sm text-zinc-900 leading-relaxed font-serif font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
                      <span className="font-sans text-xs font-black text-[#005BAC] block">📖 훈장님의 심층 가락 해설</span>
                      <p>{roomState.questions[roomState.currentIndex]?.explanation}</p>
                    </div>
                  </div>

                  {/* Controller */}
                  {roomState.players.find(p => p.id === localClientId)?.isHost && (
                    <div className="pt-4 border-t border-dashed border-zinc-200 text-right">
                      <button
                        onClick={handleNextQuestion}
                        className="border-2 border-zinc-900 bg-[#E30613] hover:bg-[#c20510] text-white px-6 py-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] ml-auto cursor-pointer"
                      >
                        {roomState.currentIndex + 1 === roomState.questions.length ? '최종 결과 발표회' : '다음 문제 출제하세'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 퀴즈 오른쪽: 이탈 점수 판 (Leaderboard for this room) */}
                <div className="md:col-span-4 space-y-6">
                  <div className="bg-white border-4 border-zinc-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="border-b-2 border-zinc-900 pb-2 text-xs font-black text-zinc-850 flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-[#FFD700]" />
                        <span>과거시험 중간 품평회</span>
                      </span>
                    </div>

                    {/* Leaderboard sorted list */}
                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                      {[...roomState.players]
                        .sort((a, b) => b.score - a.score)
                        .map((plyr, rankIdx) => {
                          const isLead = rankIdx === 0;
                          const answerLog = plyr.answerHistory[roomState.currentIndex];
                          const isCorrect = answerLog?.isCorrect;

                          return (
                            <div
                              key={plyr.id}
                              className={`p-2.5 border-2 border-zinc-900 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                                plyr.id === localClientId
                                  ? 'bg-amber-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate pr-1">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  rankIdx === 0 ? 'bg-[#FFD700] text-zinc-900' :
                                  rankIdx === 1 ? 'bg-zinc-200 text-zinc-800' :
                                  rankIdx === 2 ? 'bg-orange-100 text-orange-900' :
                                  'bg-zinc-100 text-zinc-500'
                                }`}>
                                  {rankIdx + 1}
                                </span>
                                <span className="truncate max-w-24 text-zinc-900 font-serif">{plyr.nickname}</span>
                                {plyr.streak > 1 && (
                                  <span className="text-[9px] bg-rose-100 text-[#E30613] px-1 rounded animate-pulse">
                                    {plyr.streak}연승
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`text-[9px] font-black rounded px-1 ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? '맞음' : '틀림'}
                                </span>
                                <span className="font-mono text-xs text-zinc-950">{plyr.score}점</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {roomState?.status === 'finished' && (
              /* ----------------- [D] 장원 급제 시상대 및 최종 점수판 ----------------- */
              <motion.div
                key="finished"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[32px] p-6 sm:p-10 border-4 border-zinc-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-8 relative overflow-hidden"
              >
                {/* Traditional colorful ribbon headers */}
                <div className="absolute top-0 left-0 w-full h-3 flex">
                  <div className="bg-[#005BAC] flex-1 h-full"></div>
                  <div className="bg-[#E30613] flex-1 h-full"></div>
                  <div className="bg-[#FFD700] flex-1 h-full"></div>
                  <div className="bg-[#10B981] flex-1 h-full"></div>
                </div>

                <div className="text-center space-y-2">
                  <div className="inline-block p-4 bg-[#FFD700] border-4 border-zinc-900 rounded-full text-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <h2 className="font-sans text-3xl font-black text-zinc-900">쾌재라! 과거 경연의 장이 막을 내렸소</h2>
                  <p className="text-zinc-650 font-serif text-xs sm:text-sm font-bold">
                    모든 과거 관문을 정정당당하게 전수한 학도들을 기리며, 오정방 최종 승자를 발표합니다!
                  </p>
                </div>

                {/* PODIUM SCHOLARS DISPLAY - Top 1, 2, 3 */}
                {(() => {
                  const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
                  const first = sorted[0];
                  const second = sorted[1];
                  const third = sorted[2];

                  return (
                    <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 pt-6 pb-2 max-w-xl mx-auto border-b-2 border-dashed border-zinc-200">
                      
                      {/* 2nd Place: Silver */}
                      {second && (
                        <div className="w-full sm:w-1/3 flex flex-col items-center order-2 sm:order-1 mt-4 sm:mt-0">
                          <span className="text-[10px] text-zinc-400 font-bold">방안 (2등)</span>
                          <div className="w-12 h-12 rounded-full border-2 border-zinc-900 bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            🥈
                          </div>
                          <span className="text-xs font-bold font-serif truncate mt-2 max-w-28 text-zinc-900">{second.nickname}</span>
                          <span className="font-mono text-xs font-black text-zinc-600">{second.score} 점</span>
                          {/* Podium platform */}
                          <div className="w-32 bg-zinc-100 border-2 border-zinc-900 h-10 mt-1.5 rounded-t-xl flex items-center justify-center font-black text-zinc-500">
                            II
                          </div>
                        </div>
                      )}

                      {/* 1st Place: Gold Crown */}
                      {first && (
                        <div className="w-full sm:w-1/3 flex flex-col items-center order-1 sm:order-2">
                          <Crown className="w-6 h-6 text-[#FFD700] fill-[#FFD700] stroke-zinc-900 stroke-2 animate-bounce" />
                          <span className="text-xs text-rose-600 font-black">장원급제 (1등)</span>
                          <div className="w-16 h-16 rounded-full border-4 border-zinc-900 bg-[#FFD700] flex items-center justify-center font-bold text-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            👑
                          </div>
                          <span className="text-sm font-black font-serif truncate mt-2 max-w-28 text-zinc-900">{first.nickname}</span>
                          <span className="font-mono text-sm font-black text-[#E30613]">{first.score} 점</span>
                          {/* Podium platform */}
                          <div className="w-36 bg-[#FFD700]/30 border-4 border-zinc-900 h-16 mt-1.5 rounded-t-xl flex flex-col items-center justify-center font-black text-zinc-900">
                            <span>I</span>
                            <span className="text-[9px] font-sans font-black tracking-widest text-[#E30613]">CHAMPION</span>
                          </div>
                        </div>
                      )}

                      {/* 3rd Place: Bronze */}
                      {third && (
                        <div className="w-full sm:w-1/3 flex flex-col items-center order-3">
                          <span className="text-[10px] text-orange-600 font-bold">탐화 (3등)</span>
                          <div className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-orange-100 flex items-center justify-center font-bold text-orange-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            🥉
                          </div>
                          <span className="text-xs font-bold font-serif truncate mt-2 max-w-28 text-zinc-900">{third.nickname}</span>
                          <span className="font-mono text-xs font-black text-orange-850">{third.score} 점</span>
                          {/* Podium platform */}
                          <div className="w-32 bg-orange-150/20 border-2 border-zinc-900 h-8 mt-1.5 rounded-t-xl flex items-center justify-center font-black text-orange-800">
                            III
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* COMPLETE LIST leaderboard including connectivity stats */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-bold text-sm text-zinc-800 text-left">참가 유생 총괄 성적부</h4>
                  <div className="space-y-2.5 max-w-2xl mx-auto">
                    {[...roomState.players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, index) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-3.5 border-2 border-zinc-900 rounded-xl text-xs font-bold ${
                            p.id === localClientId
                              ? 'bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-zinc-400 w-4">#{index + 1}</span>
                            <span className="font-serif text-sm text-zinc-900">{p.nickname}</span>
                            {p.id === localClientId && <span className="text-[9px] text-[#005BAC]">(나)</span>}
                          </div>
                          <div className="flex items-center gap-4 text-zinc-650">
                            <div className="text-[10.5px]">
                              성공 {Object.values(p.answerHistory).filter((h: any) => h?.isCorrect).length}문 / 총 {roomState.questions.length}문
                            </div>
                            <span className="font-mono text-zinc-950 font-black">{p.score} 점</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Back to normal settings button */}
                <div className="pt-6 border-t border-dashed border-zinc-200 flex justify-center">
                  <button
                    onClick={handleLeaveRoom}
                    className="bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-900 px-6 py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    새 과거시험 마당으로 돌아가기
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
