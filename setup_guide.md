# 해시냅스 (Hashnapse) - 프로젝트 연동 및 빌드 가이드 (Google OAuth 로그인 버전)

이 가이드는 **해시냅스 (Hashnapse)** 애플리케이션의 데이터베이스(Supabase) 설정과 모바일 하이브리드 앱(Capacitor) 빌드 및 연동 방법을 설명합니다.

---

## 1. Supabase 데이터베이스 설정 (SQL)

이메일 기반 로그인 및 다중 사용자 데이터 격리(격리된 투표 내역), 그리고 캐릭터 이름 글자 수(10자) 및 중복 제한이 적용된 Supabase용 SQL 스크립트입니다. Supabase 콘솔의 **SQL Editor**에 복사하여 실행해 주세요.

```sql
-- 1. 기존 테이블 및 리소스 제거 (완전 초기 배포용)
DROP TABLE IF EXISTS public.calorie_records CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.user_votes CASCADE;
DROP TABLE IF EXISTS public.user_assets CASCADE;
DROP TABLE IF EXISTS public.characters CASCADE;

-- 2. 캐릭터 정보 테이블 생성 (방별 캐릭터 굿즈 관리)
CREATE TABLE public.characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- 중복 방지 UNIQUE 제약
    description TEXT,
    image_url TEXT,
    votes INTEGER NOT NULL DEFAULT 10,
    vote_change_rate NUMERIC NOT NULL DEFAULT 0,
    vote_history INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    room_id TEXT NOT NULL DEFAULT 'global',
    genre TEXT,
    "group" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 사용자 자산 정보 테이블 생성 (이메일 + 방 ID 복합 키를 통한 방별 자산 격리)
CREATE TABLE public.user_assets (
    id TEXT NOT NULL, -- 사용자 이메일 (user_email)
    room_id TEXT NOT NULL DEFAULT 'global', -- 방 (Room) ID
    total_steps INTEGER NOT NULL DEFAULT 0,
    claimed_steps INTEGER NOT NULL DEFAULT 0,
    available_votes INTEGER NOT NULL DEFAULT 5, -- 기본 미사용 투표권 5표 지급
    pending_votes INTEGER NOT NULL DEFAULT 0, -- 트윗 대기 중인 투표권
    scheduled_votes INTEGER NOT NULL DEFAULT 0, -- 익일 지급 대기 중인 투표권
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, room_id)
);

-- 4. 사용자 투표 내역 테이블 생성 (이메일+방ID+캐릭터ID 복합 키를 통한 방별 투표 격리)
CREATE TABLE public.user_votes (
    user_id TEXT NOT NULL, -- 사용자 이메일
    room_id TEXT NOT NULL DEFAULT 'global', -- 방 ID
    character_id TEXT NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    voted_quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, room_id, character_id)
);

-- 5. 방(Room) 정보 테이블 생성
CREATE TABLE public.rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creator TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 방 멤버 정보 테이블 생성
CREATE TABLE public.room_members (
    room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    nickname TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (room_id, user_email)
);

-- 7. 칼로리 기록 테이블 생성 (레거시/시뮬레이션 대응)
CREATE TABLE public.calorie_records (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. 초기 캐릭터 스타 후보군 데이터 삽입
INSERT INTO public.characters (id, name, description, image_url, votes, vote_change_rate, vote_history, room_id, genre, "group")
VALUES 
('char-1', '스파클링토끼', '우주에서 가장 발이 빠른 토끼. 발랄한 에너지로 차트를 지배합니다.', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&auto=format&fit=crop&q=60', 350, 15.4, ARRAY[300, 310, 315, 320, 330, 340, 345, 350], 'global', '애니메이션', 'SPARK'),
('char-2', '아이언판다', '대나무 실드로 어떤 순위 하락도 방어해내는 든든한 판다.', 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&auto=format&fit=crop&q=60', 820, 110.2, ARRAY[390, 450, 520, 600, 680, 720, 790, 820], 'global', '애니메이션', 'PANDA'),
('char-3', '골든독', '황금빛 털을 가진 행운의 강아지. 밈 투표의 대부.', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&auto=format&fit=crop&q=60', 540, 45.9, ARRAY[370, 390, 420, 450, 480, 500, 520, 540], 'global', '밈', 'GOLDD')
ON CONFLICT (name) DO NOTHING;

-- 9. RLS (Row Level Security) 비활성화 설정 (개발용)
ALTER TABLE public.characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_records DISABLE ROW LEVEL SECURITY;
```


