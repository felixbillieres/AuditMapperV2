import typography from '@tailwindcss/typography'

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
        // Dark theme colors - plus épuré
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Cyber colors - plus subtil et professionnel
        cyber: {
          primary: '#00d4aa',    // Vert cyber plus doux
          secondary: '#ff6b6b',  // Rouge plus doux
          accent: '#4ecdc4',     // Cyan plus doux
          warning: '#ffa726',    // Orange plus doux
          danger: '#ef5350',     // Rouge danger plus doux
          info: '#42a5f5',       // Bleu info plus doux
          success: '#66bb6a',    // Vert success plus doux
          critical: '#d32f2f',   // Rouge critique
          high: '#f57c00',       // Orange élevé
          medium: '#fbc02d',     // Jaune moyen
          low: '#388e3c',        // Vert faible
        },
        // Terminal colors - plus épuré
        terminal: {
          bg: '#0a0a0a',
          fg: '#00ff88',
          selection: '#264f78',
          cursor: '#ffffff',
          black: '#000000',
          red: '#ff0000',
          green: '#00ff00',
          yellow: '#ffff00',
          blue: '#0000ff',
          magenta: '#ff00ff',
          cyan: '#00ffff',
          white: '#ffffff',
        },
        // Custom brand colors
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'typewriter': 'typewriter 2s steps(40) 1s 1 normal both',
        'blink': 'blink 1s infinite',
        'float': 'float 3s ease-in-out infinite',
        'rotate-slow': 'rotate 10s linear infinite',
        'pulse-cyber': 'pulse-cyber 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4aa, 0 0 10px #00d4aa, 0 0 15px #00d4aa' },
          '100%': { boxShadow: '0 0 10px #00d4aa, 0 0 20px #00d4aa, 0 0 30px #00d4aa' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rotate: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-cyber': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 212, 170, 0.4)',
        'cyber': '0 0 20px rgba(78, 205, 196, 0.3)',
        'terminal': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'neon': '0 0 10px rgba(0, 212, 170, 0.5)',
        'neon-lg': '0 0 20px rgba(0, 212, 170, 0.7)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(45deg, #00d4aa 0%, #4ecdc4 50%, #ff6b6b 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        'terminal-bg': 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
    },
  },
  plugins: [typography],
}
