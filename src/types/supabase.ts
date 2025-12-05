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
          role: 'admin' | 'staff' | 'client'
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role?: 'admin' | 'staff' | 'client'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'admin' | 'staff' | 'client'
          created_at?: string
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
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
