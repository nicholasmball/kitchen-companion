'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePreferences() {
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C')
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial'>('metric')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('temperature_unit, measurement_system')
          .eq('id', user.id)
          .single()

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
