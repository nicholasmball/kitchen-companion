'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { useVoiceInput } from '@/hooks/use-voice-input'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export interface ChatInputHandle {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  onStop,
  isLoading,
  disabled,
  placeholder = 'Ask the chef anything...',
  value,
  onChange,
}, ref) {
  const [internalInput, setInternalInput] = useState('')
  const input = value !== undefined ? value : internalInput
  const setInput = onChange || setInternalInput
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleVoiceResult = useCallback((text: string) => {
    // Use a ref-like approach since setInput may be a controlled onChange (not setState)
    const current = value !== undefined ? value : internalInput
    const separator = current.trim() ? ' ' : ''
    setInput(current + separator + text)
  }, [setInput, value, internalInput])

  const { isListening, isSupported, transcript, toggle, clearTranscript } = useVoiceInput({
    onResult: handleVoiceResult,
  })

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }))

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSend(input)
      setInput('')
      clearTranscript()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Show interim transcript as placeholder hint while listening
  const listeningPlaceholder = isListening && transcript
    ? transcript
    : placeholder

  return (
    <div className="flex gap-2 items-end p-4 border-t bg-card/50">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={listeningPlaceholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none overflow-hidden rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 shadow-warm"
      />
      {isSupported && !isLoading && (
        <Button
          onClick={toggle}
          disabled={disabled}
          variant={isListening ? 'default' : 'outline'}
          size="icon"
          className={`h-11 w-11 shrink-0 rounded-2xl ${
            isListening ? 'animate-pulse bg-red-500 hover:bg-red-600 border-red-500' : ''
          }`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          <MicIcon className="h-5 w-5" />
        </Button>
      )}
      {isLoading ? (
        <Button
          onClick={onStop}
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-2xl"
        >
          <StopIcon className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-2xl shadow-warm"
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
})

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
    </svg>
  )
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  )
}
