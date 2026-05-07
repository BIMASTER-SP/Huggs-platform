/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#BE185D',
          700: '#9F1239',
          800: '#831843',
          900: '#500724',
        },
        accent: {
          purple: '#A855F7',
          'purple-dark': '#7E22CE',
          emerald: '#10B981',
          'emerald-dark': '#065F46',
          amber: '#F59E0B',
          rose: '#F43F5E',
          'rose-dark': '#9F1239',
        },
        status: {
          enviado: '#3B82F6',
          aprovado: '#10B981',
          'em-separacao': '#F59E0B',
          'em-transito': '#A855F7',
          entregue: '#22C55E',
          cancelado: '#EF4444',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)',
        'brand-gradient-vertical': 'linear-gradient(180deg, #BE185D 0%, #EC4899 60%, #FDF2F8 100%)',
      },
    },
  },
  plugins: [animate],
}
