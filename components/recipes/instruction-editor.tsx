'use client'

import { useCallback } from 'react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const addItem = useCallback(
    (type: InstructionItemType = 'step') => {
      onChange([...items, makeBlankItem(type)])
    },
    [items, onChange]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = items.findIndex((it) => it.id === active.id)
      const newIndex = items.findIndex((it) => it.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      onChange(arrayMove(items, oldIndex, newIndex))
    },
    [items, onChange]
  )

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Add the steps and actions for this recipe. Tap <span className="font-semibold">Action</span> on a row for setup tasks like &quot;boil the kettle&quot;.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              index={index}
              onUpdateText={updateText}
              onSetType={setType}
              onRemove={remove}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={() => addItem('step')}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add step
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => addItem('action')}
          className="border-[#40916C]/40 text-[#40916C] hover:bg-[#40916C]/5"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add action
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-[#40916C]">Action</span> items (e.g. &quot;boil the kettle&quot;) appear in the recipe with a green badge so you can spot them at a glance during cooking. Drag the handle (≡) to reorder.
      </p>
    </div>
  )
}

function SortableRow({
  item,
  index,
  onUpdateText,
  onSetType,
  onRemove,
}: {
  item: InstructionItem
  index: number
  onUpdateText: (id: string, text: string) => void
  onSetType: (id: string, type: InstructionItemType) => void
  onRemove: (id: string) => void
}) {
  const isAction = item.type === 'action'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border p-2 sm:p-3 flex flex-col sm:flex-row gap-2 sm:items-start transition-colors',
        isAction ? 'border-[#40916C]/40 bg-[#40916C]/5' : 'border-border bg-background',
        isDragging && 'shadow-lg'
      )}
    >
      {/* Drag handle + index */}
      <div className="flex sm:flex-col items-center gap-1 sm:gap-0.5 sm:w-9 shrink-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${isAction ? 'action' : 'step'} ${index + 1} to reorder`}
          className={cn(
            'h-11 w-11 sm:h-9 sm:w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted touch-none',
            isAction && 'text-[#40916C]/70 hover:bg-[#40916C]/10'
          )}
        >
          <GripIcon className="h-5 w-5" />
        </button>
        <span
          className={cn(
            'text-xs font-bold tabular-nums w-6 text-center',
            isAction ? 'text-[#40916C]' : 'text-muted-foreground'
          )}
        >
          {index + 1}
        </span>
      </div>

      {/* Text */}
      <Textarea
        value={item.text}
        onChange={(e) => onUpdateText(item.id, e.target.value)}
        placeholder={
          isAction ? 'e.g. Boil the kettle, warm the tin' : 'Describe this step...'
        }
        rows={2}
        className="flex-1 min-h-[60px]"
        aria-label={`${isAction ? 'Action' : 'Step'} ${index + 1}`}
      />

      {/* Type toggle + delete */}
      <div className="flex sm:flex-col gap-2 sm:items-end shrink-0">
        <div
          role="radiogroup"
          aria-label="Item type"
          className="inline-flex rounded-md bg-muted p-0.5 shadow-inner"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isAction}
            onClick={() => onSetType(item.id, 'step')}
            className={cn(
              'px-3 h-8 text-xs font-bold uppercase tracking-wide rounded',
              !isAction ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Step
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isAction}
            onClick={() => onSetType(item.id, 'action')}
            className={cn(
              'px-3 h-8 text-xs font-bold uppercase tracking-wide rounded',
              isAction ? 'bg-background text-[#40916C] shadow-sm' : 'text-muted-foreground'
            )}
          >
            Action
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.id)}
          aria-label="Remove item"
          className="text-muted-foreground hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
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

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
  )
}
