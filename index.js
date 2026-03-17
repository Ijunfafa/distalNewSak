require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── 정적 파일 서빙 (client 폴더) ───────────────────────
// https://distalnewsak.onrender.com 으로 접속하면 HTML 자동 제공
app.use(express.static(path.join(__dirname, 'client')));

// ── CORS 설정 ──────────────────────────────────────────
// 같은 서버에서 HTML을 제공하므로 CORS 전체 허용
app.use(cors());

app.use(express.json({ limit: '2mb' }));

// ── 루트 접속 시 로그인 페이지 제공 ───────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'login.html'));
});

// ── Claude API 프록시 ──────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt, lessonContext } = req.body;

  // 기본 유효성 검사
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 배열이 필요합니다.' });
  }
  if (messages.length > 30) {
    return res.status(400).json({ error: '대화 길이 초과 (최대 30턴)' });
  }

  // API 키 확인
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
  }

  // 시스템 프롬프트: 클라이언트가 보낸 것 + 차시 컨텍스트 합성
  const system = buildSystemPrompt(systemPrompt, lessonContext);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system,
        messages: messages.slice(-12), // 최근 12턴만 전송 (토큰 절약)
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      console.error('[Claude API Error]', anthropicRes.status, errBody);
      return res.status(anthropicRes.status).json({
        error: errBody?.error?.message || 'Claude API 오류',
      });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? '';

    // 사용량 로그 (선택)
    console.log(`[chat] lesson=${lessonContext?.lessonId ?? '?'} tokens=${data.usage?.input_tokens}+${data.usage?.output_tokens}`);

    res.json({ reply, usage: data.usage });

  } catch (err) {
    console.error('[Server Error]', err);
    res.status(500).json({ error: '서버 내부 오류: ' + err.message });
  }
});

// ── 시스템 프롬프트 빌더 ───────────────────────────────
function buildSystemPrompt(base, ctx) {
  const lessonInfo = ctx
    ? `\n\n== 현재 학습 컨텍스트 ==\n차시: ${ctx.lessonId}차시 — ${ctx.lessonTitle}\n단계: ${ctx.stage}\n학습 목표: ${ctx.objective}`
    : '';

  return (base || DEFAULT_SYSTEM) + lessonInfo;
}

const DEFAULT_SYSTEM = `너는 "AI 허수아비 튜터"야.
C앗 농장 플랫폼 ⑦번 프로그램 "스마트 밭 — 센서 데이터 사이언티스트" 전담 튜터.
대상: 중·고등학생 / 교구: ESP32 스마트팜 키트 / 핵심: 바이브코딩 + 농협대 실제 데이터

== 5단계 힌트 규칙 ==
코딩 질문엔 바로 답 주지 말고 단계적으로 힌트를 줘.
응답 첫 줄에 반드시 [힌트1]~[힌트5] 중 하나를 표시해.

[힌트1-방향] 어느 방향인지만 알려줘. 정답 절대 금지.
[힌트2-비유] 농사/스마트팜 비유로 개념 설명. 코드 없음.
[힌트3-구조] 코드 구조만. 값은 ___ 빈칸.
[힌트4-부분코드] 핵심 라인 일부만 공개.
[힌트5-전체] 완성 코드 + 원리 설명. 반드시 "복붙 말고 선생님께 설명해봐!" 추가.

개념 질문·바이브코딩 요청은 힌트 표시 없이 친절하게 답해.
말투: 친근하고 따뜻하게, 농사 비유 자주, 이모지 적당히.`;

// ── 센서 데이터 (농협대 시뮬레이션) ──────────────────
// 실제 서비스에서는 농협대 API 또는 DB에서 가져옴
let sensorBase = { temp: 24.3, hum: 67, soil: 42, light: 3200 };

app.get('/api/sensors', (req, res) => {
  // 실제처럼 보이도록 약간의 노이즈 추가
  const noise = (v, range) => +(v + (Math.random() - 0.5) * range).toFixed(1);
  res.json({
    source: '농협대학교 온실 (시뮬레이션)',
    timestamp: new Date().toISOString(),
    data: {
      temperature: noise(sensorBase.temp, 0.6),
      humidity:    Math.round(noise(sensorBase.hum, 3)),
      soilMoisture:Math.round(noise(sensorBase.soil, 4)),
      light:       Math.round(noise(sensorBase.light, 200)),
    },
  });
});

// ── 서버 시작 ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ C앗 농장 서버 실행 중 → http://localhost:${PORT}`);
  console.log(`   API 키 상태: ${process.env.ANTHROPIC_API_KEY ? '✓ 설정됨' : '✗ 없음 (.env 확인)'}`);
});
