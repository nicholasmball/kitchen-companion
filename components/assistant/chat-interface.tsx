'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useChat } from '@/hooks/use-chat'
import { ChatMessageBubble } from './chat-message'
import { ChatInput } from './chat-input'
import { QuickActions } from './quick-actions'
import type { ActiveMealPlanContext } from '@/lib/anthropic'
import type { ChatSession, ChatMessage as StoredMessage } from '@/hooks/use-chat-sessions'

interface ChatInterfaceProps {
  activeMealPlan?: ActiveMealPlanContext
  temperatureUnit?: 'C' | 'F'
  measurementSystem?: 'metric' | 'imperial'
  session?: ChatSession | null
  onMessagesChange?: (messages: StoredMessage[], title?: string) => void
}

export function ChatInterface({ activeMealPlan, temperatureUnit, measurementSystem, session, onMessagesChange }: ChatInterfaceProps) {
  const { messages, isLoading, error, sendMessage, stopGeneration } = useChat({
    activeMealPlan,
    temperatureUnit,
    measurementSystem,
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
    <div className="flex flex-col h-full bg-card rounded-2xl border shadow-warm">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-warm mb-4">
              <Image
                src="/images/branding/mascot circle.png"
                alt="Chef"
                width={80}
                height={80}
                className="object-cover"
              />
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
              <div className="text-center text-destructive text-sm py-2">
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
