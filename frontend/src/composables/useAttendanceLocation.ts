import { ref } from 'vue'

export interface LocationData {
  latitude: number
  longitude: number
  address: string
}

export function useAttendanceLocation() {
  const locationLoading = ref(false)
  const locationData    = ref<LocationData | null>(null)
  const locationError   = ref<string | null>(null)

  async function resolveAddress(lat: number, lon: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'SouthwestServiceApp/1.0' } },
      )
      const data = await res.json()
      const a = (data.address ?? {}) as Record<string, string>
      const parts = [
        a.road || a.pedestrian || a.footway || a.suburb,
        a.city || a.town || a.village || a.county,
      ].filter(Boolean)
      if (parts.length) return parts.join(', ')
      const display = (data.display_name as string | undefined) ?? ''
      return display.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
    } catch {
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
    }
  }

  async function fetchLocation() {
    locationLoading.value = true
    locationError.value   = null
    locationData.value    = null

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('NO_SUPPORT'))
          return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      const address = await resolveAddress(lat, lon)
      locationData.value = { latitude: lat, longitude: lon, address }
    } catch (err: unknown) {
      const e = err as GeolocationPositionError & { message?: string }
      if (e.code === 1) {
        locationError.value = 'Location access denied. Please enable location services.'
      } else if (e.code === 3) {
        locationError.value = 'Location timed out. Tap to retry.'
      } else if (e.message === 'NO_SUPPORT') {
        locationError.value = 'Geolocation is not supported on this device.'
      } else {
        locationError.value = 'Unable to get location. Tap to retry.'
      }
    } finally {
      locationLoading.value = false
    }
  }

  return { locationLoading, locationData, locationError, fetchLocation }
}
