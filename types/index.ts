// Re-export database types
export * from './database'

// Timeline event types for the meal planner
export type TimelineEventType =
  | 'prep_start'
  | 'cook_start'
  | 'cook_end'
  | 'rest_start'
  | 'serve'

export interface TimelineEvent {
  id: string
  mealItemId: string
  mealItemName: string
  type: TimelineEventType
  time: Date
  description: string
  temperature?: number
  temperatureUnit?: 'C' | 'F'
  cookingMethod?: string
}

// Notification types
export type NotificationType = TimelineEventType

export interface ScheduledNotification {
  id: string
  eventId: string
  time: Date
  title: string
  body: string
  type: NotificationType
}

// Timer state for active cooking
export interface ActiveTimer {
  id: string
  mealItemId: string
  mealItemName: string
  startTime: Date
  endTime: Date
  type: 'prep' | 'cook' | 'rest'
  isPaused: boolean
  pausedAt?: Date
}

// Label parsing result from Claude Vision
export interface ParsedLabel {
  name?: string
  cook_time_minutes?: number
  temperature?: number
  temperature_unit?: 'C' | 'F'
  cooking_method?: string
  instructions?: string
}

// Recipe parsing result from Claude Vision
export interface ParsedRecipe {
  title: string
  description?: string
  ingredients: Array<{
    amount: string
    unit: string
    item: string
    notes?: string
  }>
  instructions: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  rest_time_minutes?: number
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  cuisine?: string
  course?: string
  notes?: string
}

// User preferences (could be stored in local storage or user metadata)
export interface UserPreferences {
  temperatureUnit: 'C' | 'F'
  notificationsEnabled: boolean
  soundEnabled: boolean
  darkMode: 'system' | 'light' | 'dark'
}
