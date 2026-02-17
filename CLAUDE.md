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
    /planner/page.tsx             # Meal plans list
    /planner/[id]/page.tsx        # Meal plan detail
    /assistant/page.tsx           # Chef AI chat
    /recipes/page.tsx             # Recipe collection
    /recipes/[id]/page.tsx        # Recipe detail
    /recipes/new/page.tsx         # Add recipe
    /recipes/[id]/edit/page.tsx   # Edit recipe
  /api
    /chat/route.ts                # Chef assistant (streaming)
    /parse-label/route.ts         # Claude Vision for food labels
    /parse-recipe-image/route.ts  # Claude Vision for recipe images
    /parse-recipe-url/route.ts    # Extract recipe from URL
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
  /utils.ts, timing-calculator.ts, notifications.ts, audio.ts
/hooks
  /use-meal-plan.ts, use-recipes.ts, use-timers.ts, use-notifications.ts, use-chat.ts, use-chat-sessions.ts
/types
  /database.ts, index.ts
```

---

## Database

See `DATABASE.md` for full schema. Tables:
- **profiles** - User display names
- **meal_plans** - Saved meal configurations
- **meal_items** - Items within meal plans
- **recipes** - User's recipe collection
- **chat_sessions** - Persistent chat history

Supabase Storage bucket `recipe-images` for recipe image uploads.

---

## Key Features

### Meal Timing Planner (Core Feature)
- Create meal plans with multiple items (name, cook time, prep time, rest time, temperature, method)
- Timeline calculates when to start each item based on serve time
- Browser notifications + audio alerts at each step
- Label scanning via Claude Vision to extract cooking info from food packaging
- Service Worker for background notifications

### Chef Assistant
- Streaming chat powered by Claude API
- British personality (Celsius, metric, British terminology)
- Context-aware (knows about active meal plan)
- "Save to Recipes" button when assistant provides a recipe

### Recipe Collection
- CRUD with search/filter (cuisine, course, difficulty, time, favourites)
- Import from URL or image (Claude Vision extracts recipe data)
- Image upload to Supabase Storage
- Servings adjuster (scales ingredients)
- Cooking Mode (larger text, screen stays awake)

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
