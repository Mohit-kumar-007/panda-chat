/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        korean: ['Noto Sans KR', 'sans-serif'],
      },
      colors: {
        bg: '#FFF9F0',
        'panda-bg': '#E8F5E2',
        'chat-bg': '#FAFAFA',
        'bubble-mine': '#B2EBD4',
        'bubble-friend': '#FFD6C0',
        accent: '#FF6B6B',
        korean: '#1A237E',
        'text-main': '#2D2D2D',
      },
      animation: {
        'float-up': 'floatUp 2s ease-out forwards',
        'blink': 'blink 3s infinite',
        'sway': 'sway 3s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 0.5s ease-in-out',
        'zzz': 'zzz 2s ease-in-out infinite',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-80px)' },
        },
        blink: {
          '0%, 95%, 100%': { transform: 'scaleY(1)' },
          '97%': { transform: 'scaleY(0.05)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        zzz: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.8)' },
          '50%': { opacity: '1', transform: 'translateY(-15px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-30px) scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
