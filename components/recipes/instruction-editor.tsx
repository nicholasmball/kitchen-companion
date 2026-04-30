'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  type InstructionItem,
  type InstructionItemType,
  makeBlankItem,
} from '@/lib/instruction-items'

interface InstructionEditorProps {
  items: InstructionItem[]
  onChange: (items: InstructionItem[]) => void
}

export function InstructionEditor({ items, onChange }: InstructionEditorProps) {
  const updateText = useCallback(
    (id: string, text: string) => {
      onChange(items.map((it) => (it.id === id ? { ...it, text } : it)))
    },
    [items, onChange]
  )

  const setType = useCallback(
    (id: string, type: InstructionItemType) => {
      onChange(items.map((it) => (it.id === id ? { ...it, type } : it)))
    },
    [items, onChange]
  )

  const remove = useCallback(
    (id: string) => {
      onChange(items.filter((it) => it.id !== id))
    },
    [items, onChange]
  )

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const next = [...items]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      onChange(next)
    },
    [items, onChange]
  )

  const moveDown = useCallback(
    (index: number) => {
      if (index === items.length - 1) return
      const next = [...items]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      onChange(next)
    },
    [items, onChange]
  )

  const addItem = useCallback(
    (type: InstructionItemType = 'step') => {
      onChange([...items, makeBlankItem(type)])
    },
    [items, onChange]
  )

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Add the steps and prep tasks for this recipe. Tap <span className="font-semibold">Prep</span> on a row for setup tasks like &quot;boil the kettle&quot;.
        </p>
      )}

      {items.map((item, index) => {
        const isPrep = item.type === 'prep'
        return (
          <div
            key={item.id}
            className={cn(
              'rounded-lg border p-2 sm:p-3 flex flex-col sm:flex-row gap-2 sm:items-start transition-colors',
              isPrep ? 'border-[#40916C]/40 bg-[#40916C]/5' : 'border-border bg-background'
            )}
          >
            {/* Row index + reorder controls */}
            <div className="flex sm:flex-col items-center gap-1 sm:gap-0.5 sm:w-8 shrink-0">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label="Move up"
                className="h-8 w-8 sm:h-6 sm:w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronUpIcon className="h-4 w-4" />
              </button>
              <span className={cn(
                'text-xs font-bold tabular-nums w-6 text-center',
                isPrep ? 'text-[#40916C]' : 'text-muted-foreground'
              )}>
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === items.length - 1}
                aria-label="Move down"
                className="h-8 w-8 sm:h-6 sm:w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Text */}
            <Textarea
              value={item.text}
              onChange={(e) => updateText(item.id, e.target.value)}
              placeholder={
                isPrep
                  ? 'e.g. Boil the kettle, warm the tin'
                  : 'Describe this step...'
              }
              rows={2}
              className="flex-1 min-h-[60px]"
              aria-label={`${isPrep ? 'Prep' : 'Step'} ${index + 1}`}
            />

            {/* Step / Prep toggle + delete */}
            <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
              <div
                role="radiogroup"
                aria-label="Item type"
                className="inline-flex rounded-md bg-muted p-0.5 shadow-inner"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isPrep}
                  onClick={() => setType(item.id, 'step')}
                  className={cn(
                    'px-3 h-8 text-xs font-bold uppercase tracking-wide rounded',
                    !isPrep ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  Step
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isPrep}
                  onClick={() => setType(item.id, 'prep')}
                  className={cn(
                    'px-3 h-8 text-xs font-bold uppercase tracking-wide rounded',
                    isPrep ? 'bg-background text-[#40916C] shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  Prep
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(item.id)}
                aria-label="Remove item"
                className="text-muted-foreground hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => addItem('step')}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add step
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => addItem('prep')}
          className="border-[#40916C]/40 text-[#40916C] hover:bg-[#40916C]/5"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add prep
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-[#40916C]">Prep</span> items (e.g. &quot;boil the kettle&quot;) appear in the recipe with a green badge so you can spot them at a glance during cooking.
      </p>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}
