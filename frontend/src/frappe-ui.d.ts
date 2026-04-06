declare module 'frappe-ui/vite' {
  import type { Plugin } from 'vite'
  export default function frappeui(): Plugin
}

declare module 'frappe-ui/tailwind' {
  const preset: Record<string, unknown>
  export default preset
}
