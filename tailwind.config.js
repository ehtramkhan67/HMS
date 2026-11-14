/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#042938',
          cyan: '#00BCD5',
          red: '#D40035',
          white: '#FFFFFF',
        },
        // primary = deep navy surfaces + ink headings (surface-alt family),
        // with the cyan brand accent in the mid range.
        primary: {
          DEFAULT: '#00BCD5',
          50: '#E8F7FA',
          100: '#DFE5E8',
          200: '#C6D2D7',
          300: '#9FADB5',
          400: '#5F727F',
          500: '#0098AC',
          600: '#00838F',
          700: '#065F71',
          800: '#033242',
          900: '#042938',
          950: '#021C27',
        },
        // secondary = primary cyan brand accent (#00BCD5)
        secondary: {
          DEFAULT: '#00BCD5',
          50: '#E0F8FC',
          100: '#B3EFF7',
          200: '#80E5F1',
          300: '#4DDAE9',
          400: '#26D1E2',
          500: '#00BCD5',
          600: '#00A5BC',
          700: '#008A9C',
          800: '#00707D',
          900: '#005A66',
          950: '#00434D',
        },
        dark: {
          900: '#042938',
          800: '#033242',
          700: '#065F71',
        },
        surface: {
          light: '#FFFFFF',
          white: '#FFFFFF',
        },
        muted: {
          50: '#F5F7F8',
          100: '#E7ECEE',
          200: '#DFE5E8',
          300: '#C8D1D4',
          400: '#94A3AB',
          500: '#595959',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#D40035',
          info: '#00A4EF',
        }
      },
      fontFamily: {
        sans: ['NeverMind', 'Xmind', '"Plus Jakarta Sans"', 'Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['NeverMind', 'Xmind', '"Plus Jakarta Sans"', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      // Design scale: 0px (sharp) / 3px (inputs) / full (pill buttons only)
      borderRadius: {
        xs: '3px',
        sm: '3px',
        md: '3px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        card: '0px',
        'card-lg': '0px',
      },
      // Flat elevation: no card shadows; one subtle shadow for hover/focus affordance
      boxShadow: {
        'card': 'none',
        'card-hover': 'rgba(56, 69, 84, 0.2) 0px 0px 2px 0px',
      },
    },
  },
  plugins: [],
}
