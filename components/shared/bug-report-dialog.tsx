'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'
import { toastSuccess, toastError } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface BugReportDialogProps {
  children: React.ReactNode
}

// Extend Window for webkit prefixed SpeechRecognition
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

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  const SpeechRecognition =
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  return new (SpeechRecognition as new () => SpeechRecognitionInstance)()
}

export function BugReportDialog({ children }: BugReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSpeechSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    )
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition()
    if (!recognition) return

    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-GB'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        setDescription((prev) => {
          const separator = prev && !prev.endsWith(' ') ? ' ' : ''
          return prev + separator + transcript
        })
      }
    }

    recognition.onerror = () => {
      stopListening()
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [stopListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // Clean up on close
  useEffect(() => {
    if (!open) {
      stopListening()
    }
  }, [open, stopListening])

  const handleSubmit = async () => {
    if (!description.trim()) return

    setIsSubmitting(true)
    stopListening()

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), 5000)

      if (!user) {
        toastError('You must be signed in to report a bug')
        return
      }

      const { error } = await withTimeout(
        supabase.from('bug_reports').insert({
          user_id: user.id,
          description: description.trim(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
        10000
      )

      if (error) throw error

      toastSuccess('Bug report sent', 'Thanks for helping us improve!')
      setDescription('')
      setOpen(false)
    } catch {
      toastError('Failed to send bug report', 'Please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe what went wrong. You can type or use voice input.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              rows={5}
              className="w-full resize-none rounded-xl border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-warm"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            {speechSupported && (
              <Button
                type="button"
                variant={isListening ? 'default' : 'outline'}
                size="sm"
                onClick={toggleListening}
                disabled={isSubmitting}
                className={isListening ? 'animate-pulse' : ''}
              >
                <MicIcon className="h-4 w-4 mr-1" />
                {isListening ? 'Listening...' : 'Voice input'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Report'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
      />
    </svg>
  )
}
