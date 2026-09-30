# 청송 한옥호텔 홈페이지 · HIO PMS 직접 연동 개발 계획

## 1. 문서 목적

청송 한옥호텔 홈페이지를 Next.js로 전환하고, 공지사항·객실 조회·예약·예약 조회·취소 기능을 HIO PMS와 직접 연동하는 구현 방안을 정의한다.

이 문서의 핵심 결정은 다음과 같다.

- 객실, 예약, 결제 상태, 판매일보의 운영 원장은 HIO PMS로 한다.
- 홈페이지 브라우저는 PMS를 직접 호출하지 않는다.
- 홈페이지의 Next.js 서버가 PMS의 홈페이지 전용 API를 서버 간 통신으로 호출한다.
- 홈페이지 예약 생성과 PMS 판매일보 반영은 PMS 내부의 단일 트랜잭션에서 처리한다.
- 기존 CMS 전용 판매일보 API를 홈페이지에서 재사용하지 않고, PMS에 `website-reservation` 도메인을 추가한다.
- 공지사항도 PMS에서 운영자가 관리할 수 있도록 `website-notice` 도메인으로 구성한다.

## 2. 현재 상태와 확인 결과

### 2.1 청송 홈페이지

- React + Vite 단일 페이지 애플리케이션이다.
- 공지, 객실, 옵션 데이터가 `src/data.js`에 하드코딩돼 있다.
- 예약 생성은 API 요청 없이 `sessionStorage`에 저장한다.
- 예약 완료 페이지의 예약번호, 일정, 계좌 정보가 고정값이다.
- 예약 조회와 취소는 화면의 로컬 상태만 변경한다.

### 2.2 HIO PMS

- NestJS + PostgreSQL + TypeORM으로 구성돼 있다.
- `sales-daily-report`가 예약·입실·퇴실·취소·노쇼와 결제 금액을 관리한다.
- 판매일보 생성 시 객실 기간 중복 검사를 수행한다.
- 외부 예약의 멱등 반영을 위한 다음 필드와 고유 인덱스가 이미 존재한다.
  - `source_system`
  - `source_reservation_id`
  - `source_reservation_room_id`
  - `source_revision_id`
  - `source_payload_hash`
- 현재 외부 연동 원천은 `CMS`만 정의돼 있다.
- CMS 전용 서비스 토큰 API는 존재하지만 홈페이지 예약 API로 직접 사용하기에는 인증명, 소유권, 활동 로그의 의미가 맞지 않는다.
- 판매일보 매출 집계는 현재 판매일보 상태와 무관하게 `payment_entries`와 `extra_charges`를 합산한다. 따라서 입금 대기 예약에 전체 금액을 기록하면 실제 입금 전에도 매출로 집계된다.

## 3. 목표 아키텍처

```text
사용자 브라우저
    │
    │ HTTPS
    ▼
청송 홈페이지 Next.js
    ├─ 화면 렌더링
    ├─ 입력값 1차 검증
    └─ PMS BFF Route Handler
            │
            │ X-HIO-WEBSITE-SERVICE-TOKEN
            ▼
HIO PMS website-reservation API
    ├─ 가격·재고·취소 규정 검증
    ├─ 홈페이지 예약 원본 저장
    ├─ 판매일보 생성·수정
    ├─ 객실 중복 방지
    ├─ 활동 로그 기록
    └─ PostgreSQL
```

Next.js는 사용자용 API 경계(BFF) 역할만 담당한다. 예약 원본을 Next.js 전용 DB에 중복 저장하지 않는다. PMS 장애 시 재전송이 필요하면 Next.js DB 대신 요청의 `Idempotency-Key`와 PMS의 멱등 처리를 사용한다.

## 4. 시스템 책임

