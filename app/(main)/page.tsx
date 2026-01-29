import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActivePlanWidget } from '@/components/planner/active-plan-widget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  return (
    <div className="space-y-8">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-1 opacity-90">What would you like to cook today?</p>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          href="/planner"
          title="Plan a Meal"
          description="Time your dishes perfectly"
          icon={<CalendarIcon />}
          color="bg-amber-100 text-amber-700"
        />
        <QuickActionCard
          href="/assistant"
          title="Ask the Chef"
          description="Get cooking advice"
          icon={<ChefIcon />}
          color="bg-emerald-100 text-emerald-700"
        />
        <QuickActionCard
          href="/recipes"
          title="My Recipes"
          description="Browse your collection"
          icon={<BookIcon />}
          color="bg-sky-100 text-sky-700"
        />
        <QuickActionCard
          href="/recipes/new"
          title="Add Recipe"
          description="Save a new recipe"
          icon={<PlusIcon />}
          color="bg-violet-100 text-violet-700"
        />
      </div>

      {/* Active meal plan widget */}
      <ActivePlanWidget />
    </div>
  )
}

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
      {/* Hero */}
      <div className="space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
          <ChefHatIcon className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold">Kitchen Companion</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Plan your meals, time your dishes, and get AI-powered cooking assistance.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full text-left">
        <div className="p-4 rounded-lg bg-card border">
          <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <ClockIcon className="h-4 w-4" />
          </div>
          <h3 className="font-medium">Perfect Timing</h3>
          <p className="text-sm text-muted-foreground">Everything ready at the same time</p>
        </div>
        <div className="p-4 rounded-lg bg-card border">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <ChefHatIcon className="h-4 w-4" />
          </div>
          <h3 className="font-medium">AI Chef</h3>
          <p className="text-sm text-muted-foreground">Get expert cooking advice</p>
        </div>
        <div className="p-4 rounded-lg bg-card border">
          <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-2">
            <BookIcon className="h-4 w-4" />
          </div>
          <h3 className="font-medium">Recipe Library</h3>
          <p className="text-sm text-muted-foreground">Save and organize recipes</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/login">
          <Button variant="outline" size="lg">Sign in</Button>
        </Link>
        <Link href="/signup">
          <Button size="lg">Get started</Button>
        </Link>
      </div>
    </div>
  )
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
  color,
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
        <CardContent className="pt-6">
          <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            {icon}
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChefIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}
