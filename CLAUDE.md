# Cat's Kitchen Companion

A Next.js app for home cooks to plan meal timings, get AI chef assistance, and store recipes.

**Live URL:** https://catskitchen.co.uk

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, Server Components)
- **Styling:** Tailwind CSS + shadcn/ui + Nunito font
- **Database:** Supabase (Postgres + Auth + Row Level Security + Storage)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for chat + vision
- **Anti-abuse:** Cloudflare Turnstile (CAPTCHA on auth forms)
- **Deployment:** Vercel

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

---

## Project Structure

```
/app
  /(auth)
    /login/page.tsx
    /signup/page.tsx
    /forgot-password/page.tsx
    /reset-password/page.tsx
    /layout.tsx
  /(main)
    /layout.tsx
    /page.tsx                     # Dashboard (authenticated) / Landing (public)
    /settings/page.tsx            # User profile settings
    /help/page.tsx                # Help & FAQ page
    /planner/page.tsx             # Meal plans list
    /planner/[id]/page.tsx        # Meal plan detail
    /assistant/page.tsx           # Chef AI chat
    /recipes/page.tsx             # Recipe collection
    /recipes/[id]/page.tsx        # Recipe detail
    /recipes/new/page.tsx         # Add recipe
    /recipes/[id]/edit/page.tsx   # Edit recipe
    /admin/bug-reports/page.tsx   # Admin bug report dashboard
  /api
    /chat/route.ts                # Chef assistant (streaming)
    /parse-label/route.ts         # Claude Vision for food labels
    /parse-recipe-image/route.ts  # Claude Vision for recipe images
    /parse-recipe-url/route.ts    # Extract recipe from URL
    /alexa/route.ts               # Alexa Custom Skill endpoint (with account linking intents)
    /alexa/link/route.ts          # Alexa account linking code API
    /upload-recipe-image/route.ts # Upload to Supabase Storage
  /auth/callback/route.ts         # Supabase auth callback
/components
  /ui/                            # shadcn/ui components
  /layout/navbar.tsx, mobile-nav.tsx
  /planner/                       # Meal plan components
  /recipes/                       # Recipe components
  /assistant/                     # Chat components
  /auth/turnstile.tsx                # Cloudflare Turnstile CAPTCHA widget
  /shared/mascot.tsx, image-upload.tsx
  /pwa-register.tsx                # Registers service worker on page load
/lib
  /supabase/client.ts, server.ts
  /anthropic.ts
  /alexa-auth.ts                    # Alexa user resolution + meal plan data helpers
  /utils.ts, timing-calculator.ts, notifications.ts, audio.ts
/hooks
  /use-meal-plan.ts, use-recipes.ts, use-timers.ts, use-notifications.ts, use-chat.ts, use-chat-sessions.ts, use-voice-input.ts
/types
  /database.ts, index.ts
```

---

## Database

See `DATABASE.md` for full schema. Tables:
- **profiles** - User display names
- **meal_plans** - Saved meal configurations
- **meal_items** - Items within meal plans (with optional `recipe_id` FK and `ingredients` JSONB snapshot)
- **recipes** - User's recipe collection
- **chat_sessions** - Persistent chat history
- **alexa_links** - Maps Amazon Alexa user IDs to Cat's Kitchen users (code-based account linking)

Supabase Storage bucket `recipe-images` for recipe image uploads.

---

## Key Features

### Meal Timing Planner (Core Feature)
- Create meal plans with multiple items (name, cook time, prep time, rest time, temperature, method)
- Adding a recipe to a plan copies ingredients + links via `recipe_id` (survives recipe deletion)
- Meal item cards show ingredient count; dialog shows full ingredient list + "View full recipe" link
- Cooking Mode with step checkboxes (interactive progress tracking per item)
- Timeline calculates when to start each item based on serve time
- Browser notifications + audio alerts at each step
- Label scanning via Claude Vision to extract cooking info from food packaging
- Service Worker for background notifications

### Chef Assistant
- Streaming chat powered by Claude API
- British personality (Celsius, metric, British terminology)
- Context-aware (knows about active meal plan)
- "Save to Recipes" button when assistant provides a recipe
- Voice input via microphone button (Web Speech API, hidden on unsupported browsers)
- Alexa Custom Skill — "Alexa, ask Cat's Kitchen..." (see `alexa-skill/SETUP.md`)
- Alexa account linking via 6-character code (generated in Settings, spoken to Alexa)
- When linked: meal plan queries, next event, serve time, ingredients, and context-aware chef
- Step-by-step cooking guidance: "Guide me through the [dish]", "Read me step 3", "What step am I on?"

### Recipe Collection
- CRUD with search/filter (cuisine, course, difficulty, time, favourites)
- Import from URL or image (Claude Vision extracts recipe data)
- Image upload to Supabase Storage
- Servings adjuster (scales ingredients)
- Cooking Mode (larger text, screen stays awake)
- **Prep tasks inline within method:** each row in the recipe's method list can be flagged as a `step` or `prep` (e.g. "boil the kettle", "warm the tin"). Prep items render with a green badge in the recipe detail and cooking mode. Persisted as part of the existing `recipes.instructions` text using a `[prep] ` line prefix — see `lib/instruction-items.ts` for parser/serializer/`stripPrepMarkers` helper. AI prompts and Alexa TTS contexts strip the marker so it's never read aloud.

### PWA (Progressive Web App)
- Installable to home screen on mobile and desktop
- Web app manifest (`/public/manifest.json`) with app identity, icons, and theme
- PWA icons in `/public/icons/` (192x192, 512x512, standard + maskable variants)
- Offline fallback page (`/public/offline.html`) served when network is unavailable
- Service worker registers on page load via `<PWARegister />` component

### Authentication
- Email/password via Supabase Auth
- Password reset flow
- User profiles with display name
- "Remember me" option (unchecked = session ends when browser closes)
- Cloudflare Turnstile CAPTCHA on signup, login, and forgot-password forms (invisible, no user friction)

### Admin
- `is_admin` flag on profiles table (default false)
- Admin users see "Bug Reports" link in navbar dropdown
- `/admin/bug-reports` page: view all bug reports, filter by status, update status (new/reviewed/resolved)
- Protected by RLS policies (admins can read all + update bug reports)

---

## UI/UX Notes

- **Mobile-first** - Primary use is in the kitchen with messy hands
- **Large touch targets** - Minimum 44x44px
- **Warm cream/orange branding** - Full spec in `DESIGN_GUIDE.md` (colors, typography, components)
- **Mascot** - "Cat" appears in empty states, chat, navbar (`/public/images/branding/`)
- **Dark mode** - Warm brown tones, manual toggle + system preference

---

## Workflow

- **NEVER commit and push without the user confirming the change works locally first.** Always let the user test before pushing.

---

## Code Conventions

- TypeScript strict mode
- Server Components where possible, Client Components for interactivity
- Custom hooks for reusable logic (`/hooks`)
- Supabase RLS for all data access (never bypass security)
- Consistent API response format: `{ success: boolean, data?: T, error?: string }`

---

## Quick Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
```

---

## Deployment

- **Platform:** Vercel (auto-deploys from main branch)
- **Database:** Supabase (separate project)
- **Storage:** Supabase Storage bucket `recipe-images`
- **Domain:** catskitchen.co.uk

---

## Not Yet Implemented

- Web search integration for chef assistant (requires external search API)
- Sound files (currently uses Web Audio API synthesis)