| 영역 | 책임 |
|---|---|
| Next.js 화면 | 사용자 입력, 로딩·오류 표시, 접근성, 페이지 이동 |
| Next.js Route Handler | PMS 주소와 서비스 토큰 은닉, 요청 크기 제한, IP 기반 요청 제한 |
| PMS `website-reservation` | 예약 원본, 개인정보, 약관, 결제 상태, 조회·취소 인증 |
| PMS `sales-daily-report` | 운영 판매일보, 객실 배정, 매출, 입실·퇴실 상태 |
| PMS `website-notice` | 홈페이지 공지 등록·수정·게시 |
| PostgreSQL | 예약·공지·판매일보의 영속성과 동시성 보장 |

## 5. PMS 백엔드 구현 구조

PMS의 DDD + Layered Architecture 규칙을 그대로 적용한다.

```text
stayg-pms/backend/src/
├─ domain/
│  ├─ website-reservation/
│  │  ├─ website-reservation.entity.ts
│  │  ├─ website-reservation-option.entity.ts
│  │  ├─ website-reservation-agreement.entity.ts
│  │  ├─ website-reservation-quote.entity.ts
│  │  └─ enum/
│  └─ website-notice/
│     ├─ website-notice.entity.ts
│     └─ enum/
├─ application/
│  ├─ website-reservation/
│  │  ├─ website-reservation.service.ts
│  │  ├─ website-availability.service.ts
│  │  ├─ website-reservation-quote.service.ts
│  │  └─ dto/
│  └─ website-notice/
│     ├─ website-notice.service.ts
│     └─ dto/
├─ presentation/
│  ├─ website-reservation/
│  │  ├─ website-reservation.controller.ts
│  │  ├─ website-reservation.module.ts
│  │  └─ dto/
│  └─ website-notice/
│     ├─ website-notice.controller.ts
│     ├─ website-notice.module.ts
│     └─ dto/
└─ config/
   └─ configuration.ts
```

레이어 간 DTO를 분리하고 Presentation 계층에서 외부 `snake_case` 계약을 Application 계층의 `camelCase`로 매핑한다. Repository는 Application Service에서 `@InjectRepository`로 주입한다.

## 6. 데이터 모델

### 6.1 `website_reservations`

| 필드 | 설명 |
|---|---|
| `id` | UUID PK, `KstBaseEntity` 사용 |
| `project_id` | PMS 프로젝트 |
| `sales_daily_report_id` | 생성된 판매일보 ID |
| `reservation_number` | 고객에게 노출하는 고유 예약번호 |
| `idempotency_key` | 예약 생성 중복 방지 키 |
| `room_id` | 실제 판매 객실 ID |
| `room_number` | 판매일보 표시용 객실번호 스냅샷 |
| `room_type_id` | 객실 유형 ID |
| `room_type_name` | 객실 유형명 스냅샷 |
| `guest_name` | 예약자명 |
| `guest_phone` | 정규화한 연락처 |
| `guest_email` | 이메일 |
| `guest_count` | 실제 투숙 인원 |
| `check_in_date` | 입실 예정일시, KST |
| `check_out_date` | 퇴실 예정일시, KST |
| `room_amount` | 객실 금액 |
| `option_amount` | 옵션 금액 |
| `discount_amount` | 할인 금액 |
| `total_amount` | 서버가 확정한 총 예약 금액 |
| `payment_status` | 입금 대기·결제 완료·환불 대기·환불 완료 |
| `status` | 예약 상태 |
| `payment_deadline` | 입금 기한 |
| `request_message` | 고객 요청사항 |
| `lookup_failure_count` | 조회 시도 제한 보조값 |
| `cancelled_date` | 취소 시각 |
| `cancellation_reason` | 취소 사유 |

고유 인덱스는 최소 다음 두 개를 둔다.

- `uq_website_reservations_project_number(project_id, reservation_number)`
- `uq_website_reservations_project_idempotency(project_id, idempotency_key)`

### 6.2 `website_reservation_options`

옵션명과 가격은 예약 당시 스냅샷으로 저장한다.

