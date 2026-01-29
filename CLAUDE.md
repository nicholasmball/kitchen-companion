# Kitchen Companion - Project Specification

## Overview

A Next.js 14+ app for home cooks to plan meal timings, get AI chef assistance, and store recipes. The app helps coordinate cooking multiple dishes to serve at the same time, provides an AI chef assistant for cooking guidance, and stores favourite recipes.

**Primary Use Case:** Someone cooking a complex meal (e.g., Sunday roast with meat, potatoes, vegetables, gravy) who needs help timing everything to be ready simultaneously.

**Live URL:** Deployed on Vercel (see environment configuration)

---

## Current Implementation Status

### Completed Features
- ✅ Authentication (email/password via Supabase)
- ✅ Dashboard with active meal plan widget and quick actions
- ✅ Meal timing planner with timeline calculations
- ✅ Label scanning via Claude Vision
- ✅ Browser notifications with audio alerts
- ✅ Timer display with countdown
- ✅ Chef assistant with streaming chat (British personality, metric/Celsius)
- ✅ Recipe CRUD (create, read, update, delete)
- ✅ Recipe import from URLs and images
- ✅ Recipe search and filters (cuisine, course, difficulty, time, favourites)
- ✅ Favourite recipes toggle
- ✅ Add recipe to meal plan
- ✅ Start cooking from recipe (creates plan and navigates to planner)
- ✅ Multi-recipe meal plan building

