import type {Config} from 'tailwindcss'

/**
 * Phaselaw brand palette + the `pl_light` DaisyUI theme, mirrored from the main
 * product (shredder-fe) so this tool feels like part of the family.
 */
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          vermillion: '#FF392E',
          blue: '#33327E',
          carrot: '#F79605',
          sunglow: '#FFD13E',
          pumpkin: '#F36E0A',
          almond: '#F6E5D4',
          cream: '#F9F5EC',
          ppt: '#C64320',
          ink: '#16151C',
        },
      },
      fontFamily: {
        sans: ['var(--font-ubuntu)', 'system-ui', 'sans-serif'],
        display: ['var(--font-ubuntu)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {opacity: '0', transform: 'translateY(12px)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        shimmer: {
          '100%': {transform: 'translateX(100%)'},
        },
        'pulse-ring': {
          '0%': {transform: 'scale(0.95)', opacity: '0.7'},
          '70%': {transform: 'scale(1.1)', opacity: '0'},
          '100%': {opacity: '0'},
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    logs: false,
    themes: [
      {
        pl_light: {
          primary: '#FF392E',
          'primary-content': '#F9F5EC',
          secondary: '#33327E',
          'secondary-content': '#F9F5EC',
          accent: '#F36E0A',
          'accent-content': '#F9F5EC',
          neutral: '#16151C',
          'neutral-content': '#F9F5EC',
          'base-100': '#ffffff',
          'base-200': '#F9F5EC',
          'base-300': '#F6E5D4',
          'base-content': '#16151C',
          info: '#33327E',
          'info-content': '#F9F5EC',
          success: '#3BB273',
          'success-content': '#F9F5EC',
          warning: '#F79605',
          'warning-content': '#16151C',
          error: '#FF392E',
          'error-content': '#F9F5EC',
          '--rounded-box': '1.25rem',
          '--rounded-btn': '0.75rem',
        },
      },
    ],
  },
}

export default config
