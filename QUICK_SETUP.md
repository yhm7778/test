# Supabase 프로젝트 빠른 설정 가이드

## 1단계: Supabase 프로젝트 생성

1. <https://supabase.com> 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New project" 클릭
5. 프로젝트 정보 입력:
   - Name: `vision-marketing`
   - Database Password: 안전한 비밀번호 생성 (저장 필수!)
   - Region: `Northeast Asia (Seoul)` 선택
   - Pricing Plan: `Free` 선택
6. "Create new project" 클릭 (약 2분 소요)

## 2단계: 데이터베이스 설정

1. Supabase Dashboard → 왼쪽 메뉴 → **SQL Editor** 클릭
2. "New query" 클릭
3. `supabase-setup.sql` 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭 (Ctrl+Enter)
5. 성공 메시지 확인: "Success. No rows returned"

## 3단계: Storage 버킷 생성

1. Supabase Dashboard → 왼쪽 메뉴 → **Storage** 클릭
2. "Create a new bucket" 클릭
3. 버킷 설정:
   - Name: `applications`
   - Public bucket: ✅ **체크**
4. "Create bucket" 클릭

## 4단계: API 키 복사

1. Supabase Dashboard → 왼쪽 메뉴 → **Settings** (톱니바퀴) → **API** 클릭
2. 다음 값들을 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (긴 토큰)

## 5단계: 환경 변수 설정

`.env.local` 파일을 열고 복사한 값으로 수정:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
RESEND_API_KEY=re_your-resend-key-here
```

## 6단계: 개발 서버 재시작

```bash
# 현재 실행 중인 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

## 7단계: 첫 관리자 계정 생성

1. <http://localhost:3000/login> 접속
2. 이메일/비밀번호로 회원가입
3. Supabase Dashboard → **Table Editor** → **profiles** 테이블
4. 방금 생성한 사용자의 `role`을 `admin`으로 변경
5. 로그아웃 후 다시 로그인

## ✅ 완료

이제 모든 기능을 사용할 수 있습니다:

- ✅ 회원가입/로그인
- ✅ 마케팅 신청 (<http://localhost:3000/apply>)
- ✅ 관리자 대시보드 (<http://localhost:3000/admin>)
- ✅ 클라이언트 대시보드 (<http://localhost:3000/my>)

## 🔧 문제 해결

### "Invalid API key" 에러

- `.env.local` 파일의 키가 정확한지 확인
- 개발 서버 재시작

### 로그인 후 프로필 없음

- Supabase Dashboard → Authentication → Users에서 사용자 확인
- profiles 테이블에 자동으로 생성되었는지 확인

### 사진 업로드 실패

- Storage 버킷이 Public인지 확인
- 버킷 이름이 정확히 `applications`인지 확인
