/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        alight: {
          50: '#FFFDF5',
          100: '#FEF9E7',
          200: '#FDEFC2',
          300: '#FCE299',
          400: '#F9CF66',
          500: '#E8A520',
          600: '#D4890A',
          700: '#B26C04',
          800: '#8F5307',
          900: '#73410A',
          accent: '#E8A520',
          coral: '#E06B43',
        },
        dark: {
          bg: '#0A0B10',
          sidebar: '#0E0F17',
          card: '#141622',
          border: '#202334',
          hover: '#1B1E2E',
          text: '#F3F4F8',
          muted: '#8E94A8',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'spin-slow': 'spin 12s linear infinite',
        'shimmer': 'shimmer 2.5s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 15px rgba(232, 165, 32, 0.3))' },
          '100%': { filter: 'drop-shadow(0 0 30px rgba(232, 165, 32, 0.6))' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
