-- 1. Applications 테이블 스키마 변경
-- status 컬럼 추가 (기본값: pending)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
-- marketing_type 컬럼 추가
ALTER TABLE applications ADD COLUMN IF NOT EXISTS marketing_type text;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_marketing_type ON applications(marketing_type);

-- 2. 기존 데이터 마이그레이션 (Applications)
-- 모든 기존 신청서의 status를 'pending'으로 설정
UPDATE applications SET status = 'pending' WHERE status IS NULL;

-- 기존 신청서의 marketing_type을 추론하여 업데이트
-- '블로그'가 포함된 경우 'blog_reporter'로 설정 (기본값)
UPDATE applications 
SET marketing_type = 'blog_reporter' 
WHERE marketing_type IS NULL AND (notes LIKE '%블로그%' OR notes LIKE '%blog%');

-- 나머지는 'etc'로 설정
UPDATE applications 
SET marketing_type = 'etc' 
WHERE marketing_type IS NULL;

-- 3. 인증(Auth) 및 프로필(Profiles) 데이터 마이그레이션 (SQL 예시)
-- 주의: 실제 비밀번호 변경은 Supabase Admin API를 사용하는 것이 안전합니다.
-- 아래 SQL은 로직을 설명하기 위한 예시이며, auth.users 테이블 직접 수정은 권장되지 않습니다.

/*
-- 가상 시나리오: 이메일 도메인 변경 (@test.com -> @vision.local)
UPDATE auth.users
SET email = split_part(email, '@', 1) || '@vision.local',
    raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{username}', to_jsonb(split_part(email, '@', 1)))
WHERE email LIKE '%@test.com';

-- 프로필 테이블 동기화
UPDATE public.profiles
SET email = split_part(email, '@', 1) || '@vision.local'
WHERE email LIKE '%@test.com';
*/
