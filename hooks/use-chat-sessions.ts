'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setSessions(data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat sessions')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Create a new session
  const createSession = useCallback(async (title?: string): Promise<ChatSession | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in')
      return null
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title || 'New Chat',
        messages: [],
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setSessions((prev) => [data, ...prev])
    setCurrentSession(data)
    return data
  }, [supabase])

  // Load a session
  const loadSession = useCallback(async (id: string): Promise<ChatSession | null> => {
    // Check if already in local state
    const existing = sessions.find((s) => s.id === id)
    if (existing) {
      setCurrentSession(existing)
      return existing
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError(error.message)
      return null
    }

    setCurrentSession(data)
    return data
  }, [supabase, sessions])

  // Update session messages
  const updateMessages = useCallback(async (
    sessionId: string,
    messages: ChatMessage[],
    title?: string
  ): Promise<boolean> => {
    const updates: { messages: ChatMessage[]; title?: string } = { messages }

    // Auto-generate title from first user message if not set
    if (title) {
      updates.title = title
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return false
    }

    setSessions((prev) => prev.map((s) => (s.id === sessionId ? data : s)))
    if (currentSession?.id === sessionId) {
      setCurrentSession(data)
    }
    return true
  }, [supabase, currentSession])

  // Delete a session
  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return false
    }

    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (currentSession?.id === id) {
      setCurrentSession(null)
    }
    return true
  }, [supabase, currentSession])

  // Search sessions
  const searchSessions = useCallback((query: string): ChatSession[] => {
    if (!query.trim()) return sessions

    const lower = query.toLowerCase()
    return sessions.filter((session) => {
      // Search in title
      if (session.title.toLowerCase().includes(lower)) return true
      // Search in messages
      return session.messages.some((m) =>
        m.content.toLowerCase().includes(lower)
      )
    })
  }, [sessions])

  // Clear current session (start fresh without creating new one yet)
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null)
  }, [])

  // Fetch sessions on mount (don't auto-select — let user choose or start fresh)
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setSessions(data || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat sessions')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [supabase])

  return {
    sessions,
    currentSession,
    loading,
    error,
    fetchSessions,
    createSession,
    loadSession,
    updateMessages,
    deleteSession,
    searchSessions,
    clearCurrentSession,
    setCurrentSession,
  }
}
