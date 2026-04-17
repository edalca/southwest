import { inject } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export function useTime() {
  const __ = inject<(t: string) => string>('$translate', (t) => t)

  function formatTimeAgo(value: string | number | null | undefined) {
    if (value == null || value === '') return ''
    
    let diffInMinutes: number
    
    if (typeof value === 'number') {
      diffInMinutes = value
    } else {
      const date = dayjs(value)
      if (!date.isValid()) return ''
      diffInMinutes = dayjs().diff(date, 'minute')
    }

    if (diffInMinutes < 1) return __('just now')
    if (diffInMinutes < 60) return diffInMinutes + 'm ' + __('ago')
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return diffInHours + 'h ' + __('ago')
    
    const diffInDays = Math.floor(diffInHours / 24)
    return diffInDays + 'd ' + __('ago')
  }

  return {
    formatTimeAgo,
  }
}
