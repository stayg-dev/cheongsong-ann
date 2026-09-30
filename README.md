# 청송 한옥호텔 안

React/Vite 홈페이지와 Node.js 공지 관리 서버입니다. `/admin`에서 로그인해 공지를 작성·수정·삭제하고, `/announcement`에서 공개 목록을 확인합니다. 기존 `/#/...` 링크도 새 경로로 이동합니다.

## 로컬 실행

Node.js 24 이상을 사용합니다.

```powershell
npm install
npm run setup:admin
npm run dev
```

- 홈페이지: `http://localhost:5173`
- 관리자: `http://localhost:5173/admin`
- 초기 계정: `admin` / `admin123!`
- API 서버: `http://127.0.0.1:3100`

`setup:admin`은 `.env.local`에 무작위 salt를 사용하는 scrypt 비밀번호 해시와 세션 서명키를 저장합니다. 기존 값이 있으면 유지합니다. 비밀번호를 바꾸어 초기화하려면 해시를 비운 뒤 `INITIAL_ADMIN_PASSWORD`를 설정하고 명령을 실행하세요. 비밀번호와 PMS 키는 브라우저 번들에 포함되지 않습니다. 로그인 시도 제한도 PMS API로 확인하므로 PMS 연동 키를 설정해야 로그인할 수 있습니다.

## PMS 연결

공지사항은 `브라우저 → 홈페이지 서버 → PMS API` 순서로 처리합니다. 홈페이지 서버가 관리자 세션을 확인하고 서버에 보관된 API 키를 붙여 PMS로 요청합니다. 데이터 저장과 활동 로그는 PMS가 담당합니다. 홈페이지 실행에는 DB 접속 정보나 로컬 PostgreSQL이 필요하지 않습니다.

홈페이지 `.env.local`:

```dotenv
PMS_API_BASE_URL=https://pms-api.hio.ai.kr/api
PMS_API_KEY=<PMS에 등록된 청송 공지 연동 키>
```

청송 프로젝트 ID는 `server/pms-config.mjs`의 상수 `0655428b-84be-4d1e-b194-e679a7e1f3c8`을 사용합니다. 홈페이지의 `PMS_PROJECT_ID` 환경변수는 필요하지 않습니다.

PMS 백엔드도 같은 청송 프로젝트 ID를 기본 상수로 사용합니다. 실행 환경에는 연동 키를 설정합니다:

```dotenv
CHEONGSONG_WEBSITE_API_KEY=<홈페이지 PMS_API_KEY와 같은 값>
```

양양의 `WEBSITE_PROJECT_ID` / `WEBSITE_API_KEY`는 그대로 유지합니다. 청송 키는 공지 API만 사용할 수 있습니다. 연동에는 이번 PMS 코드 변경을 함께 실행/배포해야 합니다.

PMS API 계약:

| 작업 | 메서드 | 경로 (`/api/projects/:project_id/website` 기준) |
|---|---|---|
| 공개 공지 조회 | GET | `/notices` |
| 관리자 공지 조회 | GET | `/admin/notices` |
| 공지 작성 | POST | `/admin/notices` |
| 공지 수정 | PUT | `/admin/notices/:id` |
| 공지 삭제 | DELETE | `/admin/notices/:id` |
| 관리자 로그인 시도 제한 | POST | `/admin-login-attempt` |

요청 헤더는 `X-Website-Key`입니다. 작성·수정은 `{ notice: { title, body, category }, revision }`, 삭제는 `{ revision }`을 전송합니다. PMS의 `{ code: 200, data }` 응답을 사용합니다. 기존 `src/data.js`의 화면 예시 공지는 자동으로 운영 PMS에 등록하지 않습니다.

## 동작과 운영

- 로그인은 서버에서 검증합니다. 세션은 서명된 HttpOnly/SameSite=Strict 쿠키로 전달하며 8시간 후 만료됩니다. 서명에 비밀번호 해시와 관리자 ID도 포함하므로 자격증명 또는 서명키를 변경하면 기존 세션이 모두 무효화됩니다.
- 세션은 Vercel 인스턴스나 서버 재시작에 의존하지 않습니다. 로그아웃은 현재 브라우저의 쿠키를 삭제합니다. 개별 토큰의 서버 측 철회 목록은 사용하지 않으므로 복사된 토큰은 만료 또는 서명키 변경까지 유효합니다.
- PMS DB의 프로젝트별 공용 제한으로 분당 최대 10회 로그인 시도를 허용합니다. 쓰기 요청은 `APP_ORIGIN`과 JSON Content-Type을 검사합니다.
- 공지는 저장 즉시 공개되며 분류는 공지/안내/이벤트입니다. 제목 120자, 본문 20,000자, 프로젝트당 최대 200건·4 MiB입니다. 본문은 HTML이 아닌 일반 텍스트입니다.
- 동시에 수정한 경우 PMS revision 검사로 409를 반환합니다. 작성 내용은 화면에 유지됩니다. 내용을 복사하고 새로고침한 뒤 다시 편집하세요.
- PMS는 작성·수정·삭제와 활동 로그를 같은 트랜잭션에 기록합니다.
- PMS 연결 실패는 오류로 표시합니다. 임시 데이터로 저장 성공을 표시하지 않습니다.