### Not Yet Implemented
- ❌ "Remember me" option on login
- ❌ Password reset flow
- ❌ Welcome message with user's name on dashboard
- ❌ Recent/favourite recipes sections on dashboard
- ❌ Save recipe from chat button
- ❌ Cooking mode for recipes (larger font, keep screen awake)
- ❌ Servings adjuster on recipe detail page
- ❌ Dark mode manual toggle (currently follows system preference only)
- ❌ Service Worker for true background notifications
- ❌ Recipe image upload to cloud storage
- ❌ Sound files (/public/sounds/*.mp3) - uses Web Audio API synthesis instead

---

## Tech Stack

- **Framework:** Next.js 14+ with App Router, TypeScript, Server Components where appropriate
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (Postgres + Auth + Row Level Security)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for chef assistant + vision capabilities for label/recipe scanning
- **Deployment:** Vercel
- **State Management:** React hooks
- **Notifications:** Browser Notification API + Web Audio API for alerts

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## Database Schema

Run this in Supabase SQL Editor:

```sql
-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- MEAL PLANS TABLE
-- Stores saved meal configurations (e.g., "Sunday Roast", "Christmas Dinner")
-- ============================================
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  serve_time timestamptz, -- When user wants everything ready
  is_active boolean default false, -- Only one active plan at a time per user
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster queries
create index meal_plans_user_id_idx on public.meal_plans(user_id);
create index meal_plans_is_active_idx on public.meal_plans(user_id, is_active) where is_active = true;

-- ============================================
-- MEAL ITEMS TABLE
-- Individual items within a meal plan
-- ============================================
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  name text not null,
  cook_time_minutes int not null,
  prep_time_minutes int default 0,
  rest_time_minutes int default 0, -- For meats that need to rest after cooking
  temperature int, -- Cooking temperature
  temperature_unit text default 'C' check (temperature_unit in ('C', 'F')),
  cooking_method text default 'oven' check (cooking_method in ('oven', 'hob', 'grill', 'microwave', 'air_fryer', 'slow_cooker', 'steamer', 'bbq', 'other')),
  instructions text, -- Specific cooking instructions
  notes text, -- Additional notes
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Index for faster queries
create index meal_items_meal_plan_id_idx on public.meal_items(meal_plan_id);

-- ============================================
-- RECIPES TABLE
-- User's saved recipe collection
-- ============================================
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  ingredients jsonb default '[]'::jsonb, -- [{amount: "2", unit: "cups", item: "flour", notes: "sifted"}]
  instructions text, -- Step-by-step instructions (markdown supported)
  prep_time_minutes int,
  cook_time_minutes int,
  total_time_minutes int generated always as (coalesce(prep_time_minutes, 0) + coalesce(cook_time_minutes, 0)) stored,
  servings int default 4,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  cuisine text, -- e.g., "Italian", "Mexican", "British"
  course text, -- e.g., "starter", "main", "dessert", "side"
  source_url text, -- If imported from a website
  source_name text, -- e.g., "BBC Good Food", "Grandma's cookbook"
  image_url text,
  tags text[] default '{}', -- e.g., ["vegetarian", "quick", "comfort food"]
  is_favourite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for faster queries
create index recipes_user_id_idx on public.recipes(user_id);
create index recipes_is_favourite_idx on public.recipes(user_id, is_favourite) where is_favourite = true;
create index recipes_tags_idx on public.recipes using gin(tags);

-- ============================================
-- CHAT SESSIONS TABLE (Optional - for persistent chat history)
-- ============================================
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Chat',
  messages jsonb default '[]'::jsonb, -- [{role: "user"|"assistant", content: "..."}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index chat_sessions_user_id_idx on public.chat_sessions(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.meal_plans enable row level security;
alter table public.meal_items enable row level security;
alter table public.recipes enable row level security;
alter table public.chat_sessions enable row level security;

-- Meal Plans: Users can only access their own
create policy "Users can view own meal plans" on public.meal_plans
  for select using (auth.uid() = user_id);
create policy "Users can insert own meal plans" on public.meal_plans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own meal plans" on public.meal_plans
  for update using (auth.uid() = user_id);
create policy "Users can delete own meal plans" on public.meal_plans
  for delete using (auth.uid() = user_id);

-- Meal Items: Users can access items in their meal plans
create policy "Users can view own meal items" on public.meal_items
  for select using (
    exists (
      select 1 from public.meal_plans 
      where meal_plans.id = meal_items.meal_plan_id 
      and meal_plans.user_id = auth.uid()
    )
  );
create policy "Users can insert own meal items" on public.meal_items
  for insert with check (
    exists (
      select 1 from public.meal_plans 
      where meal_plans.id = meal_items.meal_plan_id 
      and meal_plans.user_id = auth.uid()
    )
  );
create policy "Users can update own meal items" on public.meal_items
  for update using (
    exists (
      select 1 from public.meal_plans 
      where meal_plans.id = meal_items.meal_plan_id 
      and meal_plans.user_id = auth.uid()
    )
  );
create policy "Users can delete own meal items" on public.meal_items
  for delete using (
    exists (
      select 1 from public.meal_plans 
      where meal_plans.id = meal_items.meal_plan_id 
      and meal_plans.user_id = auth.uid()
    )
  );

-- Recipes: Users can only access their own
create policy "Users can view own recipes" on public.recipes
  for select using (auth.uid() = user_id);
create policy "Users can insert own recipes" on public.recipes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on public.recipes
  for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on public.recipes
  for delete using (auth.uid() = user_id);

-- Chat Sessions: Users can only access their own
create policy "Users can view own chat sessions" on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own chat sessions" on public.chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own chat sessions" on public.chat_sessions
  for update using (auth.uid() = user_id);
create policy "Users can delete own chat sessions" on public.chat_sessions
  for delete using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to ensure only one active meal plan per user
create or replace function public.ensure_single_active_meal_plan()
returns trigger as $$
begin
  if NEW.is_active = true then
    update public.meal_plans 
    set is_active = false 
    where user_id = NEW.user_id 
    and id != NEW.id 
    and is_active = true;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger single_active_meal_plan_trigger
  before insert or update on public.meal_plans
  for each row execute function public.ensure_single_active_meal_plan();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger update_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute function public.update_updated_at_column();

create trigger update_recipes_updated_at
  before update on public.recipes
  for each row execute function public.update_updated_at_column();

create trigger update_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.update_updated_at_column();
```

---

## Project Structure

```
/app
  /(auth)
    /login/page.tsx
    /signup/page.tsx
    /layout.tsx                 # Auth layout (no nav)
  /(main)
    /layout.tsx                 # Main app layout with navigation
    /page.tsx                   # Dashboard/Home
    /planner
      /page.tsx                 # Meal timing planner (list of plans)
      /[id]/page.tsx            # Specific saved meal plan detail
    /assistant/page.tsx         # Chef AI chat
    /recipes
      /page.tsx                 # Recipe collection list
      /[id]/page.tsx            # Single recipe view
      /new/page.tsx             # Add new recipe
      /[id]/edit/page.tsx       # Edit recipe
  /api
    /chat/route.ts              # Chef assistant streaming API
    /parse-label/route.ts       # Claude Vision for food labels
    /parse-recipe-image/route.ts # Claude Vision for recipe images
    /parse-recipe-url/route.ts  # Extract recipe from URL
  /auth
    /callback/route.ts          # Supabase auth callback handler
/components
  /ui/                          # shadcn/ui components
  /layout
    /navbar.tsx                 # Top navigation bar
    /mobile-nav.tsx             # Bottom navigation for mobile
  /planner
    /active-plan-widget.tsx     # Dashboard widget showing active plan
    /add-recipe-to-plan.tsx     # Add recipe from planner page
    /add-to-plan-dialog.tsx     # Add recipe to plan from recipe page
    /meal-plan-form.tsx         # Form to create/edit meal plan
    /meal-item-card.tsx         # Individual item in plan
    /meal-item-form.tsx         # Add/edit item modal
    /timeline-view.tsx          # Visual timeline of cooking schedule
    /timer-display.tsx          # Active timer countdown
    /label-scanner.tsx          # Camera/upload for label scanning
    /notification-prompt.tsx    # Request notification permission
  /recipes
    /recipe-card.tsx            # Recipe preview card
    /recipe-form.tsx            # Add/edit recipe form
    /recipe-importer.tsx        # URL/image import modal
  /assistant
    /chat-interface.tsx         # Main chat UI
    /chat-message.tsx           # Individual message bubble
    /chat-input.tsx             # Message input with suggestions
    /chat-history.tsx           # Chat session history sidebar
    /quick-actions.tsx          # Preset action buttons
  /shared
    /image-upload.tsx           # Reusable image upload component
/lib
  /supabase
    /client.ts                  # Browser Supabase client
    /server.ts                  # Server Supabase client
  /anthropic.ts                 # Claude API client setup
  /utils.ts                     # General utilities (cn function, etc.)
  /timing-calculator.ts         # Calculate cooking schedule from serve time
  /notifications.ts             # Browser notification helpers
  /audio.ts                     # Alert sound utilities (Web Audio API synthesis)
/hooks
  /use-meal-plan.ts             # Meal plan CRUD operations
  /use-recipes.ts               # Recipes CRUD operations
  /use-timers.ts                # Timer management
  /use-notifications.ts         # Notification permission & sending
  /use-chat.ts                  # Chat streaming state management
  /use-chat-sessions.ts         # Chat session persistence
/types
  /database.ts                  # Supabase generated types
  /index.ts                     # App-specific types
/middleware.ts                  # Auth middleware (root level)
/public
  /images/branding/mascot.png   # App mascot image
```

---

## Feature Specifications

### 1. Authentication

**Pages:** `/login`, `/signup`

**Requirements:**
- Email/password authentication via Supabase Auth
- "Remember me" option
- Password reset flow
- Redirect to dashboard after successful auth
- Protected routes redirect to login if not authenticated

**UI:**
- Clean, simple forms
- Show loading states during auth
- Display error messages clearly

---

### 2. Dashboard (Home Page)

**Page:** `/` (main layout)

**Requirements:**
- Welcome message with user's name (if available)
- **Active Meal Plan Widget:** If user has an active plan, show:
  - Plan name and serve time
  - Next upcoming action (e.g., "Put roast in oven in 15 mins")
  - Quick link to full planner
- **Quick Actions Grid:**
  - "Plan a Meal" → `/planner`
  - "Ask the Chef" → `/assistant`
  - "My Recipes" → `/recipes`
  - "Add Recipe" → `/recipes/new`
- **Recent Recipes:** Show last 4-6 recipes accessed
- **Favourite Recipes:** Quick access to favourites

---

### 3. Meal Timing Planner

**Pages:** `/planner`, `/planner/[id]`

**This is the core feature of the app.**

#### 3.1 Creating/Editing a Meal Plan

**Requirements:**
- **Meal Plan Details:**
  - Name (required): e.g., "Sunday Roast"
  - Description (optional)
  - Serve Time (required): Date/time picker for when food should be ready

- **Adding Items:** Each item needs:
  - Name (required): e.g., "Roast Chicken"
  - Cooking Method: Dropdown (oven, hob, grill, microwave, air fryer, slow cooker, steamer, BBQ, other)
  - Temperature: Number input
  - Temperature Unit: Toggle C/F
  - Cook Time: Minutes (required)
  - Prep Time: Minutes (optional) - time to prepare before cooking
  - Rest Time: Minutes (optional) - especially for meats
  - Instructions: Text area for specific steps
  - Notes: Additional info

- **Label Scanning Feature:**
  - Button to "Scan Label" opens camera or file picker
  - Send image to Claude Vision API
  - Extract: cook time, temperature, cooking method, any instructions
  - Pre-fill the form with extracted data
  - User can review and edit before saving

#### 3.2 Timeline Calculation

**Algorithm:**
```
For each item, calculate:
  - start_prep_time = serve_time - cook_time - prep_time - rest_time
  - start_cook_time = serve_time - cook_time - rest_time
  - end_cook_time = serve_time - rest_time
  - serve_ready_time = serve_time

Sort all events chronologically and display as timeline
```

**Timeline Display:**
- Visual timeline showing all events
- Color-coded by item
- Clear labels: "Start prepping [X]", "Put [X] in oven at 180°C", "Take [X] out", "Rest [X]", "Serve!"
- Current time indicator
- Countdown to next action

#### 3.3 Notifications & Alarms

**Requirements:**
- Request notification permission on first use (with explanation of why)
- Store permission state
- Set browser notifications for each event:
  - 5 minutes before: "Get ready to [action]"
  - At time: "[Action] now!"
- Play audio alert with notification
- Notifications must work even if tab is in background (use Service Worker if needed)
- Allow user to dismiss/snooze notifications
- Visual in-app alert as backup

**Notification Types:**
```typescript
type NotificationType = 
  | 'prep_start'      // Time to start prepping
  | 'cook_start'      // Put item on/in
  | 'cook_end'        // Take item out
  | 'rest_start'      // Start resting period
  | 'serve'           // Time to serve
```

#### 3.4 Saved Meal Plans

**Requirements:**
- Save current meal plan for future use
- List all saved meal plans
- Load a saved plan (creates copy with new serve time)
- Edit saved plans
- Delete saved plans
- Mark one plan as "active" - this is what shows on dashboard

---

### 4. Chef Assistant

**Page:** `/assistant`

**An AI-powered cooking assistant using Claude API.**

#### 4.1 Chat Interface

**Requirements:**
- Clean chat UI with message bubbles
- User messages on right, assistant on left
- Streaming responses (show text as it generates)
- Markdown rendering for assistant responses
- Code blocks for recipes (if provided in structured format)
- Typing indicator while generating

#### 4.2 System Prompt

The chef assistant has a **British personality** - uses Celsius, metric measurements, and British cooking terminology (hob, grill, etc.).

```
You are an expert British chef assistant with decades of professional kitchen experience. You help home cooks with:

- Cooking techniques and tips
- Recipe suggestions and modifications
- Ingredient substitutions
- Food safety guidance
- Timing and coordination advice
- Troubleshooting cooking problems
- Explaining culinary terms and methods

Your personality:
- Warm, encouraging, and patient like a friendly British cooking show host
- Practical and focused on home cooking realities
- Happy to explain the "why" behind techniques
- Honest about difficulty levels
- Safety-conscious, especially regarding food temperatures and allergens

Important:
- Always use Celsius for temperatures (e.g., "180°C" not "350°F")
- Use metric measurements primarily (grams, ml, litres)
- Use British terminology: "hob" not "stovetop", "grill" not "broiler", "cling film" not "plastic wrap"

When providing recipes, structure them clearly with:
- Ingredients list with quantities (metric)
- Step-by-step instructions
- Tips for success
- Common mistakes to avoid

{If user has active meal plan, include context here}
```

#### 4.3 Context Awareness

**Requirements:**
- If user has an active meal plan, include it in the system prompt
- Assistant can reference what user is currently cooking
- Assistant can offer advice specific to the current meal

#### 4.4 Web Search Integration

**Status: NOT IMPLEMENTED**

The Claude API does not have built-in web search capabilities. To add this feature, would need to integrate a search API (e.g., Serper, Tavily, or similar) and pass results as context to Claude.

**Original Requirements (for future implementation):**
- When user asks for specific recipes or guides, search the web
- Provide source links in responses
- Offer to save found recipes to user's collection

#### 4.5 Quick Actions

**Preset buttons for common queries:**
- "Help with my current meal" (only if active plan exists)
- "Suggest a recipe for tonight"
- "What can I substitute for...?"
- "How do I know when it's done?"
- "Convert measurements"
- "Food safety question"

#### 4.6 Save to Recipes

**Requirements:**
- When assistant provides a recipe, show "Save to My Recipes" button
- Parse the recipe from the response
- Open pre-filled recipe form for user to confirm/edit
- Save to recipes collection

---

### 5. Recipe Collection

**Pages:** `/recipes`, `/recipes/[id]`, `/recipes/new`, `/recipes/[id]/edit`

#### 5.1 Recipe List Page

**Requirements:**
- Grid/list view of all recipes
- Search by title, ingredients, tags
- Filter by:
  - Favourites only
  - Cuisine type
  - Course (starter, main, dessert, side)
  - Difficulty
  - Time (quick <30min, medium 30-60min, long >60min)
- Sort by: Date added, alphabetical, cook time
- Pagination or infinite scroll

**Recipe Card shows:**
- Image (if available) or placeholder
- Title
- Cook time
- Difficulty
- Favourite star
- Quick actions (edit, delete, favourite)

#### 5.2 Recipe Detail Page

**Requirements:**
- Large, readable format optimized for kitchen use
- **"Cooking Mode" toggle:** Increases font size, simplifies UI, keeps screen awake
- Recipe image (full width on mobile)
- Title, description
- Meta info: prep time, cook time, total time, servings, difficulty
- **Servings adjuster:** +/- buttons to scale recipe
- Ingredients list (scales with servings)
- Instructions (numbered steps, large text)
- Source link (if imported from URL)
- Notes section
- Tags
- Edit/Delete buttons
- "Add to Meal Plan" button
- "Start Cooking" → Opens planner with this recipe's items

#### 5.3 Add/Edit Recipe

**Manual Entry Form:**
- Title (required)
- Description
- Image upload
- Ingredients (dynamic list):
  - Amount (number)
  - Unit (dropdown: g, kg, ml, l, tsp, tbsp, cup, oz, lb, piece, pinch, etc.)
  - Item name
  - Notes (optional, e.g., "finely chopped")
  - Add/remove ingredient rows
- Instructions (rich text or markdown)
- Prep time, cook time (minutes)
- Servings
- Difficulty (easy/medium/hard)
- Cuisine
- Course
- Tags (multi-select or free entry)
- Source name, source URL
- Notes

#### 5.4 Import from Image

**Requirements:**
- Upload image of cookbook page, handwritten recipe, or screenshot
- Send to Claude Vision API with prompt to extract recipe
- Parse response into structured recipe format
- Pre-fill recipe form
- User reviews and saves

**Claude Vision Prompt:**
```
Analyze this image of a recipe and extract the following information in JSON format:
{
  "title": "Recipe name",
  "description": "Brief description if visible",
  "ingredients": [
    {"amount": "2", "unit": "cups", "item": "flour", "notes": "sifted"}
  ],
  "instructions": "Step by step instructions as a single string with numbered steps",
  "prep_time_minutes": null or number,
  "cook_time_minutes": null or number,
  "servings": null or number,
  "difficulty": "easy" | "medium" | "hard" | null,
  "notes": "Any additional notes or tips"
}

If any field is not visible or cannot be determined, use null.
Extract all ingredients you can see, preserving quantities and units.
For instructions, number each step clearly.
```

#### 5.5 Import from URL

**Requirements:**
- User pastes recipe URL
- Fetch page content (may need server-side fetch to avoid CORS)
- Send content to Claude to extract recipe data
- Handle various recipe site formats
- Pre-fill recipe form
- Store source URL for reference

**Claude Prompt for URL Parsing:**
```
Extract the recipe from this webpage content and return as JSON:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": [{"amount": "", "unit": "", "item": "", "notes": ""}],
  "instructions": "Numbered steps",
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "servings": number or null,
  "difficulty": "easy" | "medium" | "hard" | null,
  "cuisine": "cuisine type if mentioned" or null,
  "course": "meal course if mentioned" or null
}

Focus on extracting the actual recipe content, ignoring ads, comments, and story content.
```

---

## UI/UX Requirements

### Mobile-First Design

**This app will primarily be used in the kitchen, often with messy hands.**

- **Large touch targets:** Minimum 44x44px for all interactive elements
- **Simple gestures:** Avoid complex swipes, prefer taps
- **Bottom navigation:** 4 items on mobile (Home, Planner, Chef, Recipes)
- **Readable fonts:** Minimum 16px body text, larger in "cooking mode"
- **High contrast:** Ensure readability in various lighting conditions
- **Sticky headers:** Important info (timers, next action) always visible

### Timer Visibility

- Active timers shown in sticky header bar
- Countdown displays prominently
- Color changes as time gets critical (green → yellow → red)
- Pulsing animation when action required

### Responsive Breakpoints

- Mobile: < 768px (primary design target)
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Dark Mode

- Support system preference
- Manual toggle in settings
- Ensure all components work in both modes

### Loading States

- Skeleton loaders for content
- Spinner for actions
- Optimistic updates where appropriate

### Error Handling

- Clear error messages
- Retry options
- Offline indication (app won't work offline, but should indicate clearly)

---

## API Routes

### POST `/api/chat`

Chef assistant streaming endpoint.

```typescript
// Request
{
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  activeMealPlan?: MealPlan // Include if user has active plan
}

// Response: Streaming text
```

### POST `/api/parse-label`

Parse food label image.

```typescript
// Request
{
  image: string // Base64 encoded image
}

// Response
{
  success: boolean,
  data?: {
    name?: string,
    cook_time_minutes?: number,
    temperature?: number,
    temperature_unit?: 'C' | 'F',
    cooking_method?: string,
    instructions?: string
  },
  error?: string
}
```

### POST `/api/parse-recipe-image`

Extract recipe from image.

```typescript
// Request
{
  image: string // Base64 encoded image
}

// Response
{
  success: boolean,
  data?: Recipe, // Structured recipe object
  error?: string
}
```

### POST `/api/parse-recipe-url`

Extract recipe from URL.

```typescript
// Request
{
  url: string
}

// Response
{
  success: boolean,
  data?: Recipe,
  error?: string
}
```

---

## Implementation Order

Build in this sequence for best incremental progress:

### Phase 1: Foundation
1. Initialize Next.js project with TypeScript
2. Set up Tailwind CSS and shadcn/ui
3. Configure Supabase client (browser + server)
4. Run database migrations in Supabase
5. Implement authentication (login, signup, protected routes)
6. Create main layout with responsive navigation

### Phase 2: Recipes (simpler CRUD first)
7. Recipe list page with basic display
8. Recipe detail page
9. Add recipe form (manual entry)
10. Edit/delete recipes
11. Search and filter functionality
12. Favourite toggle

### Phase 3: Recipe Import
13. Set up Anthropic API client
14. Image upload component
15. API route for recipe image parsing
16. API route for URL parsing
17. Import UI with preview and edit

### Phase 4: Meal Planner (core feature)
18. Meal plan creation form
19. Add/edit meal items
20. Timeline calculation logic
21. Timeline visualization component
22. Save/load meal plans
23. Active meal plan dashboard widget

### Phase 5: Label Scanning
24. Label scanner component (camera/upload)
25. API route for label parsing
26. Integration with meal item form

### Phase 6: Notifications & Timers
27. Notification permission handling
28. Timer management system
29. Audio alert system
30. Background notification via Service Worker
31. In-app timer display

### Phase 7: Chef Assistant
32. Chat UI components
33. Streaming API route
34. Context awareness (active meal plan)
35. Web search integration
36. Save recipe from chat
37. Quick action buttons

### Phase 8: Polish
38. Loading states and skeletons
39. Error handling improvements
40. Empty states
41. "Cooking mode" for recipes
42. Dark mode support
43. Performance optimization
44. Testing on various devices

### Phase 9: Deployment
45. Environment variable configuration
46. Vercel deployment
47. Custom domain (if applicable)
48. Final testing in production

---

## Code Conventions

### TypeScript
- Strict mode enabled
- Explicit return types on functions
- Use interfaces for object shapes
- Prefer `type` for unions and primitives

### React
- Functional components only
- Use Server Components where possible (data fetching, no interactivity)
- Client Components for interactivity (`'use client'` directive)
- Custom hooks for reusable logic

### Naming
- Components: PascalCase (`MealPlanCard.tsx`)
- Hooks: camelCase with `use` prefix (`useMealPlan.ts`)
- Utilities: camelCase (`calculateTimeline.ts`)
- Types: PascalCase (`MealPlan`, `Recipe`)

### File Organization
- One component per file
- Co-locate component-specific styles/types
- Shared types in `/types`
- Shared utilities in `/lib`

### Supabase
- Use generated types from `supabase gen types`
- Always handle errors from Supabase calls
- Use RLS, never bypass security

### API Routes
- Validate input
- Return consistent response format
- Handle errors gracefully
- Use appropriate HTTP status codes

---

## Testing Checklist

Before considering each feature complete:

- [ ] Works on mobile (primary target)
- [ ] Works on desktop
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Handles empty states
- [ ] Accessible (keyboard navigation, screen reader basics)
- [ ] Dark mode compatible
- [ ] Data persists correctly
- [ ] Protected routes work

---

## Acceptance Criteria

The app is complete when:

- [x] User can sign up and log in
- [x] User can create a meal plan with multiple items
- [x] User can set a serve time and see calculated timeline
- [x] User can scan a food label and have details extracted
- [x] Notifications fire at correct times (with permission)
- [x] Audio alerts play with notifications
- [x] User can save and load meal plans
- [x] User can chat with the chef assistant
- [x] Chef assistant responses stream in real-time
- [ ] Chef assistant can search web for recipes when asked (not implemented - requires external search API)
- [ ] User can save recipes from chat (not implemented)
- [x] User can manually add recipes
- [x] User can import recipes from images
- [x] User can import recipes from URLs
- [x] User can edit and delete recipes
- [x] User can favourite recipes
- [x] User can search and filter recipes
- [ ] User can scale recipe servings (not implemented)
- [x] App is responsive and works on mobile
- [x] App works in dark mode (system preference)
- [x] App is deployed to Vercel
- [x] All data persists in Supabase

---

## Notes for Development

- Start simple, iterate. Don't over-engineer initially.
- Test on actual mobile device during development, not just browser emulation
- The timer/notification system is complex - consider using a library or service worker carefully
- Claude Vision API has usage limits - implement appropriate error handling
- Recipe parsing from URLs is imperfect - always allow user to edit extracted data
- Keep the UI clean and simple - this is used while cooking!
