/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:         '#C06A1A',
        'brand-light': '#E07820',
        'brand-dark':  '#8A4A0A',
        'brand-glow':  'rgba(224,120,32,0.15)',
        surface:       '#ffffff',
        sidebar:       '#f9fafb',
        card:          '#ffffff',
        'card-hover':  '#f3f4f6',
        border:        '#e5e7eb',
        'border-soft': '#f0f0f0',
        muted:         '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp:   { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        bounceDot: { '0%,80%,100%': { transform: 'scale(0)' },             '40%': { transform: 'scale(1) ' } },
      },
      screens: {
        xs: '400px',
      },
    },
  },
  plugins: [],
}