- `reservation_id`
- `option_code`
- `option_name`
- `quantity`
- `unit_amount`
- `total_amount`

### 6.3 `website_reservation_agreements`

- `reservation_id`
- `agreement_type`: `TERMS`, `PRIVACY`, `REFUND`, `MARKETING`
- `agreement_version`
- `is_agreed`
- `agreed_date`

필수 약관은 서버가 버전과 동의 여부를 검증한다. 프런트 체크 여부만 신뢰하지 않는다.

### 6.4 `website_reservation_quotes`

- `id`
- `project_id`
- `room_id`
- `check_in_date`
- `check_out_date`
- `guest_count`
- `pricing_payload`
- `total_amount`
- `expires_date`
- `is_consumed`

견적 유효시간은 기본 10분으로 한다. 견적은 객실을 점유하지 않으며 예약 생성 트랜잭션에서 가용성과 가격을 다시 검사한다.

### 6.5 `website_notices`

- `id`
- `project_id`
- `category`: `NOTICE`, `GUIDE`, `EVENT`
- `title`
- `summary`
- `content`
- `is_pinned`
- `is_published`
- `published_date`
- `created_by_user_id`

### 6.6 객실·요금·옵션 설정

PMS 기존 `rooms`, `room_types`를 객실 원장으로 사용한다. 홈페이지 노출에 필요한 별도 설정만 추가한다.

```text
website_room_configs
- project_id
- room_id
- public_slug
- is_published
- base_amount
- standard_guest_count
- max_guest_count
- display_order

website_room_daily_rates
- room_id
- business_date
- amount
- is_closed

website_options
- project_id
- option_code
- option_name
- amount
- is_active
```

객실 설명과 이미지 경로는 초기에는 Next.js 정적 콘텐츠로 유지할 수 있다. 판매 가능 여부, 인원, 가격은 항상 PMS 응답을 사용한다.

## 7. Enum과 판매일보 소유권

### 7.1 판매일보 원천 시스템

```ts
export enum SalesDailyReportSourceSystem {
  CMS = 'CMS',
  WEBSITE = 'WEBSITE',
}
```

홈페이지 예약이 만든 판매일보에는 다음을 기록한다.

- `source_system = WEBSITE`
- `source_reservation_id = website_reservations.id`
- `source_reservation_room_id = website_reservations.id`
- `source_revision_id = website_reservations.updated_date 기반 revision`
- `source_payload_hash = 판매일보 매핑 payload의 SHA-256`

기존 고유 인덱스를 사용해 재시도와 동시 요청에 의한 판매일보 중복 생성을 막는다.

### 7.2 홈페이지 예약 상태

```text
PENDING_PAYMENT  입금 대기
CONFIRMED        입금 확인·예약 확정
CHECKED_IN       입실
CHECKED_OUT      퇴실
CANCELLED        고객 또는 운영자 취소
EXPIRED          입금 기한 만료
NO_SHOW          노쇼
```

판매일보 상태 매핑:

| 홈페이지 상태 | 판매일보 상태 |
|---|---|
| `PENDING_PAYMENT` | `예약` |
| `CONFIRMED` | `예약` |
| `CHECKED_IN` | `체크인` |
| `CHECKED_OUT` | `체크아웃` |
| `CANCELLED` | `취소` |
| `EXPIRED` | `취소` |
| `NO_SHOW` | `노쇼` |

취소·만료 시 판매일보를 물리적으로 삭제하지 않는다. 상태를 `취소`로 변경하고 객실 배정을 해제해 운영 이력과 활동 로그를 보존한다.

## 8. API 계약

모든 PMS 응답은 기존 공통 규격을 사용한다.

```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {}
}
```

### 8.1 공지사항

```http
GET /api/projects/:project_id/website/notices
```

Query:

- `category`
- `query`
- `page`
- `size`

관리자 API:

