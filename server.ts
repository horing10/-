/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { curatedQuizQuestions } from "./src/data/quizQuestions";

dotenv.config();

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    // We check if API key exists. If not, the server will not crash immediately
    // but endpoints will return a clear message prompting setup.
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ============================================================================
// REAL-TIME MULTIPLAYER QUIZ ROOM STATE ENGINE
// ============================================================================

interface MultiplayerPlayer {
  id: string; // client temporary ID
  nickname: string;
  score: number;
  isHost: boolean;
  selectedAnswer: number | null;
  timeTaken: number;
  answered: boolean;
  answerHistory: { [key: number]: { isCorrect: boolean; selected: number } };
  connected: boolean;
  streak: number;
}

interface MultiplayerRoom {
  id: string;
  topic: string;
  difficulty: string;
  questions: any[];
  players: { [id: string]: MultiplayerPlayer };
  status: 'lobby' | 'playing' | 'revealing' | 'finished';
  currentIndex: number;
  timer: number;
  maxTimer: number;
  timerInterval: NodeJS.Timeout | null;
  useAi: boolean;
}

const rooms: { [id: string]: MultiplayerRoom } = {};
const connectedClients = new Map<string, any>(); // Map clientId -> WebSocket client
const clientRooms = new Map<string, string>();   // Map clientId -> roomId

