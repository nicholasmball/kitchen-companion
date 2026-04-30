// Database types matching the Supabase schema
// These provide type safety when querying the database

export type Database = {
  public: {
    Tables: {
      meal_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          serve_time: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          paused_at: string | null
          total_pause_seconds: number
          padding_minutes: number
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          serve_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          paused_at?: string | null
          total_pause_seconds?: number
          padding_minutes?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          serve_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          paused_at?: string | null
          total_pause_seconds?: number
          padding_minutes?: number
        }
      }
      meal_items: {
        Row: {
          id: string
          meal_plan_id: string
          name: string
          cook_time_minutes: number
          prep_time_minutes: number
          rest_time_minutes: number
          temperature: number | null
          temperature_unit: 'C' | 'F'
          cooking_method: CookingMethod
          instructions: string | null
          notes: string | null
          sort_order: number
          created_at: string
          recipe_id: string | null
          ingredients: Ingredient[] | null
          recipe_snapshot_at: string | null
        }
        Insert: {
          id?: string
          meal_plan_id: string
          name: string
          cook_time_minutes: number
          prep_time_minutes?: number
          rest_time_minutes?: number
          temperature?: number | null
          temperature_unit?: 'C' | 'F'
          cooking_method?: CookingMethod
          instructions?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string
          recipe_id?: string | null
          ingredients?: Ingredient[] | null
          recipe_snapshot_at?: string | null
        }
        Update: {
          id?: string
          meal_plan_id?: string
          name?: string
          cook_time_minutes?: number
          prep_time_minutes?: number
          rest_time_minutes?: number
          temperature?: number | null
          temperature_unit?: 'C' | 'F'
          cooking_method?: CookingMethod
          instructions?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string
          recipe_id?: string | null
          ingredients?: Ingredient[] | null
          recipe_snapshot_at?: string | null
        }
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          ingredients: Ingredient[]
          instructions: string | null
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          rest_time_minutes: number | null
          total_time_minutes: number | null
          servings: number
          difficulty: Difficulty | null
          cuisine: string | null
          course: string | null
          source_url: string | null
          source_name: string | null
          image_url: string | null
          tags: string[]
          is_favourite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          ingredients?: Ingredient[]
          instructions?: string | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          rest_time_minutes?: number | null
          servings?: number
          difficulty?: Difficulty | null
          cuisine?: string | null
          course?: string | null
          source_url?: string | null
          source_name?: string | null
          image_url?: string | null
          tags?: string[]
          is_favourite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          ingredients?: Ingredient[]
          instructions?: string | null
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          rest_time_minutes?: number | null
          servings?: number
          difficulty?: Difficulty | null
          cuisine?: string | null
          course?: string | null
          source_url?: string | null
          source_name?: string | null
          image_url?: string | null
          tags?: string[]
          is_favourite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          messages: ChatMessage[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          messages?: ChatMessage[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          messages?: ChatMessage[]
          created_at?: string
          updated_at?: string
        }
      }
      bug_reports: {
        Row: {
          id: string
          user_id: string
          description: string
          page_url: string | null
          user_agent: string | null
          status: 'new' | 'reviewed' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          description: string
          page_url?: string | null
          user_agent?: string | null
          status?: 'new' | 'reviewed' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          description?: string
          page_url?: string | null
          user_agent?: string | null
          status?: 'new' | 'reviewed' | 'resolved'
          created_at?: string
        }
      }
      alexa_links: {
        Row: {
          id: string
          user_id: string
          amazon_user_id: string | null
          linking_code: string | null
          linking_code_expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amazon_user_id?: string | null
          linking_code?: string | null
          linking_code_expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amazon_user_id?: string | null
          linking_code?: string | null
          linking_code_expires_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          temperature_unit: 'C' | 'F'
          measurement_system: 'metric' | 'imperial'
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          temperature_unit?: 'C' | 'F'
          measurement_system?: 'metric' | 'imperial'
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          temperature_unit?: 'C' | 'F'
          measurement_system?: 'metric' | 'imperial'
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Enum types
export type CookingMethod =
  | 'oven'
  | 'hob'
  | 'grill'
  | 'microwave'
  | 'air_fryer'
  | 'slow_cooker'
  | 'steamer'
  | 'bbq'
  | 'other'

export type Difficulty = 'easy' | 'medium' | 'hard'

// Ingredient structure for recipes
export interface Ingredient {
  amount: string
  unit: string
  item: string
  notes?: string
}

// Chat message structure
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Helper types for easier use
export type MealPlan = Database['public']['Tables']['meal_plans']['Row']
export type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert']
export type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update']

export type MealItem = Database['public']['Tables']['meal_items']['Row']
export type MealItemInsert = Database['public']['Tables']['meal_items']['Insert']
export type MealItemUpdate = Database['public']['Tables']['meal_items']['Update']

export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update']

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type BugReport = Database['public']['Tables']['bug_reports']['Row']
export type BugReportInsert = Database['public']['Tables']['bug_reports']['Insert']

export type AlexaLink = Database['public']['Tables']['alexa_links']['Row']
export type AlexaLinkInsert = Database['public']['Tables']['alexa_links']['Insert']
export type AlexaLinkUpdate = Database['public']['Tables']['alexa_links']['Update']
