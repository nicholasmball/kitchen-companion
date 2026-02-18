'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface HelpSection {
  title: string
  icon: React.ReactNode
  items: { question: string; answer: string }[]
}

const helpSections: HelpSection[] = [
  {
    title: 'Meal Timing Planner',
    icon: <CalendarIcon className="h-5 w-5" />,
    items: [
      {
        question: 'How do I create a meal plan?',
        answer: 'Go to the Planner page and tap "New Plan". Give it a name, an optional description, and set your target serve time. Then add items — each one represents a dish or component of your meal.',
      },
      {
        question: 'How does the timing calculator work?',
        answer: 'Once you set a serve time and add items with cooking times, the planner works backwards from the serve time to calculate when each item needs to start. Items with longer cook times start earlier. The timeline view shows you the full schedule at a glance.',
      },
      {
        question: 'What does "Set Active" do?',
        answer: 'Setting a plan as active enables real-time notifications. You\'ll get browser alerts when it\'s time to start each item, so you can focus on cooking without constantly checking the clock.',
      },
      {
        question: 'How do I scan a food label?',
        answer: 'When adding an item to your plan, tap "Scan Label". Take a photo of the cooking instructions on any food packaging — the app uses AI to read the label and extract the cooking method, time, and temperature automatically.',
      },
      {
        question: 'Can I add a recipe from my collection to a plan?',
        answer: 'Yes! When viewing a plan, tap "From Recipe" to browse your saved recipes. Selecting one will copy the cooking times and instructions into your plan.',
      },
    ],
  },
  {
    title: 'Chef Assistant',
    icon: <ChefIcon className="h-5 w-5" />,
    items: [
      {
        question: 'What can the Chef Assistant help with?',
        answer: 'The Chef is an AI assistant that can answer cooking questions, suggest recipes, help with substitutions, explain techniques, and give advice on meal planning. It knows about British cooking and uses Celsius and metric measurements.',
      },
      {
        question: 'Does the Chef know about my active meal plan?',
        answer: 'Yes! If you have an active meal plan, the Chef is aware of what you\'re cooking and can give contextual advice — like timing tips or side dish suggestions that complement your meal.',
      },
      {
        question: 'Can I save a recipe the Chef gives me?',
        answer: 'When the Chef provides a full recipe, a "Save to Recipes" button appears. Tap it to add the recipe directly to your collection.',
      },
      {
        question: 'Are my conversations saved?',
        answer: 'Yes, your chat history is saved automatically. You can start new conversations and switch between them from the chat history panel.',
      },
    ],
  },
  {
    title: 'Recipes',
    icon: <BookIcon className="h-5 w-5" />,
    items: [
      {
        question: 'How do I add a recipe?',
        answer: 'There are three ways: manually enter it using the "Add Recipe" form, import from a URL by pasting a link to a recipe webpage, or import from an image by taking a photo of a recipe in a cookbook or magazine.',
      },
      {
        question: 'How does URL import work?',
        answer: 'Paste any recipe URL and the app will extract the title, ingredients, instructions, and cooking times automatically. You can review and edit everything before saving.',
      },
      {
        question: 'How does image import work?',
        answer: 'Take a photo or upload an image of a recipe (from a cookbook, magazine, or handwritten notes). The AI reads the image and extracts the recipe details. Review and edit before saving.',
      },
      {
        question: 'What is Cooking Mode?',
        answer: 'Cooking Mode gives you a larger text view of the recipe instructions, keeps your screen awake, and lets you tick off each step as you go. Perfect for following along while cooking with messy hands.',
      },
      {
        question: 'Can I adjust servings?',
        answer: 'Yes! On any recipe page, use the servings adjuster to scale ingredient quantities up or down. The original serving count is shown for reference.',
      },
      {
        question: 'How do I search and filter recipes?',
        answer: 'The Recipes page has a search bar and filters for cuisine, course, difficulty, cooking time, and favourites. You can combine multiple filters to find exactly what you\'re looking for.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    icon: <SettingsIcon className="h-5 w-5" />,
    items: [
      {
        question: 'How do I change my display name or profile picture?',
        answer: 'Go to Settings (tap your avatar in the top right, then "Settings"). You can update your display name and upload a profile picture.',
      },
      {
        question: 'What does "Remember me" do on the login page?',
        answer: 'When checked, your session persists even after closing the browser. When unchecked, you\'ll be signed out when you close the browser tab — useful on shared devices.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'On the login page, tap "Forgot password?" and enter your email. You\'ll receive a link to set a new password.',
      },
      {
        question: 'Can I install the app on my phone?',
        answer: 'Yes! Cat\'s Kitchen works as an installable app. On your phone\'s browser, look for "Add to Home Screen" or "Install" in the browser menu. This gives you a full-screen app experience with an icon on your home screen.',
      },
    ],
  },
]

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Help & FAQ</h1>
        <p className="text-muted-foreground">
          Everything you need to know about using Cat&apos;s Kitchen.
        </p>
      </div>

      {helpSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`
              const isOpen = openItems.has(key)
              return (
                <div key={key} className="border-b border-muted last:border-0">
                  <button
                    onClick={() => toggleItem(key)}
                    className="w-full flex items-center justify-between py-3 text-left hover:text-primary transition-colors gap-2"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium text-sm">{item.question}</span>
                    <ChevronIcon
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <p className="text-sm text-muted-foreground pb-3 leading-relaxed">
                      {item.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-6 text-center space-y-2">
          <p className="text-muted-foreground">
            Still have a question? Ask the{' '}
            <Link href="/assistant" className="text-primary hover:underline font-medium">
              Chef Assistant
            </Link>
            {' '} — it knows all about cooking and how to use the app.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ChefIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