// Retrieve batch of quiz questions using server-side Gemini
async function generateAIBatchQuestions(topic: string, difficulty: string, count: number): Promise<any[]> {
  try {
    const ai = getAI();
    const topicQuery = topic ? `Gugak topic: "${topic}"` : "random interesting Gugak topics";
    const difficultyQuery = difficulty ? `difficulty: "${difficulty}"` : "medium";

    const prompt = `Generate a list of exactly ${count} educational multiple-choice quiz questions in Korean about Korean Traditional Music (국악 - Gugak).
Requirements:
1. Topic filter: ${topicQuery}
2. Difficulty: ${difficultyQuery}
3. Correct answers must be strictly accurate.
4. Output must be a JSON array of objects fitting the schema below.
5. High quality, clear polite native Korean language.

Format your output as a single JSON array containing objects with these keys:
- topic (one of: 'instrument', 'theory', 'genre', 'history', 'general')
- question (string, polite)
- options (array of exactly 4 strings)
- correctAnswer (integer, 0 to 3)
- explanation (string)
- difficulty (one of: 'easy', 'medium', 'hard')
- hint (string)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["topic", "question", "options", "correctAnswer", "explanation", "difficulty", "hint"]
          }
        }
      }
    });

    const list = JSON.parse(response.text?.trim() || "[]");
    return list.map((q: any, idx: number) => ({
      ...q,
      id: `ai-multi-${idx}-${Math.random().toString(36).substr(2, 5)}`
    }));
  } catch (err) {
    console.error("AI batch questions generation failed, falling back to curated library:", err);
    return getCuratedFallbackQuestions(topic, difficulty, count);
  }
}

// Fallback logic inside server to extract standard curated questions
function getCuratedFallbackQuestions(topic: string, difficulty: string, count: number): any[] {
  let filtered = [...curatedQuizQuestions];
  if (topic && topic !== 'all') {
    filtered = filtered.filter(q => q.topic === topic);
  }
  if (difficulty && difficulty !== 'all') {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  if (filtered.length === 0) {
    filtered = [...curatedQuizQuestions];
  }
  
  // Shuffle questions randomly
  filtered.sort(() => Math.random() - 0.5);
  return filtered.slice(0, count);
}

// Sanitization and cheat prevention: hide correctAnswer when 'playing'
function broadcastRoomState(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const sanitizedQuestions = room.questions.map((q, idx) => {
    if (room.status === 'playing' && idx === room.currentIndex) {
      // Strips correctAnswer and explanation in payload to make it absolutely secure!
      const { correctAnswer, explanation, ...rest } = q;
      return rest;
    }
    return q;
  });

  const statePayload = {
    id: room.id,
    topic: room.topic,
    difficulty: room.difficulty,
    questions: sanitizedQuestions,
    status: room.status,
    currentIndex: room.currentIndex,
    timer: room.timer,
    maxTimer: room.maxTimer,
    useAi: room.useAi,
    players: Object.entries(room.players).map(([id, p]) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
      answered: p.answered,
      selectedAnswer: room.status === 'revealing' || room.status === 'finished' ? p.selectedAnswer : (p.selectedAnswer !== null), // Boolean value to client while playing
      answerHistory: p.answerHistory,
      streak: p.streak
    }))
  };

  const message = JSON.stringify({
    type: "ROOM_STATE",
    payload: statePayload
  });

  // Broadcast
  for (const pId in room.players) {
    const ws = connectedClients.get(pId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  }
}

// Countdown timer loop
function startTimerCountdown(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timerInterval = setInterval(() => {
    const activeRoom = rooms[roomId];
    if (!activeRoom || activeRoom.status !== 'playing') {
      if (activeRoom && activeRoom.timerInterval) {
        clearInterval(activeRoom.timerInterval);
        activeRoom.timerInterval = null;
      }
      return;
    }

    activeRoom.timer -= 1;

    // Tick signal for ticking client effects (optional)
    if (activeRoom.timer <= 0) {
      clearInterval(activeRoom.timerInterval);
      activeRoom.timerInterval = null;
      activeRoom.status = 'revealing';
    }

    broadcastRoomState(roomId);
  }, 1000);
}

// Handle player exit
function handleClientDisconnect(clientId: string) {
  const roomId = clientRooms.get(clientId);
  if (!roomId) return;

  const room = rooms[roomId];
  if (!room) return;

  const player = room.players[clientId];
  if (player) {
    player.connected = false;

    const anyConnected = Object.values(room.players).some(p => p.connected);
    if (!anyConnected) {
      // Clean room completely if nobody remains
      setTimeout(() => {
        const cleanupRoom = rooms[roomId];
        if (cleanupRoom && !Object.values(cleanupRoom.players).some(p => p.connected)) {
          if (cleanupRoom.timerInterval) {
            clearInterval(cleanupRoom.timerInterval);
          }
          delete rooms[roomId];
          console.log(`[국악 퀴즈 서버] 빈 대결방 ${roomId} 정리를 완료하게나.`);
        }
      }, 30000);
    } else if (player.isHost) {
      // Reassign host instantly to other active participant
      const activePlayers = Object.values(room.players).filter(p => p.connected);
      if (activePlayers.length > 0) {
        activePlayers[0].isHost = true;
        player.isHost = false;
        console.log(`[국악 퀴즈 서버] 방장 연결이 끊겨 새로운 방장(${activePlayers[0].nickname})을 위촉하였네.`);
      }
    }
  }

  clientRooms.delete(clientId);
  broadcastRoomState(roomId);
}

// Websocket logic
function initializeWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    // Upgrade standard path
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: any) => {
    const clientId = "client-" + Math.random().toString(36).substring(2, 11);
    connectedClients.set(clientId, ws);

    ws.on('message', async (messageStr: string) => {
      try {
        const msg = JSON.parse(messageStr);
        const { type, payload } = msg;

        switch (type) {
          case 'CREATE_ROOM': {
            const { topic, difficulty, nickname, numQuestions, useAi } = payload;
            const roomId = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4-char catchy ID

            let questions: any[] = [];
            if (useAi) {
              questions = await generateAIBatchQuestions(topic, difficulty, numQuestions || 5);
            } else {
              questions = getCuratedFallbackQuestions(topic, difficulty, numQuestions || 5);
            }

            const newRoom: MultiplayerRoom = {
              id: roomId,
              topic: topic || 'all',
              difficulty: difficulty || 'all',
              questions,
              players: {},
              status: 'lobby',
              currentIndex: 0,
              timer: 20,
              maxTimer: 20,
              timerInterval: null,
              useAi: !!useAi
            };

            newRoom.players[clientId] = {
              id: clientId,
              nickname: nickname ? nickname.trim().substring(0, 8) : "명리",
              score: 0,
              isHost: true,
              selectedAnswer: null,
              timeTaken: 0,
              answered: false,
              answerHistory: {},
              connected: true,
              streak: 0
            };

            rooms[roomId] = newRoom;
            clientRooms.set(clientId, roomId);

            broadcastRoomState(roomId);
            break;
          }

          case 'JOIN_ROOM': {
            const { roomId, nickname } = payload;
            const targetId = roomId ? roomId.trim().toUpperCase() : '';
            const room = rooms[targetId];

            if (!room) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: '존재하지 않거나 기한이 만료된 국악 방(Room)입니다.' }
              }));
              return;
            }

            if (room.status !== 'lobby') {
              ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: '이미 과거시험 경연이 시작되어 참여할 수 없다네.' }
              }));
              return;
            }

            let name = nickname ? nickname.trim().substring(0, 8) : "풍류객";
            const exists = Object.values(room.players).some(p => p.nickname === name);
            if (exists) {
              name = `${name}_${Math.floor(Math.random() * 90) + 10}`;
            }

            room.players[clientId] = {
              id: clientId,
              nickname: name,
              score: 0,
              isHost: false,
              selectedAnswer: null,
              timeTaken: 0,
              answered: false,
              answerHistory: {},
              connected: true,
              streak: 0
            };

            clientRooms.set(clientId, targetId);
            broadcastRoomState(targetId);
            break;
          }

          case 'START_QUIZ': {
            const roomId = clientRooms.get(clientId);
            if (!roomId) return;
            const room = rooms[roomId];
            if (!room || room.status !== 'lobby') return;

            const self = room.players[clientId];
            if (!self || !self.isHost) return;

            room.status = 'playing';
            room.currentIndex = 0;
            room.timer = 20;

            startTimerCountdown(roomId);
            broadcastRoomState(roomId);
            break;
          }

          case 'SUBMIT_ANSWER': {
            const roomId = clientRooms.get(clientId);
            if (!roomId) return;
            const room = rooms[roomId];
            if (!room || room.status !== 'playing') return;

            const player = room.players[clientId];
            if (!player || player.answered) return;

            const { answerIndex, timeTaken } = payload;
            const currentQuestion = room.questions[room.currentIndex];
            const isCorrect = answerIndex === currentQuestion.correctAnswer;

            player.selectedAnswer = answerIndex;
            player.answered = true;
            player.timeTaken = timeTaken || 0;

            let points = 0;
            if (isCorrect) {
              player.streak += 1;
              // Points based on remaining timer seconds (out of 20)
              const speedBonus = Math.max(0, Math.min(500, Math.round((room.timer / 20) * 500)));
              const streakBonus = Math.min(150, player.streak * 30);
              points = 500 + speedBonus + streakBonus;
              player.score += points;
            } else {
              player.streak = 0;
            }

            player.answerHistory[room.currentIndex] = {
              isCorrect,
              selected: answerIndex
            };

            // Calculate if EVERY active joined participant (excl. spectator hosts or hosts with mock play) has answered
            const activeJoinedPlayers = Object.values(room.players).filter(p => p.connected && !p.isHost);
            const allAnswered = activeJoinedPlayers.length > 0
              ? activeJoinedPlayers.every(p => p.answered)
              : Object.values(room.players).filter(p => p.connected).every(p => p.answered);

            if (allAnswered) {
              if (room.timerInterval) {
                clearInterval(room.timerInterval);
                room.timerInterval = null;
              }
              room.status = 'revealing';
            }

            broadcastRoomState(roomId);
            break;
          }

          case 'NEXT_QUESTION': {
            const roomId = clientRooms.get(clientId);
            if (!roomId) return;
            const room = rooms[roomId];
            if (!room) return;

            const self = room.players[clientId];
            if (!self || !self.isHost) return;

            if (room.status === 'revealing') {
              if (room.currentIndex + 1 < room.questions.length) {
                room.currentIndex += 1;
                room.status = 'playing';
                room.timer = 20;

                // Reset answer variables
                for (const pId in room.players) {
                  room.players[pId].answered = false;
                  room.players[pId].selectedAnswer = null;
                  room.players[pId].timeTaken = 0;
                }

                startTimerCountdown(roomId);
              } else {
                room.status = 'finished';
                if (room.timerInterval) {
                  clearInterval(room.timerInterval);
                  room.timerInterval = null;
                }
              }
              broadcastRoomState(roomId);
            }
            break;
          }

          case 'LEAVE_ROOM': {
            handleClientDisconnect(clientId);
            break;
          }
        }
      } catch (err) {
        console.error("WS connection processing error:", err);
      }
    });

    ws.on('close', () => {
      handleClientDisconnect(clientId);
      connectedClients.delete(clientId);
    });
  });
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API health and configuration checker
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    time: new Date().toISOString()
  });
});

// Endpoint: AI-Generated Gugak quiz question
app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { topic, difficulty, type: requestedType } = req.body;
    const ai = getAI();

    const topicQuery = topic ? `Gugak topic: "${topic}" (could be instrument, theory, genre, history, or general)` : "a random interesting Gugak (Korean traditional music) topic";
    const difficultyQuery = difficulty ? `difficulty: "${difficulty}"` : "medium";

    const typeQuery = requestedType && requestedType !== 'all'
      ? `You MUST generate a question of type: "${requestedType}".`
      : `You can freely choose to generate any of the three question types: 'multiple_choice' (standard 4 choices), 'visual' (instrument identification based on description of its physical visual parts), or 'matching' (matching 4 traditional terms/concepts to their definitions). Please vary the selected type frequently!`;

    const prompt = `Generate a high-quality, educational, and authentic Korean Traditional Music (국악 - Gugak) quiz question in Korean.
Requirements:
1. Topic should match: ${topicQuery}
2. Difficulty should match: ${difficultyQuery}
3. Question Type should conform to: ${typeQuery}
4. Explanation and Correct answer must be exactly correct and historically verified.
5. Output must strictly conform to the JSON schema.
6. All texts, options, explanations, and hints must be in polite, native and warm Korean language using traditional scholar style ("~라네", "~하오", "~라오" or polite 하오체/하십시오체).
7. Do not include duplicate questions resembling basic common sense. Look into authentic Gugak theory, instrument details (like Gayageum strings/Anjok, Daegeum cheong, Geomungo Suldae/Gwae, Haegeum 2 strings/Wonsan, Janggu Gungpyeon/Chaepyeon), historical records (Sejong, King Gasil, Wang San-ak, Manpaksikjeok), or traditional genres (Pansori, Jongmyo Jeryeak, Semachi rhythm, Shinawi, Sanjo, Gagok).

Specifically for each type:
- If type is 'multiple_choice': 'options' must contain exactly 4 text options, 'correctAnswer' must be the index of correct option (0-3). 'matchingPairs' and 'instrumentId' can be left null/unused.
- If type is 'visual': 'instrumentId' must be one of 'gayageum', 'geomungo', 'haegeum', or 'janggu'. State what the visual features are in the question (e.g. 12 strings, 2 strings with bow, or hourglass shape). 'options' must contain 4 instruments, and 'correctAnswer' is the index of the correct instrument option.
- If type is 'matching': 'options' must be an empty array [], 'correctAnswer' must be 99. 'matchingPairs' must contain exactly 4 logical conceptual pairs (each with 'left' name and 'right' explanation text).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.STRING,
              description: "Must be one of: 'instrument', 'theory', 'genre', 'history', 'general'"
            },
            type: {
              type: Type.STRING,
              description: "Must be one of: 'multiple_choice', 'visual', 'matching'"
            },
            instrumentId: {
              type: Type.STRING,
              description: "For 'visual' type only, must select which instrument to display illustration for: 'gayageum', 'geomungo', 'haegeum', 'janggu'"
            },
            matchingPairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  left: { type: Type.STRING, description: "Gugak term/concept, e.g., '산조', '대금'" },
                  right: { type: Type.STRING, description: "Its corresponding correct explanation or matching pair text" }
                },
                required: ["left", "right"]
              },
              description: "For 'matching' type only. Exactly 4 pairs."
            },
            question: {
              type: Type.STRING,
              description: "Detailed quiz question in polite Korean (e.g. 존댓말)"
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "For 'multiple_choice' and 'visual' types: exactly 4 multiple choice options. For 'matching' type: must be an empty array []"
            },
            correctAnswer: {
              type: Type.INTEGER,
              description: "For 'multiple_choice' and 'visual' types: 0-based index of the correct option (0-3). For 'matching' type: must be 99"
            },
            explanation: {
              type: Type.STRING,
              description: "Thorough, educational explanation of the answer in Korean"
            },
            difficulty: {
              type: Type.STRING,
              description: "One of: 'easy', 'medium', 'hard'"
            },
            hint: {
              type: Type.STRING,
              description: "A friendly hint to help the user guess the answer in Korean"
            }
          },
          required: ["topic", "type", "question", "options", "correctAnswer", "explanation", "difficulty", "hint"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "";
    const questionData = JSON.parse(jsonStr);
    
    // Assign a random ID
    questionData.id = "ai-" + Math.random().toString(36).substr(2, 9);
    res.json(questionData);
  } catch (error: any) {
    console.error("Quiz generation failed:", error);
    res.status(500).json({
      error: "AI 퀴즈 생성에 실패했습니다.",
      details: error.message
    });
  }
});