## Vercel 배포 (현재 배포 대상)

청송 홈페이지는 Vercel 프로젝트 하나로 배포합니다. `dist`는 정적 화면, `api/index.js`는 관리자 인증·PMS 통신용 Node Function입니다. `vercel.json`에 빌드, API 라우팅, SPA 새로고침 설정이 포함되어 있습니다. Vercel에서는 `npm start`를 실행하거나 별도 Express 서버를 운영하지 않습니다.

1. PMS 백엔드 변경분을 기존 PMS 서버에 먼저 배포하고 `CHEONGSONG_WEBSITE_API_KEY`를 설정합니다. 공지 테이블과 로그인 제한 테이블은 PMS에서 관리합니다.
2. 청송 프로젝트 소스를 Git 저장소에 올리고 Vercel에서 Import합니다. 루트는 `cheongsong-ann` 프로젝트 디렉터리이며 Framework Preset은 **Vite**, Node.js는 **24.x**입니다. Build Command는 `npm run build`, Output Directory는 `dist`입니다.
3. 로컬에서 `npm run setup:admin`을 한 번 실행하고 `.env.local`의 해시와 서명키를 Vercel Settings → Environment Variables에 등록합니다. `.env.local` 자체는 업로드하지 않습니다.

| Vercel 환경변수 | 값 |
|---|---|
| `PMS_API_KEY` | PMS의 `CHEONGSONG_WEBSITE_API_KEY`와 같은 키 |
| `ADMIN_PASSWORD_HASH` | 로컬 `.env.local`의 생성된 해시 |
| `ADMIN_SESSION_SECRET` | 로컬 `.env.local`의 생성된 무작위 서명키 |
| `APP_ORIGIN` | 실제 홈페이지 origin, 예: `https://ann.example.com` (끝 `/` 제외) |
| `PMS_API_BASE_URL` | 선택. 기본값 `https://pms-api.hio.ai.kr/api` |
| `ADMIN_USERNAME` | 선택. 기본값 `admin` |

4. Deploy 후 `/admin`에서 로그인하고 공지 등록·수정·삭제 및 `/announcement` 반영을 확인합니다. 환경변수 변경 후에는 Redeploy합니다.

프로젝트 ID는 상수로 설정되어 있습니다. 도메인을 아직 연결하지 않았다면 `APP_ORIGIN`에 기본 `https://프로젝트명.vercel.app` 주소를 사용하고, 커스텀 도메인 연결 후 변경합니다. Preview에서는 Vercel이 제공하는 해당 배포의 `VERCEL_URL`을 origin으로 사용합니다. Preview 관리자에 운영 PMS 키를 설정하면 운영 공지를 변경하므로 관리자 테스트가 필요할 때만 해당 환경의 키를 등록하세요.

Vercel에는 추가 DB를 만들지 않습니다. 모든 공지 저장은 홈페이지 Function에서 PMS API를 호출하여 처리합니다. 실제 Vercel 배포는 사용자가 수행합니다.

참고: [Vercel의 Vite 및 API Functions 안내](https://vercel.com/docs/frameworks/frontend/vite).

## 별도 Node 서버 실행 (선택)

```powershell
npm run build
$env:NODE_ENV='production'
$env:APP_ORIGIN='https://실제-홈페이지-도메인'
npm start
```

HTTPS 리버스 프록시에서 모든 경로를 `127.0.0.1:3100`으로 전달하세요. 서버가 정적 파일과 `/admin` 등의 SPA 경로, `/api/*`를 모두 처리합니다. 운영 쿠키에는 Secure가 적용됩니다. 정적 파일만 배포하면 관리자 API가 동작하지 않습니다. `.env.local`은 커밋하지 않고 운영에서는 환경변수로 주입합니다.

## 이미지 최적화

홈페이지 이미지는 `public/assets/*.webp`를 사용합니다. WebP 품질 82로 변환하며 원래 비율과 투명도를 유지합니다. 큰 사진은 최대 가로 1,600px, 홈 객실 카드는 1,000px, 주변/옵션 사진은 800px, 예약 객실 이미지는 640px, 작은 썸네일은 480px로 제한하고 작은 원본을 확대하지 않습니다.

```powershell
npm run optimize:images
# 코드의 이미지 경로를 .webp로 변경하고 결과를 확인한 다음 실행
npm run optimize:images -- --archive-originals
```

스크립트는 원본 PNG를 `artifacts/original-images`에 보관합니다. 해당 폴더는 Git/Vercel 업로드에서 제외되므로 원본 보존이 필요하면 별도 백업해 두세요. 최적화 결과는 `artifacts/image-optimization.json`에 기록합니다. 기존 WebP는 일반 빌드에서 다시 인코딩하지 않습니다.

## 검증

```powershell
npm test
npm run build
```

HTTP 테스트는 인증·CSRF·세션 만료/폐기·시도 제한·PMS 라우팅·입력 검증·충돌 처리를 검증합니다. PMS 실제 저장/프로젝트 격리/활동 로그 검증은 PMS의 `test/website-booking/website-notice.*.spec.ts`에 있습니다.
