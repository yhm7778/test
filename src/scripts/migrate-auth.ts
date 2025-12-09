import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function migrateAuth() {
    console.log('Starting Auth Migration...')

    // 1. Fetch all users
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log(`Found ${users.length} users.`)

    for (const user of users) {
        const oldEmail = user.email || ''
        if (!oldEmail) continue

        // Check if already migrated or not a target
        if (oldEmail.endsWith('@vision.local')) {
            console.log(`User ${oldEmail} already migrated. Skipping.`)
            continue
        }

        const username = oldEmail.split('@')[0]
        const newEmail = `${username}@vision.local`
        const newPassword = 'test123'

        console.log(`Migrating ${oldEmail} -> ${newEmail} (Username: ${username})`)

        try {
            // 2. Update Auth User (Email + Password + Metadata)
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                {
                    email: newEmail,
                    password: newPassword,
                    email_confirm: true,
                    user_metadata: {
                        ...user.user_metadata,
                        username: username
                    }
                }
            )

            if (updateError) {
                console.error(`Failed to update auth user ${oldEmail}:`, updateError.message)
                continue
            }

            // 3. Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ email: newEmail })
                .eq('id', user.id)

            if (profileError) {
                console.error(`Failed to update profile for ${oldEmail}:`, profileError.message)
            } else {
                console.log(`Successfully migrated ${oldEmail}`)
            }

        } catch (err) {
            console.error(`Unexpected error for ${oldEmail}:`, err)
        }
    }

    console.log('Auth Migration Completed.')
}

async function migrateApplications() {
    console.log('Starting Applications Data Migration...')

    // 1. Update Status to 'pending' where null
    const { error: statusError } = await supabase
        .from('applications')
        .update({ status: 'pending' })
        .is('status', null)
    
    if (statusError) console.error('Error updating status:', statusError)
    else console.log('Updated status to pending for old records.')

    // 2. Update Marketing Type based on notes
    // Note: Supabase JS filter limitation for OR/LIKE might be tricky, 
    // simpler to fetch all and update if dataset is small, or use raw SQL via RPC if available.
    // For now, we'll try to update broadly or use a simple heuristic.
    
    // Fetch applications with null marketing_type
    const { data: apps, error: fetchError } = await supabase
        .from('applications')
        .select('id, notes')
        .is('marketing_type', null)

    if (fetchError) {
        console.error('Error fetching applications:', fetchError)
        return
    }

    console.log(`Found ${apps?.length || 0} applications to update.`)

    if (apps) {
        for (const app of apps) {
            let type = 'etc'
            if (app.notes && (app.notes.includes('블로그') || app.notes.includes('blog'))) {
                type = 'blog_reporter'
            }
            // Add more logic if needed

            const { error: updateAppError } = await supabase
                .from('applications')
                .update({ marketing_type: type })
                .eq('id', app.id)
            
            if (updateAppError) {
                console.error(`Failed to update app ${app.id}:`, updateAppError)
            }
        }
    }

    console.log('Applications Data Migration Completed.')
}

async function main() {
    await migrateAuth()
    await migrateApplications()
}

main()
