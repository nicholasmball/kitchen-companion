'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
  onend: (() => void) | null
}

function createRecognition(): SpeechRecognitionInstance | null {
  const SpeechRecognition =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  return new (SpeechRecognition as new () => SpeechRecognitionInstance)()
}

export interface UseVoiceInputOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (text: string) => void
}

export function useVoiceInput(options?: UseVoiceInputOptions) {
  const { lang = 'en-GB', continuous = true, interimResults = true, onResult } = options ?? {}

  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    setIsSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    )
  }, [])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const start = useCallback(() => {
    // Clean up any existing session
    stop()
    setError(null)

    const recognition = createRecognition()
    if (!recognition) return

    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[useVoiceInput] onresult fired, resultIndex:', event.resultIndex, 'results.length:', event.results.length)

      // Build full transcript from all results: final parts are locked in, interim shows latest partial
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        console.log(`[useVoiceInput] result[${i}]: isFinal=${result.isFinal}, text="${text}"`)
        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      const combined = (finalText + interimText).trim()
      console.log('[useVoiceInput] combined transcript:', combined)
      setTranscript(combined)

      // Only call onResult with finalized text to avoid duplicate appends
      if (finalText) {
        onResultRef.current?.(finalText.trim())
      }
    }

    recognition.onerror = (event: Event & { error: string }) => {
      console.warn('[useVoiceInput] error:', event.error)
      setError(event.error)
      // Don't stop here — let onend handle cleanup
      // Some errors (like no-speech) are transient
    }

    recognition.onend = () => {
      console.log('[useVoiceInput] session ended')
      recognitionRef.current = null
      setIsListening(false)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch (e) {
      console.warn('[useVoiceInput] failed to start:', e)
      setError('Failed to start speech recognition')
      recognitionRef.current = null
    }
  }, [continuous, interimResults, lang, stop])

  const toggle = useCallback(() => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }, [isListening, start, stop])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    error,
    start,
    stop,
    toggle,
    clearTranscript,
  }
}