```http
POST   /api/projects/:project_id/website/notices
PATCH  /api/projects/:project_id/website/notices/:notice_id
DELETE /api/projects/:project_id/website/notices/:notice_id
```

조회 API는 홈페이지 서비스 토큰 또는 제한된 공개 조회로 제공한다. 쓰기 API는 기존 PMS 사용자 인증과 프로젝트 권한을 사용한다.

### 8.2 객실 가용성 조회

```http
GET /api/projects/:project_id/website/availability
    ?check_in=2026-07-15
    &check_out=2026-07-17
    &guest_count=2
```

응답에는 PMS 내부 ID, 객실별 가용 여부와 서버 계산 가격만 제공한다.

```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {
    "rooms": [
      {
        "room_id": "uuid",
        "room_type_id": "uuid",
        "public_slug": "hunjang",
        "is_available": true,
        "night_count": 2,
        "room_amount": 360000,
        "max_guest_count": 4
      }
    ]
  }
}
```

### 8.3 견적 생성

```http
POST /api/projects/:project_id/website/quotes
```

```json
{
  "room_id": "uuid",
  "check_in": "2026-07-15",
  "check_out": "2026-07-17",
  "guest_count": 2,
  "options": [
    { "option_code": "BREAKFAST", "quantity": 1 }
  ],
  "promotion_code": null
}
```

서버는 `quote_id`, 가격 상세, 만료 시각을 반환한다.

### 8.4 예약 생성

```http
POST /api/projects/:project_id/website/reservations
Idempotency-Key: UUID
```

```json
{
  "quote_id": "uuid",
  "guest": {
    "name": "홍길동",
    "phone": "01012341234",
    "email": "guest@example.com"
  },
  "request_message": "늦은 도착 예정입니다.",
  "agreements": [
    { "type": "TERMS", "version": "2026-01", "is_agreed": true },
    { "type": "PRIVACY", "version": "2026-01", "is_agreed": true },
    { "type": "REFUND", "version": "2026-01", "is_agreed": true },
    { "type": "MARKETING", "version": "2026-01", "is_agreed": false }
  ]
}
```

응답:

```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {
    "reservation_id": "uuid",
    "reservation_number": "ANN-20260715-0001",
    "status": "PENDING_PAYMENT",
    "payment_status": "UNPAID",
    "total_amount": 390000,
    "payment_deadline": "2026-07-16T18:00:00+09:00",
    "bank_account": {
      "bank_name": "은행명",
      "account_number_masked": "000-***-000000",
      "account_holder": "청송 한옥호텔 안"
    }
  }
}
```

### 8.5 예약 조회

```http
POST /api/projects/:project_id/website/reservations/lookup
```

```json
{
  "reservation_number": "ANN-20260715-0001",
  "guest_name": "홍길동",
  "guest_phone": "01012341234"
}
```

성공 시 예약 데이터와 10분짜리 `management_token`을 반환한다. 이후 상세 조회와 취소는 이 토큰을 `Authorization: Bearer`로 전송한다. 개인정보가 URL과 접근 로그에 남지 않도록 이름과 전화번호는 Query String으로 보내지 않는다.

### 8.6 예약 상세·취소

```http
GET  /api/projects/:project_id/website/reservations/:reservation_id
POST /api/projects/:project_id/website/reservations/:reservation_id/cancel-quote
POST /api/projects/:project_id/website/reservations/:reservation_id/cancel
```

`cancel-quote`는 현재 시각과 체크인 일자를 기준으로 취소 가능 여부와 환불 예상액을 반환한다. `cancel`은 해당 견적 ID를 받아 서버에서 다시 검증한 뒤 처리한다.

### 8.7 입금 확인과 만료

관리자 입금 확인:

```http
POST /api/projects/:project_id/website/reservations/:reservation_id/confirm-payment
```

입금 기한 만료 배치:

