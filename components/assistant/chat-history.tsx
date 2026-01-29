'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/hooks/use-chat-sessions'

interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId?: string
  onSelectSession: (session: ChatSession) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  onSearch: (query: string) => ChatSession[]
}

export function ChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onSearch,
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const filteredSessions = searchQuery ? onSearch(searchQuery) : sessions

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getPreview = (session: ChatSession) => {
    const lastMessage = session.messages[session.messages.length - 1]
    if (!lastMessage) return 'No messages'
    const preview = lastMessage.content.slice(0, 50)
    return preview.length < lastMessage.content.length ? `${preview}...` : preview
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <Button onClick={onNewChat} className="w-full" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group relative rounded-lg p-2 cursor-pointer hover:bg-muted transition-colors',
                  currentSessionId === session.id && 'bg-muted'
                )}
                onClick={() => onSelectSession(session)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getPreview(session)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteDialog(session.id)
                    }}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDate(session.updated_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog) {
                  onDeleteSession(deleteDialog)
                  setDeleteDialog(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