// Endpoint: AI Master Detailed Explanation
app.post("/api/quiz/explain", async (req, res) => {
  try {
    const { question, options, selectedAnswer, correctAnswer, originalExplanation } = req.body;
    const ai = getAI();

    const isCorrect = selectedAnswer === correctAnswer;

    const prompt = `You are "국악 훈장님" (AI Gugak Scholar), a warm, wise, and enthusiastic master of Korean Traditional Music.
A user just took a quiz question:
Question: "${question}"
Options: ${JSON.stringify(options)}
User selected Option Index: ${selectedAnswer} (Option: "${options[selectedAnswer] || "None"}")
Correct Option Index: ${correctAnswer} (Option: "${options[correctAnswer]}")
Standard Explanation: "${originalExplanation}"

Write a lively, polite, and deeply educational response in Korean (전통 서당 훈장님 말투, e.g., '~라네', '~하였소', '~라오', etc., but extremely friendly and encouraging, not intimidating).
Include:
1. Enthusiastic feedback (Did they get it right? Cheer for them! If they got it wrong, gently comfort then explain the mystery).
2. Deep Scholarly Insights: Explain *why* the correct answer is correct. Go beyond standard textbooks to share some historical context, how the instrument is handcrafted, or how the rhythm feels in real performances.
3. Keep it to 3-4 structured, delightful paragraphs. Use clean formatting. Do not output JSON. Just output pure Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Explanation generation failed:", error);
    res.status(500).json({
      error: "AI 훈장님의 심층 해설 발급에 실패했습니다.",
      details: error.message
    });
  }
});

// Endpoint: Ask AI Master Anything about Gugak
app.post("/api/gugak/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = getAI();

    // Reconstruct system instruction and history
    const systemInstruction = `You are "국악 훈장님" (AI Gugak Master / Seodang Scholar), an elderly, warm-hearted, and incredibly knowledgeable traditional teacher.
You live in a digital Hanok school and have dedicated your entire life to practicing, researching, and teaching Gugak (Korean Traditional Music).
Tone:
1. Warm, kind, grandfatherly, and wise.
2. Use refined, playful, and scholarly traditional Korean speech forms (e.g., 하오체, 하게체, or ~라네, ~했소, ~라오, ~하게나, 에헴! etc.). 
3. You can use mild onomatopoeias like "에헴...", "허허허!", "그렇고 말고!" to breathe life into your character.
4. You are very passionate about Gugak. If users ask about Western instruments or non-Gugak topics, politely guide them back to traditional music, saying something like "그것도 신비한 서양의 가락이기는 하다만, 오늘은 우리 국악의 소리에 흥을 돋워보세나!"

Standard Factual Specifications of Traditional Korean Instruments (Crucial for Accurate Responses):
- 피리 (Piri): 지공(구멍/손가락 구멍)은 전체 "8개"라네. (뒷면에 1개, 앞면에 7개). 대나무 대(관대) 위에 갈대로 만든 겹리드인 '서(Seol, 혀)'를 끼워서 입으로 불어 소리를 낸다네. 향피리, 당피리, 세피리 등이 있다네.
- 대금 (Daegeum): 지공(손가락 구멍)은 "6개"라네. 악기 전체에는 입을 대고 바람을 넣는 "취구" 1개, 갈대 속껍질을 붙여 탈탈거리는 고유의 청아한 소리를 떨게 하는 "청공" 1개, 지공 6개, 그리고 음정을 맞추는 구멍인 "칠성공"이 1~2개 있어서 악기 전체의 구멍 수는 많지만 손가락으로 막는 지공은 정확히 "6개"라네! 가로로 비스듬히 눕혀 분다네.
- 단소 (Danso): 세로로 부는 소형 대나무 악기로, 지공은 전통적으로 뒤에 1개, 앞에 4개로 총 "5개"이지만, 실제 전통 연주 시 제5공(가장 아래 구멍)은 거의 막지 않고 열어두어 주로 4개의 구멍만 손가락으로 짚어 연주(4구멍 연주)한다네!
- 해금 (Haegeum): 세로로 들고 무릎 위에 얹어 연주하는 대표적인 찰현악기로, 오직 "2개의 명주 줄" 사이에 말총 활을 끼워 깽깽거리듯 애절한 소리를 낸다네.
- 아쟁 (Ajaeng): 바닥에 거치대를 대고 길게 눕혀 연주하는 찰현악기로, 정악 아쟁은 전통적으로 "7줄", 산조 아쟁은 주로 "8줄"이라네. 나무대(소나무 활기)나 말총 활로 명주 줄을 비벼 묵직하고 장엄한 저음을 뽑아낸다네.
- 가야금 (Gayageum): 부드러운 안족(기러기발)으로 줄을 받쳐 손가락 끝으로 뜯어 소리를 내는 수평 발현악기라네. 풍류가야금과 산조가야금둘 다 전통적인 현의 개수는 정확히 "12줄(12현)"이라네! 개량가야금은 18현, 25현 등 다양하다네.
- 거문고 (Geomungo): 고구려의 왕산악이 창제하였으며 극단적인 남성적이고 깊고 장중한 울림을 주는 수평 현악기라네. 줄은 가야금과 달리 정확히 "6줄(6현)"이 있고, 고정된 나무 받침돌인 "괘(16개)"와 기러기발 모양의 "안족(3개)"을 함께 사용한다네. 오른손에는 가는 대나무 대인 '술대'를 꼭 쥐어 묵직하게 줄을 내려쳐 연주한다네.
- 소금 (Sogeum): 가로로 부는 고음의 얇은 대나무 피리로 지공은 "6개"가 있다네.
- 생황 (Saeghwang): 아악(궁중음악)에 주로 쓰이는 신비로운 관악기로, 전통적으로 오동나무나 금속(원래는 박바가지인 포, 匏)으로 만든 울림통 주위에 대나무 관을 세로로 "17개(17관)" 꽂아서 만든다네. 요즘 현대에는 음역대를 넓히고 다양한 전조 연주를 소화하기 위해 "24관"부터 "36관", "38관"에 이르는 다채로운 개량 생황도 널리 연구되어 쓰인다네. 국악기 중 **"유일하게 화음(여러 음을 동시에 짚어 소리 냄)을 연주할 수 있는 화음 관악기"**라네. 또한 들숨(들이쉬는 숨)과 날숨(내쉬는 숨) 모두 소리를 낼 수 있는 신묘한 악기로, 피리·대금 연주자와 함께 '생소병주(생황과 단소의 이중주)'라 하여 빼어난 조화를 이룬다네.

YouTube Recommendation Guidelines:
- If a user asks for YouTube channels, music creators, videos, or references, you MUST recommend these authentic and excellent channels/videos so they can watch/hear traditional music instantly.
- Always provide the links as standard markdown format: '[채널 이름](유튜브 링크)' because our frontend will specially render them as beautiful, interactive launch buttons.
1. 국립국악원 (National Gugak Center): [국립국악원 유튜브](https://www.youtube.com/@gugak1951) (국악의 총본산. 고품격 종묘제례악부터 악기 강좌까지 전부 있다네!)
2. 국악방송 (Gugak TV): [국악방송 유튜브](https://www.youtube.com/@gugaktv) (민요, 판소리 등 다양한 무대와 특집 다큐멘터리를 송출한다네.)
3. 이날치 (LEENALCHI): [이날치 OFFICIAL](https://www.youtube.com/@leenalchiofficial) (판소리 수궁가의 "범 내려온다"로 선풍적인 퓨전 유행을 주도한 밴드라네!)
4. 악단광칠 (ADG7): [악단광칠 유튜브](https://www.youtube.com/@ADG7) (황해도 굿 음악과 민요를 파워풀하고 유쾌한 락 콘셉트로 융합한 개성파 밴드라네.)
5. 서도밴드 (sEODo BAND): [서도밴드 유튜브](https://www.youtube.com/@seodoband) (전통 국악 가락과 소울 음악을 크로스오버한 "조선팝" 창시 밴드라네.)
- Warmly encourage the user to click the links by adding phrases like "바로 가서 신선들의 풍류를 두 귀로 감상해 보시게나!".

Content limits:
- Answer everything related to Gugak (pansori, sanjo, samulnori, jeongak, traditional scales like Hwangjong, instruments like Gayageum, Haegeum, Piri, histories with King Sejong or Ureuk) with absolute factual accuracy.
- If they ask how to play, give them practical tips (gently plucking with index, breathing through daegeum cheong, etc.).
- Keep answers structured with clear paragraphs and bullet points where helpful. Give fascinating historical stories behind the music!`;

    const formattedContents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        formattedContents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      }
    }
    
    // Add current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat failed:", error);
    res.status(500).json({
      error: "훈장님과의 대화 연결에 실패했습니다.",
      details: error.message
    });
  }
});

// Vite middleware and static serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[국악 퀴즈 서버] 포트 ${PORT}에서 신명나게 기동 중... (http://localhost:${PORT})`);
  });

  initializeWebSocketServer(httpServer);
}

startServer();
