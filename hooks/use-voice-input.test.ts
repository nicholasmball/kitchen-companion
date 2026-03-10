import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceInput } from './use-voice-input'

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

describe('useVoiceInput', () => {
  let mockRecognition: ReturnType<typeof createMockRecognition>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRecognition = createMockRecognition()
    // Must use a real function/class constructor for `new` to work
    ;(window as unknown as Record<string, unknown>).SpeechRecognition =
      function () {
        return mockRecognition
      }
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
  })

  it('detects speech recognition support', () => {
    const { result } = renderHook(() => useVoiceInput())
    expect(result.current.isSupported).toBe(true)
  })

  it('detects when speech recognition is not supported', () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    const { result } = renderHook(() => useVoiceInput())
    expect(result.current.isSupported).toBe(false)
  })

  it('starts with default state', () => {
    const { result } = renderHook(() => useVoiceInput())
    expect(result.current.isListening).toBe(false)
    expect(result.current.transcript).toBe('')
  })

  it('starts listening when start() is called', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    expect(result.current.isListening).toBe(true)
    expect(mockRecognition.start).toHaveBeenCalled()
  })

  it('configures recognition with default options', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    expect(mockRecognition.continuous).toBe(true)
    expect(mockRecognition.interimResults).toBe(true)
    expect(mockRecognition.lang).toBe('en-GB')
  })

  it('accepts custom options', () => {
    const { result } = renderHook(() =>
      useVoiceInput({ lang: 'en-US', continuous: false, interimResults: true })
    )
    act(() => {
      result.current.start()
    })
    expect(mockRecognition.continuous).toBe(false)
    expect(mockRecognition.interimResults).toBe(true)
    expect(mockRecognition.lang).toBe('en-US')
  })

  it('stops listening when stop() is called', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.stop()
    })
    expect(result.current.isListening).toBe(false)
    expect(mockRecognition.stop).toHaveBeenCalled()
  })

  it('toggles listening state', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.toggle()
    })
    expect(result.current.isListening).toBe(true)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.isListening).toBe(false)
  })

  it('builds transcript from all results including interim', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })

    // Interim result should appear in transcript
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: false, 0: { transcript: 'hello' } },
        },
      })
    })

    expect(result.current.transcript).toBe('hello')

    // Final result replaces the interim
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'hello world' } },
        },
      })
    })

    expect(result.current.transcript).toBe('hello world')

    // Second result (final + new interim)
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 1,
        results: {
          length: 2,
          0: { isFinal: true, 0: { transcript: 'hello world' } },
          1: { isFinal: false, 0: { transcript: 'more' } },
        },
      })
    })

    expect(result.current.transcript).toBe('hello worldmore')

    // Both final
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 1,
        results: {
          length: 2,
          0: { isFinal: true, 0: { transcript: 'hello world' } },
          1: { isFinal: true, 0: { transcript: ' more text' } },
        },
      })
    })

    expect(result.current.transcript).toBe('hello world more text')
  })

  it('clears transcript when clearTranscript() is called', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'some text' } },
        },
      })
    })
    expect(result.current.transcript).toBe('some text')

    act(() => {
      result.current.clearTranscript()
    })
    expect(result.current.transcript).toBe('')
  })

  it('sets error state on recognition error', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    act(() => {
      mockRecognition.onerror?.({ error: 'not-allowed' })
    })
    expect(result.current.error).toBe('not-allowed')
  })

  it('stops listening when recognition ends naturally', () => {
    const { result } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    act(() => {
      mockRecognition.onend?.()
    })
    expect(result.current.isListening).toBe(false)
  })

  it('calls onResult callback only for final results', () => {
    const onResult = vi.fn()
    const { result } = renderHook(() => useVoiceInput({ onResult }))
    act(() => {
      result.current.start()
    })

    // Interim should NOT trigger onResult
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: false, 0: { transcript: 'hel' } },
        },
      })
    })
    expect(onResult).not.toHaveBeenCalled()

    // Final SHOULD trigger onResult
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, 0: { transcript: 'hello' } },
        },
      })
    })
    expect(onResult).toHaveBeenCalledWith('hello')
  })

  it('cleans up on unmount', () => {
    const { result, unmount } = renderHook(() => useVoiceInput())
    act(() => {
      result.current.start()
    })
    unmount()
    expect(mockRecognition.stop).toHaveBeenCalled()
  })
})
