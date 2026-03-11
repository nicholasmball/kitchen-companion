import { createClient } from '@supabase/supabase-js'
import type { MealPlan, MealItem, Profile } from '@/types/database'

// Service-role client that bypasses RLS (server-side only)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface AlexaUser {
  userId: string
  profile: Profile
}

/**
 * Resolve an Amazon user ID to a Cat's Kitchen user via the alexa_links table.
 * Returns the user ID and profile, or null if not linked.
 */
export async function resolveAlexaUser(amazonUserId: string): Promise<AlexaUser | null> {
  const supabase = createServiceClient()

  const { data: link } = await supabase
    .from('alexa_links')
    .select('user_id')
    .eq('amazon_user_id', amazonUserId)
    .single()

  if (!link) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', link.user_id)
    .single()

  if (!profile) return null

  return { userId: link.user_id, profile: profile as Profile }
}

export interface ActiveMealPlanWithItems {
  plan: MealPlan
  items: MealItem[]
}

/**
 * Fetch the user's active meal plan with all its items.
 * Returns null if no active plan exists.
 */
export async function getActiveMealPlan(userId: string): Promise<ActiveMealPlanWithItems | null> {
  const supabase = createServiceClient()

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!plan) return null

  const { data: items } = await supabase
    .from('meal_items')
    .select('*')
    .eq('meal_plan_id', plan.id)
    .order('sort_order', { ascending: true })

  return {
    plan: plan as MealPlan,
    items: (items || []) as MealItem[],
  }
}

/**
 * Validate a linking code and bind the Amazon user ID to the Cat's Kitchen user.
 * Returns the user_id on success, or null if the code is invalid/expired.
 */
export async function redeemLinkingCode(
  code: string,
  amazonUserId: string
): Promise<string | null> {
  const supabase = createServiceClient()

  // Find the code (case-insensitive match)
  const { data: link } = await supabase
    .from('alexa_links')
    .select('id, user_id, linking_code_expires_at')
    .eq('linking_code', code.toUpperCase())
    .single()

  if (!link) return null

  // Check expiry
  if (link.linking_code_expires_at && new Date(link.linking_code_expires_at) < new Date()) {
    return null
  }

  // Bind the Amazon user ID and clear the code
  const { error } = await supabase
    .from('alexa_links')
    .update({
      amazon_user_id: amazonUserId,
      linking_code: null,
      linking_code_expires_at: null,
    })
    .eq('id', link.id)

  if (error) {
    console.error('Failed to redeem linking code:', error)
    return null
  }

  return link.user_id
}
