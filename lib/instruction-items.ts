export type InstructionItemType = 'step' | 'prep'

export interface InstructionItem {
  id: string
  text: string
  type: InstructionItemType
}

const PREP_PREFIX_RE = /^\s*\[prep\]\s*/i

let nextId = 0
const generateId = () => `item-${Date.now()}-${nextId++}`

export function parseInstructionItems(raw: string | null | undefined): InstructionItem[] {
  if (!raw) return []
  return raw
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const isPrep = PREP_PREFIX_RE.test(line)
      const text = isPrep ? line.replace(PREP_PREFIX_RE, '').trim() : line.trim()
      return {
        id: generateId(),
        text,
        type: isPrep ? 'prep' : 'step',
      }
    })
}

export function serializeInstructionItems(items: InstructionItem[]): string {
  return items
    .map((item) => item.text.trim())
    .map((text, i) => (items[i].type === 'prep' ? `[prep] ${text}` : text))
    .filter((line) => line.replace(/^\[prep\]\s*/i, '').length > 0)
    .join('\n')
}

export function stripPrepMarkers(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .split('\n')
    .map((line) => line.replace(PREP_PREFIX_RE, ''))
    .join('\n')
}

export function makeBlankItem(type: InstructionItemType = 'step'): InstructionItem {
  return { id: generateId(), text: '', type }
}
