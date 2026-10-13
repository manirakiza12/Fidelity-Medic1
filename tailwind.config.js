/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Medical Royal Blue - primary brand
        brand: {
          50: '#EEF2FF',
          100: '#DEE5FF',
          200: '#BACBFF',
          300: '#8EA8FF',
          400: '#5D7DFB',
          500: '#2F53F0',
          600: '#0033CC',
          700: '#0029A6',
          800: '#001F80',
          900: '#00155A',
          950: '#000D38',
        },
        // Energetic Caring Red - secondary accent
        accent: {
          50: '#FFF1F1',
          100: '#FFE1E1',
          200: '#FFC7C7',
          300: '#FF9E9E',
          400: '#FF6161',
          500: '#FF1A1A',
          600: '#E00F0F',
          700: '#BC0B0B',
          800: '#990B0B',
          900: '#7D0E0E',
        },
        // Clinical neutrals
        ink: {
          DEFAULT: '#212529',
          soft: '#495057',
          mute: '#6C757D',
          line: '#E3E6EA',
        },
        mist: {
          DEFAULT: '#F8F9FA',
          deep: '#F1F3F5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(33,37,41,.04), 0 8px 24px -8px rgba(33,37,41,.10)',
        'card-hover': '0 2px 4px rgba(0,51,204,.06), 0 24px 48px -16px rgba(0,51,204,.28)',
        nav: '0 1px 0 rgba(33,37,41,.06), 0 8px 24px -12px rgba(33,37,41,.14)',
        glow: '0 0 0 4px rgba(0,51,204,.10)',
      },
      maxWidth: { container: '1200px' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1.16)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.85)', opacity: '.7' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        kenburns: 'kenburns 7s ease-out both',
        'slide-in-left': 'slide-in-left .7s cubic-bezier(.22,1,.36,1) both',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.24,.6,.35,1) infinite',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};