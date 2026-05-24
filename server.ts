/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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
    const { topic, difficulty } = req.body;
    const ai = getAI();

    const topicQuery = topic ? `Gugak topic: "${topic}" (could be instrument, theory, genre, history, or general)` : "a random interesting Gugak (Korean traditional music) topic";
    const difficultyQuery = difficulty ? `difficulty: "${difficulty}"` : "medium";

    const prompt = `Generate a high-quality, educational, and authentic Korean Traditional Music (국악 - Gugak) multiple-choice question in Korean.
Requirements:
1. Topic should match: ${topicQuery}
2. Difficulty should match: ${difficultyQuery}
3. Correct answer must be exactly mathematically correct and historically verified.
4. Output must strictly conform to the JSON schema.
5. All texts, options, explanations, and hints must be in polite, native and warm Korean language.
6. The explanations should be interesting, including a fun fact or details of traditional practice (Gugak terms).
7. Do not include duplicate questions resembling basic common sense. Look into authentic Gugak theory, instrument details (like Gayageum strings, Daegeum cheong, Geomungo Suldae), historical records (Sejong, King Gasil, Wang San-ak, Manpaksikjeok), or traditional genres (Pansori, Jongmyo Jeryeak, Semachi rhythm, Shinawi, Sanjo).`;

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
            question: {
              type: Type.STRING,
              description: "Detailed quiz question in polite Korean (e.g. 존댓말)"
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 4 multiple choice options"
            },
            correctAnswer: {
              type: Type.INTEGER,
              description: "0-based index of the correct option (0, 1, 2, or 3)"
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
          required: ["topic", "question", "options", "correctAnswer", "explanation", "difficulty", "hint"]
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[국악 퀴즈 서버] 포트 ${PORT}에서 신명나게 기동 중... (http://localhost:${PORT})`);
  });
}

startServer();
