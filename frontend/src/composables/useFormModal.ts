import { ref } from 'vue'

const isOpen = ref(false)
const swoName = ref<string | null>(null)
let _onSaved: (() => void) | null = null
let _onStatusUpdated: (() => void) | null = null

export function open(
  name: string | null = null,
  callbacks?: { onSaved?: () => void; onStatusUpdated?: () => void },
) {
  swoName.value = name
  _onSaved = callbacks?.onSaved ?? null
  _onStatusUpdated = callbacks?.onStatusUpdated ?? null
  isOpen.value = true
}

export function useFormModal() {
  function close() { isOpen.value = false }
  function notifySaved() { _onSaved?.() }
  function notifyStatusUpdated() { _onStatusUpdated?.() }
  return { isOpen, swoName, close, notifySaved, notifyStatusUpdated }
}
