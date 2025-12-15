# 자동 전투 게임

NestJS 백엔드와 Next.js 프론트엔드를 사용한 자동 전투 게임입니다.

## 게임 규칙

- 1초마다 자동으로 전투가 진행됩니다.
- 유저 공격력이 몬스터 공격력보다 높으면 승리하여 다음 층으로 올라갑니다.
- 승리 시 층수만큼 골드를 획득합니다 (1층 = 1원, 100층 = 100원).
- 패배 시 1층으로 돌아갑니다.
- 몬스터는 층수에 따라 공격력과 체력이 +1, 방어력이 +0.5씩 증가합니다 (1000층까지).
- 골드를 사용하여 스탯을 업그레이드할 수 있습니다 (1원 = +1 스탯).

## 시작하기

### 백엔드 실행

```bash
cd backend
npm install
npm run start:dev
```

백엔드는 `http://localhost:3001`에서 실행됩니다.

### 프론트엔드 실행

새 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.

## 프로젝트 구조

```
ultimate/
├── backend/          # NestJS 백엔드
│   ├── src/
│   │   ├── game/    # 게임 로직 및 API
│   │   └── ...
│   └── ...
└── frontend/         # Next.js 프론트엔드
    ├── app/         # Next.js 앱 라우터
    └── ...
```

## API 엔드포인트

- `GET /game/state` - 현재 게임 상태 조회
- `POST /game/battle` - 전투 실행
- `POST /game/upgrade` - 스탯 업그레이드 (body: `{ stat: 'health' | 'attack' | 'defense' }`)
- `POST /game/reset` - 게임 리셋
