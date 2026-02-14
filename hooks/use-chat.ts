'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ActiveMealPlanContext } from '@/lib/anthropic'
import type { ChatMessage as StoredMessage, ChatSession } from './use-chat-sessions'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface UseChatOptions {
  activeMealPlan?: ActiveMealPlanContext
  temperatureUnit?: 'C' | 'F'
  measurementSystem?: 'metric' | 'imperial'
  session?: ChatSession | null
  onMessagesChange?: (messages: StoredMessage[], title?: string) => void
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Load messages from session when it changes
  useEffect(() => {
    if (options.session) {
      if (options.session.id !== sessionIdRef.current) {
        sessionIdRef.current = options.session.id
        // Only load messages if the session has messages
        // (skip if it's a fresh session - we'll persist to it instead)
        if (options.session.messages.length > 0) {
          const loaded = options.session.messages.map((m, i) => ({
            id: `${m.role}-${i}-${m.timestamp}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          }))
          setMessages(loaded)
        }
      }
    } else {
      sessionIdRef.current = null
      setMessages([])
    }
  }, [options.session])

  // Convert messages to storage format and notify parent
  const persistMessages = useCallback((msgs: ChatMessage[], generateTitle?: boolean) => {
    if (!options.onMessagesChange) return

    const stored: StoredMessage[] = msgs.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }))

    // Generate title from first user message
    let title: string | undefined
    if (generateTitle && msgs.length > 0) {
      const firstUserMsg = msgs.find((m) => m.role === 'user')
      if (firstUserMsg) {
        title = firstUserMsg.content.slice(0, 50)
        if (firstUserMsg.content.length > 50) title += '...'
      }
    }

    options.onMessagesChange(stored, title)
  }, [options])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    setError(null)

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Prepare messages for API
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          activeMealPlan: options.activeMealPlan,
          temperatureUnit: options.temperatureUnit,
          measurementSystem: options.measurementSystem,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        accumulatedContent += text

        // Update the assistant message with accumulated content
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: accumulatedContent }
              : m
          )
        )
      }

      // Persist final messages
      const finalMessages = [...updatedMessages, { ...assistantMessage, content: accumulatedContent }]
      const isFirstMessage = messages.length === 0
      persistMessages(finalMessages, isFirstMessage)

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError('Failed to send message. Please try again.')
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, isLoading, options.activeMealPlan, options.temperatureUnit, options.measurementSystem, persistMessages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    sessionIdRef.current = null
  }, [])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
  }
}
