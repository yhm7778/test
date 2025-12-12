export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          username: string | null
          role: 'admin' | 'staff' | 'client'
          created_at: string
          scheduled_deletion_at: string | null
          max_requests: number | null
          phone: string | null
        }
        Insert: {
          id: string
          email?: string | null
          username?: string | null
          role?: 'admin' | 'staff' | 'client'
          created_at?: string
          scheduled_deletion_at?: string | null
          max_requests?: number | null
          phone?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          role?: 'admin' | 'staff' | 'client'
          created_at?: string
          scheduled_deletion_at?: string | null
          max_requests?: number | null
          phone?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          store_name: string
          keywords: string[] | null
          advantages: string | null
          tags: string[] | null
          place_url: string | null
          notes: string | null
          photo_urls: string[] | null
          expire_at: string | null
          status: string
          marketing_type: string | null
          completion_date: string | null
          is_hidden: boolean
          files_deleted: boolean
          before_content: string | null
          after_content: string | null
          before_media_urls: string[] | null
          after_media_urls: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          store_name: string
          keywords?: string[] | null
          advantages?: string | null
          tags?: string[] | null
          place_url?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          expire_at?: string | null
          status?: string
          marketing_type?: string | null
          completion_date?: string | null
          is_hidden?: boolean
          files_deleted?: boolean
          before_content?: string | null
          after_content?: string | null
          before_media_urls?: string[] | null
          after_media_urls?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          store_name?: string
          keywords?: string[] | null
          advantages?: string | null
          tags?: string[] | null
          place_url?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          expire_at?: string | null
          status?: string
          marketing_type?: string | null
          completion_date?: string | null
          is_hidden?: boolean
          files_deleted?: boolean
          before_content?: string | null
          after_content?: string | null
          before_media_urls?: string[] | null
          after_media_urls?: string[] | null
        }
        Relationships: []
      }
      staff_requests: {
        Row: {
          id: string
          email: string
          name: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          label: string
          href: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          href: string
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          href?: string
          order?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
