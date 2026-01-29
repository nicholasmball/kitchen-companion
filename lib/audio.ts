'use client'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

// Play a simple beep using Web Audio API (no external files needed)
export function playAlertSound(type: 'gentle' | 'urgent' = 'gentle'): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  if (type === 'urgent') {
    // Urgent: Higher pitch, longer, pulsing
    oscillator.frequency.value = 880 // A5
    oscillator.type = 'sine'

    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)

    // Pulse 3 times
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.3
      gainNode.gain.linearRampToValueAtTime(0.3, start + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, start + 0.2)
    }

    oscillator.start(now)
    oscillator.stop(now + 1)
  } else {
    // Gentle: Lower pitch, single tone
    oscillator.frequency.value = 523.25 // C5
    oscillator.type = 'sine'

    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5)

    oscillator.start(now)
    oscillator.stop(now + 0.6)
  }
}

// Initialize audio context on first user interaction (required by browsers)
export function initAudio(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }
}
