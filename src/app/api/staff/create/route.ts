import { NextRequest, NextResponse } from 'next/server'
import { createStaffAccount } from '@/app/actions/staff'

export async function POST(request: NextRequest) {
    try {
        const { username, password, name } = await request.json()

        if (!username || !password) {
            return NextResponse.json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 })
        }

        const result = await createStaffAccount(username, password, name)

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('Create staff API error:', error)
        const message = error instanceof Error ? error.message : '계정 생성 중 오류가 발생했습니다.'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
