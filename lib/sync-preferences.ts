'use client'

import { useEffect, useState } from 'react'

/**
 * User-controllable preferences for recipe ↔ planner sync, persisted to
 * localStorage. Server-side rendering returns the default; the hook hydrates
 * to the stored value after mount.
 */

const KEY_OFFER_PUSH_ON_SAVE = 'kitchen:settings:offerPushOnSave'

/** Default ON — most cooks will want the post-save toast. */
const DEFAULT_OFFER_PUSH_ON_SAVE = true

export function getOfferPushOnSave(): boolean {
  if (typeof window === 'undefined') return DEFAULT_OFFER_PUSH_ON_SAVE
  try {
    const raw = localStorage.getItem(KEY_OFFER_PUSH_ON_SAVE)
    if (raw === null) return DEFAULT_OFFER_PUSH_ON_SAVE
    return raw === 'true'
  } catch {
    return DEFAULT_OFFER_PUSH_ON_SAVE
  }
}

export function setOfferPushOnSave(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY_OFFER_PUSH_ON_SAVE, String(value))
    window.dispatchEvent(new CustomEvent('kitchen:sync-prefs-changed'))
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function useOfferPushOnSave(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(DEFAULT_OFFER_PUSH_ON_SAVE)

  useEffect(() => {
    setValue(getOfferPushOnSave())
    const onChange = () => setValue(getOfferPushOnSave())
    window.addEventListener('kitchen:sync-prefs-changed', onChange)
    return () => window.removeEventListener('kitchen:sync-prefs-changed', onChange)
  }, [])

  const set = (v: boolean) => {
    setValue(v)
    setOfferPushOnSave(v)
  }

  return [value, set]
}