```text
매 5분 실행
PENDING_PAYMENT + payment_deadline < 현재시각
→ EXPIRED
→ 판매일보 취소
→ 객실 배정 해제
→ 활동 로그 기록
```

## 9. 예약 생성 트랜잭션

예약 생성은 다음 순서로 하나의 PostgreSQL 트랜잭션에서 처리한다.

1. 견적 ID, 만료 여부, 사용 여부 검사
2. 프로젝트와 홈페이지 판매 설정 검사
3. `room_id` 행에 `pessimistic_write` 잠금 획득
4. 판매일보에서 동일 객실·기간의 활성 예약 재조회
5. 중복이면 `WEBSITE_RESERVATION_ROOM_CONFLICT` 반환
6. 서버 가격 재계산 및 견적과 비교
7. `website_reservations` 생성
8. 옵션과 약관 스냅샷 생성
9. `source_system=WEBSITE` 판매일보 생성
10. 판매일보 ID를 홈페이지 예약에 연결
11. 견적을 사용 완료 상태로 변경
12. 예약·판매일보 활동 로그 기록
13. 커밋 후 문자·이메일 발송 이벤트 등록

단순히 가용성 조회 결과를 믿고 예약을 생성하면 조회와 저장 사이에 중복 예약이 발생할 수 있다. 최종 중복 검사는 반드시 잠금이 적용된 트랜잭션 내부에서 수행한다.

## 10. 판매일보 매핑

| 홈페이지 데이터 | 판매일보 데이터 |
|---|---|
| 예약 ID | `source_reservation_id` |
| 예약번호 | `reservation_number` |
| 객실번호 | `room_number` |
| 객실 유형명 | `room_type_name` |
| 예약자명 | `guest_name` |
| 예약 경로 | `channel_name = 공식 홈페이지` |
| 실제 인원 | `guest_count` |
| 숙박 기간 | `reservation_check_in_date`, `reservation_check_out_date` |
| 옵션 | 입금 완료 후 `extra_charges` |
| 요청사항 | `memo` |
| 예약 상태 | 판매일보 상태 Enum |

### 10.1 무통장 입금 매핑

현재 PMS 매출 집계는 상태 필터 없이 결제 항목을 합산하므로 입금 대기 금액을 전체 금액으로 기록하면 미입금 예약도 매출에 포함된다.

1차 구현에서는 다음 규칙을 사용한다.

- `PENDING_PAYMENT`
  - `payment_method = 무통장입금 대기`, `amount = 0`
  - `extra_charges`는 비워 두고 선택 옵션은 홈페이지 예약 원본과 판매일보 메모에서 확인한다.
- `CONFIRMED`
  - `payment_entries`에는 `room_amount - discount_amount`를 기록한다.
  - `extra_charges`에는 실제 옵션 금액을 기록한다.
  - `payment_entries + extra_charges = total_amount`가 되어야 한다.
- `CANCELLED` 또는 `EXPIRED`
  - 미입금 또는 전액 환불이면 `payment_entries = 0`, `extra_charges = []`로 갱신한다.
  - 일부 금액을 위약금으로 보유하면 실제 보유 금액만 결제 항목에 남긴다.
- 예상 예약 금액과 옵션 내역은 항상 `website_reservations` 및 하위 옵션 테이블에서 조회한다.

향후 PMS에서 예약 매출과 실입금 매출을 분리하려면 판매일보 결제 모델에 `payment_status` 또는 `recognized_amount`를 추가하는 별도 개선이 필요하다.

## 11. Next.js 전환 구조

```text
app/
├─ layout.tsx
├─ page.tsx
├─ rooms/page.tsx
├─ announcement/page.tsx
├─ reservation/page.tsx
├─ reservation/[room_slug]/page.tsx
├─ complete/[reservation_id]/page.tsx
├─ manage/page.tsx
└─ api/
   ├─ notices/route.ts
   ├─ availability/route.ts
   ├─ quotes/route.ts
   └─ reservations/
      ├─ route.ts
      ├─ lookup/route.ts
      └─ [reservation_id]/
         ├─ route.ts
         └─ cancel/route.ts

lib/
├─ pms-client.ts
├─ env.ts
├─ validation/
└─ types/
```

