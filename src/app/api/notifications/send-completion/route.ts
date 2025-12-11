'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendApplicationCompletedNotification } from '@/app/actions/notification'

export async function POST(request: NextRequest) {
    try {
        const { applicationId, userId, marketingType } = await request.json()

        if (!applicationId || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify admin/staff permission
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        // Get user profile for phone
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('phone, username')
            .eq('id', userId)
            .single() as { data: { phone?: string; username?: string } | null }

        if (!userProfile?.phone) {
            return NextResponse.json(
                { error: 'User phone number not found' },
                { status: 404 }
            )
        }

        // Send notification
        await sendApplicationCompletedNotification({
            recipientPhone: userProfile.phone,
            applicationType: marketingType || 'etc'
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Notification API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
