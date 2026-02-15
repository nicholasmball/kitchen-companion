import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { PWARegister } from '../pwa-register'

describe('PWARegister', () => {
  const mockRegister = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing', () => {
    const { container } = render(<PWARegister />)
    expect(container.innerHTML).toBe('')
  })

  it('registers the service worker on mount', async () => {
    render(<PWARegister />)
    await vi.waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('/sw.js')
    })
  })

  it('handles registration failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRegister.mockRejectedValueOnce(new Error('SW registration failed'))

    render(<PWARegister />)

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Service Worker registration failed:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it('does not register if serviceWorker is not supported', () => {
    const original = navigator.serviceWorker
    // @ts-expect-error — deleting to simulate unsupported browser
    delete (navigator as Record<string, unknown>).serviceWorker

    render(<PWARegister />)
    expect(mockRegister).not.toHaveBeenCalled()

    // Restore
    Object.defineProperty(navigator, 'serviceWorker', {
      value: original,
      writable: true,
      configurable: true,
    })
  })
})
