'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  disabled,
  placeholder = 'Ask the chef anything...',
  value,
  onChange,
}: ChatInputProps) {
  const [internalInput, setInternalInput] = useState('')
  const input = value !== undefined ? value : internalInput
  const setInput = onChange || setInternalInput
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="flex gap-2 items-end p-4 border-t bg-background">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />
      {isLoading ? (
        <Button
          onClick={onStop}
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
        >
          <StopIcon className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

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