### 11.1 Next.js 환경변수

```env
PMS_API_BASE_URL=https://pms.example.com/api
PMS_PROJECT_ID=<uuid>
HIO_WEBSITE_SERVICE_TOKEN=<secret>
NEXT_PUBLIC_SITE_URL=https://ann.example.com
```

`HIO_WEBSITE_SERVICE_TOKEN`과 PMS 프로젝트 ID는 Client Component에 전달하지 않는다. PMS 호출은 Server Component 또는 Route Handler에서만 수행한다.

### 11.2 페이지별 데이터 연결

| 페이지 | 연결 방식 |
|---|---|
| 공지사항 | Server Component에서 PMS 공지 API 조회 |
| 객실 목록 | 정적 설명 + PMS 가격·판매 상태 병합 |
| 예약 | Client Component 입력 + Next Route Handler |
| 완료 | 예약 ID로 Next 서버가 PMS 상세 조회 |
| 예약 조회 | Next Route Handler가 PMS lookup 호출 |
| 취소 | management token을 HttpOnly·Secure 쿠키에 저장 후 요청 |

기존 `HashRouter`와 `react-router-dom`은 제거하고 Next.js 파일 기반 라우팅으로 전환한다.

## 12. 인증과 보안

### 12.1 서버 간 인증

- PMS 환경변수: `HIO_WEBSITE_SERVICE_TOKEN`
- Next.js 환경변수: 동일한 토큰
- 요청 헤더: `X-HIO-WEBSITE-SERVICE-TOKEN`
- 브라우저 응답, 번들, 로그에 토큰을 노출하지 않는다.
- 토큰 비교는 timing-safe 비교를 사용한다.
- 장기적으로 클라이언트 ID + 토큰 해시 테이블로 확장한다.

### 12.2 고객 예약 조회

- 예약번호·이름·전화번호가 모두 일치해야 한다.
- 전화번호는 숫자만 남겨 정규화한다.
- IP와 예약번호 기준으로 요청 횟수를 제한한다.
- 실패 응답은 어떤 필드가 틀렸는지 구분하지 않는다.
- 조회 성공 후 짧은 유효기간의 management token을 발급한다.
- 토큰은 Next.js에서 HttpOnly, Secure, SameSite=Lax 쿠키로 저장한다.

### 12.3 개인정보

- 전화번호와 이메일을 애플리케이션 로그에 남기지 않는다.
- 활동 로그에는 마스킹된 연락처만 사용한다.
- 예약 조회 응답도 전화번호와 계좌번호를 마스킹한다.
- 개인정보 보유 기간과 파기 배치는 운영 정책 확정 후 구현한다.

## 13. 오류 코드

| 오류 코드 | 의미 |
|---|---|
| `WEBSITE_SERVICE_TOKEN_INVALID` | 서버 간 인증 실패 |
| `WEBSITE_RESERVATION_QUOTE_NOT_FOUND` | 견적 없음 |
| `WEBSITE_RESERVATION_QUOTE_EXPIRED` | 견적 만료 |
| `WEBSITE_RESERVATION_ROOM_CONFLICT` | 객실 중복 예약 |
| `WEBSITE_RESERVATION_PRICE_CHANGED` | 견적 이후 가격 변경 |
| `WEBSITE_RESERVATION_REQUIRED_AGREEMENT` | 필수 약관 미동의 |
| `WEBSITE_RESERVATION_NOT_FOUND` | 조회 정보 불일치 포함 |
| `WEBSITE_RESERVATION_CANCEL_NOT_ALLOWED` | 취소 불가 기간 또는 상태 |
| `WEBSITE_RESERVATION_ALREADY_CANCELLED` | 이미 취소된 예약 |
| `WEBSITE_RESERVATION_IDEMPOTENCY_CONFLICT` | 동일 키에 다른 요청 사용 |