---

## 2. 주요 연동 및 변경 기능 요약

* **Google 소셜 로그인 (OAuth)**: 기존 간이 이메일 로그인을 Google 계정 연동(OAuth) 방식으로 교체했습니다. Google 인증 완료 후 Supabase 세션의 사용자 이메일 정보를 기준 삼아 개별 데이터를 격리하여 동기화합니다.
* **NaN 득표율 방지**: DB 데이터 매핑 및 증가율 산정 과정에서 발생할 수 있는 `NaN`을 연산 안전 예방 코드로 처리하여 0%로 확실히 가드합니다.
* **거래소 컴팩트 보드**: 거래소([Market.tsx](file:///Users/celebe/WebstormProjects/fanstock/src/components/Market.tsx))에서는 모든 이미지를 제거하고, 득표 차트와 득표율 증감 수치 등 텍스트 위주로 고품격 UI를 컴팩트하게 제공합니다.
* **상장 필터링 규칙**: 
  - 신규 스타 상장 시 공백 입력을 원천 차단하며 최대 10자까지만 입력이 차단되도록 input 단에서 마스크 처리했습니다.
  - 기존 캐릭터 명부에 동일한 이름의 캐릭터가 존재하면 중복 에러를 반환해 상장을 막아 고유성(PK)을 보장합니다.

---

## 3. 기존 테이블 마이그레이션 (ALTER SQL)

이미 초기 버전의 테이블들을 생성하신 경우, DB를 초기화하지 않고 아래의 **ALTER 쿼리**를 SQL Editor에 실행하시면 최신 스키마 구조로 정상 연동됩니다.

```sql
-- 1. characters 테이블 마이그레이션 (에러 없이 안전하게 실행)
-- 기존 안 쓰는 컬럼 제거
ALTER TABLE public.characters DROP COLUMN IF EXISTS base_price;
ALTER TABLE public.characters DROP COLUMN IF EXISTS current_price;
ALTER TABLE public.characters DROP COLUMN IF EXISTS price_change_rate;
ALTER TABLE public.characters DROP COLUMN IF EXISTS price_history;
ALTER TABLE public.characters DROP COLUMN IF EXISTS popularity_index;
ALTER TABLE public.characters DROP COLUMN IF EXISTS popularity_history;

-- 최신 컬럼 안전하게 추가 (존재하지 않는 경우에만 생성)
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS vote_change_rate NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS vote_history INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- UNIQUE 제약 조건 안전하게 추가
ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_name_unique;
ALTER TABLE public.characters ADD CONSTRAINT characters_name_unique UNIQUE (name);

-- 2. user_assets 테이블 마이그레이션
-- 기존 안 쓰는 컬럼 제거
ALTER TABLE public.user_assets DROP COLUMN IF EXISTS cash;
ALTER TABLE public.user_assets DROP COLUMN IF EXISTS stock_tickets;
-- 최신 컬럼 안전하게 추가
ALTER TABLE public.user_assets ADD COLUMN IF NOT EXISTS available_votes INTEGER NOT NULL DEFAULT 5;

-- 3. user_stocks -> user_votes 테이블 마이그레이션 & 복합 PK 적용
-- 테이블이 user_stocks 이름으로 존재하면 user_votes로 변경
ALTER TABLE public.user_stocks RENAME TO user_votes;

-- 임시 예외 발생 방지: user_votes 명의로 컬럼 정리
ALTER TABLE public.user_votes DROP COLUMN IF EXISTS avg_buy_price;

-- quantity 컬럼 처리 (voted_quantity가 이미 존재하면 quantity 삭제, 없으면 rename 혹은 신규 생성)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_votes' AND column_name='voted_quantity') THEN
    ALTER TABLE public.user_votes DROP COLUMN IF EXISTS quantity;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_votes' AND column_name='quantity') THEN
    ALTER TABLE public.user_votes RENAME COLUMN quantity TO voted_quantity;
  ELSE
    ALTER TABLE public.user_votes ADD COLUMN IF NOT EXISTS voted_quantity INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- user_id (이메일 식별자) 컬럼 추가
ALTER TABLE public.user_votes ADD COLUMN IF NOT EXISTS user_id TEXT;
-- 기존 데이터의 user_id 임시 업데이트
UPDATE public.user_votes SET user_id = 'test@email.com' WHERE user_id IS NULL;
-- user_id 컬럼 NOT NULL 제약 추가
ALTER TABLE public.user_votes ALTER COLUMN user_id SET NOT NULL;

-- 기존 제약 조건 및 복합 기본 키 재설정
ALTER TABLE public.user_votes DROP CONSTRAINT IF EXISTS user_stocks_pkey;
ALTER TABLE public.user_votes DROP CONSTRAINT IF EXISTS user_votes_pkey;
ALTER TABLE public.user_votes ADD PRIMARY KEY (user_id, character_id);

-- 4. [방별 자산 및 투표 격리를 위한 최신 마이그레이션 ALTER]
-- A. user_assets 테이블 복합 PK 재설정 (id, room_id)
-- 기존 PK 제거
ALTER TABLE public.user_assets DROP CONSTRAINT IF EXISTS user_assets_pkey;
-- room_id 및 추가 에어드랍 대기 컬럼 추가 (기존에 없을 경우)
ALTER TABLE public.user_assets ADD COLUMN IF NOT EXISTS room_id TEXT NOT NULL DEFAULT 'global';
ALTER TABLE public.user_assets ADD COLUMN IF NOT EXISTS pending_votes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_assets ADD COLUMN IF NOT EXISTS scheduled_votes INTEGER NOT NULL DEFAULT 0;
-- 복합 기본키 새로 추가
ALTER TABLE public.user_assets ADD PRIMARY KEY (id, room_id);

-- B. user_votes 테이블 복합 PK 재설정 (user_id, room_id, character_id)
-- 기존 PK 제거
ALTER TABLE public.user_votes DROP CONSTRAINT IF EXISTS user_votes_pkey;
-- room_id 컬럼 추가 (기존에 없을 경우)
ALTER TABLE public.user_votes ADD COLUMN IF NOT EXISTS room_id TEXT NOT NULL DEFAULT 'global';
-- 복합 기본키 새로 추가
ALTER TABLE public.user_votes ADD PRIMARY KEY (user_id, room_id, character_id);

-- C. characters 테이블 room_id 컬럼 추가
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS room_id TEXT NOT NULL DEFAULT 'global';
```

---

## 4. 프로덕션 환경을 위한 Supabase RLS 정책 (참고)

로컬 개발 중에는 편의를 위해 RLS를 완전히 해제(`DISABLE`)하고 사용할 수 있지만, 실제 상용화(Release) 서비스에 배포할 때는 데이터 보안을 위해 RLS를 켜고 아래와 같은 **보안 정책(Policy)**을 설정하여 로그인된 자신의 데이터만 쓰고 읽도록 강제해야 합니다.

```sql
-- 1. 모든 테이블 RLS 보안 다시 켜기
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;

-- 2. characters 테이블 보안 설정 (모든 인증된 사용자가 읽고 신규 후보 추가 가능)
CREATE POLICY "Allow read for all authenticated users" 
ON public.characters FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.characters FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for system daemon" 
ON public.characters FOR UPDATE 
TO authenticated 
USING (true);

-- 3. user_assets 테이블 보안 설정 (자신의 이메일 레코드만 읽고 쓰기 허용)
CREATE POLICY "Allow access to own user assets" 
ON public.user_assets FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = id) 
WITH CHECK (auth.jwt() ->> 'email' = id);

-- 4. user_votes 테이블 보안 설정 (자신의 이메일 투표 기록만 읽고 쓰기 허용)
CREATE POLICY "Allow access to own user votes" 
ON public.user_votes FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = user_id) 
WITH CHECK (auth.jwt() ->> 'email' = user_id);
```

---

## 5. Supabase 소셜 로그인 (Kakao & X/Twitter) 설정 방법

### [Kakao 로그인 설정]
#### ① Kakao Developers에서 애플리케이션 등록 및 키 발급
1. [Kakao Developers](https://developers.kakao.com/)에 로그인하여 **내 애플리케이션 > 애플리케이션 추가하기**를 진행합니다.
2. 생성된 애플리케이션의 **앱 키 > REST API 키**를 확인하고 복사합니다.
3. **제품 설정 > 카카오 로그인**으로 이동하여 **활성화 설정**을 **ON**으로 변경합니다.
4. **Redirect URI** 등록 설정에서 Supabase가 제공하는 Callback URL을 추가합니다.
   - Supabase 콘솔 > **Authentication > Providers > Kakao** 페이지에서 `Callback URL (Redirect URI)`을 복제하여 Kakao Developers의 Redirect URI에 등록해 줍니다. (예: `https://<your-project-id>.supabase.co/auth/v1/callback`)
5. **동의항목** 설정에서 필요한 사용자 정보(닉네임, 이메일 등) 권한을 선택하여 동의를 허용합니다. (이메일의 경우 검수 등을 거쳐 필수/선택 제공을 받아야 고유 식별 이메일 조회가 가능합니다.)

#### ② Supabase Dashboard에서 Kakao 인증 활성화
1. Supabase 프로젝트 콘솔의 **Authentication > Providers** 메뉴로 진입합니다.
2. 공급자 목록 중 **Kakao**를 찾아 활성화(Enabled)로 스위치를 켭니다.
3. Kakao Developers에서 복사해 온 **Kakao Client ID (REST API 키)**를 입력합니다.
4. 변경 사항을 저장(Save)합니다.

---

### [X (Twitter) 로그인 설정 - OAuth 2.0 (v2) 필수]
#### ① X Developer Portal에서 OAuth 2.0 애플리케이션 등록 및 Client ID/Secret 발급
1. [X Developer Portal](https://developer.x.com/)에 접속하여 프로젝트 및 App을 선택합니다.
2. App 설정의 **User authentication settings**를 구성(Set up)합니다.
   - **App permissions**: **Read** (또는 Read and write)
   - **Type of App**: **Web App, Automated App or Bot** (OAuth 2.0 지원을 위해 필수 선택)
   - **Callback URI / Redirect URL**: Supabase Twitter Provider 설정 페이지에서 제공하는 **Callback URL (Redirect URI)**을 정확히 입력합니다. (예: `https://<your-project-id>.supabase.co/auth/v1/callback`)
   - **Website URL**: 본인의 앱 혹은 웹사이트 주소
3. 설정을 완료하면 **OAuth 2.0 Client ID**와 **Client Secret**이 생성됩니다. 이 값을 복사하여 보관합니다.
4. (선택사항) Twitter API v1.1 겸용을 위해 상위의 **API Key** 및 **API Key Secret**(Consumer Key/Secret)도 함께 발급받아 둡니다.

#### ② Supabase Dashboard에서 Twitter(X) 인증 활성화 및 OAuth 2.0 설정
1. Supabase 프로젝트 웹 콘솔의 **Authentication > Providers** 메뉴로 진입합니다.
2. 공급자 목록 중 **Twitter**를 찾아 활성화(Enabled) 토글을 켭니다. **(※ 켜지 않으면 "Unsupported provider: provider is not enabled" 에러 발생)**
3. 기본 입력 란에 X Developer Portal에서 발급받은 **API Key (Consumer Key)**와 **API Key Secret (Consumer Secret)**을 입력합니다.
4. **중요: OAuth 2.0 활성화**
   - 아래쪽의 **OAuth 2.0 Client ID** 및 **OAuth 2.0 Client Secret** 입력란을 찾아서 발급받은 v2 Client ID/Secret을 입력합니다.
   - 이렇게 입력하면 Supabase가 자동으로 Twitter API v2 및 OAuth 2.0을 사용해 인증을 처리하게 됩니다.
5. 변경 사항을 저장(Save)합니다.

---

### ③ 오프라인/로컬 테스트 개발 환경 (Offline Mode)
* 로컬 개발 모드(Supabase 미설정 또는 오프라인)로 작동 시 각 소셜 로그인 버튼을 클릭하면 가상 로그인 정보(`google_avatar@gmail.com` 혹은 `x_avatar@x.com`)로 자동 전환되어 데이터 입출력 테스트를 지원합니다.

