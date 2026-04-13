// NOTE: @material-tailwind/html does NOT export withMT() — that API exists only
// in the React/Vue Material Tailwind packages.  The HTML package ships pure
// JavaScript interactive components whose styling uses standard Tailwind utilities.
// We add its dist paths to the content array so Tailwind scans any class names
// referenced there, and we apply the Material Tailwind class patterns directly
// in our Vue templates.

import frappeUIPreset from 'frappe-ui/tailwind'

export default {
  presets: [frappeUIPreset],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/@material-tailwind/html/dist/**/*.{js,cjs}',
  ],
  theme: {
    extend: {
      screens: {
        standalone: { raw: '(display-mode: standalone)' },
      },
      padding: {
        'safe-top':    'env(safe-area-inset-top)',
        'safe-right':  'env(safe-area-inset-right)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left':   'env(safe-area-inset-left)',
      },
    },
  },
  plugins: [],
}