외부 응답에는 내부 스택과 DB 오류를 노출하지 않는다. 예외는 PMS의 `CustomException`, `ErrorCode`, 전역 예외 필터를 사용한다.

## 14. 활동 로그

PMS 쓰기 API 규칙에 따라 다음 작업은 반드시 활동 로그를 남긴다.

- 홈페이지 예약 접수
- 입금 확인
- 예약 정보 변경
- 예약 취소
- 입금 기한 만료
- 공지 등록·수정·삭제

시스템 작업은 다음 principal을 사용한다.

```text
actor_type: SYSTEM
actor_key: CHEONGSONG_ANN_WEBSITE
actor_name: 청송 한옥호텔 홈페이지
```

## 15. 테스트 계획

### 15.1 PMS Application 단위 테스트

- 날짜·인원에 따른 가용 객실 조회
- 견적 계산과 만료
- 필수 약관 검증
- 예약번호 생성
- 판매일보 필드 매핑
- 실제 인원과 옵션 매핑
- 입금 대기 금액 0원 처리
- 입금 확인 후 판매일보 금액 갱신
- 취소·만료 시 객실 배정 해제
- 취소 규정과 환불액 계산
- 동일 Idempotency-Key 재요청
- 동일 객실 동시 예약 충돌
- 활동 로그 생성

### 15.2 PMS Presentation e2e 테스트

- 서비스 토큰 없음·오류·정상
- 공통 응답 형태
- DTO 검증과 snake_case 계약
- 공지 목록·검색·페이지네이션
- 예약 생성·조회·취소 전체 흐름
- 개인정보 조회 실패 응답 통일
- 관리자 공지 CRUD 권한

### 15.3 Next.js 테스트

- PMS Client 요청·응답 매핑
- 서비스 토큰이 브라우저 응답에 없는지 확인
- 예약 폼 검증
- PMS 오류 메시지 UI 매핑
- 페이지 이동 및 새로고침
- 모바일·데스크톱 예약 흐름
- 예약 중복 제출 방지

### 15.4 연동 회귀 테스트

PMS 백엔드 변경이므로 저장소 규칙에 따라 다음을 모두 실행한다.

1. PMS 서버 실행 확인 후 종료
2. PMS `npm run test`
3. PMS `npm run test:e2e`
4. Kiosk 백엔드 `npm run test`
5. Kiosk 백엔드 `npm run test:e2e`
6. 홈페이지 Next.js `npm run lint`
7. 홈페이지 Next.js `npm run build`
8. 홈페이지 예약 생성 후 PMS 판매일보 화면 확인

## 16. DB·DDL 변경

엔티티 추가와 함께 다음을 갱신한다.

- TypeORM 엔티티 등록
- PMS의 `backend/.db/schema.ddl.sql`
- Enum 생성 DDL
- 테이블·인덱스·외래키 생성 DDL
- 테스트용 pg-mem 스키마

DDL은 증분 `ALTER`만 남기는 방식이 아니라 빈 DB에서 최신 구조를 생성할 수 있는 전체 스키마 스냅샷을 유지한다.

## 17. 구현 단계

### Phase 0. 운영 설정 확인

- 청송 PMS 프로젝트 ID 확인
- 참봉댁·생원댁·훈장댁·교수댁·정승댁·영감댁·대감댁의 PMS 객실 및 객실 유형 ID 확인
- 객실별 기준·최대 인원 확인
- 날짜별 가격 정책 확인
- 입금 계좌와 입금 기한 확인
- 취소·환불 규정 버전 확정

### Phase 1. PMS 홈페이지 예약 기반

