import { describe, it, expect } from 'vitest'
import {
  parseInstructionItems,
  serializeInstructionItems,
  stripActionMarkers,
  makeBlankItem,
} from './instruction-items'

describe('parseInstructionItems', () => {
  it('returns empty array for null/empty input', () => {
    expect(parseInstructionItems(null)).toEqual([])
    expect(parseInstructionItems(undefined)).toEqual([])
    expect(parseInstructionItems('')).toEqual([])
    expect(parseInstructionItems('   ')).toEqual([])
  })

  it('parses single-line plain step', () => {
    const items = parseInstructionItems('Whisk the eggs')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ text: 'Whisk the eggs', type: 'step' })
  })

  it('parses multi-line plain steps split on newlines', () => {
    const items = parseInstructionItems('Whisk the eggs\nFry the bacon\nServe hot')
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.text)).toEqual(['Whisk the eggs', 'Fry the bacon', 'Serve hot'])
    expect(items.every((i) => i.type === 'step')).toBe(true)
  })

  it('detects [action] prefix and strips it from text', () => {
    const items = parseInstructionItems('[action] Boil the kettle')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ text: 'Boil the kettle', type: 'action' })
  })

  it('accepts the legacy [prep] alias', () => {
    const items = parseInstructionItems('[prep] Boil the kettle')
    expect(items[0]).toMatchObject({ text: 'Boil the kettle', type: 'action' })
  })

  it('handles markers case-insensitively', () => {
    expect(parseInstructionItems('[ACTION] Tea towel')[0].type).toBe('action')
    expect(parseInstructionItems('[Action] Tea towel')[0].type).toBe('action')
    expect(parseInstructionItems('[PREP] Tea towel')[0].type).toBe('action')
  })

  it('handles markers with surrounding whitespace', () => {
    expect(parseInstructionItems('  [action]   Boil kettle  ')[0]).toMatchObject({
      text: 'Boil kettle',
      type: 'action',
    })
  })

  it('mixes action and step in order', () => {
    const items = parseInstructionItems(
      '[action] Boil kettle\nWhisk batter\n[action] Warm the tin\nPour batter'
    )
    expect(items.map((i) => ({ text: i.text, type: i.type }))).toEqual([
      { text: 'Boil kettle', type: 'action' },
      { text: 'Whisk batter', type: 'step' },
      { text: 'Warm the tin', type: 'action' },
      { text: 'Pour batter', type: 'step' },
    ])
  })

  it('drops blank lines between items', () => {
    const items = parseInstructionItems('Whisk\n\nFry\n   \nServe')
    expect(items).toHaveLength(3)
  })

  it('strips Windows-style \\r line endings', () => {
    const items = parseInstructionItems('Whisk\r\nFry\r\nServe')
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.text)).toEqual(['Whisk', 'Fry', 'Serve'])
  })

  it('assigns unique ids to each item', () => {
    const items = parseInstructionItems('a\nb\nc')
    const ids = new Set(items.map((i) => i.id))
    expect(ids.size).toBe(3)
  })

  it('does not treat [action] in the middle of a line as a marker', () => {
    expect(parseInstructionItems('Add [action] tag if you like')[0].type).toBe('step')
  })
})

describe('serializeInstructionItems', () => {
  it('returns empty string for empty input', () => {
    expect(serializeInstructionItems([])).toBe('')
  })

  it('joins steps with newlines without markers', () => {
    expect(
      serializeInstructionItems([
        { id: '1', text: 'Whisk', type: 'step' },
        { id: '2', text: 'Fry', type: 'step' },
      ])
    ).toBe('Whisk\nFry')
  })

  it('emits [action] marker for action items', () => {
    expect(
      serializeInstructionItems([
        { id: '1', text: 'Boil kettle', type: 'action' },
        { id: '2', text: 'Whisk', type: 'step' },
      ])
    ).toBe('[action] Boil kettle\nWhisk')
  })

  it('drops items whose text is empty/whitespace-only', () => {
    expect(
      serializeInstructionItems([
        { id: '1', text: 'Whisk', type: 'step' },
        { id: '2', text: '', type: 'action' },
        { id: '3', text: '  ', type: 'step' },
        { id: '4', text: 'Fry', type: 'step' },
      ])
    ).toBe('Whisk\nFry')
  })

  it('round-trips parse → serialize → parse', () => {
    const input = '[action] Boil kettle\nWhisk batter\n[action] Warm tin\nPour batter'
    const items = parseInstructionItems(input)
    const serialized = serializeInstructionItems(items)
    const reparsed = parseInstructionItems(serialized)
    expect(reparsed.map((i) => ({ text: i.text, type: i.type }))).toEqual(
      items.map((i) => ({ text: i.text, type: i.type }))
    )
  })

  it('upgrades legacy [prep] to [action] on round-trip', () => {
    const items = parseInstructionItems('[prep] Boil kettle')
    expect(serializeInstructionItems(items)).toBe('[action] Boil kettle')
  })

  it('trims leading/trailing whitespace within each item', () => {
    expect(
      serializeInstructionItems([{ id: '1', text: '  Whisk  ', type: 'step' }])
    ).toBe('Whisk')
  })
})

describe('stripActionMarkers', () => {
  it('returns empty string for null/undefined', () => {
    expect(stripActionMarkers(null)).toBe('')
    expect(stripActionMarkers(undefined)).toBe('')
  })

  it('removes [action] from each line, preserving structure', () => {
    expect(stripActionMarkers('[action] Boil kettle\nWhisk batter\n[action] Warm tin')).toBe(
      'Boil kettle\nWhisk batter\nWarm tin'
    )
  })

  it('also strips legacy [prep] markers', () => {
    expect(stripActionMarkers('[prep] Boil kettle')).toBe('Boil kettle')
  })

  it('leaves non-marker lines untouched', () => {
    expect(stripActionMarkers('Whisk batter\nFry bacon')).toBe('Whisk batter\nFry bacon')
  })

  it('handles case-insensitive markers', () => {
    expect(stripActionMarkers('[ACTION] Boil kettle')).toBe('Boil kettle')
    expect(stripActionMarkers('[Prep] Boil kettle')).toBe('Boil kettle')
  })
})

describe('makeBlankItem', () => {
  it('returns a step item by default', () => {
    const item = makeBlankItem()
    expect(item.text).toBe('')
    expect(item.type).toBe('step')
    expect(item.id).toBeTruthy()
  })

  it('respects requested type', () => {
    expect(makeBlankItem('action').type).toBe('action')
  })

  it('generates unique ids', () => {
    const a = makeBlankItem()
    const b = makeBlankItem()
    expect(a.id).not.toBe(b.id)
  })
})
