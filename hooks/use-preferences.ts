'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/utils'

export function usePreferences() {
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C')
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial'>('metric')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000)
        if (!user) return

        const { data } = await withTimeout(
          supabase
            .from('profiles')
            .select('temperature_unit, measurement_system')
            .eq('id', user.id)
            .single(),
          5000
        )

        if (data) {
          setTemperatureUnit(data.temperature_unit || 'C')
          setMeasurementSystem(data.measurement_system || 'metric')
        }
      } catch {
        // Preferences will use defaults if fetch fails
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  return { temperatureUnit, measurementSystem, loading }
}