- `website-reservation` 엔티티와 Enum
- 홈페이지 전용 서비스 토큰 인증
- 객실 공개 설정과 옵션 데이터
- 가용성·견적 API
- 단위 테스트와 e2e 테스트

### Phase 2. 예약과 판매일보

- 예약 생성 트랜잭션
- `SalesDailyReportSourceSystem.WEBSITE`
- 판매일보 생성·수정 매핑
- 중복 요청과 동시 예약 방지
- 활동 로그
- 입금 확인과 만료 배치

### Phase 3. 조회·취소

- 고객 조회 인증
- management token
- 취소 견적
- 예약 취소와 판매일보 상태 변경
- 환불 상태 처리

### Phase 4. 공지사항

- `website-notice` 도메인
- 공개 목록과 상세 API
- 관리자 CRUD
- 홈페이지 검색·필터·페이지네이션 연결

### Phase 5. Next.js 전환

- Vite 제거 및 App Router 전환
- 기존 디자인·CSS·이미지 이전
- PMS BFF Route Handler
- 각 페이지 API 연결
- 로딩·빈 상태·오류 상태
- SEO Metadata와 sitemap

### Phase 6. 운영 준비

- 운영 환경변수와 비밀키 등록
- HTTPS·CORS·Rate Limit
- 알림 발송 연동
- 로그와 장애 알림
- 기존 샘플 예약 데이터 제거
- 스테이징 통합 테스트 후 운영 반영

## 18. 배포 순서

호환성을 유지하기 위해 다음 순서로 배포한다.

1. PMS DB 스키마와 새 API 배포
2. PMS 관리자에서 청송 프로젝트·객실·가격 설정
3. 홈페이지 서비스 토큰 등록
4. Next.js를 새 API에 연결해 스테이징 배포
5. 테스트 예약 생성·입금 확인·취소 검증
6. PMS 판매일보·객실현황·매출 집계 검증
7. 운영 홈페이지 전환

PMS API가 먼저 배포되므로 기존 PMS·Kiosk·CMS 기능에는 영향을 주지 않아야 한다. 홈페이지 기능은 프로젝트별 `is_website_booking_enabled` 기능 플래그로 활성화한다.

## 19. 완료 기준

- 홈페이지에서 실제 날짜와 인원으로 예약 가능한 객실을 조회할 수 있다.
- 가격과 옵션 금액이 PMS 계산 결과와 일치한다.
- 동시에 같은 객실을 예약하면 한 요청만 성공한다.
- 예약 접수 즉시 PMS 판매일보에 `공식 홈페이지` 예약으로 표시된다.
- 실제 투숙 인원과 옵션이 판매일보에 정확히 반영된다.
- 입금 전 금액이 PMS 실매출에 포함되지 않는다.
- 입금 확인 시 예약과 판매일보 결제가 함께 갱신된다.
- 예약 조회 정보가 일치할 때만 고객이 예약 내용을 볼 수 있다.
- 취소 시 객실이 다시 판매 가능해지고 판매일보 이력이 보존된다.
- 공지사항 검색·분류·페이지네이션이 PMS 데이터로 동작한다.
- PMS·Kiosk 백엔드 테스트와 홈페이지 빌드가 모두 통과한다.

## 20. 구현 전 확정이 필요한 운영 정책

다음 항목은 코드 구현 전 운영 담당자 확인이 필요하다.

1. 입금 대기 예약이 객실을 즉시 점유하는지 여부
2. 입금 기한: 예약 후 24시간 또는 고정 시각
3. 당일 예약의 입금 기한 예외
4. 취소 가능 기준 시각과 환불 비율
5. 마케팅 동의 데이터 보유 기간
6. 옵션별 수량·재고 제한
7. 예약 확정 문자·이메일 발송 채널
8. 예약번호 표시 형식
9. PMS 판매일보에서 입금 대기 금액을 표시하는 방법
10. 공지사항 작성 화면을 PMS 프런트엔드에 포함할지 여부
