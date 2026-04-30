export type InstructionItemType = 'step' | 'action'

export interface InstructionItem {
  id: string
  text: string
  type: InstructionItemType
}

// Marker emitted on serialize. Parser also accepts the legacy [prep] alias.
const ACTION_PREFIX_RE = /^\s*\[(action|prep)\]\s*/i

let nextId = 0
const generateId = () => `item-${Date.now()}-${nextId++}`

export function parseInstructionItems(raw: string | null | undefined): InstructionItem[] {
  if (!raw) return []
  return raw
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const isAction = ACTION_PREFIX_RE.test(line)
      const text = isAction ? line.replace(ACTION_PREFIX_RE, '').trim() : line.trim()
      return {
        id: generateId(),
        text,
        type: isAction ? 'action' : 'step',
      }
    })
}

export function serializeInstructionItems(items: InstructionItem[]): string {
  return items
    .map((item) => item.text.trim())
    .map((text, i) => (items[i].type === 'action' ? `[action] ${text}` : text))
    .filter((line) => line.replace(/^\[(action|prep)\]\s*/i, '').length > 0)
    .join('\n')
}

export function stripActionMarkers(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .split('\n')
    .map((line) => line.replace(ACTION_PREFIX_RE, ''))
    .join('\n')
}

export function makeBlankItem(type: InstructionItemType = 'step'): InstructionItem {
  return { id: generateId(), text: '', type }
}
