import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Rozper Brand Colors (Dark Navy Theme)
        primary: {
          DEFAULT: '#046BD2',
          hover: '#0078E0',
          pressed: '#045CB4',
        },
        secondary: '#2575FC',
        accent: '#0086F9',
        link: '#22D3EE',
        background: '#0B1220',
        popover: '#111B2D',
        border: '#1A2638',
        foreground: '#FFFFFF',
        body: '#CCD6DF',
        destructive: '#FF4444',
        card: 'rgba(255,255,255,0.04)',
        muted: 'rgba(255,255,255,0.05)',
        input: 'rgba(255,255,255,0.07)',
        glow: 'rgba(4,107,210,0.35)',
        'glow-strong': 'rgba(4,107,210,0.6)',
        chart: {
          1: '#046BD2',
          2: '#0078E0',
          3: '#0086F9',
          4: '#2575FC',
          5: '#2D98F1',
        },
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      borderRadius: {
        base: '1rem',
        sm: '0.75rem',
        md: '0.875rem',
        lg: '1rem',
        xl: '1.25rem',
      },
    },
  },
  plugins: [
    typography,
  ],
};