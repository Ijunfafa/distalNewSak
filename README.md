# 🌾 C앗 농장 플랫폼 — 배포 가이드

## 폴더 구조
```
caat-platform/
├── server/          ← Node.js 백엔드 (Render에 배포)
│   ├── index.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── client/          ← 프론트엔드 HTML (어디서든 열기 가능)
    └── caat_smart_farm.html
```

---

## ① 로컬 테스트 (5분)

```bash
# 1. server 폴더로 이동
cd server

# 2. 패키지 설치
npm install

# 3. .env 파일 생성
cp .env.example .env
# .env 파일 열어서 ANTHROPIC_API_KEY 입력

# 4. 서버 실행
npm run dev
# → http://localhost:3001 에서 실행됨

# 5. 브라우저에서 client/caat_smart_farm.html 열기
#    (VS Code Live Server 또는 그냥 파일 열기)
```

> **주의:** client HTML 안의 `SERVER_URL`을 `http://localhost:3001`로 바꿔야 로컬 테스트 가능  
> 배포 후에는 다시 Render 주소로 바꿔주세요.

---

## ② Render 배포 (10분, 무료)

### 1단계 — GitHub 올리기

```bash
# server 폴더를 GitHub 레포지토리로 만들기
cd server
git init
git add .
git commit -m "C앗 농장 백엔드 초기 배포"
git remote add origin https://github.com/[내계정]/caat-platform-api.git
git push -u origin main
```

### 2단계 — Render 설정

1. https://render.com 접속 → 무료 계정 생성
2. **New → Web Service** 클릭
3. GitHub 레포 연결
4. 설정값 입력:

| 항목 | 값 |
|---|---|
| Name | `caat-platform-api` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

5. **Environment Variables** 탭에서 추가:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (실제 키)
   - `FRONTEND_URL` = (나중에 프론트 주소 생기면 추가)

6. **Deploy** 클릭 → 약 2~3분 후 배포 완료

배포 주소 예시: `https://caat-platform-api.onrender.com`

### 3단계 — 프론트엔드 서버 주소 업데이트

`client/caat_smart_farm.html` 파일 열어서 아래 줄 수정:

```js
// 이 줄을 찾아서
const SERVER_URL = 'https://caat-platform-api.onrender.com';

// 실제 Render 주소로 교체
const SERVER_URL = 'https://[내서비스명].onrender.com';
```

---

## ③ 자주 생기는 문제

| 문제 | 원인 | 해결 |
|---|---|---|
| 서버 첫 요청이 느림 (30초) | Render 무료 플랜 슬립 모드 | 정상. 두 번째 요청부터 빠름 |
| CORS 오류 | FRONTEND_URL 설정 안 됨 | Render 환경변수에 프론트 주소 추가 |
| 401 Unauthorized | API 키 오류 | Render 환경변수 ANTHROPIC_API_KEY 확인 |
| 센서 데이터 `--` 표시 | 서버 오프라인 | 서버 로그 확인 (Render 대시보드) |

---

## ④ 다음 개발 단계

- [ ] 씨앗코드 로그인 API 추가 (`POST /api/auth/seed-code`)
- [ ] 학생 진도 DB 저장 (Supabase 연동)
- [ ] 영농반장 강사 대시보드 페이지
- [ ] 4~12차시 콘텐츠 추가
