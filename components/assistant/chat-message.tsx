'use client'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/hooks/use-chat'

interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

export function ChatMessageBubble({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <ChefIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">Chef</span>
          </div>
        )}
        <div className={cn(
          'text-sm whitespace-pre-wrap',
          isStreaming && !message.content && 'animate-pulse'
        )}>
          {message.content || (isStreaming ? 'Thinking...' : '')}
          {isStreaming && message.content && (
            <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
          )}
        </div>
        <div className={cn(
          'text-[10px] mt-1',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function ChefIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3-5.108 8.25 8.25 0 0 1 3.362.72Z" />
    </svg>
  )
}
