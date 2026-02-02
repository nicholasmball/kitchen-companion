'use client'

import { useEffect, useMemo, useCallback, useState } from 'react'
import { useMealPlans } from '@/hooks/use-meal-plan'
import { useChatSessions, type ChatMessage } from '@/hooks/use-chat-sessions'
import { ChatInterface } from '@/components/assistant/chat-interface'
import { ChatHistory } from '@/components/assistant/chat-history'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import type { ActiveMealPlanContext } from '@/lib/anthropic'

export default function AssistantPage() {
  const { activePlan, fetchActivePlan } = useMealPlans({ initialFetch: false })
  const {
    sessions,
    currentSession,
    loading,
    createSession,
    loadSession,
    updateMessages,
    deleteSession,
    searchSessions,
    clearCurrentSession,
  } = useChatSessions()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    fetchActivePlan()
  }, [fetchActivePlan])

  // Convert active plan to context format for the chat
  const activeMealPlanContext: ActiveMealPlanContext | undefined = useMemo(() => {
    if (!activePlan || !activePlan.serve_time) return undefined

    return {
      name: activePlan.name,
      serveTime: new Date(activePlan.serve_time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: activePlan.meal_items.map((item) => ({
        name: item.name,
        cookTime: item.cook_time_minutes,
        method: item.cooking_method,
      })),
    }
  }, [activePlan])

  // Handle messages change - create session if needed, then update
  const handleMessagesChange = useCallback(async (messages: ChatMessage[], title?: string) => {
    if (currentSession) {
      await updateMessages(currentSession.id, messages, title)
    } else if (messages.length > 0) {
      // Create a new session when first message is sent
      const session = await createSession(title || 'New Chat')
      if (session) {
        await updateMessages(session.id, messages)
      }
    }
  }, [currentSession, createSession, updateMessages])

  const handleNewChat = useCallback(() => {
    clearCurrentSession()
    setSidebarOpen(false)
  }, [clearCurrentSession])

  const handleSelectSession = useCallback((session: typeof currentSession) => {
    if (session) {
      loadSession(session.id)
      setSidebarOpen(false)
    }
  }, [loadSession])

  // Sidebar content
  const sidebarContent = (
    <ChatHistory
      sessions={sessions}
      currentSessionId={currentSession?.id}
      onSelectSession={handleSelectSession}
      onNewChat={handleNewChat}
      onDeleteSession={deleteSession}
      onSearch={searchSessions}
    />
  )

  return (
    <div className="flex h-[calc(100vh-10rem)] pb-4 md:pb-0 md:h-[calc(100vh-8rem)] gap-4">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="h-full bg-card rounded-lg border">
          {sidebarContent}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {sidebarContent}
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-2xl font-bold">Chef Assistant</h1>
              {currentSession && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:block">
                  {currentSession.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activePlan && (
              <div className="text-right text-sm hidden sm:block">
                <span className="text-muted-foreground">Cooking:</span>
                <p className="font-medium text-primary truncate max-w-[150px]">{activePlan.name}</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleNewChat} className="hidden sm:flex">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            activeMealPlan={activeMealPlanContext}
            session={currentSession}
            onMessagesChange={handleMessagesChange}
          />
        </div>
      </div>
    </div>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
