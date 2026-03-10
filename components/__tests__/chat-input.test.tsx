import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatInput } from '../assistant/chat-input'

// Track the most recent mock recognition instance
let mockRecognition: ReturnType<typeof createMockRecognition>

function createMockRecognition() {
  return {
    continuous: false,
    interimResults: false,
    lang: '',
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null as ((event: unknown) => void) | null,
    onerror: null as ((event: unknown) => void) | null,
    onend: null as (() => void) | null,
  }
}

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

describe('ChatInput', () => {
  const onSend = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRecognition = createMockRecognition()
    ;(window as unknown as Record<string, unknown>).SpeechRecognition =
      function () {
        return mockRecognition
      }
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
  })

  it('shows mic button when speech recognition is supported', () => {
    render(<ChatInput onSend={onSend} />)
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()
  })

  it('hides mic button when speech recognition is not supported', () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    render(<ChatInput onSend={onSend} />)
    expect(screen.queryByLabelText('Start voice input')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Stop voice input')).not.toBeInTheDocument()
  })

  it('hides mic button when loading (showing stop button)', () => {
    render(<ChatInput onSend={onSend} isLoading onStop={vi.fn()} />)
    expect(screen.queryByLabelText('Start voice input')).not.toBeInTheDocument()
  })

  it('toggles listening state when mic button is clicked', () => {
    render(<ChatInput onSend={onSend} />)
    const micButton = screen.getByLabelText('Start voice input')
    fireEvent.click(micButton)
    expect(screen.getByLabelText('Stop voice input')).toBeInTheDocument()
    expect(mockRecognition.start).toHaveBeenCalled()
  })

  it('appends voice transcript to input on final result', () => {
    const onChange = vi.fn()
    render(<ChatInput onSend={onSend} value="" onChange={onChange} />)

    // Start listening
    fireEvent.click(screen.getByLabelText('Start voice input'))

    // Simulate a final speech result
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'hello chef' } },
        },
      })
    })

    expect(onChange).toHaveBeenCalledWith('hello chef')
  })

  it('sends message on enter key', () => {
    render(<ChatInput onSend={onSend} value="test message" onChange={vi.fn()} />)
    const textarea = screen.getByPlaceholderText('Ask the chef anything...')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('test message')
  })

  it('does not send empty message', () => {
    render(<ChatInput onSend={onSend} value="" onChange={vi.fn()} />)
    const textarea = screen.getByPlaceholderText('Ask the chef anything...')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables mic button when input is disabled', () => {
    render(<ChatInput onSend={onSend} disabled />)
    const micButton = screen.getByLabelText('Start voice input')
    expect(micButton).toBeDisabled()
  })
})
