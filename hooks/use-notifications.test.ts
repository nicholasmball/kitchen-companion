import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the notification and audio modules
vi.mock('@/lib/notifications', () => ({
  getNotificationPermission: vi.fn().mockReturnValue('default'),
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  sendNotification: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/audio', () => ({
  playAlertSound: vi.fn(),
  initAudio: vi.fn(),
}))

import { useNotifications } from './use-notifications'
import { getNotificationPermission, requestNotificationPermission, sendNotification } from '@/lib/notifications'
import { playAlertSound } from '@/lib/audio'

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads initial permission state on mount', () => {
    vi.mocked(getNotificationPermission).mockReturnValue('granted')

    const { result } = renderHook(() => useNotifications())

    expect(result.current.permission).toBe('granted')
    expect(result.current.isGranted).toBe(true)
    expect(result.current.isDenied).toBe(false)
  })

  it('requests permission and updates state', async () => {
    vi.mocked(getNotificationPermission).mockReturnValue('default')
    vi.mocked(requestNotificationPermission).mockResolvedValue('granted')

    const { result } = renderHook(() => useNotifications())

    await act(async () => {
      await result.current.requestPermission()
    })

    expect(requestNotificationPermission).toHaveBeenCalled()
    expect(result.current.permission).toBe('granted')
  })

  it('calls sendNotification and playAlertSound on notify', () => {
    vi.mocked(getNotificationPermission).mockReturnValue('granted')

    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({
        title: 'Timer done',
        body: 'Your chicken is ready',
        playSound: 'urgent',
      })
    })

    expect(playAlertSound).toHaveBeenCalledWith('urgent')
    expect(sendNotification).toHaveBeenCalledWith({
      title: 'Timer done',
      body: 'Your chicken is ready',
    })
  })

  it('reports unsupported correctly', () => {
    vi.mocked(getNotificationPermission).mockReturnValue('unsupported')

    const { result } = renderHook(() => useNotifications())

    expect(result.current.isSupported).toBe(false)
  })
})
