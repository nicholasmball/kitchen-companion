'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/use-chat'
import { ChatMessageBubble } from './chat-message'
import { ChatInput } from './chat-input'
import { QuickActions } from './quick-actions'
import type { ActiveMealPlanContext } from '@/lib/anthropic'
import type { ChatSession, ChatMessage as StoredMessage } from '@/hooks/use-chat-sessions'

interface ChatInterfaceProps {
  activeMealPlan?: ActiveMealPlanContext
  session?: ChatSession | null
  onMessagesChange?: (messages: StoredMessage[], title?: string) => void
}

export function ChatInterface({ activeMealPlan, session, onMessagesChange }: ChatInterfaceProps) {
  const { messages, isLoading, error, sendMessage, stopGeneration } = useChat({
    activeMealPlan,
    session,
    onMessagesChange,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt)
  }

  const handleSend = (message: string) => {
    sendMessage(message)
    setInputValue('')
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ChefHatIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Ask the Chef</h2>
            <p className="text-muted-foreground mt-1 max-w-md">
              Get expert cooking advice, recipe suggestions, ingredient substitutions, and more.
            </p>
            {activeMealPlan && (
              <p className="text-sm text-primary mt-2">
                Currently cooking: {activeMealPlan.name}
              </p>
            )}
            <div className="mt-6">
              <QuickActions
                onSelect={handleQuickAction}
                hasActivePlan={!!activeMealPlan}
                disabled={isLoading}
              />
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
            {error && (
              <div className="text-center text-red-500 text-sm py-2">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick actions when there are messages */}
      {messages.length > 0 && !isLoading && (
        <QuickActions
          onSelect={handleQuickAction}
          hasActivePlan={!!activeMealPlan}
          disabled={isLoading}
        />
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSend}
        onStop={stopGeneration}
        isLoading={isLoading}
        value={inputValue}
        onChange={setInputValue}
      />
    </div>
  )
}

function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  )
}
